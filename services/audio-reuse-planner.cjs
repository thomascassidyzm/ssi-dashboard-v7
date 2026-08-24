/**
 * REUSE-FIRST REGENERATION — the planner.
 *
 * Tom's rule, verbatim (2026-08-07):
 *
 *   "set aside all clips for the first 10 ROUNDS
 *    does this voice x text x lang combination exist already?
 *    find it
 *    then generate all missing clips"
 *
 * This module is the durable capability behind that. It is deliberately
 * SEPARATE from phase8-audio-v13.cjs (which owns TTS, S3 and the course_audio
 * writes) so the decision logic is unit-testable with no I/O beyond Supabase
 * reads. phase8 mounts it on /reuse-plan, /reuse-apply and /reuse-run.
 *
 * ── THE THREE RULES THAT SHAPE EVERY LINE BELOW ───────────────────────────
 *
 * 1. ENUMERATE THROUGH THE ROUND GENERATOR, NEVER BY COUNTING HOLDER ROWS.
 *    A "round" is a learner-facing unit emitted by
 *    services/learning-script-generator.cjs. Counting course_legos +
 *    course_practice_phrases rows and calling the answer "rounds 1-10" is what
 *    produced the wrong figure Tom rejected on 2026-08-07
 *    (docs/audio-repair-2026-08-07/fra-rounds-1-10-recount-2026-08-07.md).
 *    The generator is the only authority on what a learner hears.
 *
 * 2. THE COURSE CONTENT IS THE SOURCE OF TRUTH FOR TEXT, NOT course_audio.text.
 *    course_audio.text is a clip's render-time snapshot. Re-rendering from it
 *    is structurally blind to the course and can never fix a clip whose text is
 *    wrong. Every clip spec here comes out of the generator, which reads
 *    course_legos / course_practice_phrases / course_seeds — the same text the
 *    learner is shown. course_audio.text is consulted for exactly one question:
 *    "does a clip saying this already exist?"
 *
 * 3. MAKE BEFORE BREAK. NOTHING IS EVER DELETED.
 *    A reuse decision produces a NEW link, applied only once the target row is
 *    known to exist and to carry a real (non-pending) S3 object. The previous
 *    course_audio row is left exactly where it is. The 2026-08-03 fra_for_eng
 *    purge deleted 31,310 rows before re-rendering and left ~2,000 learner
 *    slots silent for two days. See AUDIO_PIPELINE_ARCHITECTURE.md §6b.
 *
 * ── THE REUSE KEY ─────────────────────────────────────────────────────────
 *
 * Tom's key is (voice x text x language) and NOTHING else — evaluated across
 * ALL courses and ALL roles (2026-08-07): "An English sentence spoken by the
 * clone as target2 in eng_for_hin COUNTS as coverage for the English known side
 * of fra_for_eng." So the lookup is ROLE-AGNOSTIC and DIRECTION-AGNOSTIC by
 * default. This matters: measured on fra_for_eng rounds 1-10, role-scoping the
 * query drops the clone's English coverage from 32 clips to 3 — a narrow query
 * would have argued against the very voice the widening exists to find.
 *
 * ONE physical exception, not a policy one: Azure BAKES the configured `speed`
 * into the stored MP3 (services/shared/clone-copy-match.cjs), and course_audio
 * has no persisted per-row speed, so an Azure clip's pace cannot be verified
 * after the fact. Crossing roles on an Azure source could therefore import a
 * clip rendered at 0.85x into a 1.0x slot. xAI and ElevenLabs have no working
 * speed parameter at all, so every clip on them is 1x and role-crossing is
 * free. The guard is engine-shaped, not role-shaped. Pass { crossRole: false }
 * to restore strict same-role matching everywhere.
 *
 * ── THE LANGUAGE-NAME FILTER (Tom, 2026-08-07) ────────────────────────────
 *
 * A clip whose text NAMES A LANGUAGE must never be borrowed into a course for a
 * different language. "The German for 'to speak'" inside a French course is a
 * learner-facing disaster, and the same trap bites the German redo in reverse.
 * Exact text matching mostly protects us — those two lines differ, so they do
 * not match — but the filter is enforced explicitly anyway, because it also
 * catches the case exact matching CANNOT: a contaminated text already sitting
 * in this course's own content, written by some earlier batch. So the rule is
 * stated positively and audited: a text may name this course's own known or
 * target language and no other.
 *
 * Voice is matched EXACTLY on the stored voice_id string. The estate carries
 * both bare (`eve`) and provider-prefixed (`xai_eve`) ids for what is probably
 * the same voice; this module does NOT assume that. Treating them as equal is a
 * voice-identity call and therefore Tom's, not ours. `voiceAliases` lets a
 * caller assert an equivalence explicitly, and every clip that reuses through
 * an alias is tagged so an audit can find it.
 *
 * Language is matched across code CONVENTIONS only (fra/fr/fre are one
 * language) and never across regional variants (fr-CA is not fr) — that is an
 * accent change, which is a voice change.
 *
 * Text is matched with audioKeyCandidates() from services/shared/text-normalize
 * because course_audio.text_normalized holds two incompatible conventions and
 * no single exact key reaches both rows written before and after March 2026.
 */

const { generateLearningScript } = require('./learning-script-generator.cjs')
const { normalizeForAudio, audioKeyCandidates } = require('./shared/text-normalize.cjs')
const { pickPreferredAudioRow } = require('./shared/audio-link-preference.cjs')
const {
  PROVIDER_PREFIX,
  bareVoiceId,
  resolveVoices,
  voicesMatch,
  voiceCandidates,
} = require('./shared/relink-voice-guard.cjs')
const createLogger = require('./shared/logger.cjs')

const logger = createLogger('AudioReusePlanner')

// Roles this planner knows how to enumerate and fill. Pods, instructions and
// encouragements are not part of a learner round and are out of scope.
const CLIP_ROLES = ['known', 'target1', 'target2', 'presentation']

// Which holder column carries the FK for each role, per holder table.
const HOLDER_COLUMN = {
  known: 'known_audio_id',
  target1: 'target1_audio_id',
  target2: 'target2_audio_id',
  presentation: 'presentation_audio_id',
}

// ISO-639 conventions that name the SAME language. Regional variants
// (fr-CA, pt-BR, en-GB) are deliberately absent: a locale is an accent, and an
// accent change is a voice change.
const LANGUAGE_ALIASES = [
  ['fra', 'fre', 'fr'],
  ['eng', 'en'],
  ['deu', 'ger', 'de'],
  ['spa', 'es'],
  ['ita', 'it'],
  ['por', 'pt'],
  ['nld', 'dut', 'nl'],
  ['cym', 'wel', 'cy'],
  ['zho', 'chi', 'zh'],
  ['jpn', 'ja'],
  ['kor', 'ko'],
  ['ara', 'ar'],
  ['rus', 'ru'],
  ['pol', 'pl'],
  ['tur', 'tr'],
  ['hin', 'hi'],
  ['ell', 'gre', 'el'],
  ['ukr', 'uk'],
  ['ces', 'cze', 'cs'],
  ['hrv', 'hr'],
  ['lit', 'lt'],
  ['ron', 'rum', 'ro'],
  ['swe', 'sv'],
  ['dan', 'da'],
  ['nor', 'no'],
  ['fin', 'fi'],
  ['hun', 'hu'],
]

/**
 * Every stored language code that means the same language as `lang`.
 * Unknown codes return just themselves — never widen a language we don't know.
 */
function languageCandidates(lang) {
  if (!lang) return []
  const raw = String(lang).trim()
  const lower = raw.toLowerCase()
  const group = LANGUAGE_ALIASES.find(g => g.includes(lower))
  const out = group ? [...group] : [lower]
  if (!out.includes(raw)) out.push(raw)
  return [...new Set(out)]
}

/**
 * Is `candidateLang` the same language as `wantedLang`? Regional variants are
 * NOT the same language for reuse purposes.
 */
function sameLanguage(wantedLang, candidateLang) {
  if (!wantedLang || !candidateLang) return false
  return languageCandidates(wantedLang)
    .map(s => s.toLowerCase())
    .includes(String(candidateLang).trim().toLowerCase())
}

// resolveVoices / bareVoiceId / voicesMatch / voiceCandidates now live in
// services/shared/relink-voice-guard.cjs — Kai's relink voice-match ruling of
// 2026-08-19 needs the SAME answer to "do these two ids name the same voice?"
// in every relink path, so there is now exactly one definition and this planner
// (which already got the rule right) is one of its callers rather than a second
// copy. The re-exports below keep this module's public API unchanged.

/**
 * Human labels for the voices that matter, so a coverage table reads as people
 * rather than as ids. Keyed on the BARE id, so both eras resolve.
 * `gfzdpspr5fdp` is Tom's own cloned voice — his ruling, 2026-08-07.
 */
const VOICE_LABELS = {
  gfzdpspr5fdp: 'Tom (clone)',
  eve: 'Eve (xAI)',
  leo: 'Leo (xAI)',
  ara: 'Ara (xAI)',
}

/** Display name for a voice id, falling back to the bare id itself. */
function voiceLabel(voiceId) {
  const bare = bareVoiceId(voiceId)
  return VOICE_LABELS[bare] || bare || 'unknown'
}

/**
 * Do two voice_id strings name the same voice?
 *
 * TOM'S RULING, 2026-08-07: "eve and xai_eve are the same voice under two id
 * conventions; treat bare vs xai_-prefixed ids as one voice identity generally
 * (same actual voice, different provider-migration eras)." So a bare id and its
 * prefixed sibling now match BY DEFAULT. This was an open question until he
 * settled it, and the code deliberately would not guess.
 *
 * The match is still TAGGED (`viaAlias`) so an audit can find every clip that
 * came in across an era boundary rather than on an exact id — the ruling makes
 * it correct, not invisible. `mergeProviderEras: false` restores strict exact
 * matching. `aliases` remains for equivalences the prefix rule cannot express.
 */
// (implementation: services/shared/relink-voice-guard.cjs)

/**
 * Can this voice's clips be trusted to be at natural (1x) pace, so a clip may
 * be borrowed into a slot with a different role?
 *
 * xAI exposes no speed parameter at all, and ElevenLabs destructures `speed`
 * but never sends it — every clip on either is 1x. Azure BAKES the configured
 * rate into the SSML and therefore into the stored MP3, and course_audio keeps
 * no per-row speed, so an Azure clip's pace is unverifiable after the fact.
 * (Verified in services/shared/clone-copy-match.cjs against tts-service.cjs.)
 * Unknown/legacy voice ids are untrusted — the safe default.
 */
function isSpeedTrustedVoice(voiceId) {
  if (!voiceId) return false
  const id = String(voiceId)
  // The guard is AZURE-SHAPED, not prefix-shaped. Testing for a known-good
  // prefix instead would fail closed on every BARE legacy id — and the estate's
  // bare ids include `gfzdpspr5fdp`, Tom's own xAI clone. Measured 2026-08-07:
  // the prefix-shaped version suppressed the clone's cross-role coverage
  // entirely, which is precisely the distortion the role-agnostic widening
  // exists to remove. So: untrusted iff it names an Azure voice.
  if (/^azure_/i.test(id)) return false
  // Azure ids are the only ones shaped `xx-YY-NameNeural`, with or without the
  // provider prefix — that shape is how a bare Azure row is recognised.
  if (/^[a-z]{2,3}(-[A-Za-z]+)?-[A-Z]{2}-/.test(id) || /Neural$/i.test(id)) return false
  return true
}

/* voiceCandidates: see services/shared/relink-voice-guard.cjs */

/**
 * The clip identity key. Text is normalised with normalizeForAudio (the JS
 * convention); the DB-convention variants are handled at LOOKUP time by
 * audioKeyCandidates, not here — this key only has to be stable within one run.
 */
function clipKey({ role, language, voiceId, text }, { crossRole = false } = {}) {
  const langGroup = languageCandidates(language)[0] || language
  const rolePart = crossRole ? '*' : role
  return `${rolePart}|${langGroup}|${voiceId}|${normalizeForAudio(text)}`
}

/**
 * Is this text something a voice can actually say? Punctuation-only holder rows
 * exist and must never become render work.
 */
function isSayable(text) {
  if (!text || !String(text).trim()) return false
  return /[\p{L}\p{N}]/u.test(String(text))
}

// ===========================================================================
// THE LANGUAGE-NAME FILTER
// ===========================================================================

/**
 * English names of the languages the estate actually teaches, plus the common
 * variants that appear in presentation lines. Drawn from language-code-service
 * at call time where possible; this list is the floor, so the filter still
 * works when a caller passes no code service.
 */
const LANGUAGE_NAME_FLOOR = [
  'English', 'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Dutch',
  'Welsh', 'Irish', 'Polish', 'Russian', 'Ukrainian', 'Czech', 'Croatian',
  'Serbian', 'Lithuanian', 'Romanian', 'Swedish', 'Danish', 'Norwegian',
  'Finnish', 'Hungarian', 'Greek', 'Turkish', 'Arabic', 'Hebrew', 'Persian',
  'Hindi', 'Urdu', 'Bengali', 'Punjabi', 'Gujarati', 'Marathi', 'Tamil',
  'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Nepali',
  'Chinese', 'Mandarin', 'Cantonese', 'Japanese', 'Korean', 'Vietnamese',
  'Thai', 'Indonesian', 'Malay', 'Swahili', 'Afrikaans', 'Icelandic',
  'Catalan', 'Basque', 'Galician', 'Latin', 'Quebecois',
]

/**
 * Build the filter for one course: which language names this course's texts are
 * ALLOWED to contain (its own known and target language), and which are
 * therefore forbidden.
 *
 * `extraAllowed` exists because a course's target language NAME is what matters,
 * not its code — fra_for_eng and fra_ca_for_eng are different courses whose
 * texts both legitimately say "French", which is exactly why Tom pointed at the
 * Quebecois course as the source for French intro lines.
 */
function buildLanguageNameFilter({ knownName, targetName, extraAllowed = [], names = LANGUAGE_NAME_FLOOR } = {}) {
  const allowed = new Set(
    [knownName, targetName, ...extraAllowed].filter(Boolean).map(s => String(s).toLowerCase())
  )
  const forbidden = names.filter(n => !allowed.has(n.toLowerCase()))
  // Word-boundary match, case-insensitive. \b is correct here: every name in the
  // list is Latin-script, and we want "German" but not "Germanic sound shift"...
  // which \b would still catch, so the pattern requires the whole word.
  const pattern = forbidden.length
    ? new RegExp(`\\b(${forbidden.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i')
    : null

  /** @returns {null|string} the offending language name, or null if clean */
  const namedLanguage = (text) => {
    if (!pattern || !text) return null
    const m = pattern.exec(String(text))
    return m ? m[1] : null
  }

  return { allowed: [...allowed], forbidden, namedLanguage, pattern }
}

/**
 * Language names a course may legitimately mention, derived from its codes.
 * `codeService` is services/language-code-service.cjs (injected so this file
 * stays free of a hard dependency and testable).
 */
function courseLanguageNames(course, codeService) {
  const get = (c) => {
    if (!c) return null
    try { return codeService?.getName ? codeService.getName(c) : null } catch { return null }
  }
  return { knownName: get(course.known_lang), targetName: get(course.target_lang) }
}

// ===========================================================================
// STEP 1 — ENUMERATE
// ===========================================================================

/**
 * Set aside every clip rounds `fromRound`..`roundCount` of a course play.
 *
 * `fromRound` defaults to 1, which is the whole prefix and the only shape this
 * ever had. It exists because a full course is ~1,500 rounds: re-planning from
 * round 1 every time makes each later pass re-verify — and, under
 * verifyIncumbents, re-LISTEN to — every clip of every round before it, which
 * is hours of whisper for work already finished. A band is disjoint, bounded
 * and checkpointable. Clips shared with an earlier band still come back
 * SATISFIED, so banding is idempotent, never destructive, and never re-buys
 * audio; it only stops paying to re-ask a question already answered.
 *
 * Runs the REAL learning-script generator, walks the emitted cycles, and
 * returns the DISTINCT clip set with, for each clip: role, language, the voice
 * it should be on, the COURSE text it should say, which rounds play it, how
 * many plays it gets, and every holder row (table + id + FK column) that must
 * end up pointing at it.
 *
 * @returns {Promise<{ clips: Map<string,object>, shape: object, voices: object, course: object }>}
 */
/**
 * The rounds a band covers: inclusive both ends, so bands tile without a gap
 * (1-200, 201-500) and without an overlap. A band whose start is past its end
 * is empty rather than an error here — the caller raises that, with the course
 * name in the message.
 */
function roundsInBand (rounds, fromRound = 1, roundCount = Infinity) {
  return (rounds || []).filter(r => r.roundNumber >= fromRound && r.roundNumber <= roundCount)
}

async function enumerateRoundClips(supabase, courseCode, roundCount, options = {}) {
  const { crossRole = false, mode, fromRound = 1 } = options

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, voice_config')
    .eq('course_code', courseCode)
    .single()
  if (courseErr || !course) {
    throw new Error(`Course ${courseCode} not found: ${courseErr?.message || 'no row'}`)
  }

  const voices = resolveVoices(course)
  const missingVoices = CLIP_ROLES.filter(r => !voices[r])
  if (missingVoices.includes('known') || missingVoices.includes('target1')) {
    throw new Error(`${courseCode} voice_config has no voice for ${missingVoices.join(', ')} — fill it in before planning`)
  }

  // learnerView:false — we are planning what SHOULD exist, so a LEGO must not
  // be dropped from the walk for the very reason we are here (its audio is
  // missing). The recount confirmed rounds 1-10 of fra_for_eng are identical
  // either way; on a damaged course they would not be, and the ungated walk is
  // the correct one for a repair plan.
  const script = await generateLearningScript(supabase, courseCode, roundCount, 0, {
    learnerView: false,
    ...(mode ? { mode } : {}),
  })

  const rounds = roundsInBand(script.rounds, fromRound, roundCount)
  if (!rounds.length) {
    throw new Error(`Generator emitted no rounds ${fromRound}-${roundCount} for ${courseCode}`)
  }

  // Holder lookup. The generator hands back lego ids, phrase ids and seed ids;
  // we need the primary keys of the rows carrying the FK columns.
  const legoIds = [...new Set(rounds.flatMap(r => r.items.map(i => i.legoId)).filter(Boolean))]
  const phraseIds = [...new Set(rounds.flatMap(r => r.items.map(i => i.phrase_id)).filter(Boolean))]
  const seedNumbers = [...new Set(rounds.flatMap(r => r.items.map(i => i.seedNumber)).filter(n => n != null))]

  const legoRows = await fetchIn(supabase, 'course_legos',
    'id, lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id',
    courseCode, 'lego_id', legoIds)
  const legoByLegoId = new Map(legoRows.map(r => [r.lego_id, r]))

  const phraseRows = phraseIds.length
    ? await fetchIn(supabase, 'course_practice_phrases',
        'id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id',
        courseCode, 'id', phraseIds)
    : []
  const phraseById = new Map(phraseRows.map(r => [r.id, r]))

  const seedRows = seedNumbers.length
    ? await fetchIn(supabase, 'course_seeds',
        'id, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id',
        courseCode, 'seed_number', seedNumbers)
    : []
  const seedByNumber = new Map(seedRows.map(r => [r.seed_number, r]))

  // Presentation TEXT. Unlike every other layer this is not on the holder row —
  // it lives on the course_audio row itself (authored by phase8's presentation
  // author, sometimes as a `pending/` text-only row awaiting its render). We
  // read it here purely to know what the intro should SAY; a LEGO with no
  // authored presentation text is reported as BLOCKED with that reason rather
  // than silently skipped, because phase8 /generate is what authors it.
  const presRows = await fetchPresentationTexts(supabase, courseCode, legoIds)

  const clips = new Map()
  const shape = {
    rounds: rounds.length,
    cycles: 0,
    clipPlays: 0,
    byType: { intro: 0, debut: 0, build: 0, review: 0, consolidate: 0 },
  }

  const addPlay = (spec, holder, roundNumber) => {
    if (!isSayable(spec.text)) return
    const key = clipKey(spec, { crossRole })
    let clip = clips.get(key)
    if (!clip) {
      clip = {
        clipKey: key,
        role: spec.role,
        language: spec.language,
        voiceId: spec.voiceId,
        text: spec.text,
        plays: 0,
        roundsUsedIn: [],
        holders: [],
        currentAudioIds: [],
      }
      clips.set(key, clip)
    }
    clip.plays++
    if (!clip.roundsUsedIn.includes(roundNumber)) clip.roundsUsedIn.push(roundNumber)
    if (holder) {
      const dup = clip.holders.some(h => h.table === holder.table && String(h.id) === String(holder.id) && h.column === holder.column)
      if (!dup) {
        clip.holders.push(holder)
        if (holder.currentAudioId) clip.currentAudioIds.push(holder.currentAudioId)
      }
    }
    return clip
  }

  for (const round of rounds) {
    for (const item of round.items) {
      shape.cycles++
      if (shape.byType[item.type] != null) shape.byType[item.type]++

      // Which row holds this cycle's FK columns?
      let holderRow = null
      let holderTable = null
      if (item.phrase_id) {
        holderRow = phraseById.get(item.phrase_id) || null
        holderTable = 'course_practice_phrases'
      } else if (item.reviewItemKind === 'seed') {
        holderRow = seedByNumber.get(item.seedNumber) || null
        holderTable = 'course_seeds'
      } else {
        holderRow = legoByLegoId.get(item.legoId) || null
        holderTable = 'course_legos'
      }

      const holderFor = (role) => holderRow ? {
        table: holderTable,
        id: holderRow.id,
        column: HOLDER_COLUMN[role],
        legoId: item.legoId || null,
        currentAudioId: holderRow[HOLDER_COLUMN[role]] || null,
      } : null

      // ENGLISH SIDE. An intro cycle plays the presentation line instead of a
      // bare known clip — that is why the English count is 97 + 10, not 107.
      if (item.type === 'intro') {
        const pres = presRows.get(item.legoId)
        if (pres?.text) {
          const clip = addPlay({
            role: 'presentation',
            language: course.known_lang,
            voiceId: voices.presentation || voices.known,
            text: pres.text,
          }, holderFor('presentation'), round.roundNumber)
          if (clip) clip.legoId = item.legoId
        } else {
          // Recorded, not skipped: phase8 /generate authors intro text, so this
          // is a real piece of missing work and the plan must say so.
          const key = `presentation|MISSING_TEXT|${item.legoId}`
          if (!clips.has(key)) {
            clips.set(key, {
              clipKey: key,
              role: 'presentation',
              language: course.known_lang,
              voiceId: voices.presentation || voices.known,
              text: null,
              legoId: item.legoId,
              plays: 0,
              roundsUsedIn: [],
              holders: [holderFor('presentation')].filter(Boolean),
              currentAudioIds: [],
              blocked: 'no authored presentation text for this LEGO — phase 8 /generate authors intro text; run it for this scope first',
            })
          }
          const c = clips.get(key)
          c.plays++
          if (!c.roundsUsedIn.includes(round.roundNumber)) c.roundsUsedIn.push(round.roundNumber)
        }
      } else {
        addPlay({
          role: 'known',
          language: course.known_lang,
          voiceId: voices.known,
          text: item.known_text,
        }, holderFor('known'), round.roundNumber)
      }

      // TARGET SIDE. Every cycle plays both speeds, always.
      addPlay({
        role: 'target1',
        language: course.target_lang,
        voiceId: voices.target1,
        text: item.target_text,
      }, holderFor('target1'), round.roundNumber)

      addPlay({
        role: 'target2',
        language: course.target_lang,
        voiceId: voices.target2 || voices.target1,
        text: item.target_text,
      }, holderFor('target2'), round.roundNumber)
    }
  }

  shape.clipPlays = [...clips.values()].reduce((n, c) => n + c.plays, 0)
  shape.distinctClips = clips.size

  logger.info(
    `${courseCode} rounds ${fromRound}-${roundCount}: ${shape.cycles} cycles, ${shape.clipPlays} clip plays, ${shape.distinctClips} distinct clips`
  )

  return { clips, shape, voices, course }
}

/** Paged .in() fetch — Supabase caps a single IN list, and courses are large. */
async function fetchIn(supabase, table, select, courseCode, column, values, chunk = 200) {
  const out = []
  for (let i = 0; i < values.length; i += chunk) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('course_code', courseCode)
      .in(column, values.slice(i, i + chunk))
    if (error) throw new Error(`fetch ${table}.${column}: ${error.message}`)
    out.push(...(data || []))
  }
  return out
}

/**
 * Presentation text per LEGO. Read by lego_id (indexed:
 * idx_course_audio_lego), never by a bare course_code scan — a course_code-only
 * query on a 52k-row course is the shape that times out.
 */
async function fetchPresentationTexts(supabase, courseCode, legoIds, chunk = 200) {
  const out = new Map()
  for (let i = 0; i < legoIds.length; i += chunk) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, lego_id, text, s3_key, voice_id, language, created_at, origin')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .in('lego_id', legoIds.slice(i, i + chunk))
    if (error) throw new Error(`fetch presentation texts: ${error.message}`)
    for (const row of (data || [])) {
      if (!row.lego_id) continue
      const prev = out.get(row.lego_id)
      // A real render beats a pending text-only row; otherwise newest wins.
      const rowReal = row.s3_key && !row.s3_key.startsWith('pending/')
      const prevReal = prev?.s3_key && !prev.s3_key.startsWith('pending/')
      if (!prev || (rowReal && !prevReal) || (rowReal === prevReal && (row.created_at || '') > (prev.created_at || ''))) {
        out.set(row.lego_id, row)
      }
    }
  }
  return out
}

// ===========================================================================
// STEP 2 — DOES THIS VOICE x TEXT x LANGUAGE ALREADY EXIST?
// ===========================================================================

/**
 * Look up reuse candidates for a batch of clips, estate-wide.
 *
 * Query shape matters here. course_audio cannot be scanned by course_code on a
 * 52k-row course without a statement timeout; the fast path is the
 * (text_normalized, language) index, which is exactly the shape of this
 * question. We ask by text candidates + language and filter voice/role in JS,
 * so one round trip covers a batch and no query is ever unbounded.
 *
 * @returns {Promise<Map<string, object[]>>} clipKey -> candidate rows
 */
async function findCandidates(supabase, clips, { batchSize = 100 } = {}) {
  const list = [...clips.values()].filter(c => c.text)
  const byNormText = new Map() // normalized text -> clipKeys wanting it
  const allTexts = new Set()

  for (const clip of list) {
    for (const cand of audioKeyCandidates(clip.text)) {
      allTexts.add(cand)
      if (!byNormText.has(cand)) byNormText.set(cand, new Set())
      byNormText.get(cand).add(clip.clipKey)
    }
  }

  const texts = [...allTexts]
  const rowsByText = new Map()
  for (let i = 0; i < texts.length; i += batchSize) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, word_boundaries, created_at, audio_revision')
      .in('text_normalized', texts.slice(i, i + batchSize))
    if (error) throw new Error(`reuse lookup: ${error.message}`)
    for (const row of (data || [])) {
      const k = row.text_normalized
      if (!rowsByText.has(k)) rowsByText.set(k, [])
      rowsByText.get(k).push(row)
    }
  }

  const out = new Map()
  for (const clip of list) {
    const seen = new Set()
    const rows = []
    for (const cand of audioKeyCandidates(clip.text)) {
      for (const row of (rowsByText.get(cand) || [])) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        rows.push(row)
      }
    }
    out.set(clip.clipKey, rows)
  }
  return out
}

/**
 * Decide what happens to one clip, given every course_audio row that says the
 * same words. PURE — no I/O, so the rules below are unit-testable and the
 * "never cross a voice boundary" guarantee is provable rather than asserted.
 *
 * Decisions:
 *   SATISFIED   every holder already points at a row on the right voice
 *   REUSE_OWN   such a row exists in THIS course; some holder does not point at it
 *   REUSE_CROSS such a row exists in ANOTHER course; copy it in, no TTS
 *   RENDER      nothing anywhere says this in this voice — genuinely missing
 *   BLOCKED     cannot be decided; `reason` says why
 */
function decideClip(clip, candidates, opts = {}) {
  const {
    courseCode,
    crossRole = true,           // Tom's key is voice x text x language and nothing else
    voiceAliases = [],
    languageFilter = null,      // from buildLanguageNameFilter()
    preferredSourceCourses = [],// e.g. ['deu_for_eng'] — queried first, not as an afterthought
    rebuild = false,            // force a fresh render of every clip (Tom's ruling)
    freshRoles = [],            // roles that may never BORROW from another course
    // THIS COURSE'S OWN CLIPS ARE NOT A SOURCE (Tom, 2026-08-08 02:02Z):
    // "we are not checking any internal clips first from French or German ...
    // because we KNOW that both French and German are bobbins. all French and
    // German clips in the current courses are being wiped and replaced —
    // either from other courses contributions to the pool, or by regeneration."
    //
    // The damage is OURS, not the TTS provider's: until 2026-08-05 masterAudio
    // called audioProcessor.repairTailDefect, which trimmed at the tail
    // detector's timestamp and re-padded. The detector cannot tell a tail click
    // from a natural mid-sentence pause, so the trim ate every word after the
    // pause — that is how deu_for_eng shipped "Ich will jetzt mit dir Deutsch
    // sprechen" without "sprechen". Reusing those clips re-imports the damage.
    //
    // So this is a DATE, not a boolean. A row written after that path was
    // deleted ships exactly as rendered and is not suspect; only rows that
    // could have been through the mutation are. Making it a date is also what
    // keeps a banded overnight run IDEMPOTENT — a blanket "never trust own"
    // would re-render this run's own fresh output every time a band restarted,
    // re-buying the whole course on each resume.
    distrustOwnBefore = null,   // ISO date; own rows older than this are not a source
    ownRevisedSince = null,     // Set of audio ids re-rendered in place since that date
  } = opts

  // created_at is NOT sufficient on its own: an in-place swap bumps
  // audio_revision and writes a history row but deliberately leaves created_at
  // alone (the row was not created again). So a clip re-rendered tonight still
  // carries its original date, and a date-only test would distrust it forever.
  const ownRowIsTrusted = (row) => {
    if (!distrustOwnBefore) return true
    if (row.created_at && String(row.created_at) >= distrustOwnBefore) return true
    return !!(ownRevisedSince && ownRevisedSince.has(row.id))
  }

  if (clip.blocked) {
    return { decision: 'BLOCKED', reason: clip.blocked, source: null, viaAlias: false }
  }
  if (!clip.voiceId) {
    return { decision: 'BLOCKED', reason: `no voice configured for role ${clip.role}`, source: null, viaAlias: false }
  }
  if (!isSayable(clip.text)) {
    return { decision: 'BLOCKED', reason: 'text is empty or punctuation-only — nothing to say', source: null, viaAlias: false }
  }

  // THE LANGUAGE-NAME FILTER, on the clip's OWN text first. A contaminated text
  // already sitting in this course is the case exact matching cannot catch, so
  // it is surfaced rather than quietly rendered in the wrong words.
  if (languageFilter) {
    const named = languageFilter.namedLanguage(clip.text)
    if (named) {
      return {
        decision: 'BLOCKED',
        reason: `this course's own text names the language "${named}", which is not a language of ${courseCode} — the text is wrong, not the audio`,
        source: null, viaAlias: false, namedLanguage: named,
      }
    }
  }

  // THE VOICE BOUNDARY. Enforced first and unconditionally: a row that is not
  // on this clip's voice is not a candidate for anything, whatever else is true
  // about it. Borrowing across a voice change is a voice-identity change, which
  // is Tom's taste call and never this code's.
  const viable = []
  const rejected = { voice: 0, language: 0, role: 0, pending: 0, languageName: 0, foreignIntro: 0 }
  for (const row of candidates) {
    const v = voicesMatch(clip.voiceId, row.voice_id, voiceAliases)
    if (!v.match) { rejected.voice++; continue }
    if (!sameLanguage(clip.language, row.language)) { rejected.language++; continue }
    if (!row.s3_key || row.s3_key.startsWith('pending/')) { rejected.pending++; continue }
    // Role-agnostic by default. The ONE exception is physical, not editorial:
    // Azure bakes speed into the MP3 and course_audio does not persist it, so a
    // cross-role Azure borrow could import a 0.85x render into a 1.0x slot.
    if (row.role !== clip.role) {
      if (!crossRole || !isSpeedTrustedVoice(row.voice_id)) { rejected.role++; continue }
    }
    // A candidate naming a foreign language never enters, whatever course or
    // role it came from — an eng_for_hin line saying "The Hindi for ..." is an
    // English clip on the right voice and would otherwise match.
    if (languageFilter && languageFilter.namedLanguage(row.text)) { rejected.languageName++; continue }
    // INTROS ARE NEVER BORROWED. Tom, 2026-08-07, on carrying the French run's
    // clone English into deu_for_eng: reuse the pooled known lines, but
    // "intros ALWAYS rendered fresh, never reused". A presentation line names
    // the target language, so a borrowed one is a course-identity error the
    // language-name filter only catches when the name is spelled out. This
    // closes it structurally: a fresh role may still be SATISFIED by this
    // course's OWN existing row (re-running a range must not re-buy audio),
    // but it can never be copied in from anywhere else.
    if (freshRoles.includes(clip.role) && row.course_code !== courseCode) { rejected.foreignIntro++; continue }
    viable.push({ ...row, viaAlias: v.viaAlias })
  }

  if (!viable.length && rebuild) {
    return { decision: 'REBUILD', reason: 'rebuild: nothing exists yet — render creates the row', source: null, viaAlias: false }
  }

  if (!viable.length) {
    const why = []
    if (rejected.voice) why.push(`${rejected.voice} on another voice`)
    if (rejected.language) why.push(`${rejected.language} in another language`)
    if (rejected.role) why.push(`${rejected.role} blocked by the Azure baked-speed guard`)
    if (rejected.languageName) why.push(`${rejected.languageName} naming a foreign language`)
    if (rejected.foreignIntro) why.push(`${rejected.foreignIntro} in another course (intros are never borrowed)`)
    if (rejected.pending) why.push(`${rejected.pending} with no rendered audio`)
    return {
      decision: 'RENDER',
      reason: candidates.length
        ? `${candidates.length} clip(s) say this, none usable — ${why.join(', ')}`
        : 'no clip anywhere says this',
      source: null, viaAlias: false, rejected,
    }
  }

  // Preference order:
  //   1. this course's own row (no copy needed, just a link);
  //   2. a course the caller named as a preferred source — Tom asked for
  //      deu_for_eng to be queried FIRST for the English layer, not to be found
  //      by luck behind a generic estate sweep;
  //   3. an exact-voice row over an aliased one;
  //   4. the standard link preference (human > newest > deterministic id).
  // Own rows that predate the post-processing fix are removed from the SOURCE
  // pool but stay eligible as the swap target below, so make-before-break still
  // holds: the fresh render publishes into the same row id and no holder FK
  // ever moves. Distrust changes where a clip may come FROM, never whether the
  // course keeps pointing at something real.
  const ownAll = viable.filter(r => r.course_code === courseCode)
  const own = ownAll.filter(ownRowIsTrusted)
  const ownDistrusted = ownAll.length - own.length
  let pool = own
  if (!pool.length && preferredSourceCourses.length) {
    for (const pref of preferredSourceCourses) {
      const hit = viable.filter(r => r.course_code === pref)
      if (hit.length) { pool = hit; break }
    }
  }
  // The fallback pool must also exclude the distrusted own rows, or a clip with
  // no foreign candidate would quietly fall back onto the very row the policy
  // just rejected and report it as a reuse.
  const sourceable = viable.filter(r => r.course_code !== courseCode || ownRowIsTrusted(r))
  if (!pool.length) pool = sourceable

  // Nothing left to source from — every candidate was one of this course's own
  // distrusted rows. Render fresh, and swap into the best own row so the course
  // never points at nothing for an instant.
  if (!pool.length) {
    const ownPool = (ownAll.filter(r => !r.viaAlias).length ? ownAll.filter(r => !r.viaAlias) : ownAll)
    const ownRow = ownPool.length ? ownPool.reduce((best, r) => pickPreferredAudioRow(best, r), null) : null
    return {
      decision: 'RENDER',
      reason: ownRow
        ? `own clip distrusted (predates the 2026-08-05 post-processing fix); re-rendering fresh into row ${ownRow.id} as revision ${(ownRow.audio_revision ?? 1) + 1}`
        : 'own clip distrusted (predates the 2026-08-05 post-processing fix); no usable row anywhere',
      source: ownRow
        ? { audioId: ownRow.id, courseCode, s3Key: ownRow.s3_key, voiceId: ownRow.voice_id,
            role: ownRow.role, language: ownRow.language, durationMs: ownRow.duration_ms || null,
            wordBoundaries: ownRow.word_boundaries || null, text: ownRow.text,
            createdAt: ownRow.created_at, origin: ownRow.origin,
            swapTargetAudioId: ownRow.id, currentRevision: ownRow.audio_revision ?? 1 }
        : null,
      viaAlias: false,
      ownDistrusted,
    }
  }

  const exact = pool.filter(r => !r.viaAlias)
  const finalPool = exact.length ? exact : pool
  const winner = finalPool.reduce((best, r) => pickPreferredAudioRow(best, r), null)

  const source = {
    audioId: winner.id,
    courseCode: winner.course_code,
    s3Key: winner.s3_key,
    voiceId: winner.voice_id,
    role: winner.role,
    language: winner.language,
    durationMs: winner.duration_ms || null,
    wordBoundaries: winner.word_boundaries || null,
    text: winner.text,
    createdAt: winner.created_at,
    origin: winner.origin,
  }

  // REBUILD — Tom's ruling: every clip in scope is re-rendered fresh on the
  // chosen voice, whatever already exists. The existing OWN row is carried as
  // the swap target: the render publishes into that same row id with a bumped
  // audio_revision, so no holder FK ever moves and the course cannot reference
  // a missing clip at any instant. If there is no own row, it is a plain
  // RENDER that creates one.
  if (rebuild) {
    // The swap target must be chosen with the SAME preference as a reuse — an
    // exact voice-id match beats an era-crossing one, then human > newest >
    // deterministic id. A bare `.find()` here took whichever own row happened
    // to come back first, which on 2026-08-07 pointed one clip at the legacy
    // `eve` row while its 52 siblings sat on `xai_eve`. Same voice under Tom's
    // ruling, so nothing shipped wrong — but the target must be deterministic.
    const ownRows = viable.filter(r => r.course_code === courseCode)
    const exactOwn = ownRows.filter(r => !r.viaAlias)
    const ownPool = exactOwn.length ? exactOwn : ownRows
    const ownRow = ownPool.length ? ownPool.reduce((best, r) => pickPreferredAudioRow(best, r), null) : null
    return {
      decision: 'REBUILD',
      reason: ownRow
        ? `rebuild: re-render fresh and swap into row ${ownRow.id} as revision ${(ownRow.audio_revision ?? 1) + 1}`
        : 'rebuild: no existing row in this course — render creates one',
      source: ownRow ? { ...source, swapTargetAudioId: ownRow.id, currentRevision: ownRow.audio_revision ?? 1 } : null,
      viaAlias: false,
    }
  }

  if (own.length) {
    const holdersPointingAtIt = clip.holders.filter(h => h.currentAudioId === winner.id).length
    if (clip.holders.length && holdersPointingAtIt === clip.holders.length) {
      return { decision: 'SATISFIED', reason: `already linked to ${winner.id}`, source, viaAlias: winner.viaAlias }
    }
    return {
      decision: 'REUSE_OWN',
      reason: `this course already owns a matching clip; ${clip.holders.length - holdersPointingAtIt} of ${clip.holders.length} holder(s) point elsewhere`,
      source,
      viaAlias: winner.viaAlias,
    }
  }

  return {
    decision: 'REUSE_CROSS',
    reason: `same voice, text and language already rendered in ${winner.course_code}`,
    source,
    viaAlias: winner.viaAlias,
  }
}

/**
 * The whole read-only plan: enumerate, look up, decide. Generates nothing,
 * writes nothing, and is safe to run at any time.
 */
async function buildReusePlan(supabase, courseCode, roundCount, options = {}) {
  const { crossRole = true, voiceAliases = [], mode, codeService = null,
          preferredSourceCourses = [], rebuild = false, freshRoles = [], fromRound = 1,
          distrustOwnBefore = null } = options

  const { clips, shape, voices, course } = await enumerateRoundClips(
    supabase, courseCode, roundCount, { crossRole: false, mode, fromRound }
  )
  const { knownName, targetName } = courseLanguageNames(course, codeService)
  const languageFilter = buildLanguageNameFilter({ knownName, targetName })

  const candidates = await findCandidates(supabase, clips)

  // Which of this course's own rows have been RE-RENDERED IN PLACE since the
  // cutoff. The swap path bumps audio_revision and writes a history row but
  // leaves created_at alone, so without this a clip re-rendered by tonight's
  // own run still looks old and would be bought again on every band restart.
  let ownRevisedSince = null
  if (distrustOwnBefore) {
    ownRevisedSince = new Set()
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('course_audio_revisions')
        .select('audio_id')
        .eq('course_code', courseCode)
        .gte('created_at', distrustOwnBefore)
        // ORDER IS LOAD-BEARING. .range() paging without a stable sort lets
        // PostgREST return rows in arbitrary order per page, so pages overlap
        // and rows are silently skipped — the set comes back INCOMPLETE and
        // non-deterministically so. Measured 2026-08-08: the same course, with
        // nothing rendered in between, planned 3,750 clips as distrusted on one
        // run and 0 on the next. Under-reading this set is safe in the sense
        // that it only re-renders clips that did not need it, but it wastes
        // money and it makes verification meaningless.
        .order('audio_id')
        .range(from, from + PAGE - 1)
      if (error) throw new Error(`revisions since ${distrustOwnBefore}: ${error.message}`)
      for (const r of data || []) ownRevisedSince.add(r.audio_id)
      if (!data || data.length < PAGE) break
    }
  }

  const decided = []
  for (const clip of clips.values()) {
    const d = decideClip(clip, candidates.get(clip.clipKey) || [], {
      courseCode, crossRole, voiceAliases, languageFilter, preferredSourceCourses, rebuild, freshRoles,
      distrustOwnBefore, ownRevisedSince,
    })
    decided.push({
      clipKey: clip.clipKey,
      role: clip.role,
      language: clip.language,
      voiceId: clip.voiceId,
      text: clip.text,
      legoId: clip.legoId || null,
      plays: clip.plays,
      roundsUsedIn: clip.roundsUsedIn.slice().sort((a, b) => a - b),
      holders: clip.holders,
      currentAudioIds: [...new Set(clip.currentAudioIds)],
      decision: d.decision,
      reason: d.reason,
      viaVoiceAlias: d.viaAlias,
      namedLanguage: d.namedLanguage || null,
      // Provenance Tom asked for by name: which course AND which role each
      // reused clip came from, so "N clips came in from eng_for_hin target2"
      // is a number he can read rather than an assertion he must trust.
      reuseFrom: d.source ? { courseCode: d.source.courseCode, role: d.source.role, crossedRole: d.source.role !== clip.role } : null,
      reuseSource: d.source,
    })
  }

  // RENDER-bucket order is the order a human wants to read it: by round, then
  // role, so "what is missing early" is the top of the list.
  decided.sort((a, b) => {
    const ar = a.roundsUsedIn[0] ?? 999, br = b.roundsUsedIn[0] ?? 999
    if (ar !== br) return ar - br
    return CLIP_ROLES.indexOf(a.role) - CLIP_ROLES.indexOf(b.role)
  })

  const summary = { total: decided.length, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, blocked: 0 }
  for (const c of decided) {
    if (c.decision === 'SATISFIED') summary.satisfied++
    else if (c.decision === 'REUSE_OWN') summary.reuseOwn++
    else if (c.decision === 'REUSE_CROSS') summary.reuseCross++
    else if (c.decision === 'RENDER') summary.render++
    else summary.blocked++
  }

  const toRender = decided.filter(c => c.decision === 'RENDER' || c.decision === 'REBUILD')
  const characters = toRender.reduce((n, c) => n + (c.text ? c.text.length : 0), 0)

  const byLayer = {}
  for (const c of decided) {
    byLayer[c.role] = byLayer[c.role] || { total: 0, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, blocked: 0 }
    byLayer[c.role].total++
    const k = { SATISFIED: 'satisfied', REUSE_OWN: 'reuseOwn', REUSE_CROSS: 'reuseCross', RENDER: 'render', BLOCKED: 'blocked' }[c.decision]
    byLayer[c.role][k]++
  }

  return {
    ok: true,
    courseCode,
    rounds: roundCount,
    fromRound,
    generatedAt: new Date().toISOString(),
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    voices,
    voiceAliases,
    crossRole,
    freshRoles,
    shape,
    summary,
    byLayer,
    estimate: {
      renderClips: toRender.length,
      characters,
      note: 'characters are of the course text as it will be sent to TTS, before any gender expansion',
    },
    clips: decided,
  }
}

// ===========================================================================
// STEP 2b — THE COVERAGE TABLE
// ===========================================================================
//
// Tom, 2026-08-07: "Voice selection is COVERAGE-DRIVEN, not fixed up front."
//
// For EACH candidate voice, what fraction of the clips these rounds need
// ALREADY EXISTS estate-wide on that voice? The voice with the most existing
// coverage is the cheapest to finish, and the table is the evidence on which
// Tom makes the one-word call. It is a deliverable, not a log line.
//
// Two properties the table lives or dies by:
//   - it is computed on the SAME widened key as reuse (voice x text x language,
//     all courses, all roles). Role-scoping it drops the clone's English
//     coverage on fra_for_eng rounds 1-10 from 32 clips to 3, which would make
//     the table argue against the very voice the widening exists to find;
//   - the language-name filter applies INSIDE it. A deu_for_eng text containing
//     "German" is not coverage for a French course, and counting it would
//     inflate the exact number the decision rests on.

/** Group bare and provider-prefixed spellings of one voice into a family. */
function voiceFamilyOf(voiceId, voiceAliases = []) {
  if (!voiceId) return { family: 'unknown', ids: [] }
  for (const group of voiceAliases) {
    if (group.includes(voiceId)) return { family: group.join(' / '), ids: [...group] }
  }
  // Family = the voice, across provider-migration eras. Tom ruled the bare and
  // prefixed spellings are one voice, so this grouping is now the truth rather
  // than a display convenience, and it carries his label for the voice.
  return { family: voiceLabel(voiceId), ids: [voiceId] }
}

/**
 * Compute the coverage table for the first `roundCount` rounds of a course.
 *
 * Read-only. Generates nothing, writes nothing, costs nothing.
 */
async function buildCoverageTable(supabase, courseCode, roundCount, options = {}) {
  const {
    voiceAliases = [],
    codeService = null,
    preferredSourceCourses = [],
    layers = CLIP_ROLES,
    fromRound = 1,
  } = options

  const { clips, shape, voices, course } = await enumerateRoundClips(
    supabase, courseCode, roundCount, { crossRole: false, fromRound }
  )

  const { knownName, targetName } = courseLanguageNames(course, codeService)
  const languageFilter = buildLanguageNameFilter({ knownName, targetName })

  // The distinct (text, language) combinations these rounds need, per layer.
  // Voice is deliberately NOT part of this — the whole question is which voice
  // to put them in.
  const needed = []
  const excludedByName = []
  for (const clip of clips.values()) {
    if (!layers.includes(clip.role) || !isSayable(clip.text)) continue
    const named = languageFilter.namedLanguage(clip.text)
    if (named) {
      excludedByName.push({ text: clip.text, namedLanguage: named, sourceCourse: courseCode, role: clip.role })
      continue
    }
    needed.push({ role: clip.role, language: clip.language, text: clip.text })
  }

  const candidates = await findCandidates(supabase, new Map(
    needed.map((n, i) => [`n${i}`, { clipKey: `n${i}`, text: n.text }])
  ))

  // Tally: voiceId -> per-layer set of covered texts, plus provenance.
  const tally = new Map()
  let excludedCandidateRows = 0

  needed.forEach((n, i) => {
    const rows = candidates.get(`n${i}`) || []
    const key = `${n.role}|${normalizeForAudio(n.text)}`
    for (const row of rows) {
      if (!sameLanguage(n.language, row.language)) continue
      if (!row.s3_key || row.s3_key.startsWith('pending/')) continue
      if (languageFilter.namedLanguage(row.text)) { excludedCandidateRows++; continue }
      // Role-agnostic, with the same Azure baked-speed guard reuse uses, so the
      // table never promises coverage reuse would then refuse to take.
      if (row.role !== n.role && !isSpeedTrustedVoice(row.voice_id)) continue

      let t = tally.get(row.voice_id)
      if (!t) {
        t = {
          voiceId: row.voice_id,
          byLayer: {},
          covered: new Set(),
          borrowable: new Set(),
          viaTargetRoles: new Set(),
          sourceCourses: new Map(),
        }
        tally.set(row.voice_id, t)
      }
      t.byLayer[n.role] = t.byLayer[n.role] || new Set()
      t.byLayer[n.role].add(key)
      t.covered.add(key)
      if (row.course_code !== courseCode) t.borrowable.add(key)
      if (row.role === 'target1' || row.role === 'target2') t.viaTargetRoles.add(key)
      const sc = t.sourceCourses.get(row.course_code) || new Set()
      sc.add(key)
      t.sourceCourses.set(row.course_code, sc)
    }
  })

  const neededByLayer = {}
  for (const n of needed) {
    neededByLayer[n.role] = neededByLayer[n.role] || { language: n.language, needed: 0 }
    neededByLayer[n.role].needed++
  }

  const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0)
  const totalNeeded = needed.length

  // Per-voice-id detail, kept for auditing. The headline `coverage` array below
  // is FAMILY-level, because that is the unit a voice decision is made in: a
  // reader choosing "Eve" does not care that the estate spells her two ways.
  const perVoiceId = [...tally.values()].map(t => {
    const byLayer = {}
    for (const [role, info] of Object.entries(neededByLayer)) {
      const cov = t.byLayer[role]?.size || 0
      byLayer[role] = { needed: info.needed, covered: cov, pct: pct(cov, info.needed) }
    }
    const fam = voiceFamilyOf(t.voiceId, voiceAliases)
    return {
      voiceId: t.voiceId,
      voiceFamily: fam.family,
      provider: /^(xai|azure|elevenlabs|google)_/.exec(t.voiceId)?.[1] || 'legacy/bare',
      speedTrusted: isSpeedTrustedVoice(t.voiceId),
      byLayer,
      overall: { needed: totalNeeded, covered: t.covered.size, pct: pct(t.covered.size, totalNeeded) },
      borrowable: t.borrowable.size,
      viaTargetRoles: t.viaTargetRoles.size,
      topSourceCourses: [...t.sourceCourses.entries()]
        .map(([courseCode, set]) => ({ courseCode, clips: set.size }))
        .sort((a, b) => b.clips - a.clips)
        .slice(0, 10),
      isCurrent: Object.values(voices).includes(t.voiceId),
      _covered: t.covered,
    }
  }).sort((a, b) => b.overall.covered - a.overall.covered)

  // FAMILY ROLL-UP — the headline table. Every set is UNIONED, never summed:
  // the same text covered by both `eve` and `xai_eve` is one covered clip, not
  // two, and summing would silently overstate the number the voice decision
  // rests on. Note this shows what the numbers BECOME if a bare id and its
  // prefixed sibling are one voice; whether they are is Tom's call, so the
  // per-id truth stays available in `coverageByVoiceId`.
  const families = new Map()
  for (const t of tally.values()) {
    const famName = voiceFamilyOf(t.voiceId, voiceAliases).family
    let f = families.get(famName)
    if (!f) {
      f = {
        voiceFamily: famName, voiceIds: [], providers: new Set(),
        byLayer: {}, covered: new Set(), borrowable: new Set(),
        viaTargetRoles: new Set(), sourceCourses: new Map(), isCurrent: false,
        speedTrusted: false,
      }
      families.set(famName, f)
    }
    f.voiceIds.push(t.voiceId)
    f.providers.add(/^(xai|azure|elevenlabs|google)_/.exec(t.voiceId)?.[1] || 'legacy/bare')
    f.speedTrusted = f.speedTrusted || isSpeedTrustedVoice(t.voiceId)
    if (Object.values(voices).includes(t.voiceId)) f.isCurrent = true
    for (const k of t.covered) f.covered.add(k)
    for (const k of t.borrowable) f.borrowable.add(k)
    for (const k of t.viaTargetRoles) f.viaTargetRoles.add(k)
    for (const [role, set] of Object.entries(t.byLayer)) {
      f.byLayer[role] = f.byLayer[role] || new Set()
      for (const k of set) f.byLayer[role].add(k)
    }
    for (const [cc, set] of t.sourceCourses) {
      const dest = f.sourceCourses.get(cc) || new Set()
      for (const k of set) dest.add(k)
      f.sourceCourses.set(cc, dest)
    }
  }

  const coverage = [...families.values()].map(f => {
    const byLayer = {}
    for (const [role, info] of Object.entries(neededByLayer)) {
      const cov = f.byLayer[role]?.size || 0
      byLayer[role] = { needed: info.needed, covered: cov, pct: pct(cov, info.needed) }
    }
    return {
      voiceFamily: f.voiceFamily,
      voiceIds: f.voiceIds.slice().sort(),
      provider: [...f.providers].sort().join(' / '),
      speedTrusted: f.speedTrusted,
      byLayer,
      overall: { needed: totalNeeded, covered: f.covered.size, pct: pct(f.covered.size, totalNeeded) },
      borrowable: f.borrowable.size,
      viaTargetRoles: f.viaTargetRoles.size,
      topSourceCourses: [...f.sourceCourses.entries()]
        .map(([courseCode, set]) => ({ courseCode, clips: set.size }))
        .sort((a, b) => b.clips - a.clips)
        .slice(0, 10),
      isCurrent: f.isCurrent,
      _covered: f.covered,
    }
  }).sort((a, b) => b.overall.covered - a.overall.covered)

  const familyRollup = coverage.map(r => ({
    voiceFamily: r.voiceFamily, voiceIds: r.voiceIds, overall: r.overall,
  }))

  for (const row of coverage) delete row._covered
  for (const row of perVoiceId) delete row._covered

  const best = coverage[0]
  const gap = totalNeeded - (best?.overall.covered || 0)
  // Characters of the clips the winner does NOT cover — an approximation
  // proportional to the gap, because the per-text covered set is not retained
  // past this point. Labelled as such in the payload rather than dressed up.
  const avgChars = needed.length ? needed.reduce((a, n) => a + n.text.length, 0) / needed.length : 0
  const gapChars = Math.round(gap * avgChars)

  return {
    ok: true,
    courseCode,
    rounds: roundCount,
    generatedAt: new Date().toISOString(),
    shape,
    currentVoices: voices,
    layers: neededByLayer,
    languageFilter: {
      applied: true,
      allowedLanguageNames: languageFilter.allowed,
      excludedTexts: excludedByName.length,
      excludedExamples: excludedByName.slice(0, 10),
      excludedCandidateRows,
      note: 'a text may name this course\'s own known or target language and no other; candidates naming any other language are excluded from coverage and from reuse',
    },
    coverage,
    coverageByVoiceId: perVoiceId,
    familyRollup,
    recommendation: best ? {
      voiceFamily: best.voiceFamily,
      voiceIds: best.voiceIds,
      coveredPct: best.overall.pct,
      reason: `${best.overall.covered} of ${totalNeeded} needed clips already exist on this voice`,
      spendIfChosen: { renderClips: gap, characters: gapChars, charactersApproximate: true },
    } : null,
  }
}

// ===========================================================================
// STEP 3 — VERIFY THE BYTES, NOT THE ROW
// ===========================================================================

/**
 * A course_audio row is a CLAIM about audio; only storage settles it. Ask S3
 * whether every clip this plan says is fine actually exists and has bytes.
 *
 * `headObject(s3Key)` is injected so this stays testable and so the caller owns
 * the S3 client (phase8 already has a socket-bounded one). It must resolve to
 * { exists: boolean, size: number|null } and must NEVER throw for a missing
 * object — a thrown/failed question is reported as `unknown`, never as missing.
 * Reading a failed question as "the file is gone" is how a repair pass turns
 * into a purge.
 *
 * Mutates the plan in place, adding `bytes` to each clip, and returns a summary.
 */
async function verifyPlanBytes(plan, { headObject, concurrency = 8, minBytes = 1024 } = {}) {
  const targets = []
  for (const clip of plan.clips) {
    // What will the learner actually fetch once this plan is applied?
    const s3Key = clip.reuseSource?.s3Key || null
    if (!s3Key) { clip.bytes = { checked: false, reason: clip.decision === 'RENDER' ? 'not rendered yet' : 'no s3 key' }; continue }
    targets.push({ clip, s3Key })
  }

  const summary = { checked: 0, alive: 0, missing: 0, tiny: 0, unknown: 0 }
  let cursor = 0
  const worker = async () => {
    while (cursor < targets.length) {
      const { clip, s3Key } = targets[cursor++]
      let res
      try {
        res = await headObject(s3Key)
      } catch (e) {
        res = { exists: null, size: null, error: e.message }
      }
      summary.checked++
      if (res.exists === null) { clip.bytes = { checked: true, state: 'unknown', reason: res.error || 'could not ask storage' }; summary.unknown++ }
      else if (!res.exists) { clip.bytes = { checked: true, state: 'missing', s3Key }; summary.missing++ }
      else if ((res.size || 0) < minBytes) { clip.bytes = { checked: true, state: 'tiny', size: res.size, s3Key }; summary.tiny++ }
      else { clip.bytes = { checked: true, state: 'alive', size: res.size, s3Key }; summary.alive++ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, targets.length)) }, worker))

  // A clip whose bytes are missing or tiny is not satisfied, whatever the row
  // says. Promote it to RENDER so the plan tells the truth.
  for (const clip of plan.clips) {
    if (clip.bytes?.state === 'missing' || clip.bytes?.state === 'tiny') {
      if (clip.decision !== 'RENDER') {
        clip.decisionBeforeByteCheck = clip.decision
        clip.decision = 'RENDER'
        clip.reason = `${clip.reason}; but the stored object is ${clip.bytes.state} — the row is a claim the bytes do not support`
        clip.reuseSource = null
      }
    }
  }
  recountPlan(plan)
  plan.bytes = summary
  return summary
}

/**
 * LISTEN to every clip this plan intends to keep, and promote the damaged ones
 * to RENDER.
 *
 * `verifyPlanBytes` asks whether an object exists. This asks whether it says
 * what the COURSE says it should say. Those are different questions, and the
 * fra_for_eng damage of 2026-08-07 lived in the gap between them: the rows were
 * right, the objects were alive, and roughly one clip in three had simply lost
 * its final word (Tom, listening: "the final word is wholly missing and the
 * clip ends in a gap").
 *
 * The expected text is `clip.text` — the ROUND GENERATOR's text, i.e. what the
 * course says the learner should hear. Never `course_audio.text`, and never the
 * clip's own transcript: a clip rendered from a wrong stored text passes every
 * self-referential check ever written while the course stays broken.
 *
 * `fetchObject(s3Key) -> Buffer` and the veracity module are injected so the
 * caller owns the S3 client and this file stays testable. A check that cannot
 * be made (whisper missing, download failed) is recorded as `unknown` and
 * NEVER treated as a failure — an unanswerable question must not trigger a
 * re-render, the same rule verifyPlanBytes follows for missing objects.
 *
 * `verdictCache` (optional, `{ get(key), set(key, verdict) }`) removes DUPLICATE
 * decodes. Whisper is the dominant cost of this whole exercise, and bands re-ask
 * the same question constantly: bands are disjoint in ROUNDS but not in CLIPS,
 * because review offsets reach back as far as 2584 rounds — measured 2026-08-07,
 * 35.7% of a rounds-201-210 plan is clips that rounds 1-200 also plays. Without a
 * cache every band re-listens to that overlap from scratch.
 *
 * The cache is correct BY CONSTRUCTION rather than by invalidation, which is why
 * it is safe to persist it across runs and across days: mastered/<uuid>.mp3 objects
 * are WRITE-ONCE (a re-master mints a new key and repoints the rows), so a given
 * s3Key names the same bytes forever. Keying on s3Key + expected text + language —
 * exactly the three inputs to checkAudioVeracity — means a cache hit is the answer
 * to the identical question, never a stale one. There is deliberately no TTL and no
 * invalidation path: adding one could only ever make it wrong.
 *
 * Omit it and behaviour is exactly as before — every clip is decoded.
 *
 * Mutates the plan in place, adding `heard` to each checked clip.
 */
async function verifyPlanVeracity(plan, { fetchObject, veracity, concurrency = 4, logger = console, verdictCache = null } = {}) {
  const KEEPING = new Set(['SATISFIED', 'REUSE_OWN', 'REUSE_CROSS'])
  const targets = []
  for (const clip of plan.clips) {
    if (!KEEPING.has(clip.decision)) continue
    const s3Key = clip.reuseSource?.s3Key
    if (s3Key) targets.push({ clip, s3Key })
  }

  const summary = { checked: 0, ok: 0, failed: 0, unknown: 0, cached: 0, byReason: {} }
  // The three inputs to the question, and nothing else. A NUL separator cannot
  // occur in an s3 key or in course text, so the parts can never run together
  // ambiguously the way a space or a pipe could.
  const cacheKey = (s3Key, clip) => `${s3Key}\u0000${clip.text}\u0000${clip.language}`
  let cursor = 0
  const worker = async () => {
    while (cursor < targets.length) {
      const { clip, s3Key } = targets[cursor++]
      let verdict
      const ck = cacheKey(s3Key, clip)
      const hit = verdictCache ? verdictCache.get(ck) : undefined
      if (hit !== undefined && hit !== null) {
        verdict = hit
        summary.cached++
      } else {
        try {
          const buf = await fetchObject(s3Key)
          verdict = await veracity.checkAudioVeracity(buf, clip.text, clip.language)
        } catch (e) {
          verdict = { pass: null, checked: false, reason: 'check_failed', detail: e.message }
        }
        // An UNANSWERABLE check is never cached: whisper missing or a download that
        // failed is a fact about this moment, not about the clip, and freezing it
        // would make a transient outage permanent.
        if (verdictCache && verdict.checked !== false) verdictCache.set(ck, verdict)
      }
      summary.checked++
      clip.heard = {
        checked: verdict.checked, pass: verdict.pass, reason: verdict.reason,
        cer: verdict.cer ?? null, decode: verdict.decode ?? null,
      }
      if (verdict.pass === false) {
        summary.failed++
        summary.byReason[verdict.reason] = (summary.byReason[verdict.reason] || 0) + 1
      } else if (verdict.pass === true) summary.ok++
      else summary.unknown++

      if (summary.checked % 200 === 0) {
        logger.info?.(`[ReuseFirst veracity] ${summary.checked}/${targets.length} listened — ${summary.failed} damaged`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, targets.length)) }, worker))

  for (const clip of plan.clips) {
    if (clip.heard?.pass === false) {
      clip.decisionBeforeVeracity = clip.decision
      clip.decision = 'RENDER'
      clip.reason = `${clip.reason}; but the audio is damaged (${clip.heard.reason}) — heard ${JSON.stringify(String(clip.heard.decode || '').slice(0, 60))}`
      clip.reuseSource = null
    }
  }
  recountPlan(plan)
  plan.heard = summary
  return summary
}

/** Recompute summary/byLayer/estimate after decisions change. */
function recountPlan(plan) {
  const summary = { total: plan.clips.length, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, rebuild: 0, blocked: 0 }
  const byLayer = {}
  const key = { SATISFIED: 'satisfied', REUSE_OWN: 'reuseOwn', REUSE_CROSS: 'reuseCross', RENDER: 'render', REBUILD: 'rebuild', BLOCKED: 'blocked' }
  for (const c of plan.clips) {
    summary[key[c.decision]]++
    byLayer[c.role] = byLayer[c.role] || { total: 0, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, rebuild: 0, blocked: 0 }
    byLayer[c.role].total++
    byLayer[c.role][key[c.decision]]++
  }
  const toRender = plan.clips.filter(c => c.decision === 'RENDER' || c.decision === 'REBUILD')
  plan.summary = summary
  plan.byLayer = byLayer
  plan.estimate = {
    renderClips: toRender.length,
    characters: toRender.reduce((n, c) => n + (c.text ? c.text.length : 0), 0),
    note: plan.estimate?.note || 'characters are of the course text as it will be sent to TTS, before any gender expansion',
  }
  return plan
}

// ===========================================================================
// STEP 4 — APPLY. MAKE BEFORE BREAK. NOTHING IS DELETED.
// ===========================================================================

/**
 * Apply a plan.
 *
 * Order is not negotiable and is the whole point of the module:
 *   1. every reuse target is PROVEN to have live bytes in storage;
 *   2. a course_audio row for THIS course is created if one is needed;
 *   3. only then is a holder FK repointed;
 *   4. RENDER work goes through the injected renderer, which is phase 8;
 *   5. nothing, ever, is deleted — not a row, not an object, not on this run
 *      and not "right after".
 *
 * Injected collaborators keep TTS/S3 out of this file:
 *   headObject(s3Key)   -> { exists, size }
 *   renderClip(clip)    -> { audioId, s3Key, durationMs } (phase 8 owns TTS)
 *   onProgress(evt)     -> optional progress sink
 */
async function applyReusePlan(supabase, plan, opts = {}) {
  const {
    headObject,
    renderClip,
    onProgress = () => {},
    dryRun = true,
    bumpStamp = true,
    // Clips are INDEPENDENT: distinct text x voice x language by construction,
    // distinct holder rows, and every write is its own statement. So the loop
    // is serial only by history, and on a 200-round scope that history costs
    // hours. Opt-in, default 1 — a caller that does not ask for concurrency
    // gets exactly the behaviour that has already been proven in production.
    concurrency = 1,
  } = opts
  const courseCode = plan.courseCode

  const log = {
    runId: opts.runId || null,
    courseCode,
    rounds: plan.rounds,
    fromRound: plan.fromRound ?? 1,
    dryRun,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    voices: plan.voices,
    shape: plan.shape,
    summaryBefore: JSON.parse(JSON.stringify(plan.summary)),
    entries: [],
    deleted: [],   // stays empty, by construction — asserted at the end
    errors: [],
  }

  const actionable = plan.clips.filter(c => c.decision === 'REUSE_OWN' || c.decision === 'REUSE_CROSS' || c.decision === 'RENDER')
  let done = 0
  const progress = (clip, outcome) => {
    done++
    onProgress({ done, total: actionable.length, clip: clip.text, role: clip.role, outcome })
  }

  // Entries are written into a pre-sized slot per clip rather than pushed, so
  // the artifact stays in plan order however many workers ran. A log whose
  // order depends on scheduling is a log nobody can diff against a dry run.
  const slots = new Array(plan.clips.length).fill(null)
  const entry = (i, e) => { slots[i] = e }
  let cursor = 0

  const processClip = async (clip, i) => {
    if (clip.decision === 'SATISFIED') {
      entry(i, { clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'NONE', reason: clip.reason })
      return
    }
    if (clip.decision === 'BLOCKED') {
      entry(i, { clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'BLOCKED', reason: clip.reason })
      return
    }

    try {
      if (clip.decision === 'RENDER' || clip.decision === 'REBUILD') {
        if (dryRun) {
          entry(i, {
            clipKey: clip.clipKey, role: clip.role, text: clip.text,
            action: clip.decision === 'REBUILD' ? 'WOULD_REBUILD' : 'WOULD_RENDER',
            voiceId: clip.voiceId, holders: clip.holders,
            swapTargetAudioId: clip.reuseSource?.swapTargetAudioId || null,
            nextRevision: clip.reuseSource ? (clip.reuseSource.currentRevision ?? 1) + 1 : null,
          })
          progress(clip, clip.decision === 'REBUILD' ? 'would-rebuild' : 'would-render')
          return
        }
        if (typeof renderClip !== 'function') throw new Error('no renderer injected — cannot render')
        const rendered = await renderClip(clip)
        if (!rendered?.audioId) throw new Error('renderer returned no audioId')
        const linked = await relinkHolders(supabase, clip, rendered.audioId, { dryRun })
        entry(i, {
          clipKey: clip.clipKey, role: clip.role, text: clip.text,
          action: clip.decision === 'REBUILD' ? 'REBUILT' : 'RENDERED',
          audioId: rendered.audioId, s3Key: rendered.s3Key || null, durationMs: rendered.durationMs || null,
          revision: rendered.revision || null,
          previousS3Key: rendered.previousS3Key || null,
          swappedInPlace: !!rendered.swappedInPlace,
          holdersUpdated: linked,
          note: rendered.swappedInPlace
            ? 'same row id, bumped revision — no holder FK moved, so the course never referenced a missing clip; old object retained'
            : undefined,
        })
        progress(clip, clip.decision === 'REBUILD' ? 'rebuilt' : 'rendered')
        return
      }

      // REUSE_OWN / REUSE_CROSS — both are "a clip already says this in this
      // voice". Prove the bytes first, always.
      const src = clip.reuseSource
      if (!src?.s3Key) throw new Error('reuse decision carries no source s3 key')

      const head = typeof headObject === 'function' ? await headObject(src.s3Key) : { exists: null }
      if (head.exists === false) throw new Error(`reuse source object missing in storage: ${src.s3Key}`)
      if (head.exists === null) throw new Error(`could not verify reuse source in storage (${head.error || 'unknown'}) — refusing to relink on an unverified claim`)

      let audioId = src.audioId
      if (clip.decision === 'REUSE_CROSS') {
        if (dryRun) {
          entry(i, {
            clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'WOULD_REUSE_CROSS',
            fromCourse: src.courseCode, fromAudioId: src.audioId, s3Key: src.s3Key,
            viaVoiceAlias: clip.viaVoiceAlias, holders: clip.holders,
          })
          progress(clip, 'would-reuse')
          return
        }
        // Copy the row into this course, pointing at the SAME S3 object. No new
        // bytes, no TTS, no spend. Text stored is the COURSE text, not the
        // source clip's snapshot — rule 2 at the top of this file.
        const { data: inserted, error } = await supabase
          .from('course_audio')
          .upsert({
            course_code: courseCode,
            text: clip.text,
            text_normalized: normalizeForAudio(clip.text),
            language: clip.language,
            role: clip.role,
            voice_id: clip.voiceId,
            origin: 'tts',
            s3_key: src.s3Key,
            duration_ms: src.durationMs,
            lego_id: clip.legoId || null,
            word_boundaries: src.wordBoundaries || null,
          }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
          .select('id')
          .single()
        if (error) throw new Error(`copy row into ${courseCode}: ${error.message}`)
        audioId = inserted.id
      }

      const holdersUpdated = await relinkHolders(supabase, clip, audioId, { dryRun })
      entry(i, {
        clipKey: clip.clipKey, role: clip.role, text: clip.text,
        action: dryRun ? 'WOULD_REUSE_OWN' : (clip.decision === 'REUSE_CROSS' ? 'REUSED_CROSS' : 'REUSED_OWN'),
        fromCourse: src.courseCode, audioId,
        previousAudioIds: clip.currentAudioIds,
        viaVoiceAlias: clip.viaVoiceAlias,
        holdersUpdated,
        note: 'previous rows left in place — nothing deleted',
      })
      progress(clip, dryRun ? 'would-relink' : 'relinked')
    } catch (e) {
      log.errors.push({ clipKey: clip.clipKey, role: clip.role, text: clip.text, error: e.message })
      entry(i, { clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'FAILED', error: e.message })
      progress(clip, 'failed')
    }
  }

  const worker = async () => {
    while (cursor < plan.clips.length) {
      const i = cursor++
      await processClip(plan.clips[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, plan.clips.length || 1)) }, worker))
  log.entries = slots.filter(Boolean)

  if (!dryRun && bumpStamp) {
    const changed = log.entries.some(e => ['REUSED_OWN', 'REUSED_CROSS', 'RENDERED', 'REBUILT'].includes(e.action))
    if (changed) {
      const { error } = await supabase
        .from('courses')
        .update({ audio_stamp: new Date().toISOString() })
        .eq('course_code', courseCode)
      if (error) log.errors.push({ clipKey: null, error: `audio_stamp bump failed: ${error.message}` })
      else log.audioStampBumped = true
    }
  }

  log.finishedAt = new Date().toISOString()
  log.counts = log.entries.reduce((acc, e) => { acc[e.action] = (acc[e.action] || 0) + 1; return acc }, {})
  // Structural assertion, not a comment: this module has no delete path at all.
  log.deletionsPerformed = log.deleted.length
  return log
}

/**
 * Point every holder row for a clip at `audioId`. Never nulls a column, never
 * deletes; a holder already pointing at the right row is left alone.
 */
async function relinkHolders(supabase, clip, audioId, { dryRun = true } = {}) {
  const updated = []
  for (const holder of clip.holders) {
    if (holder.currentAudioId === audioId) continue
    if (dryRun) {
      updated.push({ ...holder, to: audioId, applied: false })
      continue
    }
    const { error } = await supabase
      .from(holder.table)
      .update({ [holder.column]: audioId })
      .eq('id', holder.id)
    if (error) throw new Error(`relink ${holder.table}.${holder.id}.${holder.column}: ${error.message}`)
    updated.push({ ...holder, to: audioId, applied: true })
  }
  return updated
}

module.exports = {
  roundsInBand,
  // planning
  enumerateRoundClips,
  buildReusePlan,
  findCandidates,
  verifyPlanBytes,
  verifyPlanVeracity,
  recountPlan,
  buildCoverageTable,
  buildLanguageNameFilter,
  courseLanguageNames,
  voiceFamilyOf,
  isSpeedTrustedVoice,
  LANGUAGE_NAME_FLOOR,
  // applying
  applyReusePlan,
  relinkHolders,
  // pure decision logic (unit-tested)
  decideClip,
  clipKey,
  resolveVoices,
  voicesMatch,
  voiceCandidates,
  bareVoiceId,
  voiceLabel,
  VOICE_LABELS,
  sameLanguage,
  languageCandidates,
  isSayable,
  // constants
  CLIP_ROLES,
  HOLDER_COLUMN,
}

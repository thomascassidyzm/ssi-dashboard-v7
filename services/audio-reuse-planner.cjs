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
 * Tom's key is (voice x text x language). This module adds ROLE as a fourth
 * component of the default key, which is a deliberate NARROWING and is safe in
 * one direction only: it can make us render a clip we could have borrowed, but
 * it can never make us ship a clip in the wrong voice or at the wrong pace.
 * Rationale: `role` is what distinguishes target1 from target2 when a course
 * puts the same voice on both, and Azure bakes a per-role `speed` into the
 * stored MP3 (see services/shared/clone-copy-match.cjs). Pass
 * { crossRole: true } to fall back to Tom's bare three-part key.
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

/**
 * Resolve the voice_id string phase8 would write for each role, from
 * courses.voice_config. Mirrors phase8-audio-v13.cjs getVoiceForRole exactly:
 * `${provider}_${voiceId}` when a provider is set, bare voiceId otherwise,
 * never the config object.
 */
function resolveVoices(course) {
  const voices = course?.voice_config?.voices || {}
  const out = {}
  for (const role of CLIP_ROLES) {
    const v = voices[role]
    if (!v) { out[role] = null; continue }
    if (v.provider && v.voiceId) out[role] = `${v.provider}_${v.voiceId}`
    else out[role] = v.voiceId || null
  }
  return out
}

/**
 * Do two voice_id strings name the same voice?
 *
 * EXACT by default. `aliases` is a list of groups a caller has explicitly
 * asserted to be one voice (e.g. [['eve','xai_eve']] to bridge the estate's
 * legacy bare ids). Returns { match, viaAlias } so the decision can be tagged
 * and audited — an aliased reuse is a human's assertion, not a fact the data
 * proves.
 */
function voicesMatch(wanted, candidate, aliases = []) {
  if (!wanted || !candidate) return { match: false, viaAlias: false }
  if (wanted === candidate) return { match: true, viaAlias: false }
  for (const group of aliases) {
    if (group.includes(wanted) && group.includes(candidate)) {
      return { match: true, viaAlias: true }
    }
  }
  return { match: false, viaAlias: false }
}

/** All voice_id strings that are acceptable for `wanted` under `aliases`. */
function voiceCandidates(wanted, aliases = []) {
  if (!wanted) return []
  const out = new Set([wanted])
  for (const group of aliases) {
    if (group.includes(wanted)) for (const v of group) out.add(v)
  }
  return [...out]
}

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
// STEP 1 — ENUMERATE
// ===========================================================================

/**
 * Set aside every clip the first `roundCount` rounds of a course play.
 *
 * Runs the REAL learning-script generator, walks the emitted cycles, and
 * returns the DISTINCT clip set with, for each clip: role, language, the voice
 * it should be on, the COURSE text it should say, which rounds play it, how
 * many plays it gets, and every holder row (table + id + FK column) that must
 * end up pointing at it.
 *
 * @returns {Promise<{ clips: Map<string,object>, shape: object, voices: object, course: object }>}
 */
async function enumerateRoundClips(supabase, courseCode, roundCount, options = {}) {
  const { crossRole = false, mode } = options

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

  const rounds = (script.rounds || []).filter(r => r.roundNumber <= roundCount)
  if (!rounds.length) {
    throw new Error(`Generator emitted no rounds for ${courseCode}`)
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
    `${courseCode} rounds 1-${roundCount}: ${shape.cycles} cycles, ${shape.clipPlays} clip plays, ${shape.distinctClips} distinct clips`
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
      .select('id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, word_boundaries, created_at')
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
  const { courseCode, crossRole = false, voiceAliases = [] } = opts

  if (clip.blocked) {
    return { decision: 'BLOCKED', reason: clip.blocked, source: null, viaAlias: false }
  }
  if (!clip.voiceId) {
    return { decision: 'BLOCKED', reason: `no voice configured for role ${clip.role}`, source: null, viaAlias: false }
  }
  if (!isSayable(clip.text)) {
    return { decision: 'BLOCKED', reason: 'text is empty or punctuation-only — nothing to say', source: null, viaAlias: false }
  }

  // THE VOICE BOUNDARY. Enforced first and unconditionally: a row that is not
  // on this clip's voice is not a candidate for anything, whatever else is true
  // about it. Borrowing across a voice change is a voice-identity change, which
  // is Tom's taste call and never this code's.
  const viable = []
  for (const row of candidates) {
    const v = voicesMatch(clip.voiceId, row.voice_id, voiceAliases)
    if (!v.match) continue
    if (!sameLanguage(clip.language, row.language)) continue
    if (!crossRole && row.role !== clip.role) continue
    if (!row.s3_key || row.s3_key.startsWith('pending/')) continue
    viable.push({ ...row, viaAlias: v.viaAlias })
  }

  if (!viable.length) {
    return {
      decision: 'RENDER',
      reason: candidates.length
        ? `${candidates.length} clip(s) say this, none on voice ${clip.voiceId} in ${clip.language} for role ${clip.role}`
        : 'no clip anywhere says this',
      source: null,
      viaAlias: false,
    }
  }

  // Prefer this course's own row, then an exact-voice row over an aliased one,
  // then the standard link preference (human > newest > deterministic id).
  const own = viable.filter(r => r.course_code === courseCode)
  const pool = own.length ? own : viable
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
  const { crossRole = false, voiceAliases = [], mode } = options

  const { clips, shape, voices, course } = await enumerateRoundClips(
    supabase, courseCode, roundCount, { crossRole, mode }
  )
  const candidates = await findCandidates(supabase, clips)

  const decided = []
  for (const clip of clips.values()) {
    const d = decideClip(clip, candidates.get(clip.clipKey) || [], { courseCode, crossRole, voiceAliases })
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

  const toRender = decided.filter(c => c.decision === 'RENDER')
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
    generatedAt: new Date().toISOString(),
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    voices,
    voiceAliases,
    crossRole,
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

/** Recompute summary/byLayer/estimate after decisions change. */
function recountPlan(plan) {
  const summary = { total: plan.clips.length, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, blocked: 0 }
  const byLayer = {}
  const key = { SATISFIED: 'satisfied', REUSE_OWN: 'reuseOwn', REUSE_CROSS: 'reuseCross', RENDER: 'render', BLOCKED: 'blocked' }
  for (const c of plan.clips) {
    summary[key[c.decision]]++
    byLayer[c.role] = byLayer[c.role] || { total: 0, satisfied: 0, reuseOwn: 0, reuseCross: 0, render: 0, blocked: 0 }
    byLayer[c.role].total++
    byLayer[c.role][key[c.decision]]++
  }
  const toRender = plan.clips.filter(c => c.decision === 'RENDER')
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
  } = opts
  const courseCode = plan.courseCode

  const log = {
    runId: opts.runId || null,
    courseCode,
    rounds: plan.rounds,
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

  for (const clip of plan.clips) {
    if (clip.decision === 'SATISFIED') {
      log.entries.push({ clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'NONE', reason: clip.reason })
      continue
    }
    if (clip.decision === 'BLOCKED') {
      log.entries.push({ clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'BLOCKED', reason: clip.reason })
      continue
    }

    try {
      if (clip.decision === 'RENDER') {
        if (dryRun) {
          log.entries.push({ clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'WOULD_RENDER', voiceId: clip.voiceId, holders: clip.holders })
          progress(clip, 'would-render')
          continue
        }
        if (typeof renderClip !== 'function') throw new Error('no renderer injected — cannot render')
        const rendered = await renderClip(clip)
        if (!rendered?.audioId) throw new Error('renderer returned no audioId')
        const linked = await relinkHolders(supabase, clip, rendered.audioId, { dryRun })
        log.entries.push({
          clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'RENDERED',
          audioId: rendered.audioId, s3Key: rendered.s3Key || null, durationMs: rendered.durationMs || null,
          holdersUpdated: linked,
        })
        progress(clip, 'rendered')
        continue
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
          log.entries.push({
            clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'WOULD_REUSE_CROSS',
            fromCourse: src.courseCode, fromAudioId: src.audioId, s3Key: src.s3Key,
            viaVoiceAlias: clip.viaVoiceAlias, holders: clip.holders,
          })
          progress(clip, 'would-reuse')
          continue
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
      log.entries.push({
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
      log.entries.push({ clipKey: clip.clipKey, role: clip.role, text: clip.text, action: 'FAILED', error: e.message })
      progress(clip, 'failed')
    }
  }

  if (!dryRun && bumpStamp) {
    const changed = log.entries.some(e => ['REUSED_OWN', 'REUSED_CROSS', 'RENDERED'].includes(e.action))
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
  // planning
  enumerateRoundClips,
  buildReusePlan,
  findCandidates,
  verifyPlanBytes,
  recountPlan,
  // applying
  applyReusePlan,
  relinkHolders,
  // pure decision logic (unit-tested)
  decideClip,
  clipKey,
  resolveVoices,
  voicesMatch,
  voiceCandidates,
  sameLanguage,
  languageCandidates,
  isSayable,
  // constants
  CLIP_ROLES,
  HOLDER_COLUMN,
}

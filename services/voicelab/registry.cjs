/**
 * VOICELAB REGISTRY — the per-LANGUAGE view of the estate's voices.
 *
 * Tom, 2026-08-28: "essentially we've got a single place to check configured
 * voices per language … each language needs 2 voices, 1 male and 1 female as
 * standard, with backups in case for whatever reason there's a problem …
 * human voices will also be configured here as well".
 *
 * ── WHY PER LANGUAGE, NOT PER COURSE ────────────────────────────────────────
 * A course inherits its voices from its language; the language is the unit the
 * casting decision is actually made in. There are ~70 target languages on live
 * courses and far more courses, so a per-course screen shows the same decision
 * many times and hides how many languages have nobody cast at all.
 *
 * ── EVERY ROW IS LIVE DATA ──────────────────────────────────────────────────
 * Languages come from `courses.target_lang` (what the estate actually teaches),
 * voices from the `voices` table, casting from `voice_language_roles`, and
 * Cartesia coverage from services/shared/tts-provider-policy.cjs — the same
 * module the production render path reads, so this screen cannot drift from
 * what a render will actually do. Nothing here is a hardcoded language list.
 *
 * ── THE THREE KINDS OF "NO VOICE", WHICH ARE NOT THE SAME PROBLEM ───────────
 * Collapsing them would make the screen lie, so each has its own status:
 *
 *   human    — the language is human-recorded ONLY (Welsh, Breton, PDC). Its
 *              empty synthetic slots are NOT a gap: a human recording wins
 *              wherever it exists, and its gaps are a recording worklist for
 *              its recordists. Rendering Welsh as a red "no Cartesia voice"
 *              would be the screen misreporting a deliberate ruling as a
 *              defect.
 *   uncast   — a synthetic provider COULD speak this language, but nobody has
 *              been cast into the slot. This is the estate's real live blocker
 *              and the thing this screen exists to surface.
 *   nocover  — Cartesia does not publish this language at all, so the ladder
 *              falls to Azure. Honest amber, not red: it is covered, just not
 *              by the default provider.
 *
 * ── THE THIRD KIND OF AUDIO: THE GUIDE VOICE ────────────────────────────────
 * Tom, 2026-08-29: the instructions and encouragements "are not linked to a
 * course per se - they are linked to every course with the same known language,
 * because these are messages to the learner". So beside the male/female PHRASE
 * slots each language carries a GUIDE slot, cast against the language as a
 * KNOWN language. Two facts about it that this module is careful with:
 *
 *   It NEVER touches completeness. `statusFor`, `filled` and `required` count
 *   the two primary phrase voices and nothing else — Tom's 2026-08-28 ruling,
 *   unchanged. Only twelve of the estate's sixty-eight languages are ever a
 *   known language, so letting an uncast guide count would turn the whole
 *   screen amber overnight and stop it saying anything.
 *
 *   It shows WHO SPEAKS TODAY beside the empty slot, read from the
 *   `voice_guide_in_use` view (a GROUP BY over course_audio). The estate has
 *   been doing the right thing by hand for a long time — one voice per known
 *   language already — so casting is confirming a fact, not making a choice
 *   from nothing.
 *
 * ── WHAT THIS MODULE WILL NEVER DO ──────────────────────────────────────────
 * It writes `voice_language_roles` and nothing else. It does not write
 * `course_audio`, `algorithm_config` or any course's `voice_config` — the Voice
 * Lab exports a config and a human applies it, which is the lab's standing rule
 * and survives this rework untouched.
 */

const { effectivePaceRatio, playbackSpeed } = require('../shared/voice-pace.cjs')
const fs = require('fs')
const path = require('path')
const policy = require('../shared/tts-provider-policy.cjs')
const { isHumanVoiceLang } = require('../shared/human-voice-courses.cjs')
const { humanRecordedForLanguage, loadHumanRecordedRoles } = require('../shared/human-recorded-roles.cjs')
const { tryCanonicalVoiceId, PROVIDER_ALIASES } = require('../shared/clip-identity.cjs')

/**
 * How many ranks are TRACKED (and shown) per (language, gender) slot — primary
 * plus however many backups the estate wants visible.
 */
const REQUIRED_RANKS = Number(process.env.VOICELAB_REQUIRED_RANKS || 2)

/**
 * How many of those ranks make a language COMPLETE.
 *
 * Tom's ruling, 2026-08-28, read as written: "each language needs 2 voices, 1
 * male and 1 female as standard, with backups in case for whatever reason
 * there is a problem." Two (one male, one female) is what makes a language
 * complete — rank 0, primary, per gender. Backups are insurance, not part of
 * completeness: a missing backup is a quieter flag (see `hasBackup` below),
 * never red, never counted toward "incomplete".
 */
const COMPLETE_RANKS = 1

/** The genders every language is expected to carry. Matches voices.gender. */
const GENDERS = Object.freeze(['m', 'f'])

/** Human-readable rank names, so the UI never has to invent them. */
function rankName (rank) {
  if (rank === 0) return 'primary'
  if (rank === 1) return 'backup'
  return `backup ${rank}`
}

/**
 * Build the whole per-language view.
 *
 * @param {object} db   a Supabase client (services/supabase-client.cjs getClient())
 * @returns {Promise<{languages: object[], summary: object, notes: object}>}
 */
/**
 * The pace facts about a cast voice, for the screen.
 *
 * Tom, 2026-08-29: "maybe we have settings in the voice lab that should/could
 * be then read by the player?" This is that reading surface. `effective` is the
 * one number anything downstream should use — the measurement times the human's
 * nudge — and it is null, never 1.0, for a voice nobody has measured, because
 * "typical for its language" and "we have not looked" are different claims that
 * happen to share a digit.
 *
 * `easy` and `fast` are THE NUMBERS THE PLAYER WILL ACTUALLY USE on the target
 * language under the role+mode rule (Tom, 2026-08-29 — the belt ramp is
 * retired). They are shown rather than left to be derived, because a raw ratio
 * is not a thing anyone can judge by ear and a playback speed is.
 */
function paceOf (voice) {
  if (!voice) return null
  const ratio = voice.natural_pace_ratio === null || voice.natural_pace_ratio === undefined
    ? null : Number(voice.natural_pace_ratio)
  const nudge = voice.natural_pace_nudge === null || voice.natural_pace_nudge === undefined
    ? null : Number(voice.natural_pace_nudge)
  const easy = playbackSpeed(voice, 'target', 'easy')
  const fast = playbackSpeed(voice, 'target', 'fast')
  return {
    ratio,
    nudge,
    effective: effectivePaceRatio(voice),
    // Target-language playback only: known and listening are 1.0 flat by the
    // rule, with no per-voice correction, so there is no number to show.
    easy: easy.speed,
    fast: fast.speed,
    easyClamped: easy.clamped,
    fastClamped: fast.clamped,
    cps: voice.natural_pace_cps === null || voice.natural_pace_cps === undefined ? null : Number(voice.natural_pace_cps),
    samples: voice.natural_pace_samples ?? null,
    measuredAt: voice.natural_pace_measured_at || null,
    nudgeNote: voice.natural_pace_nudge_note || null,
  }
}

/**
 * THE PER-LANGUAGE REFERENCE PACE — the thing every voice ratio is measured
 * against, and without which a ratio is a number nobody can check.
 *
 * Read from tools/voice/provider-pace-reference.json, the artifact
 * tools/voice/measure-provider-pace.cjs writes: the sentence every voice in
 * that language spoke, how long the reference read took, and how many voices
 * are behind it. Missing file = no reference shown, never a broken screen.
 */
function paceReference () {
  try {
    const file = path.join(__dirname, '..', '..', 'tools', 'voice', 'provider-pace-reference.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return { languages: {} }
  }
}

async function build (db, opts = {}) {
  // Cartesia's live catalogue, keyed by two-letter code (params.cjs fetches it).
  // Merged in as UNREGISTERED candidates so a language with no Cartesia voice in
  // `voices` can still be cast from this screen — otherwise the estate's default
  // provider would be the one provider you could not choose. Casting one
  // registers it; see router.cjs.
  const catalogue = opts.cartesiaCatalogue || {}
  const [courses, voices, roles, guideInUse] = await Promise.all([
    all(db, 'courses', 'course_code, target_lang, known_lang, status, voice_config'),
    all(db, 'voices', 'voice_id, type, tts_engine, display_name, human_name, languages, gender, is_active, notes, natural_pace_ratio, natural_pace_cps, natural_pace_samples, natural_pace_measured_at, natural_pace_nudge, natural_pace_nudge_note'),
    all(db, 'voice_language_roles', 'language, gender, rank, voice_id, notes, assigned_by, slot'),
    // Who ACTUALLY speaks the instructions today, per known language. About a
    // dozen rows: the GROUP BY is the view's, not this module's, because doing
    // it here would mean paging ~6,300 course_audio rows on every page load.
    // A view that has not been created yet must degrade to "unknown", never to
    // a broken screen — see allSoft.
    allSoft(db, 'voice_guide_in_use', 'known_lang, role, voice_id, clips, courses'),
  ])

  // ── WHICH SLOTS HOLD REAL RECORDINGS (Tom's ruling, 2026-08-31) ───────────
  // Tens of rows, grouped by the view rather than here for the same reason
  // voice_guide_in_use is: paging 42,388 human clips on every page load to
  // count them would be absurd. Read SOFTLY — with no view the policy and
  // stored-config halves of the signal still stand, so Welsh is still labelled.
  const humanRows = await loadHumanRecordedRoles(db)

  const voiceById = new Map(voices.map((v) => [v.voice_id, v]))

  // Group the estate's courses by the language they teach. `target_lang` is the
  // unit because that is what a voice actually speaks.
  const byLang = new Map()
  for (const c of courses) {
    const lang = String(c.target_lang || '').trim()
    if (!lang) continue
    if (!byLang.has(lang)) byLang.set(lang, [])
    byLang.get(lang).push(c)
  }

  const rolesByLang = new Map()
  for (const r of roles) {
    if (!rolesByLang.has(r.language)) rolesByLang.set(r.language, [])
    rolesByLang.get(r.language).push(r)
  }

  // ── LANGUAGES NOBODY TEACHES BUT SOMEBODY LEARNS FROM ─────────────────────
  // Six of the estate's twenty-five known languages (aze, guj, pan, sin, tam,
  // urd) are the known side of a course and the target side of none, so they
  // had no row on this screen at all — and therefore no way to cast the guide
  // voice their learners already hear. sin and tam have real instruction clips
  // today. They get a row with zero teaching courses and the status
  // 'knownonly', which is deliberately NOT a gap: nothing teaches them, so
  // asking for a male and a female phrase voice would be the screen inventing a
  // worklist. Every other language's status is untouched by this.
  for (const c of courses) {
    const k = String(c.known_lang || '').trim()
    if (k && !byLang.has(k)) byLang.set(k, [])
  }

  // How many courses use each language as their KNOWN language. This is what
  // makes a guide slot make sense on the row of a language nobody teaches from:
  // twelve languages carry a real number here and fifty-six carry zero.
  const knownCounts = new Map()
  for (const c of courses) {
    const k = String(c.known_lang || '').trim()
    if (!k) continue
    knownCounts.set(k, (knownCounts.get(k) || 0) + 1)
  }

  // The measured in-use guide voices, keyed by known language, biggest first.
  const inUseByLang = new Map()
  for (const g of guideInUse) {
    const k = String(g.known_lang || '').trim()
    if (!k) continue
    if (!inUseByLang.has(k)) inUseByLang.set(k, [])
    inUseByLang.get(k).push(g)
  }

  const reference = paceReference()
  const languages = [...byLang.entries()]
    .map(([code, langCourses]) => describeLanguage({
      code,
      paceReference: (reference.languages || {})[code] || null,
      langCourses,
      roles: rolesByLang.get(code) || [],
      voiceById,
      voices,
      catalogue,
      knownCourses: knownCounts.get(code) || 0,
      guideInUse: inUseByLang.get(code) || [],
      courses,
      humanRows,
    }))
    .sort((a, b) => {
      // LIVE COURSES FIRST, THEN COURSE COUNT, THEN THE LANGUAGE'S NAME.
      //
      // Tom's ruling, 2026-08-29, looking at the live page: "the order of
      // languages is weird on the main page - doesn't seem to follow any
      // discernible logic". Two things were wrong with the old order. It sorted
      // by STATUS first (worst first), which is a defensible order but not the
      // one he wants to read; and its final tiebreak was the three-letter CODE,
      // which is not a sort key he can see, so the tail of the list read as
      // noise. The status chips, colours and filters are untouched — a gap
      // still reads as a gap — but the ROW ORDER is his, not the status's.
      //
      // The name leg cannot be done here: the estate's one code-to-name lookup
      // (src/utils/languageNames.js) is a front-end module that fetches a CSV
      // asynchronously, and dragging it server-side to sort a list would be a
      // second answer to a question that already has one. So this emits the
      // first two legs plus a stable code tiebreak, and the final ordering by
      // NAME happens in LanguagesPanel.vue's `rows`, where the lookup already
      // lives and is already used for search.
      const live = (l) => (l.released > 0 ? 0 : 1)
      return live(a) - live(b) || b.courses - a.courses || a.code.localeCompare(b.code)
    })

  return { languages, summary: summarise(languages), notes: notes() }
}

/**
 * ── WHAT A COURSE ACTUALLY HAS, AS OPPOSED TO WHAT A RENDER WOULD PICK ──────
 *
 * `defaultProvider` above answers "what would a NEW render choose?", asked of
 * the policy. That is a real question and a useful one, but it is NOT what the
 * estate is running on: it answers 'azure' for every language, which hid the 29
 * courses that are on xAI today — the exact fact this screen exists to surface
 * while xAI is being deprecated (Tom, 2026-08-29).
 *
 * The stored answer lives in `courses.voice_config.voices.<role>.provider`,
 * one object per role (known / target1 / target2 / presentation, and a course
 * may carry others).
 *
 * THE TRAP: `voice_config` ALSO carries a top-level `providers` block —
 * {"xai":{"enabled":true},"azure":{"enabled":true},"elevenlabs":{…}} — which is
 * boilerplate copied into nearly every course and says nothing about what the
 * course uses. Read it and every course looks like an xAI course. It is
 * deliberately never read here; only the per-role objects are.
 *
 * Resolution order, and it never guesses into azure:
 *   1. the role's own explicit `provider` key, through the estate's existing
 *      PROVIDER_ALIASES table;
 *   2. failing that, the SHAPE of the voice id, through the estate's existing
 *      `canonicalVoiceId` — which already knows that `en-GB-SoniaNeural` is
 *      Azure and that the bare names `eve, leo, ara, sal, rex, gfzdpspr5fdp,
 *      bedd6226` are xAI;
 *   3. a role with neither a provider nor a voice id is `unset`, and anything
 *      else that will not resolve is `unknown`. Both are rendered as themselves.
 * There is no third answer to "which provider is this id?" invented here —
 * two answers to one question is how a screen starts lying about the system it
 * describes.
 */
function providerOfRole (role) {
  if (!role || typeof role !== 'object') return null
  const declared = String(role.provider || '').trim().toLowerCase()
  if (declared && PROVIDER_ALIASES[declared]) return PROVIDER_ALIASES[declared]
  const id = role.voiceId || role.voice_id
  if (!id) return declared ? 'unknown' : 'unset'
  const canon = tryCanonicalVoiceId(id)
  if (canon) return canon.split('_')[0]
  return 'unknown'
}

/**
 * Per-language tally of the providers the language's COURSES actually store.
 *
 * Courses are the headline number — "4 courses on xAI" is what a person acts
 * on; role slots are the detail underneath. A course counts once per distinct
 * provider it carries, so a course that mixes Azure and xAI appears in both.
 * xAI sorts first wherever it is present: it is the thing the screen is for.
 */
function providersInUse (langCourses) {
  const byProvider = new Map()
  let configured = 0
  for (const c of langCourses) {
    const voices = c.voice_config && c.voice_config.voices
    if (!voices || typeof voices !== 'object' || !Object.keys(voices).length) continue
    let any = false
    const seen = new Set()
    for (const role of Object.values(voices)) {
      const p = providerOfRole(role)
      if (!p) continue
      any = true
      if (!byProvider.has(p)) byProvider.set(p, { provider: p, courses: 0, roles: 0 })
      byProvider.get(p).roles += 1
      seen.add(p)
    }
    for (const p of seen) byProvider.get(p).courses += 1
    if (any) configured += 1
  }
  const list = [...byProvider.values()].sort((a, b) => {
    if (a.provider === 'xai') return -1
    if (b.provider === 'xai') return 1
    return b.courses - a.courses || a.provider.localeCompare(b.provider)
  })
  const xai = byProvider.get('xai')
  return {
    providersInUse: list,
    xaiCourses: xai ? xai.courses : 0,
    xaiRoles: xai ? xai.roles : 0,
    configuredCourses: configured,
    unconfiguredCourses: langCourses.length - configured,
  }
}

/** One language's row. */
function describeLanguage ({ code, langCourses, roles, voiceById, voices, catalogue = {}, knownCourses = 0, guideInUse = [], paceReference = null, courses = [], humanRows = [] }) {
  const human = isHumanVoiceLang(code)
  const cartesiaCovers = policy.cartesiaCoversLanguage(code)
  // No course teaches this language; it only ever appears on the known side.
  // Its phrase slots are not a gap, and `statusFor` is told so.
  const knownOnly = langCourses.length === 0
  const inUse = providersInUse(langCourses)

  // A row with no `slot` is a PHRASE row: the column arrived on 2026-08-29 with
  // a 'phrase' default, and reading a missing value as anything else would let
  // an old row silently become a guide.
  const isGuide = (r) => r.slot === 'guide'
  const phraseRoles = roles.filter((r) => !isGuide(r))
  const guideRoles = roles.filter(isGuide)

  const slots = {}
  for (const g of GENDERS) {
    slots[g] = []
    for (let rank = 0; rank < REQUIRED_RANKS; rank += 1) {
      const role = phraseRoles.find((r) => r.gender === g && r.rank === rank)
      const voice = role ? voiceById.get(role.voice_id) : null
      slots[g].push({
        rank,
        rankName: rankName(rank),
        filled: Boolean(voice),
        // A cast slot whose voice row has since been deactivated is reported as
        // cast-but-broken rather than silently counted as filled.
        active: voice ? voice.is_active !== false : null,
        voiceId: role ? role.voice_id : null,
        voiceName: voice ? (voice.display_name || voice.human_name || voice.voice_id) : null,
        kind: voice ? voiceKind(voice) : null,
        engine: voice ? (voice.tts_engine || null) : null,
        pace: paceOf(voice),
        notes: role ? role.notes : null,
        assignedBy: role ? role.assigned_by : null,
      })
    }
  }

  // Completeness counts PRIMARY slots only (rank < COMPLETE_RANKS) — Tom's
  // ruling: two working voices, one male one female, is complete, full stop.
  const filled = GENDERS.flatMap((g) => slots[g].slice(0, COMPLETE_RANKS)).filter((s) => s.filled && s.active !== false).length
  const required = GENDERS.length * COMPLETE_RANKS

  // Backup insurance is tracked separately and never affects `status`. A
  // gender is "backed up" if any of its ranks beyond the primary is filled and
  // active. Reported per-language so the view can show a quiet "no fallback"
  // flag without ever turning a complete language red.
  const backedUpGenders = GENDERS.filter((g) => slots[g].slice(COMPLETE_RANKS).some((s) => s.filled && s.active !== false))
  const hasFullBackup = backedUpGenders.length === GENDERS.length

  // ── THE GUIDE SLOT ────────────────────────────────────────────────────────
  // One voice per language, not a pair: ranks only, no gender axis. `gender` on
  // a guide row records the voice's own gender and is passed through untouched
  // so the writer can round-trip it; nothing reads it to make a decision.
  const guideSlots = []
  for (let rank = 0; rank < REQUIRED_RANKS; rank += 1) {
    const role = guideRoles.find((r) => r.rank === rank)
    const voice = role ? voiceById.get(role.voice_id) : null
    guideSlots.push({
      rank,
      rankName: rankName(rank),
      filled: Boolean(voice),
      active: voice ? voice.is_active !== false : null,
      voiceId: role ? role.voice_id : null,
      voiceName: voice ? (voice.display_name || voice.human_name || voice.voice_id) : null,
      kind: voice ? voiceKind(voice) : null,
      engine: voice ? (voice.tts_engine || null) : null,
      gender: role ? role.gender : null,
      pace: paceOf(voice),
      notes: role ? role.notes : null,
      assignedBy: role ? role.assigned_by : null,
    })
  }

  // ── THE HUMAN RECORDINGS THIS LANGUAGE'S CAST WOULD REACH ────────────────
  // Named per SLOT, because a phrase cast and a guide cast reach different
  // courses and different roles. This is what the screen must be able to say
  // BEFORE the tap — "Welsh has 3 human-recorded courses" is a label, not an
  // error message after the fact (Tom, 2026-08-31).
  const humanPhrase = humanRecordedForLanguage({ language: code, slot: 'phrase', courses, humanRows })
  const humanGuide = humanRecordedForLanguage({ language: code, slot: 'guide', courses, humanRows })
  // Every course a PHRASE cast on this language would touch at all — the
  // denominator that decides whether a cast is partly refused or wholly
  // pointless. `known` slots on courses taught FROM this language count too.
  const phraseReach = courses.filter((c) => c.target_lang === code || c.known_lang === code).length

  return {
    code,
    courses: langCourses.length,
    released: langCourses.filter((c) => c.status === 'released').length,
    // The pace every voice in this language is compared against, and the exact
    // sentence it was measured on. Null for a language nobody has measured.
    paceReference,
    human,
    // The MEASURED human signal, per slot: which courses a cast here would not
    // speak over, and why. `blocked` means every course this cast could reach
    // is human-recorded, so the cast is refused outright rather than written as
    // a decision nothing can act on.
    humanRecorded: {
      phrase: humanPhrase,
      guide: humanGuide,
      phraseReach,
      blocked: phraseReach > 0 && humanPhrase.total >= phraseReach,
    },
    cartesiaCovers,
    // The provider a NEW render would actually use, asked of the same module
    // production asks, so this cannot claim something the render path denies.
    // This is a HYPOTHETICAL, and the UI labels it as one ("If re-rendered").
    defaultProvider: providerFor(code),
    // What the language's courses actually have stored, right now. The fact
    // the "If re-rendered" column cannot tell you.
    ...inUse,
    slots,
    filled,
    required,
    hasFullBackup,
    backedUpGenders,
    // DELIBERATELY computed from the PHRASE slots alone. An uncast guide is an
    // empty slot on the row, never a status regression — only twelve languages
    // are ever a known language, and letting the guide count would turn 68 rows
    // amber and stop the screen saying anything (Tom's completeness ruling,
    // 2026-08-28, survives this change untouched).
    knownOnly,
    status: statusFor({ human, cartesiaCovers, filled, required, knownOnly }),
    // ── The guide voice, cast against this language as a KNOWN language ─────
    // `knownCourses` is what makes the slot legible on the row of a language
    // nobody teaches from: 0 means nobody hears instructions in it.
    knownCourses,
    guide: {
      slots: guideSlots,
      cast: guideSlots.some((s) => s.filled && s.active !== false),
      // What the estate's existing clips actually use, measured, biggest first.
      // "eng is currently Aran, uncast" is the whole point: casting confirms a
      // fact rather than inventing one.
      inUse: guideVoicesInUse(guideInUse, voiceById),
      // Any active castable voice that declares this language. NOT filtered by
      // gender — a guide is one voice, and the male/female split is a property
      // of the phrase slots only.
      candidates: guideCandidates({ code, voices, guideRoles, voiceById, inUse: guideInUse, catalogue }),
    },
    // Voices that CAN speak this language and are not yet cast — the candidate
    // list, so casting is a click rather than a search.
    //
    // ONE ROW PER VOICE. A voice cloned from this page is in BOTH sources: the
    // `voices` row the clone route writes, and Cartesia's own owner catalogue.
    // Before the dedupe below, every clone made here appeared twice in its own
    // language — once registered, once as "this estate's Cartesia clone", same
    // id — which reads as two voices to choose between and invites casting the
    // copy that says it is not registered. Measured live 2026-08-30 on a clone
    // created through the deployed route. `guideCandidates` already took this
    // posture; the phrase-slot list did not.
    candidates: dedupeByVoiceId(voices
      .filter((v) => v.is_active !== false)
      .filter((v) => castable(v))
      .filter((v) => (v.languages || []).some((l) => sameLang(l, code)))
      .filter((v) => !roles.some((r) => r.voice_id === v.voice_id))
      // `pace` rides along on the candidate too, so the numbers are visible on
      // a language nobody has cast yet — which, until casting is populated, is
      // every language.
      .map((v) => ({ voiceId: v.voice_id, name: v.display_name || v.human_name || v.voice_id, kind: voiceKind(v), engine: v.tts_engine || null, gender: v.gender || null, registered: true, pace: paceOf(v) }))
      .concat(cartesiaCandidates(code, catalogue, roles)))
      .slice(0, 80),
  }
}

/**
 * The guide voices this language's clips ACTUALLY use today.
 *
 * Read from the `voice_guide_in_use` view, folded across the two guide roles so
 * the screen says "Aran, 2,688 clips" rather than listing instruction and
 * encouragement separately — they are the same decision and, measured on
 * 2026-08-29, always the same voice.
 *
 * `human_recording` is reported like any other voice and MUST be: 765 English
 * instruction clips are human-recorded, and hiding that would invite somebody
 * to cast a synthetic voice over a human recording.
 */
function guideVoicesInUse (rows, voiceById) {
  const byVoice = new Map()
  for (const r of rows || []) {
    const id = r.voice_id
    if (!id) continue
    if (!byVoice.has(id)) byVoice.set(id, { voiceId: id, clips: 0, roles: [] })
    const e = byVoice.get(id)
    e.clips += Number(r.clips || 0)
    if (r.role && !e.roles.includes(r.role)) e.roles.push(r.role)
  }
  return [...byVoice.values()]
    .map((e) => {
      const v = voiceById.get(e.voiceId)
      return {
        ...e,
        human: e.voiceId === 'human_recording' || (v && v.type === 'human'),
        name: v ? (v.display_name || v.human_name || v.voiceId) : e.voiceId,
        kind: v ? voiceKind(v) : (e.voiceId === 'human_recording' ? 'human' : providerOfVoiceId(e.voiceId)),
        // A voice with no `voices` row cannot be cast until it has one: the
        // slot table carries a foreign key. Eleven of the twelve known
        // languages' guide voices are in this state, so the flag is what tells
        // the UI to offer "cast the voice already in use" rather than nothing.
        registered: Boolean(v),
      }
    })
    .sort((a, b) => b.clips - a.clips)
}

/** The provider a voice id's SHAPE implies, with no `voices` row to ask. */
function providerOfVoiceId (id) {
  const canon = tryCanonicalVoiceId(id)
  return canon ? canon.split('_')[0] : 'unknown'
}

/**
 * Voices offerable for this language's GUIDE slot.
 *
 * Two sources, and the second is what makes casting one click rather than an
 * archaeology exercise:
 *   1. registered, active, castable voices that declare the language — NOT
 *      filtered by gender, because a guide is one voice and the male/female
 *      split belongs to the phrase slots alone;
 *   2. the voice the language's clips ALREADY use, even when it has no `voices`
 *      row yet. Eleven of the twelve known languages are in that state. It is
 *      offered with `registered: false` and `inUse: true`, and the cast route
 *      registers it before writing the slot.
 *
 * `human_recording` is never offered: it is a marker on a clip, not a voice
 * anything can render with, and casting it would fill a slot with something
 * that cannot speak.
 */
function guideCandidates ({ code, voices, guideRoles, voiceById, inUse, catalogue = {} }) {
  const taken = new Set((guideRoles || []).map((r) => r.voice_id))
  const registered = voices
    .filter((v) => v.is_active !== false)
    .filter((v) => castable(v))
    .filter((v) => (v.languages || []).some((l) => sameLang(l, code)))
    .filter((v) => !taken.has(v.voice_id))
    .map((v) => ({
      voiceId: v.voice_id,
      name: v.display_name || v.human_name || v.voice_id,
      kind: voiceKind(v),
      engine: v.tts_engine || null,
      gender: v.gender || null,
      registered: true,
      inUse: false,
    }))
  const seen = new Set(registered.map((c) => c.voiceId))
  const unregistered = [...new Set((inUse || []).map((r) => r.voice_id))]
    .filter((id) => id && id !== 'human_recording')
    .filter((id) => !taken.has(id) && !seen.has(id) && !voiceById.has(id))
    .map((id) => ({
      voiceId: id,
      name: `${id} — already speaking this language`,
      kind: providerOfVoiceId(id),
      engine: providerOfVoiceId(id),
      gender: null,
      registered: false,
      inUse: true,
    }))
  // The estate's OWN Cartesia clones, and only those. The whole Cartesia
  // catalogue is deliberately NOT offered here — 419 stock English voices would
  // bury the dozen voices this list exists to choose between — but a voice this
  // estate cloned is exactly the kind of voice a guide slot is cast from, and
  // it had no way onto this list at all (Tom, 2026-08-29: he could not see his
  // own clone among English's voices). Offered, never auto-assigned.
  const ownedClones = cartesiaCandidates(code, catalogue, guideRoles || [])
    .filter((c) => c.owned)
    .filter((c) => !taken.has(c.voiceId) && !seen.has(c.voiceId) && !voiceById.has(c.voiceId))
    .map((c) => ({ ...c, inUse: false }))
  return [...unregistered, ...ownedClones, ...registered].slice(0, 80)
}

/**
 * Keep the FIRST entry for each voice id. The registered `voices` row is built
 * first deliberately: it is the one carrying gender and pace, and it is the one
 * the cast route needs no extra step for.
 */
function dedupeByVoiceId (candidates) {
  const seen = new Set()
  return candidates.filter((c) => {
    if (seen.has(c.voiceId)) return false
    seen.add(c.voiceId)
    return true
  })
}

/**
 * Cartesia catalogue voices for a language that are not already cast.
 *
 * Reported with `registered: false` so the UI can say plainly that choosing one
 * also adds it to the estate's voice list. The id is spelled `cartesia_…`,
 * matching how the estate spells provider-scoped ids, and it is that spelling
 * the cast route uses to decide whether it needs to register the voice first.
 */
function cartesiaCandidates (code, catalogue, roles) {
  const iso1 = policy.toCartesiaLangCode(code)
  if (!iso1) return []
  // THE ESTATE'S OWN CLONES COME FIRST, and this is not cosmetic ordering.
  //
  // Tom, 2026-08-29: "I can't see MY own Cartesia clone voice in the list of
  // available voices for English." Cartesia publishes 419 English voices in an
  // order nobody here chose; his clone came back at position 210 of them and
  // Aran's at 209, while `describeLanguage` caps the candidate list at 80. So
  // the two voices the estate actually owns were the two it could never offer,
  // and every other language stayed fine only because it has fewer voices than
  // the cap. Sorting by `owner` — the flag Cartesia itself sets — fixes it for
  // any clone this estate makes later, without naming a single voice id here.
  const owned = (v) => (v.owner ? 0 : 1)
  return (catalogue[iso1] || [])
    .slice()
    .sort((a, b) => owned(a) - owned(b))
    .map((v) => ({
      voiceId: `cartesia_${v.id}`,
      name: v.owner ? `${v.name} — this estate's Cartesia clone` : `${v.name} — Cartesia`,
      kind: 'cartesia',
      engine: 'cartesia',
      gender: v.gender || null,
      registered: false,
      owned: Boolean(v.owner),
    }))
    .filter((c) => !roles.some((r) => r.voice_id === c.voiceId))
}

/**
 * `voices.languages` may hold iso3, iso1 or a locale. Compare on the two-letter
 * code both sides normalise to, so 'spa' matches 'es' and 'es-ES'.
 */
function sameLang (a, b) {
  const norm = (x) => policy.toCartesiaLangCode(x) || String(x || '').toLowerCase().split(/[-_]/)[0]
  return norm(a) === norm(b)
}

/**
 * May this voice be cast into a slot at all?
 *
 * A human voice always may — rung 1 of the ladder, and the whole point of part
 * 4. A synthetic voice may only if a NEW render could actually choose it, which
 * rules out the 106 xAI rows: xAI is retired from selection, so casting one
 * would fill a slot with a voice that 403s the moment anything tries to use it,
 * and the language would read as covered while being unrenderable. That is
 * precisely the false green this screen exists to prevent.
 *
 * Retirement is from SELECTION only — those rows stay in `voices`, their
 * historic clips keep playing, and nothing here deletes anything.
 */
function castable (v) {
  if (v.type === 'human') return true
  const engine = String(v.tts_engine || '').toLowerCase()
  if (!engine) return false                        // nothing to render with
  if (policy.RETIRED_PROVIDERS.has(engine)) return false
  if (engine === 'legacy') return false            // not a provider we can call
  return true
}

/** Human, or synthetic-by-engine. The kind Tom asked to see alongside the rest. */
function voiceKind (v) {
  if (v.type === 'human') return 'human'
  if (v.type === 'synthetic' && !v.tts_engine) return 'synthetic'
  return v.tts_engine || v.type || 'unknown'
}

/**
 * What a new render for this language would choose. Asked of the policy rather
 * than reasoned about here — two answers to one question is how a screen starts
 * lying about the system it describes.
 */
function providerFor (code) {
  try {
    return policy.selectProvider({ language: code }).provider
  } catch (e) {
    // The policy throws for human-voice content and for uncoverable languages.
    // Both are real answers, not failures, so they are reported as such.
    return e && e.code === 'HUMAN_VOICE' ? 'human' : null
  }
}

function statusFor ({ human, cartesiaCovers, filled, required, knownOnly = false }) {
  // A language nothing teaches has no phrase-voice worklist to report. It is on
  // the screen so its GUIDE can be cast — the voice its learners hear
  // instructions in — and calling that "uncast" would invent a casting job the
  // estate does not have (2026-08-29).
  if (knownOnly) return 'knownonly'
  // Human first and unconditionally: a human-voiced language's empty synthetic
  // slots are a recording worklist, never a casting gap.
  if (human) return 'human'
  if (filled >= required) return 'complete'
  if (filled > 0) return 'partial'
  return cartesiaCovers ? 'uncast' : 'nocover'
}

function summarise (languages) {
  const count = (s) => languages.filter((l) => l.status === s).length
  return {
    languages: languages.length,
    complete: count('complete'),
    partial: count('partial'),
    uncast: count('uncast'),
    nocover: count('nocover'),
    human: count('human'),
    knownonly: count('knownonly'),
    // Quiet insurance flag, never a completeness count: complete languages
    // that would lose a voice with no fallback cast.
    noBackup: languages.filter((l) => l.status === 'complete' && !l.hasFullBackup).length,
    // ── WHAT THE ESTATE IS ACTUALLY RUNNING ON ─────────────────────────────
    // Read from the courses' own stored voice_config, never from the provider
    // policy: xAI is being deprecated and these are the courses that would go
    // silent with it. A course counts once per distinct provider it stores, so
    // a course mixing Azure and xAI is in both totals and they need not sum to
    // the estate's course count.
    xaiLanguages: languages.filter((l) => l.xaiCourses > 0).length,
    xaiCourses: languages.reduce((n, l) => n + (l.xaiCourses || 0), 0),
    xaiRoles: languages.reduce((n, l) => n + (l.xaiRoles || 0), 0),
    providerTotals: providerTotals(languages),
    requiredPerLanguage: GENDERS.length * COMPLETE_RANKS,
    requiredRanks: COMPLETE_RANKS,
    trackedRanks: REQUIRED_RANKS,
  }
}

/** Estate-wide course/role counts per stored provider, biggest first, xAI first. */
function providerTotals (languages) {
  const tot = new Map()
  for (const l of languages) {
    for (const p of l.providersInUse || []) {
      if (!tot.has(p.provider)) tot.set(p.provider, { provider: p.provider, courses: 0, roles: 0 })
      tot.get(p.provider).courses += p.courses
      tot.get(p.provider).roles += p.roles
    }
  }
  return [...tot.values()].sort((a, b) => {
    if (a.provider === 'xai') return -1
    if (b.provider === 'xai') return 1
    return b.courses - a.courses || a.provider.localeCompare(b.provider)
  })
}

function notes () {
  return {
    completeness: `A language is complete when both genders have a primary voice cast (${GENDERS.length * COMPLETE_RANKS} voices: one male, one female). Backups are tracked up to ${REQUIRED_RANKS} ranks per gender but are insurance, not part of completeness — a missing backup shows as a quiet flag, never red. Tom's ruling, 2026-08-28.`,
    knownonly: 'A few languages are the KNOWN side of a course and the target side of none — nothing teaches them, so they have no phrase-voice worklist and are reported as "known only", never as a gap. They are on this screen so their guide voice can be cast: their learners hear instructions today, and without a row there was no way to cast who speaks them.',
    human: 'Human-voiced languages (Welsh, Breton, PDC) are reported as "human", never as a gap. A human recording wins wherever it exists and no TTS provider may ever be selected for them.',
    nocover: 'Cartesia does not publish every language. Where it does not, the ladder falls to Azure — that is "nocover", which is covered, just not by the default provider. Welsh is NOT in Cartesia\'s published list, which is why the flagship courses could never have been Cartesia-only.',
    writes: 'This screen writes voice_language_roles and nothing else. It never writes course_audio, algorithm_config or any course voice_config.',
    inUse: 'The "In use now" column is read from each course\'s own stored voice_config — the per-role provider, never the boilerplate `providers` block every course carries. "If re-rendered" is a different and hypothetical thing: what the provider policy would choose for a NEW render today. A language can be entirely on xAI now and say Azure there.',
    guide: 'The GUIDE slot is the instruction and encouragement voice, and it is cast against the language as a KNOWN language — those clips are messages to the learner, shared by every course with the same known language, not course material (Tom, 2026-08-29). It is one voice, not a male/female pair, and it NEVER counts toward completeness: only twelve of the estate\'s languages are ever a known language. "In use now" beside the slot is measured from the clips that exist, so casting confirms who already speaks rather than choosing from nothing.',
    castable: `Retired and unrenderable voices are not offered for casting: ${[...policy.RETIRED_PROVIDERS].join(', ')} plus rows with no engine. Their clips still play — retirement is from selection only — but a slot filled with a voice that cannot render would read as covered while being broken.`,
  }
}

/**
 * `all`, but a missing relation is an empty list rather than a 500.
 *
 * Used for `voice_guide_in_use`, whose migration may not have run on a given
 * environment yet. A screen that cannot say who speaks today is degraded; a
 * screen that will not load at all is broken, and the guide slot is an addition
 * to this page rather than its reason for existing.
 */
async function allSoft (db, table, columns) {
  try { return await all(db, table, columns) } catch (e) { return [] }
}

/** Page through PostgREST's 1000-row default so a 70-language estate is not truncated. */
async function all (db, table, columns) {
  const out = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await db.from(table).select(columns).range(from, from + page - 1)
    if (error) throw Object.assign(new Error(`${table}: ${error.message}`), { status: 500 })
    out.push(...(data || []))
    if (!data || data.length < page) return out
  }
}

/** The casting slots this registry knows about. 'phrase' is the default in the DB. */
const SLOTS = Object.freeze(['phrase', 'guide'])

module.exports = { build, paceOf, describeLanguage, providerOfRole, providersInUse, statusFor, rankName, sameLang, voiceKind, castable, cartesiaCandidates, guideCandidates, guideVoicesInUse, REQUIRED_RANKS, COMPLETE_RANKS, GENDERS, SLOTS }

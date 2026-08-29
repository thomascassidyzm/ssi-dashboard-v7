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
 * ── WHAT THIS MODULE WILL NEVER DO ──────────────────────────────────────────
 * It writes `voice_language_roles` and nothing else. It does not write
 * `course_audio`, `algorithm_config` or any course's `voice_config` — the Voice
 * Lab exports a config and a human applies it, which is the lab's standing rule
 * and survives this rework untouched.
 */

const policy = require('../shared/tts-provider-policy.cjs')
const { isHumanVoiceLang } = require('../shared/human-voice-courses.cjs')
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
async function build (db, opts = {}) {
  // Cartesia's live catalogue, keyed by two-letter code (params.cjs fetches it).
  // Merged in as UNREGISTERED candidates so a language with no Cartesia voice in
  // `voices` can still be cast from this screen — otherwise the estate's default
  // provider would be the one provider you could not choose. Casting one
  // registers it; see router.cjs.
  const catalogue = opts.cartesiaCatalogue || {}
  const [courses, voices, roles] = await Promise.all([
    all(db, 'courses', 'course_code, target_lang, status, voice_config'),
    all(db, 'voices', 'voice_id, type, tts_engine, display_name, human_name, languages, gender, is_active, notes'),
    all(db, 'voice_language_roles', 'language, gender, rank, voice_id, notes, assigned_by'),
  ])

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

  const languages = [...byLang.entries()]
    .map(([code, langCourses]) => describeLanguage({ code, langCourses, roles: rolesByLang.get(code) || [], voiceById, voices, catalogue }))
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
function describeLanguage ({ code, langCourses, roles, voiceById, voices, catalogue = {} }) {
  const human = isHumanVoiceLang(code)
  const cartesiaCovers = policy.cartesiaCoversLanguage(code)
  const inUse = providersInUse(langCourses)

  const slots = {}
  for (const g of GENDERS) {
    slots[g] = []
    for (let rank = 0; rank < REQUIRED_RANKS; rank += 1) {
      const role = roles.find((r) => r.gender === g && r.rank === rank)
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

  return {
    code,
    courses: langCourses.length,
    released: langCourses.filter((c) => c.status === 'released').length,
    human,
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
    status: statusFor({ human, cartesiaCovers, filled, required }),
    // Voices that CAN speak this language and are not yet cast — the candidate
    // list, so casting is a click rather than a search.
    candidates: voices
      .filter((v) => v.is_active !== false)
      .filter((v) => castable(v))
      .filter((v) => (v.languages || []).some((l) => sameLang(l, code)))
      .filter((v) => !roles.some((r) => r.voice_id === v.voice_id))
      .map((v) => ({ voiceId: v.voice_id, name: v.display_name || v.human_name || v.voice_id, kind: voiceKind(v), engine: v.tts_engine || null, gender: v.gender || null, registered: true }))
      .concat(cartesiaCandidates(code, catalogue, roles))
      .slice(0, 80),
  }
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
  return (catalogue[iso1] || [])
    .map((v) => ({
      voiceId: `cartesia_${v.id}`,
      name: `${v.name} — Cartesia`,
      kind: 'cartesia',
      engine: 'cartesia',
      gender: v.gender || null,
      registered: false,
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

function statusFor ({ human, cartesiaCovers, filled, required }) {
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
    human: 'Human-voiced languages (Welsh, Breton, PDC) are reported as "human", never as a gap. A human recording wins wherever it exists and no TTS provider may ever be selected for them.',
    nocover: 'Cartesia does not publish every language. Where it does not, the ladder falls to Azure — that is "nocover", which is covered, just not by the default provider. Welsh is NOT in Cartesia\'s published list, which is why the flagship courses could never have been Cartesia-only.',
    writes: 'This screen writes voice_language_roles and nothing else. It never writes course_audio, algorithm_config or any course voice_config.',
    inUse: 'The "In use now" column is read from each course\'s own stored voice_config — the per-role provider, never the boilerplate `providers` block every course carries. "If re-rendered" is a different and hypothetical thing: what the provider policy would choose for a NEW render today. A language can be entirely on xAI now and say Azure there.',
    castable: `Retired and unrenderable voices are not offered for casting: ${[...policy.RETIRED_PROVIDERS].join(', ')} plus rows with no engine. Their clips still play — retirement is from selection only — but a slot filled with a voice that cannot render would read as covered while being broken.`,
  }
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

module.exports = { build, describeLanguage, providerOfRole, providersInUse, statusFor, rankName, sameLang, voiceKind, castable, cartesiaCandidates, REQUIRED_RANKS, COMPLETE_RANKS, GENDERS }

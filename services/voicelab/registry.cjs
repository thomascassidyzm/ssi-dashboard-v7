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

/**
 * How many ranks make a (language, gender) slot complete.
 *
 * TASTE DEFAULT, Tom's to move (2026-08-28): rank 0 (primary) and rank 1 (first
 * backup), so a language is complete at FOUR voices — primary male, backup male,
 * primary female, backup female. Tom asked for "2 voices … with backups"; two
 * backups is the reading that makes "backups" plural without demanding six
 * voices for every one of ~70 languages. One number to change.
 */
const REQUIRED_RANKS = Number(process.env.VOICELAB_REQUIRED_RANKS || 2)

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
    all(db, 'courses', 'course_code, target_lang, status'),
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
      // Worst first: the screen's job is to show what is missing, so a language
      // needing casting must not be buried under a page of complete ones.
      const rank = (l) => (l.status === 'uncast' ? 0 : l.status === 'partial' ? 1 : l.status === 'nocover' ? 2 : l.status === 'human' ? 3 : 4)
      return rank(a) - rank(b) || b.courses - a.courses || a.code.localeCompare(b.code)
    })

  return { languages, summary: summarise(languages), notes: notes() }
}

/** One language's row. */
function describeLanguage ({ code, langCourses, roles, voiceById, voices, catalogue = {} }) {
  const human = isHumanVoiceLang(code)
  const cartesiaCovers = policy.cartesiaCoversLanguage(code)

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

  const filled = GENDERS.flatMap((g) => slots[g]).filter((s) => s.filled && s.active !== false).length
  const required = GENDERS.length * REQUIRED_RANKS

  return {
    code,
    courses: langCourses.length,
    released: langCourses.filter((c) => c.status === 'released').length,
    human,
    cartesiaCovers,
    // The provider a NEW render would actually use, asked of the same module
    // production asks, so this cannot claim something the render path denies.
    defaultProvider: providerFor(code),
    slots,
    filled,
    required,
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
    requiredPerLanguage: GENDERS.length * REQUIRED_RANKS,
    requiredRanks: REQUIRED_RANKS,
  }
}

function notes () {
  return {
    completeness: `A language is complete when both genders have all ${REQUIRED_RANKS} ranks cast (${GENDERS.length * REQUIRED_RANKS} voices: primary and backup, male and female). That count is Tom's taste call and is one env var, VOICELAB_REQUIRED_RANKS.`,
    human: 'Human-voiced languages (Welsh, Breton, PDC) are reported as "human", never as a gap. A human recording wins wherever it exists and no TTS provider may ever be selected for them.',
    nocover: 'Cartesia does not publish every language. Where it does not, the ladder falls to Azure — that is "nocover", which is covered, just not by the default provider. Welsh is NOT in Cartesia\'s published list, which is why the flagship courses could never have been Cartesia-only.',
    writes: 'This screen writes voice_language_roles and nothing else. It never writes course_audio, algorithm_config or any course voice_config.',
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

module.exports = { build, describeLanguage, statusFor, rankName, sameLang, voiceKind, castable, cartesiaCandidates, REQUIRED_RANKS, GENDERS }

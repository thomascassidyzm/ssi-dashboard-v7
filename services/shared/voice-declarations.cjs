/**
 * VOICE DECLARATIONS — one voice per course side, and the renderer cannot be handed another.
 *
 * This is step 0 of the migration and the cheapest thing in the whole audio rethink: it
 * touches no audio, costs nothing, and it is what makes every later step unambiguous.
 *
 * ── THE FAILURE IT CLOSES ───────────────────────────────────────────────────────────
 * `deu_for_eng` carries ten distinct voice ids on its German side and the English voice
 * appears on German rows. The unique constraint on `course_audio` is
 * (course_code, text_normalized, language, role, voice_id), so TWO VOICES FOR ONE SLOT IS
 * PERMITTED and something downstream picks. Every "the store looked right but the app
 * played the old one" bug lives in that gap. The hash makes a fix audible; the
 * DECLARATION is what makes the ambiguity impossible.
 *
 * ── WHAT THIS MODULE IS AND IS NOT ──────────────────────────────────────────────────
 * It is the pure logic — read a declaration, assert a render is on it, and gate a
 * declaration on capability. It holds no state and reaches no database. The declaration
 * itself is a VERSIONED CONFIG (algorithm_config key `voice_declarations`, immutable
 * versions addressed by hash), so "which voice was this course built under" is answerable
 * and rolling back is repointing. VOICELAB is where a human changes it.
 *
 * ── THE CAPABILITY GATE ─────────────────────────────────────────────────────────────
 * The destination is SSi staff clones used multilingually wherever the clone is capable.
 * `capable` has to mean something measurable or the ladder becomes taste wearing a lab
 * coat. So: a side may not declare a CLONE for a language where that (clone, language)
 * pair has no passing verdict from VOICELAB's Experiment 0. One check, at declaration
 * time, and it is the entire mechanism by which "wherever the clone is capable" stops
 * being a hope. Stock provider voices are not gated — they carry the provider's own
 * per-language catalogue entry, which is the evidence a clone does not have.
 *
 * ── NO SILENT FALLBACK, STATED AS POLICY RATHER THAN LEFT AS AN ACCIDENT ────────────
 * There is no automatic provider fallback anywhere in this corridor. A silent xAI→Azure
 * fallback means a course side quietly acquiring a second voice, which is the exact drift
 * this file exists to clean up. On repeated failure the item fails and is reported, and
 * choosing a different voice is a human decision taken in VOICELAB.
 */

const clipIdentity = require('./clip-identity.cjs')

/** The roles a course side can declare. `known` is the learner's own language. */
const ROLES = ['known', 'target1', 'target2', 'presentation']

/** A clone id is a bare 8-12 char token — never a provider locale name. */
const CLONE_ID = /^[a-z0-9]{8,12}$/i

class VoiceDeclarationError extends Error {
  constructor (message, detail = {}) { super(message); this.name = 'VoiceDeclarationError'; this.detail = detail }
}

/** Canonical spelling, always — `ara` and `xai_ara` are one voice. */
function canonical (voiceId) {
  return clipIdentity.tryCanonicalVoiceId(voiceId) || String(voiceId || '')
}

/**
 * Is this a staff clone rather than a stock provider voice?
 * Inferred from the id shape, because `course_audio` records no provider column and the
 * shape is the only signal there is. Stated as inference wherever it is used.
 */
function isClone (voiceId) {
  const c = canonical(voiceId)
  const bare = c.replace(/^(xai|azure|elevenlabs|narakeet)_/, '')
  // Azure and ElevenLabs ids carry locale/prefix structure; an xAI stock voice is one of
  // the five multilingual names or a per-language catalogue name.
  if (/^(azure|elevenlabs|narakeet)_/.test(c)) return false
  if (['ara', 'eve', 'leo', 'rex', 'sal'].includes(bare)) return false
  return CLONE_ID.test(bare) && /\d/.test(bare)
}

/**
 * The declared voice for a course side.
 * @param {object} declarations  the `voice_declarations` config object
 * @returns {string|null} canonical voice id, or null when the side has not declared
 */
function declaredVoice (declarations, courseCode, role) {
  const side = declarations?.courses?.[courseCode]
  if (!side) return null
  const v = side[role]
  return v ? canonical(v) : null
}

/** The declared loudness band for a course, falling back to the estate default. */
function declaredBand (declarations, courseCode) {
  return declarations?.courses?.[courseCode]?.loudness || declarations?.defaults?.loudness || null
}

/**
 * THE CORRIDOR. Called before a render, and it throws rather than warns.
 *
 * A warning here would be a discipline someone has to remember, which is the class of
 * defence this whole design is replacing with structure.
 */
function assertRenderVoice (declarations, courseCode, role, voiceId) {
  const declared = declaredVoice(declarations, courseCode, role)
  if (!declared) {
    throw new VoiceDeclarationError(
      `${courseCode}/${role} has not declared a voice — declare it in VOICELAB before rendering. ` +
      'An undeclared side is how a course acquires ten voices.',
      { courseCode, role, voiceId: canonical(voiceId) }
    )
  }
  const asked = canonical(voiceId)
  if (asked !== declared) {
    throw new VoiceDeclarationError(
      `${courseCode}/${role} is declared as ${declared}; this render asked for ${asked}. ` +
      'There is no automatic fallback: change the declaration in VOICELAB, deliberately, or fix the caller.',
      { courseCode, role, declared, asked }
    )
  }
  return declared
}

/**
 * THE CAPABILITY GATE, at declaration time.
 *
 * @param {object} capability  the `voice_capability` matrix: { [voiceId]: { [lang]: {verdict} } }
 *                             verdict is 'holds' | 'does-not-hold' | 'untested'
 * @returns {{allowed:boolean, reason:string, requiresExperiment:boolean}}
 */
function canDeclare (capability, voiceId, language) {
  const voice = canonical(voiceId)
  const lang = clipIdentity.tryCanonicalLanguage(language) || String(language || '').toLowerCase()

  if (!isClone(voice)) {
    return {
      allowed: true,
      requiresExperiment: false,
      reason: `${voice} is a stock provider voice — its per-language catalogue entry is the evidence, and the capability gate is for clones`,
    }
  }
  const verdict = capability?.[voice]?.[lang]?.verdict
  if (verdict === 'holds') {
    return { allowed: true, requiresExperiment: false, reason: `${voice} has a passing VOICELAB verdict for ${lang}` }
  }
  if (verdict === 'does-not-hold') {
    return {
      allowed: false,
      requiresExperiment: false,
      reason: `${voice} has a FAILING VOICELAB verdict for ${lang} — it may not be declared here`,
    }
  }
  return {
    allowed: false,
    requiresExperiment: true,
    reason: `${voice} has no VOICELAB verdict for ${lang}. Run Experiment 0 for that pair first — ` +
      'a clone is only used multilingually where it has been shown to hold.',
  }
}

/**
 * Validate a whole declarations object before it is saved. Returns every problem at once
 * rather than the first, because a half-corrected declaration is worse than none.
 */
function validateDeclarations (declarations, capability = {}, languageOfSide = () => null) {
  const errors = []
  const warnings = []
  const courses = declarations?.courses || {}
  for (const [courseCode, side] of Object.entries(courses)) {
    for (const role of Object.keys(side)) {
      if (role === 'loudness' || role === 'note') continue
      if (!ROLES.includes(role)) { warnings.push(`${courseCode}: unrecognised role "${role}"`); continue }
      const voice = canonical(side[role])
      if (!voice) { errors.push(`${courseCode}/${role}: empty voice`); continue }
      const lang = languageOfSide(courseCode, role)
      if (!lang) { warnings.push(`${courseCode}/${role}: language unknown, capability not checked for ${voice}`); continue }
      const c = canDeclare(capability, voice, lang)
      if (!c.allowed) errors.push(`${courseCode}/${role}: ${c.reason}`)
    }
  }
  return { valid: errors.length === 0, errors, warnings }
}

module.exports = {
  ROLES,
  VoiceDeclarationError,
  canonical,
  isClone,
  declaredVoice,
  declaredBand,
  assertRenderVoice,
  canDeclare,
  validateDeclarations,
}

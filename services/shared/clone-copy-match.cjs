/**
 * Clone-once, copy-everywhere — pure matching logic.
 *
 * No I/O here (no Supabase, no S3) so this is unit-testable in isolation.
 * Used by tools/course-optimization/clone-copy-pass.cjs (the standalone
 * copy-pass CLI) and services/phases/phase8-audio-v13.cjs (the live
 * getAudioNeeds/generate 'copy' bucket).
 */
const { normalizeForAudio } = require('./text-normalize.cjs')

// Tom's ruling: the xAI clone is the estate-wide English/known-side voice.
const CLONE_VOICE_ID = 'gfzdpspr5fdp'

// course_audio has no persisted speed column — speed lives in each course's
// voice_config, not on the rendered row, and voice_config can drift after the
// row was rendered (e.g. a course later switched its 'known' role to a
// different voice). For xAI specifically this is moot: xAI has no speed
// param, so every clone-voice render is at natural speed regardless of any
// configured speed (see buildTTSConfig in voice-config-service.cjs). Callers
// pass speedMatters=false for xAI (or any provider confirmed speed-invariant)
// so the key doesn't fold in an unreliable, potentially-stale speed value.
function roundSpeed(speed) {
  return Number(speed || 1.0).toFixed(2)
}

/**
 * Build the identity key for a known-side audio slot or a candidate source row.
 * Two slots are copy-compatible iff their keys are byte-identical.
 * @param {boolean} speedMatters - fold speed into the key (false for xAI: speed
 *   has no effect on the actual render, so it must never gate a copy).
 */
function computeAudioKey({ text, language, role, voiceId, speed }, speedMatters = true) {
  const base = `${normalizeForAudio(text)}|${language}|${role}|${voiceId}`
  return speedMatters ? `${base}|${roundSpeed(speed)}` : base
}

/**
 * Decide what to do for one destination slot, given the index of candidate
 * source rows (same match key, ANY course) already keyed by computeAudioKey.
 * Pure function — the index and the destination descriptor are both plain data.
 *
 * @param {object} slot - { text, language, role, voiceId, speed, courseCode }
 * @param {Map<string, object[]>} sourceIndex - key -> array of candidate rows
 *   { courseCode, s3Key, text, id, createdAt }
 * @param {boolean} speedMatters
 * @returns {{ action: string, key: string, source: object|null, reason: string }}
 */
function decideCopy(slot, sourceIndex, speedMatters = true) {
  const key = computeAudioKey(slot, speedMatters)
  const candidates = sourceIndex.get(key) || []

  // A matching row already owned by the destination course itself isn't a
  // copy candidate — it just needs linking (getAudioNeeds' toLink bucket),
  // not a new S3 object. Surface it distinctly so the tool stays idempotent
  // and never double-copies.
  const ownRow = candidates.find(c => c.courseCode === slot.courseCode)
  if (ownRow) {
    return { action: 'SKIP_ALREADY_OWNED', key, source: ownRow, reason: 'destination course already owns a matching course_audio row' }
  }

  const crossCourseCandidates = candidates.filter(c => c.courseCode !== slot.courseCode)
  if (!crossCourseCandidates.length) {
    return { action: 'SKIP_NO_SOURCE', key, source: null, reason: 'no matching clone-voice audio exists in any other course yet' }
  }

  // Deterministic pick when several courses have rendered the same phrase:
  // newest created_at wins, then largest id as a stable tiebreak (mirrors
  // pickPreferredAudioRow's tiebreak philosophy in audio-link-preference.cjs).
  const best = crossCourseCandidates.reduce((a, b) => {
    if (!a) return b
    const at = a.createdAt || ''
    const bt = b.createdAt || ''
    if (at !== bt) return at > bt ? a : b
    return String(a.id) > String(b.id) ? a : b
  }, null)

  return { action: 'COPY', key, source: best, reason: `exact match in ${best.courseCode}` }
}

module.exports = { CLONE_VOICE_ID, computeAudioKey, decideCopy, roundSpeed }

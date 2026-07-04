/**
 * Clone-once, copy-everywhere — pure matching logic.
 *
 * No I/O here (no Supabase, no S3) so this is unit-testable in isolation.
 * Used by tools/course-optimization/clone-copy-pass.cjs (the standalone
 * copy-pass CLI) and services/phases/phase8-audio-v13.cjs (the live
 * getAudioNeeds/generate 'copy' bucket).
 *
 * IDENTITY KEY (Tom's ruling): (language, exact normalized text, voice_id).
 * Role and course-direction are NOT part of the key — an English clip
 * rendered as known-side audio in a X_for_eng course is byte-identical
 * content to the same clip needed as target-side audio in eng_for_X, so it
 * satisfies either slot. Speed is likewise NOT part of the key: all audio is
 * rendered/expected at 1x; the player renders belt-appropriate pace live
 * (0.8x white / 0.9x yellow / 0.95x orange / 1.0x thereafter). See
 * isTrusted1x() below — some legacy Azure clips bake a non-1x rate into the
 * actual render and must not be silently treated as canonical.
 */
const { normalizeForAudio } = require('./text-normalize.cjs')

// Tom's ruling: the xAI clone is the estate-wide English voice (known-side in
// X_for_eng, target-side in eng_for_X — same voice, same content, either role).
const CLONE_VOICE_ID = 'gfzdpspr5fdp'

// TTS providers verified against services/tts-service.cjs:
//   - xai:        no speed param at all — always rendered at natural (1x) pace.
//   - elevenlabs: `speed` is destructured from config but never placed in the
//                 request body — the configured speed is silently ignored,
//                 so every render is at the API's fixed (1x-equivalent) pace.
//   - azure:      BAKES speed into the SSML `<prosody rate="...">` tag — a
//                 clip rendered with a non-1.0 configured speed has that
//                 pace physically baked into the stored MP3. course_audio
//                 has no persisted per-row speed, so a historical Azure row
//                 cannot be verified 1x after the fact. Untrusted as a
//                 canonical copy source until proven otherwise.
const TRUSTED_1X_ENGINES = new Set(['xai', 'elevenlabs'])

function isTrusted1xEngine(engine) {
  return TRUSTED_1X_ENGINES.has(engine)
}

/**
 * Build the identity key for an English audio slot or a candidate source row.
 * Two slots are copy-compatible iff their keys are byte-identical.
 */
function computeAudioKey({ text, language, voiceId }) {
  return `${normalizeForAudio(text)}|${language}|${voiceId}`
}

/**
 * Decide what to do for one destination slot, given the index of candidate
 * source rows (same match key, ANY course, ANY role) already keyed by
 * computeAudioKey. Pure function — the index and the destination descriptor
 * are both plain data.
 *
 * @param {object} slot - { text, language, voiceId, courseCode, role } (role is
 *   carried through for the eventual INSERT — it is NOT part of the match key)
 * @param {Map<string, object[]>} sourceIndex - key -> array of candidate rows
 *   { courseCode, s3Key, text, id, createdAt, role }
 * @returns {{ action: string, key: string, source: object|null, reason: string }}
 */
function decideCopy(slot, sourceIndex) {
  const key = computeAudioKey(slot)
  const candidates = sourceIndex.get(key) || []

  // A matching row already owned by the destination course itself isn't a
  // copy candidate — it just needs linking (getAudioNeeds' toLink bucket),
  // not a new row. Surface it distinctly so the tool stays idempotent and
  // never double-inserts.
  const ownRow = candidates.find(c => c.courseCode === slot.courseCode)
  if (ownRow) {
    return { action: 'SKIP_ALREADY_OWNED', key, source: ownRow, reason: 'destination course already owns a matching course_audio row' }
  }

  const crossCourseCandidates = candidates.filter(c => c.courseCode !== slot.courseCode)
  if (!crossCourseCandidates.length) {
    return { action: 'SKIP_NO_SOURCE', key, source: null, reason: 'no matching audio exists in any other course yet' }
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

  return { action: 'COPY', key, source: best, reason: `exact match in ${best.courseCode} (role=${best.role})` }
}

module.exports = { CLONE_VOICE_ID, TRUSTED_1X_ENGINES, isTrusted1xEngine, computeAudioKey, decideCopy }

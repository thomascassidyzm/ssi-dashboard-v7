/**
 * Audio-row LINK PREFERENCE — which course_audio row wins an FK link when
 * several rows match the same (text_normalized, language, role) key.
 *
 * Replaces bare-LIMIT-1 arbitrariness in the link passes (audit 06 §6.3):
 *   1. origin='human' (precious recordings) beats TTS
 *   2. newer created_at beats older (latest take/generation is current)
 *   3. larger id string (pure deterministic tiebreak — repeated link passes
 *      always pick the same row)
 *
 * Pure function, no I/O — rows need only { id, origin, created_at }.
 */
function pickPreferredAudioRow(a, b) {
  if (!a) return b
  if (!b) return a
  const aHuman = a.origin === 'human'
  const bHuman = b.origin === 'human'
  if (aHuman !== bHuman) return aHuman ? a : b
  const aT = a.created_at || ''
  const bT = b.created_at || ''
  if (aT !== bT) return aT > bT ? a : b
  return String(a.id) > String(b.id) ? a : b
}

module.exports = { pickPreferredAudioRow }

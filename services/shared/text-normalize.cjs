/**
 * Canonical text normalization for audio matching.
 * Used for course_audio.text_normalized column.
 *
 * RULES:
 * - lowercase (no initial capitalisation)
 * - trim whitespace
 * - collapse internal whitespace to single space
 * - strip trailing periods (meaningless noise)
 * - PRESERVE ! and ? (they affect TTS prosody)
 *
 * EVERY write to text_normalized and EVERY read/match against it
 * MUST use this function. No exceptions.
 */
function normalizeForAudio(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\.+$/, '')
}

module.exports = { normalizeForAudio }

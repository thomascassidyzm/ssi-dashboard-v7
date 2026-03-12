/**
 * Canonical text normalization for audio matching.
 * Must match the Supabase trigger on course_audio.text_normalized:
 *   regexp_replace(lower(trim(text)), '[.!?。？！]+$', '')
 *
 * RULES:
 * - lowercase (no initial capitalisation)
 * - trim whitespace
 * - collapse internal whitespace to single space
 * - strip trailing sentence-ending punctuation: . ! ? 。 ？ ！
 *   (stripped for MATCHING only — TTS still receives original text)
 *
 * EVERY write to text_normalized and EVERY read/match against it
 * MUST use this function. No exceptions.
 */
function normalizeForAudio(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?。？！]+$/, '')
}

module.exports = { normalizeForAudio }

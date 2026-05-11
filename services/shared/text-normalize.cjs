/**
 * Canonical text normalization for audio matching.
 * Must match the Supabase trigger on course_audio.text_normalized.
 *
 * RULES:
 * - lowercase (no initial capitalisation)
 * - trim whitespace
 * - collapse internal whitespace to single space
 * - strip trailing . ! 。 ！ (statements/exclamations)
 * - DO NOT strip trailing ? ？ — questions keep their ? so that
 *   "emin misin" and "emin misin?" can coexist as separate audio.
 *   TTS uses ? for question intonation so it matters.
 *
 * EVERY write to text_normalized and EVERY read/match against it
 * MUST use this function. No exceptions.
 */
function normalizeForAudio(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!。！]+$/, '')
}

module.exports = { normalizeForAudio }

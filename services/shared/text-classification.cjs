/**
 * Text classification helpers shared between production-api and phase8.
 *
 * Source of truth for "is this text generatable by TTS?" so the filter
 * applied during generation matches what the dashboard reports as
 * ungeneratable.
 */

/**
 * Check if text is punctuation-only (TTS can't generate these).
 * Punctuation should be taught contextually as part of M-LEGOs, not standalone.
 *
 * NOTE: Single non-Latin/digit characters are NOT considered ungeneratable.
 * Real single-character vocabulary exists in many languages (Japanese kanji,
 * Chinese hanzi, Korean syllables, etc.) and they should reach TTS — see
 * azure-tts-service.applyShortWordHint() for the language-aware coaxing.
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if text is empty or punctuation-only
 */
function isPunctuationOnly(text) {
  if (!text) return true
  const trimmed = text.trim()
  if (!trimmed) return true
  // Match common punctuation marks:
  // - Western: .,;:!?-()[]{}  (including inverted ¿¡)
  // - CJK: 。、？！；：…—–「」『』（）【】
  // - Arabic/RTL: ؟،؛ (U+061F, U+060C, U+061B)
  // - Hebrew: ־ (U+05BE maqaf)
  // - Armenian: ։ (U+0589 full stop)
  return /^[.,;:!?¿¡。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־։]+$/.test(trimmed)
}

module.exports = {
  isPunctuationOnly
}

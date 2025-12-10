/**
 * Gender Expansion Service
 *
 * Expands gender-marked text like "seguro(a)" to masculine or feminine form.
 *
 * Pattern: masculine ending followed by (feminine ending)
 * Examples:
 *   "estoy cansado(a)" → "estoy cansada" (feminine) or "estoy cansado" (masculine)
 *   "mis amigos(as)" → "mis amigas" (feminine) or "mis amigos" (masculine)
 *   "listo(a)" → "lista" (feminine) or "listo" (masculine)
 *
 * @module gender-expansion-service
 */

/**
 * Check if text contains gender markers
 * @param {string} text - Text to check
 * @returns {boolean} True if contains o(a) or similar pattern
 */
function hasGenderMarker(text) {
  // Match patterns like: o(a), os(as), ó(a)
  return /\w+\([^)]+\)/.test(text);
}

/**
 * Expand gender-marked text to specified gender
 *
 * @param {string} text - Text with gender markers like "seguro(a)"
 * @param {string} gender - 'f' for feminine, 'm' for masculine
 * @returns {string} Expanded text
 *
 * @example
 * expandGender("estoy cansado(a)", 'f') → "estoy cansada"
 * expandGender("estoy cansado(a)", 'm') → "estoy cansado"
 * expandGender("mis amigos(as)", 'f') → "mis amigas"
 */
function expandGender(text, gender) {
  if (!text || !hasGenderMarker(text)) {
    return text;
  }

  if (gender === 'f') {
    // Feminine: replace ending with feminine form
    // Pattern: word(femEnding) where we chop femEnding.length chars and add femEnding
    // "amigos(as)" → chop 2 chars ("os"), add "as" → "amigas"
    // "seguro(a)" → chop 1 char ("o"), add "a" → "segura"
    return text.replace(/(\w+)\((\w+)\)/g, (match, word, femEnd) => {
      const stem = word.slice(0, -femEnd.length);
      return stem + femEnd;
    });
  } else {
    // Masculine: just remove the parenthetical part
    return text.replace(/\([^)]+\)/g, '');
  }
}

/**
 * Determine gender from voice ID
 *
 * Convention:
 * - target1 = female voice
 * - target2 = male voice
 * - Or check voice name for gender indicators
 *
 * @param {string} voiceId - Voice identifier
 * @param {string} role - Sample role (target1, target2, etc.)
 * @returns {string} 'f' for feminine, 'm' for masculine
 */
function getGenderFromVoice(voiceId, role) {
  // Primary method: use role convention
  if (role === 'target1') return 'f';
  if (role === 'target2') return 'm';

  // Fallback: check voice ID for gender hints
  const lowerVoice = (voiceId || '').toLowerCase();

  // Common female voice indicators
  if (lowerVoice.includes('female') ||
      lowerVoice.includes('elvira') ||
      lowerVoice.includes('lucia') ||
      lowerVoice.includes('triana') ||
      lowerVoice.includes('xiaoxiao')) {
    return 'f';
  }

  // Default to masculine
  return 'm';
}

/**
 * Expand text for TTS generation based on voice/role
 *
 * @param {string} text - Text possibly containing gender markers
 * @param {string} voiceId - Voice identifier
 * @param {string} role - Sample role
 * @returns {string} Text expanded for the appropriate gender
 */
function expandForVoice(text, voiceId, role) {
  const gender = getGenderFromVoice(voiceId, role);
  return expandGender(text, gender);
}

module.exports = {
  hasGenderMarker,
  expandGender,
  getGenderFromVoice,
  expandForVoice
};

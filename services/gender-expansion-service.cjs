/**
 * Gender Expansion Service
 *
 * Expands gender-marked text like "seguro(a)" to masculine or feminine form.
 *
 * Pattern: masculine ending followed by (feminine ending)
 *
 * Supported patterns by language:
 *
 * Spanish/Italian:
 *   "estoy cansado(a)" → "estoy cansada" (feminine) or "estoy cansado" (masculine)
 *   "mis amigos(as)" → "mis amigas" (feminine) or "mis amigos" (masculine)
 *   "listo(a)" → "lista" (feminine) or "listo" (masculine)
 *
 * French:
 *   "je suis fatigué(e)" → "je suis fatiguée" (feminine) or "je suis fatigué" (masculine)
 *   "il est heureux(euse)" → "elle est heureuse" (feminine) or "il est heureux" (masculine)
 *   "il est actif(ive)" → "elle est active" (feminine) or "il est actif" (masculine)
 *   "le premier(ère)" → "la première" (feminine) or "le premier" (masculine)
 *   "il est complet(ète)" → "elle est complète" (feminine) or "il est complet" (masculine)
 *   "européen(ne)" → "européenne" (feminine) or "européen" (masculine)
 *
 * @module gender-expansion-service
 */

// =============================================================================
// FRENCH EXPANSION PATTERNS
// =============================================================================

/**
 * French gender marker patterns and their expansion rules
 * Order matters: longer patterns must come before shorter ones
 */
const FRENCH_PATTERNS = [
  // -eux(euse) → -euse (feminine) or -eux (masculine)
  { marker: /eux\(euse\)/g, femExpand: 'euse', mascExpand: 'eux' },
  // -if(ive) → -ive (feminine) or -if (masculine)
  { marker: /if\(ive\)/g, femExpand: 'ive', mascExpand: 'if' },
  // -er(ère) → -ère (feminine) or -er (masculine)
  { marker: /er\(ère\)/g, femExpand: 'ère', mascExpand: 'er' },
  // -et(ète) → -ète (feminine) or -et (masculine)
  { marker: /et\(ète\)/g, femExpand: 'ète', mascExpand: 'et' },
  // -en(ne) → -enne (feminine) or -en (masculine)
  { marker: /en\(ne\)/g, femExpand: 'enne', mascExpand: 'en' },
  // -on(ne) → -onne (feminine) or -on (masculine)
  { marker: /on\(ne\)/g, femExpand: 'onne', mascExpand: 'on' },
  // -é(e) → -ée (feminine) or -é (masculine) - must come last (shorter pattern)
  { marker: /é\(e\)/g, femExpand: 'ée', mascExpand: 'é' }
];

/**
 * Check if text contains gender markers
 * @param {string} text - Text to check
 * @returns {boolean} True if contains o(a), é(e), eux(euse), or similar pattern
 */
function hasGenderMarker(text) {
  // Match patterns like: o(a), os(as), ó(a), é(e), eux(euse), if(ive), er(ère), et(ète), en(ne), on(ne)
  // Note: \w doesn't match accented characters in JavaScript, so we use a character class
  // that includes common accented letters from Spanish, Italian, and French
  return /[a-zA-ZáéíóúàèìòùâêîôûäëïöüñçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑÇ]+\([^)]+\)/.test(text);
}

/**
 * Expand gender-marked text to specified gender
 *
 * Handles multiple patterns:
 * - Spanish/Italian: o(a), os(as) - stem replacement
 * - French: é(e), eux(euse), if(ive), er(ère), et(ète), en(ne), on(ne) - full replacement
 *
 * @param {string} text - Text with gender markers like "seguro(a)" or "fatigué(e)"
 * @param {string} gender - 'f' for feminine, 'm' for masculine
 * @returns {string} Expanded text
 *
 * @example
 * expandGender("estoy cansado(a)", 'f') → "estoy cansada"
 * expandGender("estoy cansado(a)", 'm') → "estoy cansado"
 * expandGender("mis amigos(as)", 'f') → "mis amigas"
 * expandGender("je suis fatigué(e)", 'f') → "je suis fatiguée"
 * expandGender("il est heureux(euse)", 'f') → "il est heureuse"
 */
function expandGender(text, gender) {
  if (!text || !hasGenderMarker(text)) {
    return text;
  }

  let result = text;

  // First, handle French-specific patterns (more complex replacements)
  for (const pattern of FRENCH_PATTERNS) {
    if (gender === 'f') {
      result = result.replace(pattern.marker, pattern.femExpand);
    } else {
      result = result.replace(pattern.marker, pattern.mascExpand);
    }
  }

  // Then handle Spanish/Italian style patterns: word(ending)
  // These use stem replacement: "amigos(as)" → chop 2 chars, add "as"
  if (gender === 'f') {
    // Feminine: replace ending with feminine form
    // Pattern: word(femEnding) where we chop femEnding.length chars and add femEnding
    // "amigos(as)" → chop 2 chars ("os"), add "as" → "amigas"
    // "seguro(a)" → chop 1 char ("o"), add "a" → "segura"
    result = result.replace(/(\w+)\((\w+)\)/g, (match, word, femEnd) => {
      const stem = word.slice(0, -femEnd.length);
      return stem + femEnd;
    });
  } else {
    // Masculine: just remove the parenthetical part
    result = result.replace(/\([^)]+\)/g, '');
  }

  return result;
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

/**
 * Analyze unmarked text for gender variants and expand for a specific role.
 *
 * This is the main integration point for TTS generation:
 * 1. Detects gender-variable words in the text (using gender-analyzer)
 * 2. Expands to the appropriate gender based on the role
 *
 * @param {string} text - Text to analyze (may or may not have markers)
 * @param {string} language - Language code ('spa', 'ita', 'fra')
 * @param {string} role - Voice role ('target1' = female, 'target2' = male)
 * @returns {{ originalText: string, expandedText: string, wasModified: boolean, hasGenderVariants: boolean }}
 *
 * @example
 * analyzeAndExpand("Estoy cansado", "spa", "target1")
 * // Returns:
 * // {
 * //   originalText: "Estoy cansado",
 * //   expandedText: "Estoy cansada",
 * //   wasModified: true,
 * //   hasGenderVariants: true
 * // }
 */
function analyzeAndExpand(text, language, role) {
  if (!text || typeof text !== 'string') {
    return {
      originalText: text || '',
      expandedText: text || '',
      wasModified: false,
      hasGenderVariants: false
    };
  }

  // Only process for target language roles
  if (role !== 'target1' && role !== 'target2') {
    return {
      originalText: text,
      expandedText: text,
      wasModified: false,
      hasGenderVariants: false
    };
  }

  // If text already has markers, just expand it
  if (hasGenderMarker(text)) {
    const gender = role === 'target1' ? 'f' : 'm';
    const expandedText = expandGender(text, gender);
    return {
      originalText: text,
      expandedText,
      wasModified: expandedText !== text,
      hasGenderVariants: true
    };
  }

  // Otherwise, analyze the text for gender-variable words
  // Lazy-load to avoid circular dependency
  const genderAnalyzer = require('./gender-analyzer.cjs');
  const analysis = genderAnalyzer.analyzeForGender(text, language);

  if (!analysis.hasGenderVariants) {
    return {
      originalText: text,
      expandedText: text,
      wasModified: false,
      hasGenderVariants: false
    };
  }

  // Return the appropriate variant based on role
  const expandedText = role === 'target1' ? analysis.variants.f : analysis.variants.m;

  return {
    originalText: text,
    expandedText,
    wasModified: expandedText !== text,
    hasGenderVariants: true
  };
}

/**
 * Batch analyze and expand multiple texts
 *
 * @param {Array<{text: string, language: string, role: string}>} items - Items to process
 * @returns {Array<{originalText: string, expandedText: string, wasModified: boolean}>}
 */
function batchAnalyzeAndExpand(items) {
  return items.map(item => analyzeAndExpand(item.text, item.language, item.role));
}

module.exports = {
  hasGenderMarker,
  expandGender,
  getGenderFromVoice,
  expandForVoice,
  analyzeAndExpand,
  batchAnalyzeAndExpand,
  FRENCH_PATTERNS
};

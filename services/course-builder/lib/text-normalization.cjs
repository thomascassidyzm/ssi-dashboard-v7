/**
 * Text normalization — pure functions for text comparison and vocabulary extraction.
 * No state, no DB access.
 */

const { isChinese } = require('./language-config.cjs');

/**
 * Normalize phrase text for deduplication comparison.
 * Strips trailing punctuation and lowercases.
 * e.g., "I want" == "I want." == "i want"
 */
function normalizePhrase(text) {
  if (!text) return '';
  return text.replace(/[.,!?;:؟،؛]+$/, '').toLowerCase().trim();
}

/**
 * Normalize text for LEGO containment checks (phonetic matching for TTS).
 *
 * KEEPS (phonetically significant):
 * - Accents: sì ≠ si, è ≠ e (different words!)
 * - Contractive punctuation: it's ≠ its, l'homme ≠ le homme
 *
 * REMOVES (cosmetic only):
 * - Capitalization: Sì = sì
 * - Non-contractive punctuation: sì, è = sì è
 */
function normalizeForContainment(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel (vowel marks, tanwin, shadda, sukun)
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')  // Strip all punctuation incl. Arabic comma/semicolon
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-based containment check for languages with bracket structures (e.g. German).
 * Checks that ALL words from the LEGO target appear in the phrase (in any position).
 */
function checkWordContainment(legoTarget, phraseTarget) {
  const legoWords = normalizeForContainment(legoTarget).split(/\s+/);
  const phraseWords = normalizeForContainment(phraseTarget).split(/\s+/);
  const phraseWordCounts = {};
  for (const w of phraseWords) {
    phraseWordCounts[w] = (phraseWordCounts[w] || 0) + 1;
  }
  const legoWordCounts = {};
  for (const w of legoWords) {
    legoWordCounts[w] = (legoWordCounts[w] || 0) + 1;
  }
  for (const [word, count] of Object.entries(legoWordCounts)) {
    if ((phraseWordCounts[word] || 0) < count) return false;
  }
  return true;
}

/**
 * Normalize text for ZUT comparison (strips diacritics for collision detection).
 * Used ONLY for comparing whether two words are "the same" for ZUT purposes.
 */
function normalizeForZUT(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // Strip Latin combining diacritics
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel
    .replace(/[¿¡.,;:!?؟،؛«»""。，！？、：；""]/g, '')
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Normalize text for vocab storage (PRESERVES diacritics).
 * Used for extracting and storing vocabulary.
 * CRITICAL: Diacritics are essential orthography in Romance languages.
 */
function normalizeForStorage(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')     // Strip Arabic tashkeel
    .replace(/[¿¡.,;:!?؟،؛«»""。，！？、：；""]/g, '')
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Legacy function — delegates to normalizeForZUT
 * @deprecated Use normalizeForZUT or normalizeForStorage explicitly
 */
function normalizeText(text, chinese = false) {
  return normalizeForZUT(text, chinese);
}

/**
 * Extract vocab units from text.
 * Returns the complete normalized text as a single unit.
 * The LEGO target IS the vocabulary — no splitting, no character decomposition.
 */
function extractVocab(text, chinese = false) {
  const normalized = normalizeForStorage(text, chinese);
  if (!normalized) return [];
  return [normalized];
}

module.exports = {
  normalizePhrase,
  normalizeForContainment,
  checkWordContainment,
  normalizeForZUT,
  normalizeForStorage,
  normalizeText,
  extractVocab,
};

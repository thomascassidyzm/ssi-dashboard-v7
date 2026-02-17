#!/usr/bin/env node

/**
 * Language-agnostic syllable counter
 * Handles European, CJK, Arabic, and other language families
 */

const { syllable } = require('syllable');

/**
 * Count syllables in text based on language
 * @param {string} text - The text to analyze
 * @param {string} langCode - ISO 639-3 language code (e.g., 'spa', 'zho', 'jpn')
 * @returns {number} - Syllable count
 */
function countSyllables(text, langCode) {
  if (!text || text.trim().length === 0) return 0;

  const lang = langCode.toLowerCase();

  // Chinese (Mandarin, Cantonese, etc.)
  if (lang === 'zho' || lang === 'cmn' || lang === 'yue') {
    return countChineseSyllables(text);
  }

  // Japanese
  if (lang === 'jpn') {
    return countJapaneseSyllables(text);
  }

  // Korean
  if (lang === 'kor') {
    return countKoreanSyllables(text);
  }

  // Arabic
  if (lang === 'ara' || lang === 'arb') {
    return countArabicSyllables(text);
  }

  // European languages (Romance, Germanic, Celtic)
  // eng, spa, fra, por, ita, deu, nld, cym, gle, bre, etc.
  return countEuropeanSyllables(text);
}

/**
 * Chinese: 1 character = 1 syllable
 * Counts Chinese characters (excludes punctuation, spaces, Latin chars)
 */
function countChineseSyllables(text) {
  // Unicode ranges for Chinese characters
  const chineseCharRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]/gu;
  const matches = text.match(chineseCharRegex);
  return matches ? matches.length : 0;
}

/**
 * Japanese: Count moras (similar to syllables)
 * Each hiragana/katakana character = 1 mora, except small tsu/ya/yu/yo
 * Kanji treated as 1-2 moras depending on common readings
 */
function countJapaneseSyllables(text) {
  let count = 0;

  // Hiragana range: \u3040-\u309f
  // Katakana range: \u30a0-\u30ff
  // Kanji range: \u4e00-\u9faf

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // Hiragana
    if (code >= 0x3040 && code <= 0x309f) {
      // Small kana (っ、ゃ、ゅ、ょ、ぁ、ぃ、ぅ、ぇ、ぉ) don't add mora
      if (char === 'っ' || char === 'ゃ' || char === 'ゅ' || char === 'ょ' ||
          char === 'ぁ' || char === 'ぃ' || char === 'ぅ' || char === 'ぇ' || char === 'ぉ') {
        continue;
      }
      count++;
    }
    // Katakana
    else if (code >= 0x30a0 && code <= 0x30ff) {
      // Small katakana (ッ、ャ、ュ、ョ、ァ、ィ、ゥ、ェ、ォ)
      if (char === 'ッ' || char === 'ャ' || char === 'ュ' || char === 'ョ' ||
          char === 'ァ' || char === 'ィ' || char === 'ゥ' || char === 'ェ' || char === 'ォ') {
        continue;
      }
      count++;
    }
    // Kanji - count as characters (usually 1-2 moras, average 1.5, round to 1 for simplicity)
    else if (code >= 0x4e00 && code <= 0x9faf) {
      count++;
    }
  }

  return count;
}

/**
 * Korean: Count Hangul syllable blocks
 * Each Hangul syllable block = 1 syllable
 */
function countKoreanSyllables(text) {
  // Hangul syllables: \uac00-\ud7a3 (complete syllable blocks)
  // Hangul jamo (components): \u1100-\u11ff, \u3130-\u318f, \ua960-\ua97f
  const hangulSyllableRegex = /[\uac00-\ud7a3]/g;
  const matches = text.match(hangulSyllableRegex);
  return matches ? matches.length : 0;
}

/**
 * Arabic: Approximate syllable count
 * Arabic syllables are complex (CV, CVC, CVV patterns)
 * Approximate: count vowel diacritics + estimate from consonants
 */
function countArabicSyllables(text) {
  // Remove diacritics and count Arabic letters
  // Arabic letters: \u0600-\u06ff
  const arabicLetterRegex = /[\u0600-\u06ff]/g;
  const letters = text.match(arabicLetterRegex);

  if (!letters) return 0;

  // Rough approximation: Arabic words average ~2-3 syllables per word
  // Count spaces to get word count, multiply by 2.5
  const words = text.trim().split(/\s+/).length;
  return Math.round(words * 2.5);
}

/**
 * European languages: Use syllable npm package
 * Works for: English, Spanish, French, Italian, Portuguese, German, Dutch, etc.
 */
function countEuropeanSyllables(text) {
  // syllable package works on English but approximates reasonably for Romance/Germanic
  return syllable(text);
}

/**
 * Get language code from course code
 * @param {string} courseCode - e.g., 'spa_for_eng', 'eng_for_zho'
 * @param {boolean} isTarget - true for target language, false for known language
 * @returns {string} - ISO 639-3 code
 */
function getLangFromCourse(courseCode, isTarget = true) {
  const parts = courseCode.split('_for_');
  if (parts.length !== 2) {
    throw new Error(`Invalid course code: ${courseCode}`);
  }

  // parts[0] = target language, parts[1] = known language
  const lang = isTarget ? parts[0] : parts[1];

  // Handle dialect codes (cym_s -> cym, cym_n -> cym)
  return lang.split('_')[0];
}

module.exports = {
  countSyllables,
  getLangFromCourse,
  countChineseSyllables,
  countJapaneseSyllables,
  countKoreanSyllables,
  countArabicSyllables,
  countEuropeanSyllables
};

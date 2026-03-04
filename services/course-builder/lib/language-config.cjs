/**
 * Language configuration — pure functions and constants.
 * No state, no DB access.
 */

// Language name mapping
const LANG_MAP = {
  'eng': 'English',
  'zho': 'Chinese',
  'ita': 'Italian',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'por': 'Portuguese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'rus': 'Russian',
  'cym': 'Welsh',
  'nld': 'Dutch',
  'bre': 'Breton',
  'gle': 'Irish',
  'gla': 'Scottish Gaelic',
  'cat': 'Catalan',
  'eus': 'Basque',
  'fin': 'Finnish',
  'swe': 'Swedish',
  'tur': 'Turkish',
  'hin': 'Hindi',
  'ben': 'Bengali',
  'pol': 'Polish',
  'ukr': 'Ukrainian',
  'ell': 'Greek',
  'heb': 'Hebrew',
  'tha': 'Thai',
  'vie': 'Vietnamese',
  'ind': 'Indonesian',
  'msa': 'Malay',
  'ron': 'Romanian',
  'ces': 'Czech',
  'hun': 'Hungarian',
  'dan': 'Danish',
  'nor': 'Norwegian',
  'lit': 'Lithuanian',
  'lav': 'Latvian',
  'est': 'Estonian',
  'slk': 'Slovak',
  'slv': 'Slovenian',
  'hrv': 'Croatian',
  'srp': 'Serbian',
  'bul': 'Bulgarian',
  'ang': 'Old English',
  'tgl': 'Tagalog',
  'swa': 'Swahili',
};

// Regional variant names (keyed by target part before _for_)
const DIALECT_NAMES = {
  'por_br': 'Brazilian Portuguese',
  'spa_mx': 'Mexican Spanish',
  'cym_n': 'North Welsh',
  'cym_s': 'South Welsh',
};

// Known language lookup (for non-English known languages)
// Falls back to LANG_MAP if not found here
const KNOWN_LANG_MAP = LANG_MAP;

// Language family mapping (for Ralph lesson lookup)
const LANG_FAMILY_MAP = {
  jpn: 'japanese', kor: 'korean', zho: 'cjk', cmn: 'cjk',
  deu: 'germanic', nld: 'germanic', swe: 'germanic',
  spa: 'romance', fra: 'romance', ita: 'romance', por: 'romance',
  ara: 'semitic', heb: 'semitic',
  cym: 'celtic', gle: 'celtic', gla: 'celtic',
};

// Chinese particles that don't get their own build-up phrase
const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

// Multi-language preposition list (for pattern classification)
const PREPOSITIONS = ['à', 'de', 'du', 'des', 'en', 'au', 'aux', 'avec', 'pour', 'dans', 'sur', 'von', 'mit', 'zu', 'für', 'auf', 'の', 'に', 'で', 'を', 'と', 'com', 'em', 'por', 'para', 'con', 'di', 'da', 'del'];

// Maximum syllables for a single LEGO (cognitive load cap)
const MAX_LEGO_SYLLABLES = 8;

// Syllable tiers for phrase complexity
const SYLLABLE_TIERS = {
  SHORT: { min: 3, max: 5 },
  MEDIUM: { min: 6, max: 11 },
  LONG: { min: 12, max: 20 },
};

// Average characters per syllable by target language
const CHARS_PER_SYLLABLE = {
  zho: 1.0,
  jpn: 1.5,
  kor: 1.0,
  fra: 3.5,
  spa: 3.2,
  deu: 3.0,
  eng: 3.8,
  ita: 3.0,
  por: 3.3,
  nld: 3.0,
  swe: 3.0,
  cym: 2.8,
  DEFAULT: 3.5,
};

/**
 * Extract target language code from course_code (e.g., "fra_for_eng" → "fra")
 */
function getTargetLang(courseCode) {
  const match = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_/);
  return match ? match[1] : 'DEFAULT';
}

/**
 * Extract known language code from course_code (e.g., "fra_for_eng" → "eng")
 */
function getKnownLang(courseCode) {
  const parts = courseCode.split('_for_');
  return parts[1] || 'eng';
}

/**
 * Get language name from course code (target language)
 */
function getLanguageName(courseCode) {
  const [targetPart] = courseCode.split('_for_');
  return DIALECT_NAMES[targetPart] || LANG_MAP[targetPart.split('_')[0]] || targetPart;
}

/**
 * Get language family from course code (for Ralph lesson lookup)
 */
function getLangFamily(courseCode) {
  const langCode = courseCode.split('_')[0];
  return LANG_FAMILY_MAP[langCode] || 'other';
}

/**
 * Detect if course uses character-level vocab (Chinese, Japanese, Korean target)
 */
function isChinese(courseCode) {
  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';
  const characterBasedLangs = ['zho', 'jpn', 'kor'];
  return characterBasedLangs.includes(targetLang);
}

/**
 * Get chars-per-syllable ratio for a language
 */
function getCharsPerSyllable(courseCode) {
  const targetLang = getTargetLang(courseCode);
  return CHARS_PER_SYLLABLE[targetLang] || CHARS_PER_SYLLABLE.DEFAULT;
}

/**
 * Get character thresholds for phrase complexity tiers
 */
function getCharThresholds(courseCode) {
  const targetLang = getTargetLang(courseCode);
  const charsPerSyl = CHARS_PER_SYLLABLE[targetLang] || CHARS_PER_SYLLABLE.DEFAULT;

  return {
    SHORT: {
      min: Math.round(SYLLABLE_TIERS.SHORT.min * charsPerSyl),
      max: Math.round(SYLLABLE_TIERS.SHORT.max * charsPerSyl),
    },
    MEDIUM: {
      min: Math.round(SYLLABLE_TIERS.MEDIUM.min * charsPerSyl),
      max: Math.round(SYLLABLE_TIERS.MEDIUM.max * charsPerSyl),
    },
    LONG: {
      min: Math.round(SYLLABLE_TIERS.LONG.min * charsPerSyl),
      max: 999,
    },
  };
}

/**
 * Check if a target text is a particle (should skip in build-up)
 */
function isParticle(target) {
  if (!target) return false;
  return PARTICLES.includes(target.trim());
}

/**
 * Estimate syllable count for a text in the target language.
 * Uses chars-per-syllable ratio as a language-aware proxy.
 */
function estimateSyllables(text, courseCode) {
  if (!text) return 0;
  const charsPerSyl = getCharsPerSyllable(courseCode);
  const cleaned = text.trim().replace(/[^\p{L}\p{N}\s]/gu, '');
  return Math.round(cleaned.length / charsPerSyl);
}

/**
 * Check if a LEGO target exceeds the syllable cap.
 * Returns { ok, syllables, max }
 */
function checkLegoSyllables(legoTarget, courseCode) {
  const syllables = estimateSyllables(legoTarget, courseCode);
  return { ok: syllables <= MAX_LEGO_SYLLABLES, syllables, max: MAX_LEGO_SYLLABLES };
}

/**
 * Get golden seed count from course info
 */
function getGoldenSeedCount(courseInfo) {
  return courseInfo?.quality_rules?.golden_seed_count || 10;
}

module.exports = {
  LANG_MAP,
  KNOWN_LANG_MAP,
  LANG_FAMILY_MAP,
  PARTICLES,
  PREPOSITIONS,
  SYLLABLE_TIERS,
  CHARS_PER_SYLLABLE,
  getTargetLang,
  getKnownLang,
  getLanguageName,
  getLangFamily,
  isChinese,
  getCharsPerSyllable,
  getCharThresholds,
  isParticle,
  getGoldenSeedCount,
  MAX_LEGO_SYLLABLES,
  estimateSyllables,
  checkLegoSyllables,
};

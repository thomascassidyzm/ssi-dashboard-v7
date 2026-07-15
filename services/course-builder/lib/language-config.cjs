/**
 * Language configuration — functions and constants for course building.
 * Uses language-code-service (CSV-backed) as the canonical source for
 * language names. No DB access.
 */

// Central language code service — loaded from language_codes.csv (ISO 639)
const languageCodeService = require('../../language-code-service.cjs');

// Regional variant names (keyed by target part before _for_)
const DIALECT_NAMES = {
  'por_br': 'Brazilian Portuguese',
  'spa_mx': 'Mexican Spanish',
  'cym_n': 'North Welsh',
  'cym_s': 'South Welsh',
  // Arabic dialects — keep these distinct from plain `ara` (Modern Standard
  // Arabic, resolved via the CSV). Without these, ara_eg/sy/lb would fall
  // through to getName('ara') and be mislabelled "Modern Standard Arabic".
  'ara_eg': 'Egyptian Arabic',
  'ara_sy': 'Syrian Arabic',
  'ara_lb': 'Lebanese Arabic',
  // Sinitic languages — distinct languages, NOT dialects of Mandarin (`zho`). Each
  // has its own lexis/grammar/written form. Without these they'd fall through to the
  // ISO code ("yue"/"hak"/"nan") and render as raw codes in seed text.
  'yue': 'Cantonese',           // HK/Guangzhou, colloquial written Cantonese (Traditional Han)
  'hak': 'Hakka',               // Taiwanese Sixian variety
  'nan': 'Taiwanese Hokkien',   // Min Nan, Taiwanese variety (Han + Tâi-lô)
  // Swiss German — Zürich (Züritüütsch), Dieth-lite spelling. See
  // docs/course-optimization/swiss-german-convention.md. Distinct product from deu_at.
  'deu_ch': 'Swiss German',
};

// Deprecated: callers should use languageCodeService.getName() directly.
// Kept for backward-compatible export only.
const LANG_MAP = {};
const KNOWN_LANG_MAP = {};

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
  tha: 1.5,
  mya: 1.5,
  lao: 1.5,
  khm: 1.5,
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
 * Get language name from course code (target language).
 * Uses language-code-service (CSV) as canonical source.
 * Falls back to DIALECT_NAMES for regional variants (por_br, cym_n, etc.).
 */
function getLanguageName(courseCode) {
  const [targetPart] = courseCode.split('_for_');
  // Check dialect variants first (por_br → "Brazilian Portuguese")
  if (DIALECT_NAMES[targetPart]) return DIALECT_NAMES[targetPart];
  // Use the CSV-backed service for standard codes
  const baseLang = targetPart.split('_')[0];
  const name = languageCodeService.getName(baseLang);
  // getName returns uppercase code if not found — fall back to raw code
  return name !== baseLang.toUpperCase() ? name : baseLang;
}

/**
 * Get language family from course code (for Ralph lesson lookup)
 */
function getLangFamily(courseCode) {
  const langCode = courseCode.split('_')[0];
  return LANG_FAMILY_MAP[langCode] || 'other';
}

/**
 * Detect if course uses character-level vocab (Chinese, Japanese, Thai, etc.)
 * Korean is excluded: it uses spaces between words, so word-level validation applies.
 */
function isChinese(courseCode) {
  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';
  // Korean (kor) uses spaces between words — treated as space-delimited, not CJK.
  // cmn (Mandarin) is character-based like zho.
  // yue (Cantonese) is written in Han characters like zho. hak/nan default to
  // romanization-friendly handling for now — revisit if built Han-primary.
  const characterBasedLangs = ['zho', 'cmn', 'yue', 'jpn', 'tha', 'mya', 'lao', 'khm'];
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

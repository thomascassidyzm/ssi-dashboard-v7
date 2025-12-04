#!/usr/bin/env node
/**
 * Language Code Service
 *
 * Centralized service for language code lookups and conversions.
 * Uses tools/sync/reference/language_codes.csv as the source of truth.
 *
 * ISO Standards:
 * - ISO 639-1: 2-letter codes (en, es, it, de, fr) - used for major languages
 * - ISO 639-3: 3-letter codes (cmn, yue) - used when no 2-letter exists
 *
 * The CSV contains the canonical codes. Non-standard codes like 'eng', 'spa', 'ita'
 * are mapped to their standard equivalents via LEGACY_TO_STANDARD.
 */

const fs = require('fs');
const path = require('path');

// Path to the CSV reference file
const CSV_PATH = path.join(__dirname, '..', 'tools', 'sync', 'reference', 'language_codes.csv');

// Lookup maps (populated from CSV at module load)
const codeToName = {};       // 'es' → 'Spanish'
const nameToCode = {};       // 'spanish' → 'es'
const codeToAzure = {};      // 'es' → 'es-ES'
const codeToElevenLabs = {}; // 'es' → 'es'
const codeToLegacy = {};     // 'es' → 'spa' (from CSV column, not computed)
const codeToGoogle = {};     // 'es' → 'es-ES' (Google BCP-47)

// Legacy non-standard codes → ISO standard codes
const LEGACY_TO_STANDARD = {
  'eng': 'en',
  'spa': 'es',
  'ita': 'it',
  'deu': 'de',
  'fra': 'fr',
  'por': 'pt',
  'jpn': 'ja',
  'kor': 'ko',
  'ara': 'ar',
  'hin': 'hi',
  'rus': 'ru',
  'nld': 'nl',
  'pol': 'pl',
  'tur': 'tr',
  'vie': 'vi',
  'tha': 'th',
  'swe': 'sv',
  'dan': 'da',
  'nor': 'no',
  'fin': 'fi',
  'ell': 'el',
  'heb': 'he',
  'ces': 'cs',
  'ron': 'ro',
  'hun': 'hu',
  'ukr': 'uk',
  'ind': 'id',
  'msa': 'ms',
  'cat': 'ca',
  'slk': 'sk',
  'bul': 'bg',
  'hrv': 'hr',
  'lit': 'lt',
  'slv': 'sl',
  'lav': 'lv',
  'est': 'et'
  // Note: cmn (Mandarin) stays as cmn - no 2-letter equivalent
};

// Reverse mapping: standard → legacy (for backward compatibility with directory names)
const STANDARD_TO_LEGACY = {};
for (const [legacy, standard] of Object.entries(LEGACY_TO_STANDARD)) {
  STANDARD_TO_LEGACY[standard] = legacy;
}

/**
 * Parse a CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {string[]} Array of values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Load and parse the CSV file
 * CSV format: language_code,language_name,azure_locale,elevenlabs_code,legacy_code,google_locale
 */
function loadCSV() {
  try {
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.trim().split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = parseCSVLine(line);
      const code = (parts[0] || '').toLowerCase();
      const name = parts[1] || '';
      const azureLocale = parts[2] || '';
      const elevenLabsCode = parts[3] || '';
      const legacyCode = parts[4] || '';
      const googleLocale = parts[5] || '';

      if (code && name) {
        codeToName[code] = name;
        nameToCode[name.toLowerCase()] = code;

        // Store provider codes if configured
        if (azureLocale) {
          codeToAzure[code] = azureLocale;
        }
        if (elevenLabsCode) {
          codeToElevenLabs[code] = elevenLabsCode;
        }
        if (legacyCode) {
          codeToLegacy[code] = legacyCode;
          // Also populate reverse mapping: legacyCode → code (for legacyToStandard)
          // Only add if not already in hardcoded LEGACY_TO_STANDARD
          if (!LEGACY_TO_STANDARD[legacyCode]) {
            LEGACY_TO_STANDARD[legacyCode] = code;
          }
        }
        if (googleLocale) {
          codeToGoogle[code] = googleLocale;
        }
      }
    }

    console.log(`[language-code-service] Loaded ${Object.keys(codeToName).length} language codes from CSV`);
    console.log(`[language-code-service] TTS configured: ${Object.keys(codeToAzure).length} Azure, ${Object.keys(codeToElevenLabs).length} ElevenLabs, ${Object.keys(codeToGoogle).length} Google`);
    console.log(`[language-code-service] Legacy mappings: ${Object.keys(LEGACY_TO_STANDARD).length} total (${Object.keys(codeToLegacy).length} from CSV)`);
  } catch (error) {
    console.error(`[language-code-service] Failed to load CSV: ${error.message}`);
    // Provide minimal fallback for common languages
    const fallback = {
      'en': 'English', 'es': 'Spanish', 'it': 'Italian', 'de': 'German',
      'fr': 'French', 'pt': 'Portuguese', 'ja': 'Japanese', 'ko': 'Korean',
      'zh': 'Chinese', 'cmn': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
      'ru': 'Russian', 'nl': 'Dutch', 'pl': 'Polish', 'tr': 'Turkish'
    };
    Object.assign(codeToName, fallback);
    for (const [code, name] of Object.entries(fallback)) {
      nameToCode[name.toLowerCase()] = code;
    }
  }
}

// Load CSV on module initialization
loadCSV();

// ============================================================================
// CORE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get the canonical code for a language (from CSV)
 * Accepts: language name, 2-letter code, 3-letter code, or legacy code
 *
 * @param {string} input - Language name or code
 * @returns {string|null} Canonical code from CSV, or null if not found
 */
function getCode(input) {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();

  // Check if it's a legacy code first
  if (LEGACY_TO_STANDARD[normalized]) {
    return LEGACY_TO_STANDARD[normalized];
  }

  // Check if it's already a valid code
  if (codeToName[normalized]) {
    return normalized;
  }

  // Check if it's a language name
  if (nameToCode[normalized]) {
    return nameToCode[normalized];
  }

  return null;
}

/**
 * Get the display name for a language code
 *
 * @param {string} code - Language code (any format)
 * @returns {string} Language name, or the code in uppercase if not found
 */
function getName(code) {
  if (!code) return '';
  const normalized = code.toLowerCase().trim();

  // Convert legacy to standard first
  const standardCode = LEGACY_TO_STANDARD[normalized] || normalized;

  // Look up in CSV
  if (codeToName[standardCode]) {
    return codeToName[standardCode];
  }

  // Fallback: return code in uppercase
  return code.toUpperCase();
}

/**
 * Check if a code is valid (exists in CSV or is a known legacy code)
 *
 * @param {string} code - Language code to check
 * @returns {boolean}
 */
function isValidCode(code) {
  if (!code) return false;
  const normalized = code.toLowerCase().trim();
  return !!(codeToName[normalized] || LEGACY_TO_STANDARD[normalized]);
}

// ============================================================================
// PROVIDER LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get the Azure locale for a language code
 * Throws if the language is not configured for Azure TTS
 *
 * @param {string} code - Language code (any format)
 * @returns {string} Azure locale (e.g., 'es-ES')
 * @throws {Error} If language is not configured for Azure
 */
function getAzureLocale(code) {
  if (!code) throw new Error('Language code is required');
  const standardCode = legacyToStandard(code.toLowerCase().trim());

  if (!codeToAzure[standardCode]) {
    const name = getName(standardCode);
    throw new Error(`Azure TTS not configured for ${name} (${standardCode}). Add azure_locale to language_codes.csv`);
  }

  return codeToAzure[standardCode];
}

/**
 * Get the ElevenLabs code for a language code
 * Throws if the language is not configured for ElevenLabs TTS
 *
 * @param {string} code - Language code (any format)
 * @returns {string} ElevenLabs code
 * @throws {Error} If language is not configured for ElevenLabs
 */
function getElevenLabsCode(code) {
  if (!code) throw new Error('Language code is required');
  const standardCode = legacyToStandard(code.toLowerCase().trim());

  if (!codeToElevenLabs[standardCode]) {
    const name = getName(standardCode);
    throw new Error(`ElevenLabs TTS not configured for ${name} (${standardCode}). Add elevenlabs_code to language_codes.csv`);
  }

  return codeToElevenLabs[standardCode];
}

/**
 * Check if a language has Azure TTS configured
 *
 * @param {string} code - Language code (any format)
 * @returns {boolean}
 */
function hasAzure(code) {
  if (!code) return false;
  const standardCode = legacyToStandard(code.toLowerCase().trim());
  return !!codeToAzure[standardCode];
}

/**
 * Check if a language has ElevenLabs TTS configured
 *
 * @param {string} code - Language code (any format)
 * @returns {boolean}
 */
function hasElevenLabs(code) {
  if (!code) return false;
  const standardCode = legacyToStandard(code.toLowerCase().trim());
  return !!codeToElevenLabs[standardCode];
}

/**
 * Get the Google BCP-47 locale for a language code
 * Throws if the language is not configured for Google TTS
 *
 * @param {string} code - Language code (any format)
 * @returns {string} Google BCP-47 locale (e.g., 'es-ES', 'cmn-CN')
 * @throws {Error} If language is not configured for Google
 */
function getGoogleLocale(code) {
  if (!code) throw new Error('Language code is required');
  const standardCode = legacyToStandard(code.toLowerCase().trim());

  if (!codeToGoogle[standardCode]) {
    const name = getName(standardCode);
    throw new Error(`Google TTS not configured for ${name} (${standardCode}). Add google_locale to language_codes.csv`);
  }

  return codeToGoogle[standardCode];
}

/**
 * Check if a language has Google TTS configured
 *
 * @param {string} code - Language code (any format)
 * @returns {boolean}
 */
function hasGoogle(code) {
  if (!code) return false;
  const standardCode = legacyToStandard(code.toLowerCase().trim());
  return !!codeToGoogle[standardCode];
}

// ============================================================================
// LEGACY CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert a legacy non-standard code to the ISO standard code
 * e.g., 'spa' → 'es', 'eng' → 'en', 'cmn' → 'cmn'
 *
 * @param {string} code - Legacy or standard code
 * @returns {string} ISO standard code
 */
function legacyToStandard(code) {
  if (!code) return code;
  const normalized = code.toLowerCase().trim();
  return LEGACY_TO_STANDARD[normalized] || normalized;
}

/**
 * Convert a standard ISO code to the legacy format used in directory names
 * e.g., 'es' → 'spa', 'en' → 'eng', 'cy' → 'cym'
 *
 * @param {string} code - Standard ISO code
 * @returns {string} Legacy code (or original if no legacy equivalent)
 */
function standardToLegacy(code) {
  if (!code) return code;
  const normalized = code.toLowerCase().trim();
  // First check hardcoded mapping, then CSV data, then return original
  return STANDARD_TO_LEGACY[normalized] || codeToLegacy[normalized] || normalized;
}

// ============================================================================
// COURSE CODE UTILITIES
// ============================================================================

/**
 * Parse a course code into its components
 * e.g., 'spa_for_eng' → { target: 'es', known: 'en', targetLegacy: 'spa', knownLegacy: 'eng', targetName: 'Spanish', knownName: 'English' }
 *
 * @param {string} courseCode - Course code in format target_for_known
 * @returns {object|null} Parsed components, or null if invalid format
 */
function parseCourseCode(courseCode) {
  if (!courseCode) return null;

  const match = courseCode.match(/^([a-z]+)_for_([a-z]+)$/i);
  if (!match) return null;

  const targetLegacy = match[1].toLowerCase();
  const knownLegacy = match[2].toLowerCase();

  const target = legacyToStandard(targetLegacy);
  const known = legacyToStandard(knownLegacy);

  return {
    target,
    known,
    targetLegacy,
    knownLegacy,
    targetName: getName(target),
    knownName: getName(known)
  };
}

/**
 * Generate a course code from language codes
 * e.g., ('en', 'es') → 'es_for_en' (using legacy format for directories)
 *
 * @param {string} known - Known language code
 * @param {string} target - Target language code
 * @returns {string} Course code in legacy format
 */
function toCourseCode(known, target) {
  const knownLegacy = standardToLegacy(known);
  const targetLegacy = standardToLegacy(target);
  return `${targetLegacy}_for_${knownLegacy}`;
}

/**
 * Generate a language pair string (for voice assignments)
 * e.g., ('en', 'es') → 'en-es'
 *
 * @param {string} known - Known language code
 * @param {string} target - Target language code
 * @returns {string} Language pair in standard format
 */
function toLanguagePair(known, target) {
  const knownStd = legacyToStandard(known);
  const targetStd = legacyToStandard(target);
  return `${knownStd}-${targetStd}`;
}

/**
 * Parse a language pair string
 * e.g., 'en-es' → { known: 'en', target: 'es', knownName: 'English', targetName: 'Spanish' }
 *
 * @param {string} pair - Language pair string
 * @returns {object|null} Parsed components, or null if invalid format
 */
function fromLanguagePair(pair) {
  if (!pair) return null;

  const parts = pair.split('-');
  if (parts.length !== 2) return null;

  const known = parts[0].toLowerCase();
  const target = parts[1].toLowerCase();

  return {
    known,
    target,
    knownName: getName(known),
    targetName: getName(target)
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core lookups
  getCode,
  getName,
  isValidCode,

  // Provider lookups (throw if not configured)
  getAzureLocale,
  getElevenLabsCode,
  getGoogleLocale,
  hasAzure,
  hasElevenLabs,
  hasGoogle,

  // Legacy conversions
  legacyToStandard,
  standardToLegacy,

  // Course code utilities
  parseCourseCode,
  toCourseCode,
  toLanguagePair,
  fromLanguagePair,

  // Direct access to mappings (for advanced use)
  LEGACY_TO_STANDARD,
  STANDARD_TO_LEGACY,

  // Reload CSV (useful for testing)
  reload: loadCSV
};

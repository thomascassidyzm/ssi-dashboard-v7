/**
 * Data Finders - Resilient data extraction from various wrapper formats
 *
 * Principle: Be precise when WRITING data, be resilient when READING data.
 * These functions find the data you need regardless of how it's wrapped.
 */

/**
 * Find baskets in whatever structure they're wrapped in
 * Looks for objects containing lego/practice_phrases structures
 * Prefers nested collections (e.g., data.baskets) over mixed top-level
 *
 * @param {object} data - Raw data from lego_baskets.json
 * @returns {object|null} - The baskets object, or null if not found
 */
function findBaskets(data) {
  if (!data || typeof data !== 'object') return null;

  // First, check common wrapper paths - prefer these over top-level
  const wrapperPaths = [
    'baskets',
    'data.baskets',
    'lego_baskets',
    'content.baskets',
    'data'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeBaskets(value)) return value;
  }

  // If no nested collection found, check if top-level is baskets
  // (filtering out known wrapper keys)
  const wrapperKeys = new Set(['baskets', 'data', 'lego_baskets', 'content', 'metadata', 'version']);
  const topLevelBaskets = {};
  let foundAny = false;

  for (const [key, value] of Object.entries(data)) {
    if (!wrapperKeys.has(key) && value && typeof value === 'object' && (value.lego || value.practice_phrases || value.seed_id)) {
      topLevelBaskets[key] = value;
      foundAny = true;
    }
  }

  if (foundAny) return topLevelBaskets;

  // Search all top-level keys for nested basket collections
  for (const [key, value] of Object.entries(data)) {
    if (looksLikeBaskets(value)) return value;
  }

  return null;
}

/**
 * Check if an object looks like a baskets collection
 */
function looksLikeBaskets(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const values = Object.values(obj);
  if (values.length === 0) return false;

  // Check if items look like baskets (have lego, practice_phrases, or seed_id)
  return values.some(v =>
    v && typeof v === 'object' && (
      v.lego ||
      v.practice_phrases ||
      v.seed_id ||
      (v.known && v.target)  // Alternative basket format
    )
  );
}

/**
 * Find LEGO pairs in whatever structure they're wrapped in
 *
 * @param {object} data - Raw data from lego_pairs.json
 * @returns {object|null} - The lego pairs object, or null if not found
 */
function findLegoPairs(data) {
  if (!data || typeof data !== 'object') return null;

  // Direct match
  if (looksLikeLegoPairs(data)) return data;

  // Common wrappers
  const wrapperPaths = [
    'lego_pairs',
    'pairs',
    'data.lego_pairs',
    'data.pairs',
    'data',
    'content.lego_pairs'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeLegoPairs(value)) return value;
  }

  // Search top-level keys
  for (const [key, value] of Object.entries(data)) {
    if (looksLikeLegoPairs(value)) return value;
  }

  return null;
}

/**
 * Check if an object looks like a LEGO pairs collection
 */
function looksLikeLegoPairs(obj) {
  if (!obj || typeof obj !== 'object') return false;

  // Could be array or object
  const items = Array.isArray(obj) ? obj : Object.values(obj);
  if (items.length === 0) return false;

  // Check if items look like LEGO pairs (have known/target or source/target)
  return items.some(v =>
    v && typeof v === 'object' && (
      (v.known && v.target) ||
      (v.source && v.target) ||
      (v.lego && v.lego.known && v.lego.target)
    )
  );
}

/**
 * Find seeds in whatever structure they're wrapped in
 *
 * @param {object} data - Raw data from seeds.json or similar
 * @returns {array|null} - The seeds array, or null if not found
 */
function findSeeds(data) {
  if (!data) return null;

  // Direct match - data is array of seeds
  if (looksLikeSeeds(data)) return data;

  // Common wrappers
  const wrapperPaths = [
    'seeds',
    'data.seeds',
    'data',
    'content.seeds',
    'seed_pairs'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeSeeds(value)) return value;
  }

  // Search top-level keys
  if (typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (looksLikeSeeds(value)) return value;
    }
  }

  return null;
}

/**
 * Check if data looks like a seeds collection
 */
function looksLikeSeeds(data) {
  if (!Array.isArray(data) || data.length === 0) return false;

  // Check if items look like seeds (have id/seed_id and known/target or english/translation)
  return data.some(v =>
    v && typeof v === 'object' && (
      (v.seed_id || v.id) && (
        (v.known && v.target) ||
        (v.english && v.translation) ||
        (v.source && v.target)
      )
    )
  );
}

/**
 * Find voice assignments in whatever structure
 *
 * @param {object} data - Raw data from voices.json or similar
 * @param {string} courseCode - Course code for course-specific lookup
 * @returns {object|null} - Voice assignments object, or null if not found
 */
function findVoiceAssignments(data, courseCode) {
  if (!data || typeof data !== 'object') return null;

  // Direct course assignment
  if (data.course_assignments?.[courseCode]) {
    return data.course_assignments[courseCode];
  }

  // Language pair lookup
  if (courseCode && data.language_pair_assignments) {
    const langPairKey = extractLanguagePairKey(courseCode);
    if (langPairKey && data.language_pair_assignments[langPairKey]) {
      return data.language_pair_assignments[langPairKey];
    }
  }

  // Direct match - looks like voice assignments
  if (looksLikeVoiceAssignments(data)) return data;

  // Common wrappers
  const wrapperPaths = [
    'voices',
    'assignments',
    'voice_assignments',
    'data.voices'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeVoiceAssignments(value)) return value;
  }

  return null;
}

/**
 * Check if object looks like voice assignments
 */
function looksLikeVoiceAssignments(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  // Should have role keys like source, target1, target2, presentation
  const roleKeys = ['source', 'target1', 'target2', 'target', 'presentation', 'narrator'];
  return roleKeys.some(key => obj[key] && typeof obj[key] === 'string');
}

/**
 * Find manifest data in whatever structure
 *
 * @param {object} data - Raw manifest data
 * @returns {object|null} - Manifest object, or null if not found
 */
function findManifest(data) {
  if (!data || typeof data !== 'object') return null;

  // Direct match
  if (looksLikeManifest(data)) return data;

  // Common wrappers
  const wrapperPaths = [
    'manifest',
    'course_manifest',
    'data.manifest',
    'data'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeManifest(value)) return value;
  }

  return null;
}

/**
 * Check if object looks like a course manifest
 */
function looksLikeManifest(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  // Should have seeds array or courseCode or version
  return (
    (obj.seeds && Array.isArray(obj.seeds)) ||
    (obj.courseCode || obj.course_code) ||
    (obj.version && obj.audio) ||
    (obj._stub === true)  // Stub manifest
  );
}

/**
 * Find audio metadata/samples in whatever structure
 *
 * @param {object} data - Raw audio data
 * @returns {object|null} - Audio samples object, or null if not found
 */
function findAudioSamples(data) {
  if (!data || typeof data !== 'object') return null;

  // Direct match
  if (looksLikeAudioSamples(data)) return data;

  // Common wrappers
  const wrapperPaths = [
    'samples',
    'audio',
    'audio_samples',
    'data.samples',
    'data.audio'
  ];

  for (const path of wrapperPaths) {
    const value = getNestedValue(data, path);
    if (looksLikeAudioSamples(value)) return value;
  }

  return null;
}

/**
 * Check if object looks like audio samples collection
 */
function looksLikeAudioSamples(obj) {
  if (!obj || typeof obj !== 'object') return false;

  const items = Array.isArray(obj) ? obj : Object.values(obj);
  if (items.length === 0) return false;

  // Check if items look like audio samples (have uuid, url, or audio_url)
  return items.some(v =>
    v && typeof v === 'object' && (
      v.uuid ||
      v.audio_url ||
      v.url ||
      v.s3_key
    )
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a nested value from an object using dot notation
 * @param {object} obj - The object to search
 * @param {string} path - Dot-separated path (e.g., 'data.baskets')
 * @returns {*} - The value at the path, or undefined
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Extract language pair key from course code
 * e.g., 'spa_for_eng_v2' -> 'en-es'
 */
function extractLanguagePairKey(courseCode) {
  const match = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})/);
  if (!match) return null;

  const [, targetLang, knownLang] = match;

  // Convert ISO 639-3 to ISO 639-1
  const langMap = {
    eng: 'en', spa: 'es', ita: 'it', fra: 'fr',
    deu: 'de', cmn: 'cmn', por: 'pt', jpn: 'ja',
    cym: 'cy', bre: 'br', glv: 'gv', cat: 'ca'
  };

  const knownShort = langMap[knownLang] || knownLang.substring(0, 2);
  const targetShort = langMap[targetLang] || targetLang.substring(0, 2);

  return `${knownShort}-${targetShort}`;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Main finders
  findBaskets,
  findLegoPairs,
  findSeeds,
  findVoiceAssignments,
  findManifest,
  findAudioSamples,

  // Type checkers (for testing/validation)
  looksLikeBaskets,
  looksLikeLegoPairs,
  looksLikeSeeds,
  looksLikeVoiceAssignments,
  looksLikeManifest,
  looksLikeAudioSamples,

  // Utilities
  getNestedValue,
  extractLanguagePairKey
};

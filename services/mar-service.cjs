/**
 * MAR (Master Audio Registry) Service
 *
 * Manages the voice-based audio sample database.
 * All samples are organized by voice ID, not by language.
 */

const fs = require('fs-extra');
const path = require('path');

const MAR_BASE = path.join(__dirname, '..', 'samples_database');

/**
 * Normalize text for matching (case-insensitive, ignore trailing punctuation)
 * Audio is the same regardless of capitalization or trailing punctuation
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/, ''); // Remove trailing punctuation
}

/**
 * Load voice registry
 *
 * @returns {Promise<object>} Voice registry object
 */
async function loadVoiceRegistry() {
  const registryPath = path.join(MAR_BASE, 'voices.json');
  return await fs.readJson(registryPath);
}

/**
 * Save voice registry
 *
 * @param {object} registry - Voice registry object
 */
async function saveVoiceRegistry(registry) {
  const registryPath = path.join(MAR_BASE, 'voices.json');
  registry.last_updated = new Date().toISOString();
  await fs.writeJson(registryPath, registry, { spaces: 2 });
}

/**
 * Load all samples for a specific voice
 *
 * @param {string} voiceId - Voice ID (e.g., 'elevenlabs_21m00Tcm4TlvDq8ikWAM')
 * @returns {Promise<object>} Voice samples object
 */
async function loadVoiceSamples(voiceId) {
  const samplesPath = path.join(MAR_BASE, 'voices', voiceId, 'samples.json');

  if (await fs.pathExists(samplesPath)) {
    return await fs.readJson(samplesPath);
  }

  // Voice exists but no samples yet - create empty structure
  return {
    voice_id: voiceId,
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    sample_count: 0,
    samples: {}
  };
}

/**
 * Save voice samples
 *
 * @param {string} voiceId - Voice ID
 * @param {object} voiceSamples - Voice samples object
 */
async function saveVoiceSamples(voiceId, voiceSamples) {
  const samplesPath = path.join(MAR_BASE, 'voices', voiceId, 'samples.json');
  await fs.ensureDir(path.dirname(samplesPath));
  await fs.writeJson(samplesPath, voiceSamples, { spaces: 2 });
}

/**
 * Find existing sample by text+role+language
 * Searches through the specific voice's samples
 *
 * @param {object} voiceSamples - Voice samples object from loadVoiceSamples()
 * @param {string} text - The phrase/text
 * @param {string} role - Sample role
 * @param {string} language - Language code
 * @param {string} cadence - Speech cadence (default: 'natural')
 * @returns {object|null} Sample with UUID if exists, null otherwise
 */
function findExistingSample(voiceSamples, text, role, language, cadence = 'natural') {
  const normalizedText = normalizeText(text);

  for (const [uuid, sample] of Object.entries(voiceSamples.samples)) {
    if (
      normalizeText(sample.text) === normalizedText &&
      sample.role === role &&
      sample.language === language &&
      sample.cadence === cadence
    ) {
      return { uuid, ...sample };
    }
  }
  return null;
}

/**
 * Add or update sample in voice database
 *
 * @param {string} voiceId - Voice ID
 * @param {string} uuid - Sample UUID
 * @param {object} sampleData - Sample data (text, language, role, etc.)
 */
async function saveSample(voiceId, uuid, sampleData) {
  const voiceSamples = await loadVoiceSamples(voiceId);

  voiceSamples.samples[uuid] = {
    ...sampleData,
    generated_at: sampleData.generated_at || new Date().toISOString()
  };

  voiceSamples.sample_count = Object.keys(voiceSamples.samples).length;
  voiceSamples.last_updated = new Date().toISOString();

  await saveVoiceSamples(voiceId, voiceSamples);

  // Update voice registry sample count
  const registry = await loadVoiceRegistry();
  if (registry.voices[voiceId]) {
    registry.voices[voiceId].sample_count = voiceSamples.sample_count;
    await saveVoiceRegistry(registry);
  }
}

/**
 * Get voice ID for a course role
 *
 * @param {string} courseCode - Course code (e.g., 'ita_for_eng_10seeds')
 * @param {string} role - Role ('target1', 'target2', 'source', 'presentation')
 * @returns {Promise<string>} Voice ID
 * @throws {Error} If no voice assigned for course+role
 */
async function getVoiceForCourseRole(courseCode, role) {
  const registry = await loadVoiceRegistry();
  const assignment = registry.course_assignments[courseCode];

  if (!assignment || !assignment[role]) {
    throw new Error(`No voice assigned for ${courseCode} role ${role}`);
  }

  return assignment[role];
}

/**
 * Get all voice IDs for a course
 *
 * @param {string} courseCode - Course code
 * @returns {Promise<object>} Object mapping role to voice ID
 */
async function getVoicesForCourse(courseCode) {
  const registry = await loadVoiceRegistry();
  const assignment = registry.course_assignments[courseCode];

  if (!assignment) {
    throw new Error(`No voice assignments for course ${courseCode}`);
  }

  return assignment;
}

/**
 * Create a new voice entry
 *
 * @param {string} voiceId - Voice ID
 * @param {object} voiceData - Voice metadata
 */
async function createVoice(voiceId, voiceData) {
  const registry = await loadVoiceRegistry();

  if (registry.voices[voiceId]) {
    throw new Error(`Voice ${voiceId} already exists`);
  }

  registry.voices[voiceId] = {
    ...voiceData,
    sample_count: 0,
    created_at: new Date().toISOString()
  };

  await saveVoiceRegistry(registry);

  // Create empty samples file
  await saveVoiceSamples(voiceId, {
    voice_id: voiceId,
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    sample_count: 0,
    samples: {}
  });
}

/**
 * Get voice metadata
 *
 * @param {string} voiceId - Voice ID
 * @returns {Promise<object>} Voice metadata
 */
async function getVoiceMetadata(voiceId) {
  const registry = await loadVoiceRegistry();

  if (!registry.voices[voiceId]) {
    throw new Error(`Voice ${voiceId} not found`);
  }

  return registry.voices[voiceId];
}

/**
 * Get a specific sample by UUID
 *
 * @param {string} voiceId - Voice ID
 * @param {string} uuid - Sample UUID
 * @returns {Promise<object|null>} Sample data or null if not found
 */
async function getSample(voiceId, uuid) {
  const voiceSamples = await loadVoiceSamples(voiceId);
  return voiceSamples.samples[uuid] || null;
}

/**
 * Load encouragement index from registry
 * Returns empty index if it doesn't exist yet
 *
 * @returns {Promise<object>} Encouragement index by language
 */
async function loadEncouragementIndex() {
  const registry = await loadVoiceRegistry();

  if (!registry.encouragement_index) {
    registry.encouragement_index = {};
    await saveVoiceRegistry(registry);
  }

  return registry.encouragement_index;
}

/**
 * Check if encouragements exist for a language
 *
 * @param {string} language - ISO 639-3 language code
 * @returns {Promise<object|null>} Encouragement index entry or null
 */
async function getEncouragementIndex(language) {
  const index = await loadEncouragementIndex();
  return index[language] || null;
}

/**
 * Update encouragement index for a language
 *
 * @param {string} language - ISO 639-3 language code
 * @param {string} voiceId - Voice ID used for encouragements
 * @param {Array<string>} uuids - Array of encouragement UUIDs
 */
async function updateEncouragementIndex(language, voiceId, uuids) {
  const registry = await loadVoiceRegistry();

  if (!registry.encouragement_index) {
    registry.encouragement_index = {};
  }

  registry.encouragement_index[language] = {
    voice: voiceId,
    count: uuids.length,
    uuids: uuids,
    last_updated: new Date().toISOString()
  };

  await saveVoiceRegistry(registry);
}

/**
 * Add encouragement to index
 * Use this when saving individual encouragements to keep index in sync
 *
 * @param {string} language - ISO 639-3 language code
 * @param {string} voiceId - Voice ID
 * @param {string} uuid - Encouragement UUID
 */
async function addEncouragementToIndex(language, voiceId, uuid) {
  const registry = await loadVoiceRegistry();

  if (!registry.encouragement_index) {
    registry.encouragement_index = {};
  }

  if (!registry.encouragement_index[language]) {
    registry.encouragement_index[language] = {
      voice: voiceId,
      count: 0,
      uuids: [],
      last_updated: new Date().toISOString()
    };
  }

  const entry = registry.encouragement_index[language];

  // Add UUID if not already in index
  if (!entry.uuids.includes(uuid)) {
    entry.uuids.push(uuid);
    entry.count = entry.uuids.length;
    entry.last_updated = new Date().toISOString();

    await saveVoiceRegistry(registry);
  }
}

/**
 * Load encouragement samples for a language
 * Samples are stored by language (not by voice) and matched by exact text
 *
 * @param {string} language - ISO 639-3 language code
 * @returns {Promise<object>} Encouragement samples object
 */
async function loadEncouragementSamples(language) {
  const samplesPath = path.join(MAR_BASE, 'encouragement_samples', `${language}_samples.json`);

  if (await fs.pathExists(samplesPath)) {
    return await fs.readJson(samplesPath);
  }

  // No samples yet for this language - return empty structure
  return {
    language,
    voice: null,
    last_updated: null,
    sample_count: 0,
    samples: []  // Array of samples, each with {text, uuid, duration, voice, generated_at}
  };
}

/**
 * Save encouragement samples for a language
 *
 * @param {string} language - ISO 639-3 language code
 * @param {object} samplesData - Encouragement samples object
 */
async function saveEncouragementSamples(language, samplesData) {
  const samplesPath = path.join(MAR_BASE, 'encouragement_samples', `${language}_samples.json`);
  await fs.ensureDir(path.dirname(samplesPath));

  // Update metadata
  samplesData.language = language;
  samplesData.last_updated = new Date().toISOString();
  samplesData.sample_count = samplesData.samples.length;

  await fs.writeJson(samplesPath, samplesData, { spaces: 2 });
}

/**
 * Find encouragement sample by exact text match
 * Returns the most recent sample if multiple exist for same text
 *
 * @param {string} language - ISO 639-3 language code
 * @param {string} text - Exact encouragement text
 * @returns {Promise<object|null>} Sample data or null
 */
async function findEncouragementSampleByText(language, text) {
  const samplesData = await loadEncouragementSamples(language);

  // Find all samples with matching text
  const matches = samplesData.samples.filter(s => s.text === text);

  if (matches.length === 0) {
    return null;
  }

  // Return most recent if multiple exist (text was edited)
  return matches.sort((a, b) =>
    new Date(b.generated_at) - new Date(a.generated_at)
  )[0];
}

/**
 * Add an encouragement sample (doesn't replace, allows multiple versions)
 *
 * @param {string} language - ISO 639-3 language code
 * @param {string} voiceId - Voice ID used for generation
 * @param {string} uuid - Sample UUID (for audio file)
 * @param {object} sampleData - Sample metadata (text, duration, filename)
 */
async function addEncouragementSample(language, voiceId, uuid, sampleData) {
  const samplesData = await loadEncouragementSamples(language);

  // Set voice if this is the first sample for this language
  if (!samplesData.voice) {
    samplesData.voice = voiceId;
  }

  // Add sample with generation timestamp
  samplesData.samples.push({
    uuid,
    voice: voiceId,
    generated_at: new Date().toISOString(),
    ...sampleData
  });

  await saveEncouragementSamples(language, samplesData);
}

module.exports = {
  normalizeText,
  loadVoiceRegistry,
  saveVoiceRegistry,
  loadVoiceSamples,
  saveVoiceSamples,
  findExistingSample,
  saveSample,
  getSample,
  getVoiceForCourseRole,
  getVoicesForCourse,
  createVoice,
  getVoiceMetadata,
  loadEncouragementIndex,
  getEncouragementIndex,
  updateEncouragementIndex,
  addEncouragementToIndex,
  loadEncouragementSamples,
  saveEncouragementSamples,
  findEncouragementSampleByText,
  addEncouragementSample
};

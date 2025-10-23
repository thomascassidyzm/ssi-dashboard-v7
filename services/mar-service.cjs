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
  for (const [uuid, sample] of Object.entries(voiceSamples.samples)) {
    if (
      sample.text === text &&
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

module.exports = {
  loadVoiceRegistry,
  saveVoiceRegistry,
  loadVoiceSamples,
  saveVoiceSamples,
  findExistingSample,
  saveSample,
  getVoiceForCourseRole,
  getVoicesForCourse,
  createVoice,
  getVoiceMetadata
};

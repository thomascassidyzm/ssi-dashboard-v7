/**
 * MAR (Master Audio Registry) Service
 *
 * Manages the voice-based audio sample database.
 * All samples are organized by voice ID, not by language.
 */

const fs = require('fs-extra');
const path = require('path');

const MAR_BASE = path.join(__dirname, '..', 'samples_database');
const TEMP_MAR_BASE = path.join(__dirname, '..', 'temp', 'mar');

/**
 * Normalize text for duplicate detection
 * Removes case differences, trailing/leading punctuation, and normalizes whitespace.
 * This ensures "means I'm," and "means I'm" are treated as the same phrase.
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/^[,.\s]+|[,.\s]+$/g, '') // Remove leading/trailing commas, periods, spaces
    .replace(/\s+/g, ' ');              // Normalize internal whitespace to single space
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

// ============================================================================
// Temporary MAR Functions (Phase 8 crash-safe generation)
// ============================================================================

/**
 * Initialize temporary MAR directory structure
 * Temp MAR persists in temp/mar/ until explicitly merged or cleared
 * This ensures crash-safety - generated samples are not lost if process crashes
 */
async function initTempMAR() {
  await fs.ensureDir(TEMP_MAR_BASE);
  await fs.ensureDir(path.join(TEMP_MAR_BASE, 'voices'));

  // Create voices.json if it doesn't exist
  const voicesPath = path.join(TEMP_MAR_BASE, 'voices.json');
  if (!await fs.pathExists(voicesPath)) {
    await fs.writeJson(voicesPath, {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      voices: {}
    }, { spaces: 2 });
  }

  console.log('✓ Temporary MAR initialized at:', TEMP_MAR_BASE);
}

/**
 * Get sample checking BOTH permanent MAR and temp MAR
 * Used during Phase 8 generation to avoid regenerating samples from this run
 *
 * @param {string} voiceId - Voice ID
 * @param {string} uuid - Sample UUID
 * @returns {Promise<object|null>} Sample data or null
 */
async function getSampleFromBothMARs(voiceId, uuid) {
  // Check permanent MAR first
  let sample = await getSample(voiceId, uuid);
  if (sample) return { ...sample, source: 'permanent' };

  // Check temp MAR
  const tempSamplesPath = path.join(TEMP_MAR_BASE, 'voices', voiceId, 'samples.json');
  if (await fs.pathExists(tempSamplesPath)) {
    const tempSamples = await fs.readJson(tempSamplesPath);
    if (tempSamples.samples && tempSamples.samples[uuid]) {
      return { ...tempSamples.samples[uuid], source: 'temp' };
    }
  }

  return null;
}

/**
 * Find existing sample in BOTH permanent and temp MAR
 * Searches by text/role/language/cadence to find matching sample
 * Used during analysis phase to check if sample needs generation
 *
 * @param {string} voiceId - Voice ID
 * @param {string} text - The phrase/text
 * @param {string} role - Sample role
 * @param {string} language - Language code
 * @param {string} cadence - Speech cadence (default: 'natural')
 * @returns {Promise<object|null>} Sample with UUID if exists, null otherwise
 */
async function findExistingSampleInBothMARs(voiceId, text, role, language, cadence = 'natural') {
  // Check permanent MAR first
  const permanentSamples = await loadVoiceSamples(voiceId);
  const inPermanent = findExistingSample(permanentSamples, text, role, language, cadence);
  if (inPermanent) {
    return { ...inPermanent, source: 'permanent' };
  }

  // Check temp MAR
  const tempSamplesPath = path.join(TEMP_MAR_BASE, 'voices', voiceId, 'samples.json');
  if (await fs.pathExists(tempSamplesPath)) {
    const tempSamples = await fs.readJson(tempSamplesPath);
    const inTemp = findExistingSample(tempSamples, text, role, language, cadence);
    if (inTemp) {
      return { ...inTemp, source: 'temp' };
    }
  }

  return null;
}

/**
 * Save sample to temporary MAR only
 * Used during Phase 8 generation before QC/upload verification
 *
 * @param {string} voiceId - Voice ID
 * @param {string} uuid - Sample UUID
 * @param {object} sample - Sample metadata
 */
async function saveSampleToTempMAR(voiceId, uuid, sample) {
  const tempSamplesPath = path.join(TEMP_MAR_BASE, 'voices', voiceId, 'samples.json');
  await fs.ensureDir(path.dirname(tempSamplesPath));

  let tempSamples;
  if (await fs.pathExists(tempSamplesPath)) {
    tempSamples = await fs.readJson(tempSamplesPath);
  } else {
    tempSamples = {
      voice_id: voiceId,
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      sample_count: 0,
      samples: {}
    };
  }

  tempSamples.samples[uuid] = sample;
  tempSamples.sample_count = Object.keys(tempSamples.samples).length;
  tempSamples.last_updated = new Date().toISOString();

  await fs.writeJson(tempSamplesPath, tempSamples, { spaces: 2 });
}

/**
 * Merge temporary MAR into permanent MAR
 * Called after successful QC and S3 upload verification
 *
 * @returns {Promise<object>} Merge statistics
 */
async function mergeTempMARToPermanent() {
  const stats = {
    voicesMerged: 0,
    samplesMerged: 0,
    errors: []
  };

  const tempVoicesDir = path.join(TEMP_MAR_BASE, 'voices');
  if (!await fs.pathExists(tempVoicesDir)) {
    console.log('✓ No temporary MAR to merge');
    return stats;
  }

  const voiceDirs = await fs.readdir(tempVoicesDir);

  for (const voiceId of voiceDirs) {
    const tempSamplesPath = path.join(tempVoicesDir, voiceId, 'samples.json');
    if (!await fs.pathExists(tempSamplesPath)) continue;

    try {
      const tempSamples = await fs.readJson(tempSamplesPath);
      const permanentSamples = await loadVoiceSamples(voiceId);

      // Merge samples
      for (const [uuid, sample] of Object.entries(tempSamples.samples)) {
        if (!permanentSamples.samples[uuid]) {
          permanentSamples.samples[uuid] = sample;
          stats.samplesMerged++;
        }
      }

      permanentSamples.sample_count = Object.keys(permanentSamples.samples).length;
      await saveVoiceSamples(voiceId, permanentSamples);

      stats.voicesMerged++;
      console.log(`✓ Merged ${voiceId}: ${Object.keys(tempSamples.samples).length} samples`);
    } catch (error) {
      stats.errors.push({ voiceId, error: error.message });
      console.error(`✗ Failed to merge ${voiceId}:`, error.message);
    }
  }

  return stats;
}

/**
 * Clear temporary MAR after successful merge
 * Optional - temp MAR can also be left as a backup until next run
 */
async function clearTempMAR() {
  if (await fs.pathExists(TEMP_MAR_BASE)) {
    await fs.remove(TEMP_MAR_BASE);
    console.log('✓ Temporary MAR cleared');
  }
}

// ============================================================================
// MAR Index Functions (Performance Optimization)
// ============================================================================

/**
 * Load all MAR data and build an in-memory index for fast lookups
 * This is similar to Python's create_sample_index approach
 *
 * Loads data from BOTH permanent and temp MAR, building a composite index
 * with keys: (normalized_text, role, cadence)
 *
 * @param {Array<string>} voiceIds - Array of voice IDs to index
 * @returns {Promise<object>} Index by voiceId -> key -> {uuid, sample, source}
 */
async function loadMARIndex(voiceIds) {
  console.log(`  Building MAR index for ${voiceIds.length} voices...`);
  const startTime = Date.now();

  const index = {};

  for (const voiceId of voiceIds) {
    index[voiceId] = {};

    // Load permanent MAR samples
    const permanentSamples = await loadVoiceSamples(voiceId);
    for (const [uuid, sample] of Object.entries(permanentSamples.samples)) {
      const key = buildIndexKey(sample.text, sample.role, sample.cadence);
      index[voiceId][key] = {
        uuid,
        sample,
        source: 'permanent'
      };
    }

    // Load temp MAR samples
    const tempSamplesPath = path.join(TEMP_MAR_BASE, 'voices', voiceId, 'samples.json');
    if (await fs.pathExists(tempSamplesPath)) {
      const tempSamples = await fs.readJson(tempSamplesPath);
      for (const [uuid, sample] of Object.entries(tempSamples.samples || {})) {
        const key = buildIndexKey(sample.text, sample.role, sample.cadence);
        // Temp samples override permanent (shouldn't happen, but just in case)
        index[voiceId][key] = {
          uuid,
          sample,
          source: 'temp'
        };
      }
    }
  }

  const elapsed = Date.now() - startTime;
  const totalSamples = Object.values(index).reduce((sum, voiceIndex) =>
    sum + Object.keys(voiceIndex).length, 0);

  console.log(`  ✓ MAR index built: ${totalSamples} samples in ${elapsed}ms`);

  return index;
}

/**
 * Build composite index key from sample attributes
 *
 * @param {string} text - Sample text
 * @param {string} role - Sample role
 * @param {string} cadence - Speech cadence
 * @returns {string} Composite key
 */
function buildIndexKey(text, role, cadence) {
  const normalizedText = normalizeText(text);
  return `${normalizedText}|${role}|${cadence}`;
}

/**
 * Find existing sample using pre-built index (O(1) lookup)
 *
 * @param {object} index - Pre-built MAR index from loadMARIndex()
 * @param {string} voiceId - Voice ID
 * @param {string} text - Sample text
 * @param {string} role - Sample role
 * @param {string} language - Language code (not used in index, but kept for compatibility)
 * @param {string} cadence - Speech cadence
 * @returns {object|null} {uuid, sample, source} or null if not found
 */
function findSampleInIndex(index, voiceId, text, role, language, cadence = 'natural') {
  if (!index[voiceId]) {
    return null;
  }

  const key = buildIndexKey(text, role, cadence);
  return index[voiceId][key] || null;
}

/**
 * Sync samples from manifest to MAR
 *
 * The manifest is the source of truth for sample UUIDs.
 * This function syncs all samples from manifest to their respective voice MAR files.
 * Duration is NOT stored - it's always verified from S3 before publishing.
 *
 * @param {object} manifest - Course manifest
 * @param {object} voiceAssignments - Map of role to voice ID
 * @param {string} targetLanguage - Target language code (e.g., 'spa')
 * @param {string} sourceLanguage - Source language code (e.g., 'eng')
 * @returns {Promise<object>} Sync stats { added, existing, byVoice }
 */
async function syncManifestToMAR(manifest, voiceAssignments, targetLanguage, sourceLanguage) {
  console.log('\n=== Syncing Manifest to MAR ===\n');

  const stats = {
    added: 0,
    existing: 0,
    byVoice: {}
  };

  // Group samples by voice
  const samplesByVoice = {};
  const samples = manifest.slices?.[0]?.samples || {};

  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const uuid = variant.id || variant.uuid;
      if (!uuid) continue;

      const role = variant.role;
      const voiceId = voiceAssignments[role];
      if (!voiceId) continue;

      if (!samplesByVoice[voiceId]) {
        samplesByVoice[voiceId] = {};
      }

      // Determine language based on role
      const language = (role === 'source' || role === 'presentation') ? sourceLanguage : targetLanguage;

      samplesByVoice[voiceId][uuid] = {
        text: text,
        language: language,
        role: role,
        cadence: variant.cadence || 'natural',
        generated_at: new Date().toISOString()
      };
    }
  }

  // Sync each voice
  for (const [voiceId, newSamples] of Object.entries(samplesByVoice)) {
    const voiceSamples = await loadVoiceSamples(voiceId);
    const existingCount = Object.keys(voiceSamples.samples).length;

    let addedForVoice = 0;
    let existingForVoice = 0;

    for (const [uuid, sample] of Object.entries(newSamples)) {
      if (voiceSamples.samples[uuid]) {
        existingForVoice++;
      } else {
        voiceSamples.samples[uuid] = sample;
        addedForVoice++;
      }
    }

    if (addedForVoice > 0) {
      voiceSamples.sample_count = Object.keys(voiceSamples.samples).length;
      voiceSamples.last_updated = new Date().toISOString();
      await saveVoiceSamples(voiceId, voiceSamples);
    }

    stats.added += addedForVoice;
    stats.existing += existingForVoice;
    stats.byVoice[voiceId] = {
      added: addedForVoice,
      existing: existingForVoice,
      total: Object.keys(voiceSamples.samples).length
    };

    console.log(`  ${voiceId}: +${addedForVoice} new (${existingForVoice} existing, ${Object.keys(voiceSamples.samples).length} total)`);
  }

  console.log(`\n✓ MAR sync complete: ${stats.added} added, ${stats.existing} existing\n`);

  return stats;
}

// ============================================================================
// Batched MAR Writer (Performance Optimization)
// ============================================================================

/**
 * BatchedTempMARWriter - Accumulates samples in memory and writes in batches
 * Dramatically reduces I/O for large sample sets (68k samples: 30min -> 30sec)
 */
class BatchedTempMARWriter {
  constructor(batchSize = 500) {
    this.batchSize = batchSize;
    this.pendingSamples = {}; // voiceId -> { uuid -> sample }
    this.pendingCount = 0;
  }

  /**
   * Add sample to pending batch (does not write to disk)
   */
  addSample(voiceId, uuid, sample) {
    if (!this.pendingSamples[voiceId]) {
      this.pendingSamples[voiceId] = {};
    }
    this.pendingSamples[voiceId][uuid] = sample;
    this.pendingCount++;

    // Auto-flush if batch size reached
    if (this.pendingCount >= this.batchSize) {
      return this.flush();
    }
    return Promise.resolve();
  }

  /**
   * Write all pending samples to disk (grouped by voice)
   */
  async flush() {
    if (this.pendingCount === 0) return;

    const startTime = Date.now();
    let written = 0;

    for (const [voiceId, samples] of Object.entries(this.pendingSamples)) {
      const sampleCount = Object.keys(samples).length;
      if (sampleCount === 0) continue;

      const tempSamplesPath = path.join(TEMP_MAR_BASE, 'voices', voiceId, 'samples.json');
      await fs.ensureDir(path.dirname(tempSamplesPath));

      // Load existing
      let tempSamples;
      if (await fs.pathExists(tempSamplesPath)) {
        tempSamples = await fs.readJson(tempSamplesPath);
      } else {
        tempSamples = {
          voice_id: voiceId,
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          sample_count: 0,
          samples: {}
        };
      }

      // Merge all pending samples for this voice
      Object.assign(tempSamples.samples, samples);
      tempSamples.sample_count = Object.keys(tempSamples.samples).length;
      tempSamples.last_updated = new Date().toISOString();

      // Write once
      await fs.writeJson(tempSamplesPath, tempSamples, { spaces: 2 });
      written += sampleCount;
    }

    const elapsed = Date.now() - startTime;
    console.log(`✓ Batched MAR flush: ${written} samples in ${elapsed}ms`);

    // Clear pending
    this.pendingSamples = {};
    this.pendingCount = 0;
  }
}

// Singleton instance for global use
let _batchedWriter = null;

function getBatchedTempMARWriter(batchSize = 500) {
  if (!_batchedWriter) {
    _batchedWriter = new BatchedTempMARWriter(batchSize);
  }
  return _batchedWriter;
}

async function flushBatchedTempMAR() {
  if (_batchedWriter) {
    await _batchedWriter.flush();
  }
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
  addEncouragementSample,
  // Temporary MAR functions (legacy - prefer syncManifestToMAR)
  initTempMAR,
  getSampleFromBothMARs,
  findExistingSampleInBothMARs,
  saveSampleToTempMAR,
  mergeTempMARToPermanent,
  clearTempMAR,
  TEMP_MAR_BASE,
  // MAR Index functions (performance optimization)
  loadMARIndex,
  buildIndexKey,
  findSampleInIndex,
  // Manifest-based MAR sync (preferred method)
  syncManifestToMAR,
  // Batched writer (major performance optimization)
  BatchedTempMARWriter,
  getBatchedTempMARWriter,
  flushBatchedTempMAR
};

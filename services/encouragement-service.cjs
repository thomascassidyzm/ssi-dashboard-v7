/**
 * Encouragement Service
 *
 * Handles generation and management of encouragement audio samples.
 * Encouragements are motivational messages in the source language that
 * appear periodically during lessons (every ~5 minutes, less often later).
 * They can range from short sentences to full paragraphs.
 *
 * Key differences from regular samples:
 * - Use ElevenLabs for more lively delivery
 * - Variation doesn't matter (don't need consistency)
 * - Generated once per language (shared across courses)
 * - Kept separate from manifest until final duration check
 * - Can be quite long (paragraph-length content)
 */

const fs = require('fs-extra');
const path = require('path');
const marService = require('./mar-service.cjs');
const elevenlabsService = require('./elevenlabs-service.cjs');
const audioProcessor = require('./audio-processor.cjs');
const s3Service = require('./s3-service.cjs');
const { v5: uuidv5 } = require('uuid');

// UUID namespace for encouragements
const ENCOURAGEMENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Path to canonical encouragements file (synced from S3)
const CANONICAL_ENCOURAGEMENTS_PATH = path.join(__dirname, '../public/vfs/canonical');

// Common 3-letter to 2-letter language code mappings
const LANGUAGE_CODE_MAP = {
  eng: 'en',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  cmn: 'zh',
  jpn: 'ja',
  kor: 'ko',
  ara: 'ar',
  rus: 'ru',
  hin: 'hi',
  cym: 'cy'  // Welsh
};

/**
 * Load canonical encouragements from file
 * Returns objects with text and pre-assigned UUIDs, separated by type
 *
 * @param {string} language - Language code (e.g., 'eng' or 'en')
 * @param {boolean} [combined=true] - If true, return combined array (legacy). If false, return { pooled, ordered }
 * @returns {Promise<Array|Object>} Encouragements with UUIDs
 */
async function loadCanonicalEncouragements(language, combined = true) {
  // Try the provided language code first
  let filePath = path.join(CANONICAL_ENCOURAGEMENTS_PATH, `${language}_encouragements.json`);

  // If file doesn't exist and we have a 3-letter code, try the 2-letter equivalent
  if (!await fs.pathExists(filePath) && LANGUAGE_CODE_MAP[language]) {
    filePath = path.join(CANONICAL_ENCOURAGEMENTS_PATH, `${LANGUAGE_CODE_MAP[language]}_encouragements.json`);
  }

  if (!await fs.pathExists(filePath)) {
    console.log(`No canonical encouragements found at ${filePath}`);
    return combined ? [] : { pooled: [], ordered: [] };
  }

  try {
    const data = await fs.readJson(filePath);
    const pooled = data.pooledEncouragements || [];
    const ordered = data.orderedEncouragements || [];

    console.log(`Loaded ${pooled.length + ordered.length} canonical encouragements (${ordered.length} ordered, ${pooled.length} pooled) from ${filePath}`);

    if (combined) {
      // Legacy: return combined array
      return [...pooled, ...ordered];
    } else {
      // New: return separated
      return { pooled, ordered };
    }
  } catch (err) {
    console.error(`Error loading canonical encouragements: ${err.message}`);
    return combined ? [] : { pooled: [], ordered: [] };
  }
}

/**
 * Default encouragement voice by language
 * Prefer ElevenLabs for more natural, lively delivery
 */
const DEFAULT_ENCOURAGEMENT_VOICES = {
  'eng': 'elevenlabs_aran', // Placeholder - will use actual Aran voice ID
  // For other languages, fallback to presentation voice
};

/**
 * Extract encouragement messages from course manifest
 * Encouragements are samples with role='presentation' and is_encouragement=true
 * Or they may be in manifest.encouragements array
 *
 * @param {Object} courseManifest - Course manifest
 * @returns {Array<string>} Encouragement text messages
 */
function getEncouragementPhrases(courseManifest) {
  if (!courseManifest) {
    return [];
  }

  // Check if manifest has explicit encouragements array
  if (courseManifest.encouragements && courseManifest.encouragements.length > 0) {
    return courseManifest.encouragements;
  }

  // Extract from samples where is_encouragement=true or role='presentation_encouragement'
  const encouragementTexts = [];

  const samples = courseManifest.slices?.[0]?.samples || {};
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      if (variant.is_encouragement === true || variant.role === 'presentation_encouragement') {
        if (!encouragementTexts.includes(text)) {
          encouragementTexts.push(text);
        }
        break; // Only need to add text once
      }
    }
  }

  return encouragementTexts;
}

/**
 * Get default encouragement voice for a language
 *
 * @param {string} language - ISO 639-3 language code
 * @param {Object} voiceAssignments - Course voice assignments
 * @returns {string} Voice ID
 */
function getEncouragementVoice(language, voiceAssignments) {
  // 1. Check if course has specific encouragement voice
  if (voiceAssignments.encouragement) {
    return voiceAssignments.encouragement;
  }

  // 2. Check language defaults
  if (DEFAULT_ENCOURAGEMENT_VOICES[language]) {
    return DEFAULT_ENCOURAGEMENT_VOICES[language];
  }

  // 3. Fallback to presentation voice
  return voiceAssignments.presentation;
}

/**
 * Generate deterministic UUID for encouragement
 *
 * @param {string} text - Encouragement text
 * @param {string} language - Language code
 * @returns {string} UUID
 */
function generateEncouragementUUID(text, language) {
  const data = `encouragement_${language}_${text}`;
  return uuidv5(data, ENCOURAGEMENT_NAMESPACE);
}

/**
 * Check if encouragements exist as generated samples for a language
 * Checks language-based sample storage (matched by exact text)
 *
 * @param {string} language - ISO 639-3 language code
 * @param {string} voiceId - Voice ID to check (unused, for compatibility)
 * @param {Array<string>} phrases - Encouragement phrases to check
 * @returns {Promise<Object>} { existing: [...], missing: [...] }
 */
async function checkExistingEncouragements(language, voiceId, phrases) {
  const existing = [];
  const missing = [];

  // Load encouragement samples for this language
  const samplesData = await marService.loadEncouragementSamples(language);

  if (samplesData.sample_count === 0) {
    // No samples exist for this language yet
    console.log(`No encouragement samples found for ${language} - all need generation`);

    for (const phrase of phrases) {
      const uuid = generateEncouragementUUID(phrase, language);
      missing.push({
        text: phrase,
        uuid,
        exists: false
      });
    }

    return { existing, missing };
  }

  // Samples exist - check which phrases have generated audio (match by text)
  console.log(`Found ${samplesData.sample_count} encouragement samples for ${language}`);

  for (const phrase of phrases) {
    const uuid = generateEncouragementUUID(phrase, language);

    // Find sample by exact text match (not by UUID)
    const sample = await marService.findEncouragementSampleByText(language, phrase);

    if (sample) {
      existing.push({
        text: phrase,
        uuid: sample.uuid,  // Use the sample's UUID, not generated one
        duration: sample.duration,
        exists: true
      });
    } else {
      missing.push({
        text: phrase,
        uuid,
        exists: false
      });
    }
  }

  return { existing, missing };
}

/**
 * Generate missing encouragement audio files
 *
 * @param {Array} missingEncouragements - Encouragements to generate
 * @param {string} voiceId - Voice ID to use
 * @param {string} language - Language code
 * @param {string} tempDir - Temporary directory for output
 * @returns {Promise<Array>} Generation results
 */
async function generateEncouragements(missingEncouragements, voiceId, language, tempDir) {
  await fs.ensureDir(tempDir);

  console.log(`\n=== Generating ${missingEncouragements.length} Encouragements ===\n`);

  const results = [];

  // Get voice details (assuming ElevenLabs)
  const voiceRegistry = await fs.readJson(path.join(__dirname, '../vfs/canonical/voices.json'));
  const voiceDetails = voiceRegistry.voices[voiceId];

  if (!voiceDetails) {
    throw new Error(`Voice not found: ${voiceId}`);
  }

  if (voiceDetails.provider !== 'elevenlabs') {
    console.warn(`⚠️  Warning: Encouragement voice ${voiceId} is not ElevenLabs. Using anyway.`);
  }

  // Generate each encouragement
  for (const encouragement of missingEncouragements) {
    const outputPath = path.join(tempDir, `${encouragement.uuid}.mp3`);

    try {
      // Use ElevenLabs with settings optimized for lively delivery
      const options = {
        model_id: voiceDetails.model || 'eleven_flash_v2_5',
        stability: 0.3, // Lower stability for more variation/liveliness
        similarity_boost: 0.75,
        style: 0.5, // Add some style/expressiveness
        use_speaker_boost: true
      };

      await elevenlabsService.generateAudioWithRetry(
        encouragement.text,
        voiceDetails.provider_id,
        outputPath,
        options
      );

      console.log(`✓ Generated: "${encouragement.text}"`);

      results.push({
        success: true,
        encouragement,
        outputPath
      });
    } catch (error) {
      console.error(`✗ Failed: "${encouragement.text}" - ${error.message}`);

      results.push({
        success: false,
        encouragement,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\nGenerated: ${successCount}/${missingEncouragements.length} encouragements\n`);

  return results;
}

/**
 * Process encouragement audio files
 * Encouragements use natural cadence (no time-stretch)
 *
 * @param {Array} generationResults - Results from generateEncouragements
 * @returns {Promise<Array>} Processing results
 */
async function processEncouragements(generationResults) {
  console.log('\n=== Processing Encouragements ===\n');

  const processedDir = path.join(path.dirname(generationResults[0]?.outputPath || ''), 'processed');
  await fs.ensureDir(processedDir);

  const processConfigs = [];
  const encouragementMap = new Map(); // Map output path to encouragement data

  for (const result of generationResults) {
    if (!result.success) continue;

    const processedPath = path.join(processedDir, `${result.encouragement.uuid}.mp3`);

    processConfigs.push({
      input: result.outputPath,
      output: processedPath,
      options: {
        normalize: true,
        timeStretch: 1.0, // No stretching for encouragements
        targetLUFS: -16.0
      }
    });

    // Map output path to encouragement data for later retrieval
    encouragementMap.set(processedPath, result.encouragement);
  }

  const processResults = await audioProcessor.processBatch(
    processConfigs,
    4,
    (current, total) => {
      console.log(`Processed ${current}/${total} encouragements`);
    }
  );

  // Attach encouragement data to process results
  for (const result of processResults) {
    result.encouragement = encouragementMap.get(result.output);
  }

  return processResults;
}

/**
 * Upload encouragements to S3 and update MAR
 *
 * @param {Array} processResults - Results from processEncouragements
 * @param {string} voiceId - Voice ID
 * @param {string} language - Language code
 * @param {string} bucket - S3 bucket
 * @returns {Promise<Object>} Upload results with durations
 */
async function uploadAndRegisterEncouragements(processResults, voiceId, language, bucket) {
  console.log('\n=== Uploading Encouragements to S3 ===\n');

  const durations = {};

  for (const result of processResults) {
    if (!result.success) continue;

    const uuid = path.basename(result.output, '.mp3');

    try {
      // Upload to S3
      const s3Result = await s3Service.uploadAudioFile(uuid, result.output, bucket);
      console.log(`✓ Uploaded: ${s3Result.url}`);

      // Extract duration
      const duration = await audioProcessor.getAudioDuration(result.output);
      durations[uuid] = duration;

      // Save to language-based encouragement sample storage
      await marService.addEncouragementSample(language, voiceId, uuid, {
        text: result.encouragement.text,
        duration,
        filename: `${uuid}.mp3`
      });

      console.log(`  Duration: ${duration.toFixed(3)}s`);
    } catch (error) {
      console.error(`✗ Failed to upload ${uuid}: ${error.message}`);
    }
  }

  console.log(`\nUploaded and saved ${Object.keys(durations).length} encouragements to ${language}_samples.json\n`);

  return durations;
}

/**
 * Add encouragements to course manifest
 * Populates slices[0].orderedEncouragements and slices[0].pooledEncouragements
 * Also adds encouragement samples to the samples object
 *
 * @param {Object} manifest - Course manifest
 * @param {Object|Array} encouragements - Either { pooled, ordered } or legacy array
 * @param {string} language - Language code for loading canonical if needed
 * @returns {Promise<Object>} Modified manifest
 */
async function addEncouragementsToManifest(manifest, encouragements, language = 'eng') {
  console.log('\n=== Adding Encouragements to Manifest ===\n');

  // Ensure slices structure exists
  if (!manifest.slices || !manifest.slices[0]) {
    throw new Error('Manifest must have slices[0] structure');
  }

  if (!manifest.slices[0].samples) {
    manifest.slices[0].samples = {};
  }

  const slice = manifest.slices[0];
  const samples = slice.samples;

  // Determine pooled and ordered arrays
  let pooled, ordered;

  if (Array.isArray(encouragements)) {
    // Legacy: array passed in, need to load canonical to categorize
    // Each encouragement should have:
    //   - id: canonical encouragement item ID (for categorization)
    //   - uuid: audio sample UUID (for playback)
    const canonical = await loadCanonicalEncouragements(language, false);
    const pooledIds = new Set(canonical.pooled.map(e => e.id));
    const orderedIds = new Set(canonical.ordered.map(e => e.id));

    // Use 'id' (canonical item ID) for categorization, NOT 'uuid' (sample UUID)
    pooled = encouragements.filter(e => pooledIds.has(e.id));
    ordered = encouragements.filter(e => orderedIds.has(e.id));
  } else {
    // New format: { pooled, ordered }
    pooled = encouragements.pooled || [];
    ordered = encouragements.ordered || [];
  }

  // Populate slices[0].orderedEncouragements and pooledEncouragements
  // Format: { text, id } where id is the canonical encouragement item ID
  slice.orderedEncouragements = ordered.map(enc => ({
    text: enc.text,
    id: enc.id  // Canonical item ID (NOT sample UUID)
  }));

  slice.pooledEncouragements = pooled.map(enc => ({
    text: enc.text,
    id: enc.id  // Canonical item ID (NOT sample UUID)
  }));

  console.log(`Set orderedEncouragements: ${slice.orderedEncouragements.length}`);
  console.log(`Set pooledEncouragements: ${slice.pooledEncouragements.length}`);

  // Also add to samples section (for audio playback)
  // Each encouragement needs an entry in samples with:
  //   - role: 'encouragement' (distinct from 'presentation')
  //   - id: the audio sample UUID (for fetching the audio file)
  const allEncouragements = [...pooled, ...ordered];
  for (const enc of allEncouragements) {
    const text = enc.text;
    const sampleUuid = enc.uuid || enc.id;  // Prefer sample UUID, fall back to canonical ID

    if (!samples[text]) {
      samples[text] = [];
    }

    // Check if already exists (encouragements use role: 'presentation')
    const existing = samples[text].find(
      v => v.role === 'presentation' && v.id === sampleUuid
    );

    if (!existing) {
      samples[text].push({
        role: 'presentation',  // Encouragements use presentation role
        cadence: 'natural',
        id: sampleUuid,  // Audio sample UUID for playback
        duration: enc.duration || 0
      });
    }
  }

  // Remove top-level encouragements if it exists (wrong location)
  if (manifest.encouragements) {
    console.log('Removing top-level encouragements array (moved to slice)');
    delete manifest.encouragements;
  }

  console.log(`\nAdded ${allEncouragements.length} encouragements to manifest\n`);

  return manifest;
}

/**
 * Check canonical encouragements against S3 bucket
 * Uses the pre-assigned UUIDs from the canonical file
 *
 * @param {string} language - Language code (e.g., 'eng')
 * @param {string} bucket - S3 bucket to check
 * @returns {Promise<Object>} { existing: [...], missing: [...], all: [...] }
 */
async function checkCanonicalEncouragements(language, bucket) {
  const canonicalEncouragements = await loadCanonicalEncouragements(language);

  if (canonicalEncouragements.length === 0) {
    return { existing: [], missing: [], all: [] };
  }

  const existing = [];
  const missing = [];

  console.log(`Checking ${canonicalEncouragements.length} canonical encouragements against S3...`);

  for (const enc of canonicalEncouragements) {
    const uuid = enc.id;
    const exists = await s3Service.audioExists(uuid, bucket);

    if (exists) {
      existing.push({
        text: enc.text,
        uuid: uuid,
        exists: true
      });
    } else {
      missing.push({
        text: enc.text,
        uuid: uuid,
        exists: false
      });
    }
  }

  console.log(`  Existing in S3: ${existing.length}`);
  console.log(`  Missing from S3: ${missing.length}`);

  return {
    existing,
    missing,
    all: canonicalEncouragements.map(e => ({ text: e.text, uuid: e.id }))
  };
}

module.exports = {
  getEncouragementPhrases,
  getEncouragementVoice,
  generateEncouragementUUID,
  checkExistingEncouragements,
  checkCanonicalEncouragements,
  loadCanonicalEncouragements,
  generateEncouragements,
  processEncouragements,
  uploadAndRegisterEncouragements,
  addEncouragementsToManifest,
  DEFAULT_ENCOURAGEMENT_VOICES
};

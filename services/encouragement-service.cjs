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

/**
 * Load canonical encouragements from file
 * Returns objects with text and pre-assigned UUIDs
 *
 * @param {string} language - Language code (e.g., 'eng')
 * @returns {Promise<Array<{text: string, id: string}>>} Encouragements with UUIDs
 */
async function loadCanonicalEncouragements(language) {
  const filePath = path.join(CANONICAL_ENCOURAGEMENTS_PATH, `${language}_encouragements.json`);

  if (!await fs.pathExists(filePath)) {
    console.log(`No canonical encouragements found at ${filePath}`);
    return [];
  }

  try {
    const data = await fs.readJson(filePath);
    const pooled = data.pooledEncouragements || [];
    const ordered = data.orderedEncouragements || [];

    // Combine both arrays, preserving original UUIDs
    const all = [...pooled, ...ordered];
    console.log(`Loaded ${all.length} canonical encouragements from ${filePath}`);
    return all;
  } catch (err) {
    console.error(`Error loading canonical encouragements: ${err.message}`);
    return [];
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
 * Called at the end of audio generation for duration checking
 *
 * @param {Object} manifest - Course manifest
 * @param {Array} encouragements - Encouragement data with UUIDs
 * @returns {Object} Modified manifest
 */
function addEncouragementsToManifest(manifest, encouragements) {
  console.log('\n=== Adding Encouragements to Manifest ===\n');

  // Ensure slices structure exists
  if (!manifest.slices || !manifest.slices[0]) {
    throw new Error('Manifest must have slices[0] structure');
  }

  if (!manifest.slices[0].samples) {
    manifest.slices[0].samples = {};
  }

  const samples = manifest.slices[0].samples;

  // Add encouragements to samples
  for (const enc of encouragements) {
    if (!samples[enc.text]) {
      samples[enc.text] = [];
    }

    // Check if already exists
    const existing = samples[enc.text].find(
      v => v.role === 'presentation' && v.uuid === enc.uuid
    );

    if (!existing) {
      samples[enc.text].push({
        role: 'presentation',
        cadence: 'natural',
        language: enc.language,
        uuid: enc.uuid,
        duration: enc.duration || 0,
        is_encouragement: true
      });

      console.log(`Added: "${enc.text}" (${enc.uuid})`);
    }
  }

  console.log(`\nAdded ${encouragements.length} encouragements to manifest\n`);

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

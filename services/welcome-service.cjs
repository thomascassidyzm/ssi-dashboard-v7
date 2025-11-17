/**
 * Welcome Service
 *
 * Handles generation and management of course welcome audio samples.
 * Welcomes are course-specific introductions played at the start of each course.
 *
 * Key differences from encouragements:
 * - Course-specific (not language-specific)
 * - One welcome per course (not arrays of messages)
 * - Stored in central welcome registry
 * - Uses source language voice (presentation voice)
 */

const fs = require('fs-extra');
const path = require('path');
const { v5: uuidv5 } = require('uuid');

// Lazy-load audio generation dependencies (not needed for registry operations)
let marService, elevenlabsService, azureTTS, audioProcessor, s3Service;

// UUID namespace for welcomes
const WELCOME_NAMESPACE = '8ba7b810-9dad-11d1-80b4-00c04fd430c9';

// Path to welcome registry
const WELCOME_REGISTRY_PATH = path.join(__dirname, '../vfs/canonical/welcomes.json');
const WELCOME_SAMPLES_DIR = path.join(__dirname, '../samples_database/welcome_samples');

/**
 * Load welcome registry
 *
 * @returns {Promise<Object>} Welcome registry object
 */
async function loadWelcomeRegistry() {
  if (!await fs.pathExists(WELCOME_REGISTRY_PATH)) {
    // Create empty registry if doesn't exist
    const emptyRegistry = {
      welcomes: {
        "_comment": "Course-specific welcome messages. Each course (language pair) has its own welcome.",
        "_structure": {
          "course_code": {
            "text": "Welcome message text in source language",
            "id": "UUID for audio sample (null if not generated yet)",
            "generated_date": "ISO timestamp when text was created",
            "voice": "Voice ID used for audio generation (null if not generated)",
            "duration": "Audio duration in seconds (0 if not generated)"
          }
        }
      }
    };

    await fs.ensureDir(path.dirname(WELCOME_REGISTRY_PATH));
    await fs.writeJson(WELCOME_REGISTRY_PATH, emptyRegistry, { spaces: 2 });

    return emptyRegistry;
  }

  return await fs.readJson(WELCOME_REGISTRY_PATH);
}

/**
 * Save welcome registry
 *
 * @param {Object} registry - Welcome registry object
 */
async function saveWelcomeRegistry(registry) {
  await fs.writeJson(WELCOME_REGISTRY_PATH, registry, { spaces: 2 });
}

/**
 * Get welcome for a specific course
 *
 * @param {string} courseCode - Course code (e.g., "ita_for_eng_10seeds")
 * @returns {Promise<Object|null>} Welcome object or null if not found
 */
async function getWelcomeForCourse(courseCode) {
  const registry = await loadWelcomeRegistry();

  if (registry.welcomes[courseCode]) {
    return registry.welcomes[courseCode];
  }

  return null;
}

/**
 * Generate deterministic UUID for welcome
 *
 * @param {string} courseCode - Course code
 * @param {string} text - Welcome text
 * @returns {string} UUID
 */
function generateWelcomeUUID(courseCode, text) {
  const data = `welcome_${courseCode}_${text}`;
  return uuidv5(data, WELCOME_NAMESPACE).toUpperCase();
}

/**
 * Check if welcome audio exists in MAR/S3
 *
 * @param {string} courseCode - Course code
 * @param {string} voiceId - Voice ID to use
 * @returns {Promise<Object>} { exists: boolean, sample: object|null }
 */
async function checkExistingWelcome(courseCode, voiceId) {
  // Load welcome samples from MAR
  const samplesPath = path.join(WELCOME_SAMPLES_DIR, 'welcome_samples.json');

  if (!await fs.pathExists(samplesPath)) {
    return { exists: false, sample: null };
  }

  const samplesData = await fs.readJson(samplesPath);

  // Find sample for this course
  const sample = samplesData.samples?.find(s => s.course_code === courseCode);

  if (sample) {
    return {
      exists: true,
      sample: {
        uuid: sample.uuid,
        duration: sample.duration,
        text: sample.text,
        voice: sample.voice
      }
    };
  }

  return { exists: false, sample: null };
}

/**
 * Generate welcome audio file
 *
 * @param {Object} welcomeData - Welcome data (text, uuid, courseCode)
 * @param {string} voiceId - Voice ID to use
 * @param {string} language - Language code
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} Generation result
 */
async function generateWelcome(welcomeData, voiceId, language, outputPath) {
  // Lazy-load audio generation dependencies
  if (!azureTTS) {
    azureTTS = require('./azure-tts-service.cjs');
    elevenlabsService = require('./elevenlabs-service.cjs');
  }

  console.log(`\n=== Generating Welcome for ${welcomeData.courseCode} ===\n`);

  // Get voice details
  const voiceRegistry = await fs.readJson(path.join(__dirname, '../vfs/canonical/voices.json'));
  const voiceDetails = voiceRegistry.voices[voiceId];

  if (!voiceDetails) {
    throw new Error(`Voice not found: ${voiceId}`);
  }

  await fs.ensureDir(path.dirname(outputPath));

  try {
    if (voiceDetails.provider === 'azure') {
      // Use Azure TTS
      const speed = 1.0;
      await azureTTS.generateAudioWithRetry(
        welcomeData.text,
        voiceDetails.provider_id,
        outputPath,
        speed
      );
    } else if (voiceDetails.provider === 'elevenlabs') {
      // Use ElevenLabs
      const options = {
        model_id: voiceDetails.model || 'eleven_flash_v2_5',
        stability: voiceDetails.stability || 0.5,
        similarity_boost: voiceDetails.similarity_boost || 0.75,
        use_speaker_boost: true
      };

      await elevenlabsService.generateAudioWithRetry(
        welcomeData.text,
        voiceDetails.provider_id,
        outputPath,
        options
      );
    } else {
      throw new Error(`Unknown provider: ${voiceDetails.provider}`);
    }

    console.log(`✓ Generated welcome for ${welcomeData.courseCode}`);

    return {
      success: true,
      welcomeData,
      outputPath
    };
  } catch (error) {
    console.error(`✗ Failed to generate welcome: ${error.message}`);

    return {
      success: false,
      welcomeData,
      error: error.message
    };
  }
}

/**
 * Process welcome audio file
 *
 * @param {Object} generationResult - Result from generateWelcome
 * @returns {Promise<Object>} Processing result
 */
async function processWelcome(generationResult) {
  // Lazy-load audio processing dependency
  if (!audioProcessor) {
    audioProcessor = require('./audio-processor.cjs');
  }

  if (!generationResult.success) {
    return generationResult;
  }

  console.log('\n=== Processing Welcome ===\n');

  const processedDir = path.join(path.dirname(generationResult.outputPath), 'processed');
  await fs.ensureDir(processedDir);

  const processedPath = path.join(processedDir, path.basename(generationResult.outputPath));

  const processResults = await audioProcessor.processBatch(
    [{
      input: generationResult.outputPath,
      output: processedPath,
      options: {
        normalize: true,
        timeStretch: 1.0,
        targetLUFS: -16.0
      }
    }],
    1,
    () => {}
  );

  if (processResults[0].success) {
    console.log(`✓ Processed welcome audio`);
    return {
      success: true,
      welcomeData: generationResult.welcomeData,
      output: processedPath
    };
  } else {
    return {
      success: false,
      welcomeData: generationResult.welcomeData,
      error: 'Processing failed'
    };
  }
}

/**
 * Upload welcome to S3 and register in MAR
 *
 * @param {Object} processResult - Result from processWelcome
 * @param {string} voiceId - Voice ID
 * @param {string} language - Language code
 * @param {string} bucket - S3 bucket
 * @returns {Promise<Object>} Upload result with duration
 */
async function uploadAndRegisterWelcome(processResult, voiceId, language, bucket) {
  // Lazy-load upload dependencies
  if (!s3Service) {
    s3Service = require('./s3-service.cjs');
    audioProcessor = require('./audio-processor.cjs');
  }

  if (!processResult.success) {
    return { success: false };
  }

  console.log('\n=== Uploading Welcome to S3 ===\n');

  const uuid = processResult.welcomeData.uuid;

  try {
    // Upload to S3
    const s3Result = await s3Service.uploadAudioFile(uuid, processResult.output, bucket);
    console.log(`✓ Uploaded: ${s3Result.url}`);

    // Extract duration
    const duration = await audioProcessor.getAudioDuration(processResult.output);
    console.log(`  Duration: ${duration.toFixed(3)}s`);

    // Save to welcome samples MAR
    await fs.ensureDir(WELCOME_SAMPLES_DIR);
    const samplesPath = path.join(WELCOME_SAMPLES_DIR, 'welcome_samples.json');

    let samplesData;
    if (await fs.pathExists(samplesPath)) {
      samplesData = await fs.readJson(samplesPath);
    } else {
      samplesData = {
        sample_count: 0,
        samples: []
      };
    }

    // Add or update sample
    const existingIndex = samplesData.samples.findIndex(
      s => s.course_code === processResult.welcomeData.courseCode
    );

    const sampleEntry = {
      course_code: processResult.welcomeData.courseCode,
      uuid,
      voice: voiceId,
      language,
      text: processResult.welcomeData.text,
      duration,
      filename: `${uuid}.mp3`,
      generated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      samplesData.samples[existingIndex] = sampleEntry;
    } else {
      samplesData.samples.push(sampleEntry);
      samplesData.sample_count = samplesData.samples.length;
    }

    await fs.writeJson(samplesPath, samplesData, { spaces: 2 });

    console.log(`✓ Registered welcome in MAR for ${processResult.welcomeData.courseCode}\n`);

    return {
      success: true,
      uuid,
      duration
    };
  } catch (error) {
    console.error(`✗ Failed to upload/register welcome: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update welcome registry with generation metadata
 *
 * @param {string} courseCode - Course code
 * @param {Object} updates - Fields to update
 */
async function updateWelcomeRegistry(courseCode, updates) {
  const registry = await loadWelcomeRegistry();

  if (!registry.welcomes[courseCode]) {
    registry.welcomes[courseCode] = {};
  }

  Object.assign(registry.welcomes[courseCode], updates);

  await saveWelcomeRegistry(registry);
}

module.exports = {
  loadWelcomeRegistry,
  saveWelcomeRegistry,
  getWelcomeForCourse,
  generateWelcomeUUID,
  checkExistingWelcome,
  generateWelcome,
  processWelcome,
  uploadAndRegisterWelcome,
  updateWelcomeRegistry
};

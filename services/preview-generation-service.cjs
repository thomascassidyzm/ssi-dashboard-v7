/**
 * Preview Generation Service
 *
 * Generates sample audio files for previewing voice/speed combinations
 * before committing to full audio generation.
 *
 * Preview files go to staging bucket, not production.
 * Staging: s3://ssi-audio-stage/staging/{courseCode}/preview/{uuid}.mp3
 * Production: s3://ssi-audio-stage/mastered/{uuid}.mp3
 */

const crypto = require('crypto');
const ttsService = require('./tts-service.cjs');
const s3Service = require('./s3-service.cjs');
const voiceConfigService = require('./voice-config-service.cjs');
const uuidService = require('./uuid-service.cjs');

const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const LFS_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';

/**
 * Generate a unique preview ID
 * (Not the deterministic UUID - previews are temporary)
 *
 * @returns {string} Preview ID
 */
function generatePreviewId() {
  return `preview_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Get S3 key for a preview audio file
 *
 * @param {string} courseCode
 * @param {string} previewId
 * @returns {string} S3 key
 */
function getPreviewKey(courseCode, previewId) {
  return `staging/${courseCode}/preview/${previewId}.mp3`;
}

/**
 * Get S3 URL for a preview audio file
 *
 * @param {string} courseCode
 * @param {string} previewId
 * @returns {string} S3 URL
 */
function getPreviewUrl(courseCode, previewId) {
  const key = getPreviewKey(courseCode, previewId);
  return `https://${LFS_BUCKET}.s3.eu-west-1.amazonaws.com/${key}`;
}

/**
 * Generate a single preview audio sample
 *
 * @param {object} options
 * @param {string} options.courseCode - Course code
 * @param {string} options.text - Text to synthesize
 * @param {string} options.role - Voice role ('target1', 'target2', 'known')
 * @param {string} options.cadence - Cadence ('natural', 'slow')
 * @param {object} options.voiceConfig - Voice configuration for the role
 * @param {object} options.cadenceProfiles - Cadence profile definitions
 * @returns {Promise<object>} Preview result with id, url, metadata
 */
async function generatePreviewSample(options) {
  const {
    courseCode,
    text,
    role,
    cadence = 'natural',
    voiceConfig,
    cadenceProfiles
  } = options;

  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  if (!voiceConfig || !voiceConfig.voiceId) {
    throw new Error(`Voice configuration for ${role} is incomplete`);
  }

  // Build TTS config
  const ttsConfig = voiceConfigService.buildTTSConfig(voiceConfig, cadence, cadenceProfiles);

  // Generate audio
  console.log(`[Preview] Generating: "${text.substring(0, 30)}..." with ${ttsConfig.provider}`);

  const startTime = Date.now();
  const audioBuffer = await ttsService.generate(text, ttsConfig.provider, ttsConfig);
  const generationTime = Date.now() - startTime;

  // Upload to staging
  const previewId = generatePreviewId();
  const key = getPreviewKey(courseCode, previewId);

  await s3.putObject({
    Bucket: LFS_BUCKET,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      'x-preview-course': courseCode,
      'x-preview-role': role,
      'x-preview-cadence': cadence,
      'x-preview-voice-id': voiceConfig.voiceId,
      'x-preview-speed': String(ttsConfig.speed)
    }
  }).promise();

  console.log(`[Preview] Uploaded: ${key} (${audioBuffer.length} bytes, ${generationTime}ms)`);

  return {
    id: previewId,
    url: getPreviewUrl(courseCode, previewId),
    text,
    role,
    cadence,
    voiceId: voiceConfig.voiceId,
    voiceName: voiceConfig.name,
    provider: voiceConfig.provider,
    effectiveSpeed: ttsConfig.speed,
    fileSizeBytes: audioBuffer.length,
    generationTimeMs: generationTime
  };
}

/**
 * Generate multiple preview samples for a role
 *
 * @param {object} options
 * @param {string} options.courseCode - Course code
 * @param {string} options.role - Voice role
 * @param {string} options.cadence - Cadence
 * @param {object} options.voiceConfig - Voice configuration
 * @param {object} options.cadenceProfiles - Cadence profiles
 * @param {number} options.count - Number of samples (default 5)
 * @returns {Promise<object>} Preview batch result
 */
async function generatePreviewBatch(options) {
  const {
    courseCode,
    role,
    cadence = 'natural',
    voiceConfig,
    cadenceProfiles,
    count = 5
  } = options;

  // Get sample phrases
  const phrases = await voiceConfigService.getSamplePhrases(courseCode, count);

  if (phrases.length === 0) {
    throw new Error(`No sample phrases found for ${courseCode}`);
  }

  const results = [];
  const errors = [];

  for (const phrase of phrases) {
    try {
      const result = await generatePreviewSample({
        courseCode,
        text: phrase.text,
        role,
        cadence,
        voiceConfig,
        cadenceProfiles
      });

      results.push({
        ...result,
        knownText: phrase.known,
        phraseSource: phrase.source
      });
    } catch (error) {
      console.error(`[Preview] Error generating sample for "${phrase.text}":`, error.message);
      errors.push({
        text: phrase.text,
        error: error.message
      });
    }
  }

  return {
    courseCode,
    role,
    cadence,
    voiceId: voiceConfig.voiceId,
    voiceName: voiceConfig.name,
    provider: voiceConfig.provider,
    effectiveSpeed: voiceConfigService.getEffectiveSpeed(voiceConfig, cadence, cadenceProfiles),
    samples: results,
    errors,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate preview samples for multiple roles
 *
 * @param {string} courseCode
 * @param {object} voiceConfigFull - Full voice configuration
 * @param {string[]} roles - Roles to generate previews for
 * @param {string} cadence - Cadence to use
 * @param {number} countPerRole - Samples per role
 * @returns {Promise<object>} Preview results by role
 */
async function generateMultiRolePreview(courseCode, voiceConfigFull, roles, cadence = 'natural', countPerRole = 3) {
  const results = {};

  for (const role of roles) {
    const voiceConfig = voiceConfigFull.voices?.[role];

    if (!voiceConfig || !voiceConfig.voiceId) {
      results[role] = {
        error: `No voice configured for ${role}`,
        samples: []
      };
      continue;
    }

    try {
      results[role] = await generatePreviewBatch({
        courseCode,
        role,
        cadence,
        voiceConfig,
        cadenceProfiles: voiceConfigFull.cadenceProfiles,
        count: countPerRole
      });
    } catch (error) {
      results[role] = {
        error: error.message,
        samples: []
      };
    }
  }

  return {
    courseCode,
    cadence,
    roles: results,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Clean up old preview files for a course
 * Previews older than maxAgeHours are deleted
 *
 * @param {string} courseCode
 * @param {number} maxAgeHours - Maximum age in hours (default 24)
 * @returns {Promise<object>} Cleanup result
 */
async function cleanupOldPreviews(courseCode, maxAgeHours = 24) {
  const prefix = `staging/${courseCode}/preview/`;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - maxAgeMs;

  let deleted = 0;
  let retained = 0;
  let continuationToken;

  do {
    const response = await s3.listObjectsV2({
      Bucket: LFS_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }).promise();

    const toDelete = [];

    for (const obj of response.Contents || []) {
      const lastModified = new Date(obj.LastModified).getTime();

      if (lastModified < cutoffTime) {
        toDelete.push({ Key: obj.Key });
      } else {
        retained++;
      }
    }

    if (toDelete.length > 0) {
      await s3.deleteObjects({
        Bucket: LFS_BUCKET,
        Delete: { Objects: toDelete }
      }).promise();
      deleted += toDelete.length;
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`[Preview] Cleanup for ${courseCode}: deleted ${deleted}, retained ${retained}`);

  return {
    courseCode,
    deleted,
    retained,
    maxAgeHours
  };
}

/**
 * Delete a specific preview sample
 *
 * @param {string} courseCode
 * @param {string} previewId
 * @returns {Promise<boolean>} True if deleted
 */
async function deletePreview(courseCode, previewId) {
  const key = getPreviewKey(courseCode, previewId);

  try {
    await s3.deleteObject({
      Bucket: LFS_BUCKET,
      Key: key
    }).promise();
    return true;
  } catch (error) {
    console.error(`[Preview] Error deleting ${key}:`, error.message);
    return false;
  }
}

/**
 * Compare two voice configurations by generating side-by-side previews
 *
 * @param {string} courseCode
 * @param {object} configA - First voice config
 * @param {object} configB - Second voice config
 * @param {string[]} phrases - Phrases to compare
 * @param {string} cadence - Cadence to use
 * @returns {Promise<object>} Comparison result
 */
async function compareVoiceConfigs(courseCode, configA, configB, phrases, cadence = 'natural') {
  const comparisons = [];

  for (const phrase of phrases) {
    try {
      const [resultA, resultB] = await Promise.all([
        generatePreviewSample({
          courseCode,
          text: phrase,
          role: 'comparison',
          cadence,
          voiceConfig: configA,
          cadenceProfiles: voiceConfigService.DEFAULT_VOICE_CONFIG.cadenceProfiles
        }),
        generatePreviewSample({
          courseCode,
          text: phrase,
          role: 'comparison',
          cadence,
          voiceConfig: configB,
          cadenceProfiles: voiceConfigService.DEFAULT_VOICE_CONFIG.cadenceProfiles
        })
      ]);

      comparisons.push({
        text: phrase,
        configA: resultA,
        configB: resultB
      });
    } catch (error) {
      comparisons.push({
        text: phrase,
        error: error.message
      });
    }
  }

  return {
    courseCode,
    cadence,
    configA: {
      voiceId: configA.voiceId,
      voiceName: configA.name,
      provider: configA.provider,
      speed: configA.settings?.speed
    },
    configB: {
      voiceId: configB.voiceId,
      voiceName: configB.name,
      provider: configB.provider,
      speed: configB.settings?.speed
    },
    comparisons,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  generatePreviewSample,
  generatePreviewBatch,
  generateMultiRolePreview,
  cleanupOldPreviews,
  deletePreview,
  compareVoiceConfigs,
  getPreviewUrl,
  generatePreviewId
};

#!/usr/bin/env node

/**
 * Phase 8: Audio Generation
 *
 * Generates TTS audio for all samples in course_manifest.json and uploads to S3.
 *
 * Input:  {courseDir}/course_manifest.json
 * Output: {courseDir}/audio/*.mp3 (local) + S3 upload
 *
 * Usage: node tools/generators/phase8-generate-audio.cjs <courseCode> [--dry-run] [--skip-upload]
 * Example: node tools/generators/phase8-generate-audio.cjs ita_for_fra
 * Example: node tools/generators/phase8-generate-audio.cjs ita_for_fra --dry-run
 */

const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
require('dotenv').config();

// Voice ID mapping for different languages
const VOICE_IDS = {
  'ita': {
    primary: 'XB0fDUnXU5powFXDhCwa',    // Charlotte (Italian)
    alternate: 'pqHfZKP75CvOlQylNhV4'   // Bill (Italian)
  },
  'spa': {
    primary: 'XB0fDUnXU5powFXDhCwa',    // Charlotte (Spanish)
    alternate: 'pqHfZKP75CvOlQylNhV4'   // Bill (Spanish)
  },
  'fra': {
    primary: 'XB0fDUnXU5powFXDhCwa',    // Charlotte (French)
    alternate: 'pqHfZKP75CvOlQylNhV4'   // Bill (French)
  },
  'eng': {
    primary: '21m00Tcm4TlvDq8ikWAM',    // Rachel (English)
    alternate: 'pqHfZKP75CvOlQylNhV4'   // Bill (English)
  },
  'cmn': {
    primary: 'XB0fDUnXU5powFXDhCwa',    // Charlotte (Mandarin)
    alternate: 'pqHfZKP75CvOlQylNhV4'   // Bill (Mandarin)
  }
};

/**
 * Get voice ID for language and role
 */
function getVoiceId(languageCode, role) {
  const voices = VOICE_IDS[languageCode];
  if (!voices) {
    throw new Error(`No voice mapping for language: ${languageCode}`);
  }

  if (role === 'target1' || role === 'source') {
    return voices.primary;
  } else if (role === 'target2') {
    return voices.alternate;
  } else {
    throw new Error(`Unknown role: ${role}`);
  }
}

/**
 * Get cadence settings for TTS
 */
function getCadenceSettings(cadence) {
  switch (cadence) {
    case 'natural':
      return { speed: 1.0 };
    case 'fast':
      return { speed: 1.3 };
    case 'slow':
      return { speed: 0.7 };
    default:
      return { speed: 1.0 };
  }
}

/**
 * Generate TTS audio using ElevenLabs API
 */
async function generateTTS(text, voiceId, cadence = 'natural') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not set in environment');
  }

  const settings = getCadenceSettings(cadence);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: settings.speed
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS API error: ${response.status} - ${error}`);
  }

  return await response.buffer();
}

/**
 * Upload audio file to S3
 */
async function uploadToS3(key, buffer) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-west-1'
  });

  const bucket = process.env.S3_BUCKET || 'popty-bach-lfs';

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  }).promise();
}

/**
 * Generate audio with retry logic
 */
async function generateWithRetry(text, voiceId, cadence, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateTTS(text, voiceId, cadence);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`⚠️  Retry ${i + 1}/${maxRetries} for: "${text.substring(0, 50)}..."`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

/**
 * Main audio generation function
 */
async function generateAudio(courseCode, options = {}) {
  console.log(`\n[Phase 8] Audio Generation`);
  console.log(`[Phase 8] Course: ${courseCode}\n`);

  const dryRun = options.dryRun || false;
  const skipUpload = options.skipUpload || false;

  // Define paths
  const courseDir = path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode);
  const manifestPath = path.join(courseDir, 'course_manifest.json');
  const audioDir = path.join(courseDir, 'audio');

  // Check manifest exists
  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Course manifest not found: ${manifestPath}`);
  }

  // Create audio directory
  await fs.ensureDir(audioDir);

  // Load manifest
  console.log(`[Phase 8] Loading manifest...`);
  const manifest = await fs.readJson(manifestPath);

  // Extract metadata
  const targetLang = manifest.target;  // e.g., "ita"
  const knownLang = manifest.known;    // e.g., "eng" or "fra"

  console.log(`[Phase 8] Target language: ${targetLang}`);
  console.log(`[Phase 8] Known language: ${knownLang}`);

  // Get samples from first slice
  const samples = manifest.slices[0].samples;

  // Count total files to generate
  const totalSamples = Object.values(samples).reduce((sum, variants) => sum + variants.length, 0);
  console.log(`[Phase 8] Total audio files to generate: ${totalSamples}\n`);

  if (dryRun) {
    console.log(`[Phase 8] DRY RUN MODE - No audio will be generated\n`);
  }

  // Track progress
  let completed = 0;
  const failedSamples = [];

  // Voice configuration
  const voiceConfig = {
    target1: getVoiceId(targetLang, 'target1'),
    target2: getVoiceId(targetLang, 'target2'),
    source: getVoiceId(knownLang, 'source')
  };

  console.log(`[Phase 8] Voice mapping:`);
  console.log(`  target1 (${targetLang}): ${voiceConfig.target1}`);
  console.log(`  target2 (${targetLang}): ${voiceConfig.target2}`);
  console.log(`  source (${knownLang}): ${voiceConfig.source}\n`);

  // Process each sample
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const { id, role, cadence } = variant;

      try {
        // Show progress
        const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
        console.log(`[${completed + 1}/${totalSamples}] ${role}: "${shortText}"`);

        if (!dryRun) {
          // Generate audio
          const voiceId = voiceConfig[role];
          const audioBuffer = await generateWithRetry(text, voiceId, cadence);

          // Save locally
          const audioPath = path.join(audioDir, `${id}.mp3`);
          await fs.writeFile(audioPath, audioBuffer);
          console.log(`  ✅ Saved: ${id}.mp3`);

          // Upload to S3
          if (!skipUpload) {
            const s3Key = `courses/${courseCode}/audio/${id}.mp3`;
            await uploadToS3(s3Key, audioBuffer);
            console.log(`  ✅ Uploaded: ${s3Key}`);
          }
        }

        completed++;
        const progress = Math.round((completed / totalSamples) * 100);
        console.log(`  Progress: ${completed}/${totalSamples} (${progress}%)\n`);

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        failedSamples.push({
          uuid: id,
          text: text,
          role: role,
          error: error.message
        });
      }
    }
  }

  // Summary
  console.log(`\n[Phase 8] ==================== SUMMARY ====================`);
  console.log(`[Phase 8] Total: ${totalSamples}`);
  console.log(`[Phase 8] Completed: ${completed}`);
  console.log(`[Phase 8] Failed: ${failedSamples.length}`);

  if (failedSamples.length > 0) {
    const failedPath = path.join(courseDir, 'failed_audio_samples.json');
    await fs.writeJson(failedPath, failedSamples, { spaces: 2 });
    console.log(`[Phase 8] Failed samples logged: ${failedPath}`);
  }

  if (completed === totalSamples && failedSamples.length === 0) {
    console.log(`[Phase 8] ✅ All audio files generated successfully!`);
  } else {
    console.log(`[Phase 8] ⚠️  Some files failed. Check failed_audio_samples.json`);
  }

  console.log(`[Phase 8] =====================================================\n`);

  return {
    total: totalSamples,
    completed: completed,
    failed: failedSamples.length,
    failedSamples: failedSamples
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node phase8-generate-audio.cjs <courseCode> [--dry-run] [--skip-upload]');
    console.error('Example: node phase8-generate-audio.cjs ita_for_fra');
    console.error('Example: node phase8-generate-audio.cjs ita_for_fra --dry-run');
    process.exit(1);
  }

  const courseCode = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    skipUpload: args.includes('--skip-upload')
  };

  generateAudio(courseCode, options)
    .then(result => {
      if (result.failed > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n[Phase 8] Fatal error: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { generateAudio };

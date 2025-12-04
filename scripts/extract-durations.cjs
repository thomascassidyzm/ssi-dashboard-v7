#!/usr/bin/env node
/**
 * Extract durations from audio files and update MAR
 *
 * Checks local temp files first, then S3
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { generateLegacyUUID, generateSampleUUID } = require('../services/uuid-service.cjs');

const MANIFEST_PATH = 'public/vfs/courses/cmn_for_eng/course_manifest.json';
const MAR_PATH = 'temp/audio-index.json';
const S3_INDEX_PATH = 'temp/s3-audio-index.json';

// All places to look for audio files
const AUDIO_DIRS = [
  'temp/audio',
  'temp/audio/targets',
  'temp/audio/segment_cache',
  'temp/audio/presentations',
  'temp/audio/welcome'
];

const VOICE_MAP = {
  target1: 'azure_zh-CN-XiaoxiaoNeural',
  target2: 'azure_zh-CN-YunxiNeural',
  source: 'elevenlabs_FOIN928B9X0jwgJ95cLt',
  presentation: 'elevenlabs_FOIN928B9X0jwgJ95cLt'
};

// Build index of all local audio files
async function buildLocalIndex() {
  const index = new Map();

  for (const dir of AUDIO_DIRS) {
    if (!await fs.pathExists(dir)) continue;

    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file.endsWith('.mp3')) {
        const uuid = path.basename(file, '.mp3').toUpperCase();
        index.set(uuid, path.join(dir, file));
      }
    }
  }

  return index;
}

function getDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8', timeout: 5000 }
    );
    return parseFloat(result.trim());
  } catch (err) {
    return 0;
  }
}

async function main() {
  console.log('=== Duration Extraction ===\n');

  // Load data
  const manifest = await fs.readJson(MANIFEST_PATH);
  const mar = await fs.readJson(MAR_PATH);
  const s3Index = await fs.readJson(S3_INDEX_PATH);
  const s3Set = new Set(s3Index.uuids);

  console.log('Building local file index...');
  const localIndex = await buildLocalIndex();
  console.log(`Found ${localIndex.size} local audio files\n`);

  let updated = 0;
  let notFound = 0;
  let alreadyHasDuration = 0;

  // Process each sample in manifest
  for (const slice of manifest.slices) {
    for (const [text, sampleList] of Object.entries(slice.samples)) {
      for (const sample of sampleList) {
        const { role, cadence } = sample;
        const language = sample.language || (role === 'source' || role === 'presentation' ? 'eng' : 'cmn');
        const voiceId = VOICE_MAP[role];
        const marKey = `${language}|${text}|${role}|${cadence}`;

        // Skip if not in MAR
        if (!mar.samples[marKey]) continue;

        // Skip if already has duration
        if (mar.samples[marKey].duration > 0) {
          alreadyHasDuration++;
          continue;
        }

        // Get UUID from MAR
        const uuid = mar.samples[marKey].uuid;
        if (!uuid) continue;

        // Find audio file
        let audioPath = localIndex.get(uuid.toUpperCase());

        if (!audioPath) {
          // Try legacy UUID
          const legacyUuid = generateLegacyUUID(text, language, role, cadence);
          audioPath = localIndex.get(legacyUuid.toUpperCase());
        }

        if (!audioPath) {
          // Try new UUID with voice
          if (voiceId) {
            const newUuid = generateSampleUUID(text, language, role, cadence, voiceId);
            audioPath = localIndex.get(newUuid.toUpperCase());
          }
        }

        if (audioPath) {
          const duration = getDuration(audioPath);
          if (duration > 0) {
            mar.samples[marKey].duration = duration;
            updated++;

            if (updated % 1000 === 0) {
              console.log(`  Progress: ${updated} durations extracted...`);
            }
          }
        } else {
          notFound++;
        }
      }
    }
  }

  // Save MAR
  mar.updated_at = new Date().toISOString();
  await fs.writeJson(MAR_PATH, mar, { spaces: 2 });

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Already had duration: ${alreadyHasDuration}`);
  console.log(`Not found locally: ${notFound}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

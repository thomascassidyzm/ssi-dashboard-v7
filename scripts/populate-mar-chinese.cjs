#!/usr/bin/env node
/**
 * Populate MAR with Chinese samples from manifest
 *
 * For each sample: generates both UUIDs, checks audio exists, gets duration, updates MAR
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const { generateLegacyUUID, generateSampleUUID } = require('../services/uuid-service.cjs');
const { execSync } = require('child_process');

const MANIFEST_PATH = 'public/vfs/courses/cmn_for_eng/course_manifest.json';
const MAR_PATH = 'temp/audio-index.json';
const S3_INDEX_PATH = 'temp/s3-audio-index.json';
const TEMP_AUDIO_DIR = 'temp/audio';
const TARGETS_DIR = 'temp/audio/targets';

// Voice mapping for cmn_for_eng
const VOICE_MAP = {
  target1: 'azure_zh-CN-XiaoxiaoNeural',
  target2: 'azure_zh-CN-YunxiNeural',
  source: 'elevenlabs_FOIN928B9X0jwgJ95cLt',  // English narrator
  presentation: 'elevenlabs_FOIN928B9X0jwgJ95cLt'
};

async function getDuration(filePath) {
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
  console.log('=== Populating MAR with Chinese Samples ===\n');

  // Load data
  const manifest = await fs.readJson(MANIFEST_PATH);
  const mar = await fs.readJson(MAR_PATH);
  const s3Index = await fs.readJson(S3_INDEX_PATH);
  const s3Set = new Set(s3Index.uuids);

  console.log(`Loaded manifest with ${manifest.slices.length} slices`);
  console.log(`Loaded MAR with ${mar.total_samples} samples`);
  console.log(`Loaded S3 index with ${s3Set.size} UUIDs`);

  // Collect all unique samples
  const samples = new Map(); // key -> { text, lang, role, cadence, voiceId }

  for (const slice of manifest.slices) {
    for (const [text, sampleList] of Object.entries(slice.samples)) {
      for (const sample of sampleList) {
        const { role, cadence } = sample;
        // Default language to 'eng' for source/presentation, otherwise use sample.language
        const language = sample.language || (role === 'source' || role === 'presentation' ? 'eng' : 'cmn');
        const voiceId = VOICE_MAP[role];

        if (!voiceId) {
          console.warn(`No voice for role: ${role}`);
          continue;
        }

        // MAR key format: lang|text|role|cadence
        const marKey = `${language}|${text}|${role}|${cadence}`;

        if (!samples.has(marKey)) {
          samples.set(marKey, { text, language, role, cadence, voiceId });
        }
      }
    }
  }

  console.log(`\nFound ${samples.size} unique samples to process`);

  // Process samples
  let added = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [marKey, sample] of samples) {
    const { text, language, role, cadence, voiceId } = sample;

    // Skip if already in MAR
    if (mar.samples[marKey]) {
      skipped++;
      continue;
    }

    // Generate UUIDs
    const legacyUuid = generateLegacyUUID(text, language, role, cadence);
    const newUuid = generateSampleUUID(text, language, role, cadence, voiceId);

    // Check S3 index for either UUID, or local temp files
    let uuidToUse = null;
    let duration = 0;

    // Check S3 first
    if (s3Set.has(legacyUuid)) {
      uuidToUse = legacyUuid;
    } else if (s3Set.has(newUuid)) {
      uuidToUse = newUuid;
    }

    // If not in S3, check local temp files
    if (!uuidToUse) {
      const localPaths = [
        path.join(TEMP_AUDIO_DIR, `${legacyUuid}.mp3`),
        path.join(TEMP_AUDIO_DIR, `${newUuid}.mp3`),
        path.join(TARGETS_DIR, `${legacyUuid}.mp3`),
        path.join(TARGETS_DIR, `${newUuid}.mp3`)
      ];

      for (const localPath of localPaths) {
        if (await fs.pathExists(localPath)) {
          uuidToUse = path.basename(localPath, '.mp3');
          duration = await getDuration(localPath);
          break;
        }
      }
    }

    if (!uuidToUse) {
      notFound++;
      if (notFound <= 10) {
        console.log(`  Not found: ${text.substring(0, 30)}... (${role}) - legacy: ${legacyUuid}`);
      }
      continue;
    }

    // Add to MAR
    mar.samples[marKey] = {
      uuid: uuidToUse,
      legacy_uuid: legacyUuid,
      new_uuid: newUuid,
      voice: voiceId,
      duration: duration
    };
    added++;

    if (added % 1000 === 0) {
      console.log(`  Progress: ${added} added...`);
    }
  }

  // Update MAR metadata
  mar.total_samples = Object.keys(mar.samples).length;
  mar.updated_at = new Date().toISOString();

  // Save MAR
  await fs.writeJson(MAR_PATH, mar, { spaces: 2 });

  console.log(`\n=== Done ===`);
  console.log(`Added: ${added}`);
  console.log(`Skipped (already in MAR): ${skipped}`);
  console.log(`Not found: ${notFound}`);
  console.log(`MAR now has ${mar.total_samples} samples`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

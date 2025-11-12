#!/usr/bin/env node

/**
 * Sync Canonical Resources to/from LFS Bucket
 *
 * Manages canonical resources (welcomes, voices, encouragements) in the LFS bucket.
 * These are shared resources used across all courses.
 *
 * Structure in S3:
 * - s3://popty-bach-lfs/canonical/welcomes.json (registry)
 * - s3://popty-bach-lfs/canonical/welcomes/{language_code}.wav (audio files)
 * - s3://popty-bach-lfs/canonical/voices.json (voice registry)
 * - s3://popty-bach-lfs/canonical/encouragements.json (future)
 *
 * Usage:
 *   node scripts/sync-canonical-to-lfs.cjs [options]
 *
 * Options:
 *   --upload-welcomes    Upload welcomes.json and audio files
 *   --upload-voices      Upload voices.json
 *   --upload-all         Upload everything (default)
 *   --download           Download all canonical resources from LFS
 *   --download-welcomes  Download only welcomes
 *   --download-voices    Download only voices
 */

const fs = require('fs-extra');
const path = require('path');
const s3Service = require('../services/s3-service.cjs');

// Paths
const WELCOMES_DIR = path.join(__dirname, '../extracted-welcomes');
const CANONICAL_DIR = path.join(__dirname, '../vfs/canonical');
const WELCOME_REGISTRY = path.join(CANONICAL_DIR, 'welcomes.json');
const VOICE_REGISTRY = path.join(CANONICAL_DIR, 'voices.json');

// S3 keys
const S3_WELCOME_REGISTRY = 'canonical/welcomes.json';
const S3_VOICE_REGISTRY = 'canonical/voices.json';
const S3_AUDIO_PREFIX = 'canonical/welcomes/';

// Parse command line args
const args = process.argv.slice(2);
const uploadWelcomes = args.includes('--upload-welcomes') || args.includes('--upload-all') || args.length === 0;
const uploadVoices = args.includes('--upload-voices') || args.includes('--upload-all') || args.length === 0;
const download = args.includes('--download');
const downloadWelcomes = args.includes('--download-welcomes') || download;
const downloadVoices = args.includes('--download-voices') || download;

/**
 * Upload welcome audio files to LFS
 */
async function uploadWelcomeAudio() {
  console.log('\n📤 Uploading Welcome Audio Files to LFS\n');

  if (!await fs.pathExists(WELCOME_REGISTRY)) {
    console.error(`✗ Welcome registry not found: ${WELCOME_REGISTRY}`);
    return { uploaded: 0, skipped: 0, failed: 0 };
  }

  const welcomeRegistry = await fs.readJson(WELCOME_REGISTRY);
  const welcomes = Object.entries(welcomeRegistry.welcomes).filter(
    ([key]) => !key.startsWith('_')
  );

  console.log(`Found ${welcomes.length} welcomes to upload\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [courseCode, welcomeData] of welcomes) {
    const langCode = courseCode.split('_')[0];
    const wavPath = path.join(WELCOMES_DIR, `welcome_${langCode}.wav`);
    const s3Key = `${S3_AUDIO_PREFIX}${langCode}.wav`;

    console.log(`📁 ${courseCode} (${langCode})`);

    // Check if already in LFS
    const exists = await s3Service.existsInLFS(s3Key);
    if (exists) {
      console.log(`   ⊘ Already in LFS: s3://${s3Service.LFS_BUCKET}/${s3Key}\n`);
      skipped++;
      continue;
    }

    // Check if WAV file exists locally
    if (!await fs.pathExists(wavPath)) {
      console.log(`   ✗ WAV file not found: ${wavPath}\n`);
      failed++;
      continue;
    }

    try {
      // Upload to LFS
      const result = await s3Service.uploadToLFS(s3Key, wavPath, 'audio/wav');
      console.log(`   ✓ Uploaded: ${result.url}\n`);
      uploaded++;
    } catch (error) {
      console.error(`   ✗ Upload failed: ${error.message}\n`);
      failed++;
    }
  }

  console.log('\n📊 Audio Upload Summary');
  console.log('======================');
  console.log(`✓ Uploaded: ${uploaded}`);
  console.log(`⊘ Skipped: ${skipped}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total: ${welcomes.length}\n`);

  return { uploaded, skipped, failed };
}

/**
 * Upload welcome registry to LFS
 */
async function uploadWelcomeRegistry() {
  console.log('\n📤 Uploading Welcome Registry to LFS\n');

  if (!await fs.pathExists(WELCOME_REGISTRY)) {
    console.error(`✗ Registry not found: ${WELCOME_REGISTRY}`);
    return false;
  }

  try {
    const result = await s3Service.uploadToLFS(S3_WELCOME_REGISTRY, WELCOME_REGISTRY, 'application/json');
    console.log(`✓ Uploaded: ${result.url}\n`);
    return true;
  } catch (error) {
    console.error(`✗ Upload failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Upload voice registry to LFS
 */
async function uploadVoiceRegistry() {
  console.log('\n📤 Uploading Voice Registry to LFS\n');

  if (!await fs.pathExists(VOICE_REGISTRY)) {
    console.error(`✗ Voice registry not found: ${VOICE_REGISTRY}`);
    return false;
  }

  try {
    const result = await s3Service.uploadToLFS(S3_VOICE_REGISTRY, VOICE_REGISTRY, 'application/json');
    console.log(`✓ Uploaded: ${result.url}\n`);
    return true;
  } catch (error) {
    console.error(`✗ Upload failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Download welcome registry from LFS
 */
async function downloadWelcomeRegistry() {
  console.log('\n📥 Downloading Welcome Registry from LFS\n');

  try {
    await fs.ensureDir(CANONICAL_DIR);
    await s3Service.downloadFromLFS(S3_WELCOME_REGISTRY, WELCOME_REGISTRY);
    console.log(`✓ Downloaded: ${WELCOME_REGISTRY}\n`);
    return true;
  } catch (error) {
    console.error(`✗ Download failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Download voice registry from LFS
 */
async function downloadVoiceRegistry() {
  console.log('\n📥 Downloading Voice Registry from LFS\n');

  try {
    await fs.ensureDir(CANONICAL_DIR);
    await s3Service.downloadFromLFS(S3_VOICE_REGISTRY, VOICE_REGISTRY);
    console.log(`✓ Downloaded: ${VOICE_REGISTRY}\n`);
    return true;
  } catch (error) {
    console.error(`✗ Download failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Download welcome audio files from LFS
 */
async function downloadWelcomeAudio() {
  console.log('\n📥 Downloading Welcome Audio Files from LFS\n');

  // First download the registry to know what files exist
  if (!await fs.pathExists(WELCOME_REGISTRY)) {
    console.log('Downloading welcome registry first...\n');
    await downloadWelcomeRegistry();
  }

  const welcomeRegistry = await fs.readJson(WELCOME_REGISTRY);
  const welcomes = Object.entries(welcomeRegistry.welcomes).filter(
    ([key]) => !key.startsWith('_')
  );

  console.log(`Found ${welcomes.length} welcome audio files to download\n`);

  await fs.ensureDir(WELCOMES_DIR);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [courseCode] of welcomes) {
    const langCode = courseCode.split('_')[0];
    const wavPath = path.join(WELCOMES_DIR, `welcome_${langCode}.wav`);
    const s3Key = `${S3_AUDIO_PREFIX}${langCode}.wav`;

    console.log(`📁 ${courseCode} (${langCode})`);

    // Skip if already exists locally
    if (await fs.pathExists(wavPath)) {
      console.log(`   ⊘ Already exists locally: ${wavPath}\n`);
      skipped++;
      continue;
    }

    try {
      await s3Service.downloadFromLFS(s3Key, wavPath);
      console.log(`   ✓ Downloaded: ${wavPath}\n`);
      downloaded++;
    } catch (error) {
      console.error(`   ✗ Download failed: ${error.message}\n`);
      failed++;
    }
  }

  console.log('\n📊 Audio Download Summary');
  console.log('========================');
  console.log(`✓ Downloaded: ${downloaded}`);
  console.log(`⊘ Skipped: ${skipped}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total: ${welcomes.length}\n`);

  return { downloaded, skipped, failed };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Sync Canonical Resources with LFS');
  console.log('='.repeat(60));

  try {
    // Upload mode
    if (!download) {
      console.log('\n📤 UPLOAD MODE\n');

      if (uploadWelcomes) {
        await uploadWelcomeRegistry();
        await uploadWelcomeAudio();
      }

      if (uploadVoices) {
        await uploadVoiceRegistry();
      }

      console.log('\n✅ Upload complete!\n');
    }

    // Download mode
    if (download || downloadWelcomes || downloadVoices) {
      console.log('\n📥 DOWNLOAD MODE\n');

      if (downloadWelcomes) {
        await downloadWelcomeRegistry();
        await downloadWelcomeAudio();
      }

      if (downloadVoices) {
        await downloadVoiceRegistry();
      }

      console.log('\n✅ Download complete!\n');
      console.log('Canonical resources synced to:');
      console.log(`  - ${CANONICAL_DIR}/welcomes.json`);
      console.log(`  - ${CANONICAL_DIR}/voices.json`);
      console.log(`  - ${WELCOMES_DIR}/welcome_*.wav\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  uploadWelcomeAudio,
  uploadWelcomeRegistry,
  uploadVoiceRegistry,
  downloadWelcomeRegistry,
  downloadVoiceRegistry,
  downloadWelcomeAudio
};

#!/usr/bin/env node

/**
 * Sync Welcomes to LFS Bucket
 *
 * Uploads canonical welcome audio files and registry to the LFS bucket.
 * These are shared resources used across all courses.
 *
 * Structure in S3:
 * - s3://popty-bach-lfs/canonical/welcomes.json (registry)
 * - s3://popty-bach-lfs/canonical/welcomes/{language_code}.wav (audio files)
 *
 * Usage:
 *   node scripts/sync-welcomes-to-lfs.cjs [--upload-audio] [--upload-registry] [--download]
 *
 * Options:
 *   --upload-audio      Upload welcome audio files to LFS
 *   --upload-registry   Upload welcomes.json registry to LFS
 *   --download          Download welcomes from LFS (for syncing local with remote)
 *   (no args)           Upload both audio and registry
 */

const fs = require('fs-extra');
const path = require('path');
const s3Service = require('../services/s3-service.cjs');

const WELCOMES_DIR = path.join(__dirname, '../extracted-welcomes');
const WELCOME_REGISTRY = path.join(__dirname, '../vfs/canonical/welcomes.json');
const REGISTRY_S3_KEY = 'canonical/welcomes.json';
const AUDIO_S3_PREFIX = 'canonical/welcomes/';

// Parse command line args
const args = process.argv.slice(2);
const uploadAudio = args.length === 0 || args.includes('--upload-audio');
const uploadRegistry = args.length === 0 || args.includes('--upload-registry');
const download = args.includes('--download');

async function uploadWelcomeAudio() {
  console.log('\n📤 Uploading Welcome Audio Files to LFS\n');

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
    const s3Key = `${AUDIO_S3_PREFIX}${langCode}.wav`;

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
  console.log(`Total: ${welcomes.length}`);
}

async function uploadWelcomeRegistry() {
  console.log('\n📤 Uploading Welcome Registry to LFS\n');

  if (!await fs.pathExists(WELCOME_REGISTRY)) {
    console.error(`✗ Registry not found: ${WELCOME_REGISTRY}`);
    return;
  }

  try {
    const registryContent = await fs.readFile(WELCOME_REGISTRY);
    const result = await s3Service.uploadToLFS(
      REGISTRY_S3_KEY,
      registryContent,
      'application/json'
    );

    console.log(`✓ Uploaded registry: ${result.url}`);

    // Also show what's in it
    const registry = JSON.parse(registryContent);
    const welcomeCount = Object.keys(registry.welcomes).filter(k => !k.startsWith('_')).length;
    console.log(`  Contains ${welcomeCount} welcomes`);

  } catch (error) {
    console.error(`✗ Upload failed: ${error.message}`);
  }
}

async function downloadWelcomes() {
  console.log('\n📥 Downloading Welcomes from LFS\n');

  try {
    // Download registry
    console.log('Downloading welcomes.json...');
    const registryData = await s3Service.downloadFromLFS(REGISTRY_S3_KEY);
    await fs.ensureDir(path.dirname(WELCOME_REGISTRY));
    await fs.writeFile(WELCOME_REGISTRY, registryData);
    console.log(`✓ Downloaded registry to: ${WELCOME_REGISTRY}`);

    const registry = JSON.parse(registryData);
    const welcomes = Object.keys(registry.welcomes).filter(k => !k.startsWith('_'));

    // Download audio files
    await fs.ensureDir(WELCOMES_DIR);
    console.log(`\nDownloading ${welcomes.length} audio files...\n`);

    let downloaded = 0;
    let failed = 0;

    for (const courseCode of welcomes) {
      const langCode = courseCode.split('_')[0];
      const s3Key = `${AUDIO_S3_PREFIX}${langCode}.wav`;
      const localPath = path.join(WELCOMES_DIR, `welcome_${langCode}.wav`);

      try {
        console.log(`📁 ${langCode}`);
        const audioData = await s3Service.downloadFromLFS(s3Key);
        await fs.writeFile(localPath, audioData);
        console.log(`   ✓ Downloaded to: ${localPath}\n`);
        downloaded++;
      } catch (error) {
        console.error(`   ✗ Download failed: ${error.message}\n`);
        failed++;
      }
    }

    console.log('\n📊 Download Summary');
    console.log('==================');
    console.log(`✓ Downloaded: ${downloaded}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`Total: ${welcomes.length}`);

  } catch (error) {
    console.error(`\n✗ Download failed: ${error.message}`);
  }
}

async function main() {
  console.log('🔄 Welcome LFS Sync Tool');
  console.log('========================\n');
  console.log(`LFS Bucket: ${s3Service.LFS_BUCKET}`);

  if (download) {
    await downloadWelcomes();
  } else {
    if (uploadAudio) {
      await uploadWelcomeAudio();
    }

    if (uploadRegistry) {
      await uploadWelcomeRegistry();
    }
  }

  console.log('\n✅ Sync complete!');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

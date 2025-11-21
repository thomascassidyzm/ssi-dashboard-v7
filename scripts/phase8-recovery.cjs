#!/usr/bin/env node

/**
 * Phase 8 Recovery Tool
 *
 * Recovers from interrupted Phase 8 generation by:
 * 1. Finding unprocessed MP3s in temp/audio/
 * 2. Processing them (normalize + time-stretch)
 * 3. Importing to temp MAR
 * 4. Uploading to S3
 *
 * Usage:
 *   node scripts/phase8-recovery.cjs <courseCode> [--bucket <bucket>] [--skip-upload]
 *
 * Example:
 *   node scripts/phase8-recovery.cjs spa_for_eng_TEST
 *   node scripts/phase8-recovery.cjs spa_for_eng_TEST --bucket ssi-audio-stage
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const audioProcessor = require('../services/audio-processor.cjs');
const marService = require('../services/mar-service.cjs');
const s3Service = require('../services/s3-service.cjs');

const VFS_BASE = path.join(__dirname, '..', 'public', 'vfs');
const AUDIO_TEMP_DIR = path.join(__dirname, '..', 'temp', 'audio');

// Parse arguments
const args = process.argv.slice(2);
const courseCode = args[0];
const bucketIndex = args.indexOf('--bucket');
const uploadBucket = bucketIndex !== -1 ? args[bucketIndex + 1] : 'ssi-audio-stage';
const skipUpload = args.includes('--skip-upload');

if (!courseCode) {
  console.error('Usage: node scripts/phase8-recovery.cjs <courseCode> [--bucket <bucket>] [--skip-upload]');
  process.exit(1);
}

async function getVoiceDetails(voiceId) {
  // Load from canonical location
  const voiceRegistryPath = path.join(VFS_BASE, 'canonical', 'voices.json');
  const voiceRegistry = await fs.readJson(voiceRegistryPath);
  return voiceRegistry.voices[voiceId];
}

async function recoverGeneratedSamples() {
  console.log('='.repeat(60));
  console.log('Phase 8: Recovery Tool');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Upload bucket: ${uploadBucket}`);
  console.log(`Skip upload: ${skipUpload}`);
  console.log('='.repeat(60));
  console.log();

  // Initialize temp MAR
  await marService.initTempMAR();

  // Load sample metadata from worker output files (if available) or manifest
  const sampleMetadata = {};

  // Try to load from worker output files first (contains generation results)
  const workerOutputDir = path.join(AUDIO_TEMP_DIR, 'worker-output');
  if (await fs.pathExists(workerOutputDir)) {
    const workerFiles = ['elevenlabs-results.json', 'azure-results.json'];

    for (const filename of workerFiles) {
      const filepath = path.join(workerOutputDir, filename);
      if (await fs.pathExists(filepath)) {
        const results = await fs.readJson(filepath);
        for (const sample of results) {
          if (sample.success && sample.uuid) {
            sampleMetadata[sample.uuid] = {
              text: sample.text,
              role: sample.role,
              cadence: sample.cadence,
              voiceId: sample.voiceId,
              language: sample.language
            };
          }
        }
      }
    }
    console.log(`Loaded metadata from worker output files: ${Object.keys(sampleMetadata).length} samples\n`);
  }

  // Fall back to manifest if worker files don't exist
  if (Object.keys(sampleMetadata).length === 0) {
    const manifestPath = path.join(VFS_BASE, 'courses', courseCode, 'course_manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      throw new Error(`No worker output files and course manifest not found: ${manifestPath}`);
    }

    const manifest = await fs.readJson(manifestPath);
    const samples = manifest.slices?.[0]?.samples || {};

    for (const [text, variants] of Object.entries(samples)) {
      for (const variant of variants) {
        if (variant.id) {
          sampleMetadata[variant.id] = {
            text,
            role: variant.role,
            cadence: variant.cadence,
            voiceId: variant.voice_id
          };
        }
      }
    }
    console.log(`Loaded metadata from course manifest: ${Object.keys(sampleMetadata).length} samples\n`);
  }

  // Load manifest for language info
  const manifestPath = path.join(VFS_BASE, 'courses', courseCode, 'course_manifest.json');
  const manifest = await fs.readJson(manifestPath);

  // Find all MP3s in temp/audio/
  const mp3Files = (await fs.readdir(AUDIO_TEMP_DIR))
    .filter(f => f.endsWith('.mp3'))
    .map(f => ({ uuid: path.basename(f, '.mp3'), path: path.join(AUDIO_TEMP_DIR, f) }));

  console.log(`Found ${mp3Files.length} MP3 files in temp/audio/\n`);

  if (mp3Files.length === 0) {
    console.log('✓ No files to recover');
    return;
  }

  // Check which are already in temp MAR
  const toProcess = [];
  for (const file of mp3Files) {
    const existsInMAR = await marService.getSampleFromBothMARs(file.uuid);
    if (!existsInMAR) {
      const metadata = sampleMetadata[file.uuid];
      if (metadata) {
        toProcess.push({ ...file, ...metadata });
      } else {
        console.warn(`⚠️  No metadata found for ${file.uuid} - skipping`);
      }
    }
  }

  console.log(`Already in MAR: ${mp3Files.length - toProcess.length}`);
  console.log(`Need to process: ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log('✓ All samples already in MAR');
    return;
  }

  // Process audio files
  console.log('='.repeat(60));
  console.log('Processing Audio');
  console.log('='.repeat(60));
  console.log();

  const processedDir = path.join(AUDIO_TEMP_DIR, 'processed');
  await fs.ensureDir(processedDir);

  const processConfigs = [];
  for (const sample of toProcess) {
    const voiceDetails = await getVoiceDetails(sample.voiceId);
    const cadenceSettings = voiceDetails?.processing?.cadences?.[sample.cadence] ||
                           voiceDetails?.processing?.cadences?.natural ||
                           {};

    const processedPath = path.join(processedDir, `${sample.uuid}.mp3`);

    processConfigs.push({
      input: sample.path,
      output: processedPath,
      uuid: sample.uuid,
      sample,
      options: {
        normalize: cadenceSettings.normalize !== false,
        timeStretch: cadenceSettings.time_stretch || 1.0,
        targetLUFS: cadenceSettings.target_lufs || -16.0
      }
    });
  }

  const processResults = await audioProcessor.processBatch(
    processConfigs,
    4, // Max 4 concurrent
    (current, total) => {
      console.log(`Processed ${current}/${total} audio files`);
    }
  );

  const processedCount = processResults.filter(r => r.success).length;
  console.log(`\n✅ Processed: ${processedCount}/${toProcess.length} files\n`);

  // Import to temp MAR
  console.log('='.repeat(60));
  console.log('Importing to Temp MAR');
  console.log('='.repeat(60));
  console.log();

  let imported = 0;
  for (const result of processResults) {
    if (!result.success) continue;

    // Match result to config by output path
    const config = processConfigs.find(c => c.output === result.output);
    if (!config) {
      console.warn(`⚠️  Could not find config for ${result.output}`);
      continue;
    }

    const { sample } = config;

    try {
      const duration = await audioProcessor.getAudioDuration(result.output);

      // Use language from metadata if available, otherwise determine from manifest
      const language = sample.language || (
        ['target1', 'target2'].includes(sample.role)
          ? manifest.target
          : manifest.known
      );

      await marService.saveSampleToTempMAR(sample.voiceId, sample.uuid, {
        text: sample.text,
        language,
        role: sample.role,
        cadence: sample.cadence,
        duration,
        filename: `${sample.uuid}.mp3`
      });

      imported++;
      console.log(`✓ ${sample.voiceId} / ${sample.text.substring(0, 40)}... (${duration.toFixed(2)}s)`);
    } catch (error) {
      console.error(`✗ Failed to import ${sample.uuid}: ${error.message}`);
    }
  }

  console.log(`\n✅ Imported: ${imported}/${processedCount} samples to temp MAR\n`);

  // Upload to S3
  if (!skipUpload) {
    console.log('='.repeat(60));
    console.log('Uploading to S3');
    console.log('='.repeat(60));
    console.log();

    const uploadConfigs = processResults
      .filter(r => r.success)
      .map(r => {
        const config = processConfigs.find(c => c.output === r.output);
        return {
          uuid: config.uuid,
          localPath: r.output,
          sample: config.sample
        };
      });

    let uploaded = 0;
    for (const config of uploadConfigs) {
      try {
        const s3Key = `samples/${config.uuid}.mp3`;
        await s3Service.uploadFile(config.localPath, s3Key, uploadBucket);
        uploaded++;
        console.log(`✓ ${config.sample.voiceId} / ${config.sample.text.substring(0, 40)}...`);
      } catch (error) {
        console.error(`✗ Failed to upload ${config.uuid}: ${error.message}`);
      }
    }

    console.log(`\n✅ Uploaded: ${uploaded}/${uploadConfigs.length} samples to S3 (${uploadBucket})\n`);
  }

  console.log('='.repeat(60));
  console.log('Recovery Complete');
  console.log('='.repeat(60));
  console.log();
  console.log(`Processed: ${processedCount}`);
  console.log(`Imported to MAR: ${imported}`);
  if (!skipUpload) {
    console.log(`Uploaded to S3: ${uploaded}`);
  }
  console.log();
  console.log('You can now continue Phase 8 generation with:');
  console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --execute`);
  console.log();
}

// Run
recoverGeneratedSamples().catch(err => {
  console.error('\n❌ Recovery failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});

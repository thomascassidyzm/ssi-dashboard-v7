#!/usr/bin/env node

/**
 * Migrate Old MAR to New Structure
 *
 * Merges 200K samples from s3://popty-bach-lfs/mar/eng.json into
 * samples_database/voices/elevenlabs_FVdzAUsp8apoOdc0907A/samples.json
 *
 * Usage: node scripts/migrate-old-mar.cjs [--dry-run]
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const VOICE_ID = 'elevenlabs_FVdzAUsp8apoOdc0907A';
const NEW_MAR_PATH = path.join(__dirname, '../samples_database/voices', VOICE_ID, 'samples.json');
const BACKUP_PATH = NEW_MAR_PATH.replace('.json', `_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const S3_OLD_MAR = 's3://popty-bach-lfs/mar/eng.json';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('MAR Migration: Old Format to New Structure');
  console.log('='.repeat(60));
  console.log(`\nVoice ID: ${VOICE_ID}`);
  console.log(`New MAR path: ${NEW_MAR_PATH}`);
  console.log(`Dry run: ${dryRun}\n`);

  // Step 1: Download old MAR from S3
  console.log('Step 1: Downloading old MAR from S3...');
  let oldMarJson;
  try {
    oldMarJson = execSync(`aws s3 cp ${S3_OLD_MAR} - --profile default`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024 // 100MB buffer for large file
    });
  } catch (error) {
    console.error('Failed to download old MAR from S3:', error.message);
    process.exit(1);
  }

  const oldMar = JSON.parse(oldMarJson);
  const oldCount = Object.keys(oldMar).length;
  console.log(`  Downloaded ${oldCount.toLocaleString()} samples from old MAR\n`);

  // Step 2: Load existing new MAR
  console.log('Step 2: Loading existing new MAR...');
  let newMar;
  if (await fs.pathExists(NEW_MAR_PATH)) {
    newMar = await fs.readJson(NEW_MAR_PATH);
    console.log(`  Loaded ${Object.keys(newMar.samples || {}).length.toLocaleString()} existing samples\n`);
  } else {
    newMar = {
      voice_id: VOICE_ID,
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      sample_count: 0,
      samples: {}
    };
    console.log('  No existing MAR found, creating new one\n');
  }

  // Step 3: Create backup
  if (!dryRun && await fs.pathExists(NEW_MAR_PATH)) {
    console.log('Step 3: Creating backup...');
    await fs.copy(NEW_MAR_PATH, BACKUP_PATH);
    console.log(`  Backed up to: ${BACKUP_PATH}\n`);
  } else {
    console.log('Step 3: Skipping backup (dry run or no existing file)\n');
  }

  // Step 4: Convert and merge
  console.log('Step 4: Converting and merging samples...');

  let converted = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const [uuid, oldSample] of Object.entries(oldMar)) {
    // Check if already exists in new MAR
    if (newMar.samples[uuid]) {
      duplicates++;
      continue;
    }

    // Convert old format to new format
    const newSample = {
      text: oldSample.phrase,
      language: oldSample.language || 'eng',
      role: oldSample.role || 'source',
      cadence: oldSample.cadence || 'natural',
      duration: oldSample.duration,
      filename: oldSample.filename || `${uuid}.mp3`
    };

    // Validate - skip if missing essential data
    if (!newSample.text || !newSample.duration) {
      skipped++;
      continue;
    }

    newMar.samples[uuid] = newSample;
    converted++;

    // Progress update every 10000 samples
    if (converted % 10000 === 0) {
      console.log(`  Converted ${converted.toLocaleString()} samples...`);
    }
  }

  console.log(`\n  Conversion complete:`);
  console.log(`    - Converted: ${converted.toLocaleString()}`);
  console.log(`    - Duplicates (skipped): ${duplicates.toLocaleString()}`);
  console.log(`    - Invalid (skipped): ${skipped.toLocaleString()}\n`);

  // Step 5: Update metadata
  const newCount = Object.keys(newMar.samples).length;
  newMar.sample_count = newCount;
  newMar.last_updated = new Date().toISOString();

  console.log('Step 5: Final counts');
  console.log(`  Previous sample count: ${(newCount - converted).toLocaleString()}`);
  console.log(`  Added from old MAR: ${converted.toLocaleString()}`);
  console.log(`  New total: ${newCount.toLocaleString()}\n`);

  // Step 6: Save
  if (dryRun) {
    console.log('Step 6: DRY RUN - Not saving changes\n');
    console.log('To apply changes, run without --dry-run flag');
  } else {
    console.log('Step 6: Saving merged MAR...');
    await fs.writeJson(NEW_MAR_PATH, newMar, { spaces: 2 });
    console.log(`  Saved to: ${NEW_MAR_PATH}\n`);
  }

  console.log('='.repeat(60));
  console.log('Migration complete!');
  console.log('='.repeat(60));

  if (!dryRun) {
    console.log('\nNext steps:');
    console.log('1. Sync samples_database/ to S3:');
    console.log('   aws s3 sync samples_database/ s3://popty-bach-lfs/samples_database/ --profile default');
    console.log('\n2. Delete old MAR from S3:');
    console.log('   aws s3 rm s3://popty-bach-lfs/mar/eng.json --profile default');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

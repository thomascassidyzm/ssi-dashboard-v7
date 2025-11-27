#!/usr/bin/env node
/**
 * Process and upload only missing files to S3
 * 1. Checks what's already in S3
 * 2. Normalizes (masters) missing files with ffmpeg
 * 3. Uploads them
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const TEMP_BASE = '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/temp';
const AUDIO_DIR = path.join(TEMP_BASE, 'audio'); // Legacy fallback
const MASTERED_DIR = path.join(TEMP_BASE, 'mastered');
const S3_BUCKET = 'ssi-audio-stage';
const S3_PREFIX = 'mastered/';
const CONCURRENCY = 10; // Lower for ffmpeg processing
const COURSES = ['cmn_for_eng', 'spa_for_eng'];

/**
 * Scan hierarchical temp/{course}/{role}/{cadence}/ structure for MP3 files
 */
async function scanHierarchicalStructure() {
  const files = [];

  for (const course of COURSES) {
    const courseDir = path.join(TEMP_BASE, course);
    if (!await fs.pathExists(courseDir)) continue;

    const roles = await fs.readdir(courseDir);
    for (const role of roles) {
      const roleDir = path.join(courseDir, role);
      const roleStat = await fs.stat(roleDir);
      if (!roleStat.isDirectory()) continue;

      const cadences = await fs.readdir(roleDir);
      for (const cadence of cadences) {
        const cadenceDir = path.join(roleDir, cadence);
        const cadenceStat = await fs.stat(cadenceDir);
        if (!cadenceStat.isDirectory()) continue;

        const mp3s = (await fs.readdir(cadenceDir))
          .filter(f => f.endsWith('.mp3') && /^[0-9A-F]/.test(f));

        for (const mp3 of mp3s) {
          files.push({
            uuid: mp3.replace('.mp3', ''),
            path: path.join(cadenceDir, mp3),
            course,
            role,
            cadence
          });
        }
      }
    }
  }

  return files;
}

async function normalizeAudio(inputPath, outputPath) {
  await execAsync(
    `ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

async function main() {
  console.log('=== Process & Upload Missing Files to S3 ===\n');

  await fs.ensureDir(MASTERED_DIR);

  // Get local files from new hierarchical structure
  console.log('Scanning local files (hierarchical structure)...');
  const hierarchicalFiles = await scanHierarchicalStructure();
  console.log(`Found ${hierarchicalFiles.length} files in temp/{course}/{role}/{cadence}/`);

  // Also check legacy flat structure
  let legacyFiles = [];
  if (await fs.pathExists(AUDIO_DIR)) {
    legacyFiles = fs.readdirSync(AUDIO_DIR)
      .filter(f => f.endsWith('.mp3') && /^[0-9A-F]/.test(f))
      .map(f => ({
        uuid: f.replace('.mp3', ''),
        path: path.join(AUDIO_DIR, f),
        course: 'unknown',
        role: 'unknown',
        cadence: 'unknown'
      }));
    if (legacyFiles.length > 0) {
      console.log(`Found ${legacyFiles.length} files in legacy temp/audio/`);
    }
  }

  // Combine and deduplicate (prefer hierarchical)
  const seenUUIDs = new Set(hierarchicalFiles.map(f => f.uuid));
  const localFiles = [
    ...hierarchicalFiles,
    ...legacyFiles.filter(f => !seenUUIDs.has(f.uuid))
  ];
  console.log(`Local raw files: ${localFiles.length}`);

  // Get S3 files (just the UUIDs)
  console.log('\nChecking S3 for existing files (this may take a minute)...');
  let s3Files = new Set();

  try {
    const result = execSync(
      `aws s3api list-objects-v2 --bucket ${S3_BUCKET} --prefix ${S3_PREFIX} --query "Contents[].Key" --output text`,
      { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' }
    );

    for (const line of result.split(/\s+/)) {
      if (line && line.includes('.mp3')) {
        const uuid = path.basename(line, '.mp3');
        s3Files.add(uuid);
      }
    }
  } catch (error) {
    console.error('Error listing S3:', error.message);
    process.exit(1);
  }

  console.log(`S3 files: ${s3Files.size}`);

  // Find missing (localFiles is now array of {uuid, path, course, role, cadence})
  const missing = localFiles.filter(file => !s3Files.has(file.uuid));
  console.log(`Missing from S3: ${missing.length}`);

  if (missing.length === 0) {
    console.log('\n✓ All files already in S3!');
    return;
  }

  // Show breakdown by course/role
  const breakdown = {};
  for (const file of missing) {
    const key = `${file.course}/${file.role}`;
    breakdown[key] = (breakdown[key] || 0) + 1;
  }
  console.log('\nBreakdown of missing files:');
  for (const [key, count] of Object.entries(breakdown).sort()) {
    console.log(`  ${key}: ${count}`);
  }

  // Process and upload missing files
  console.log(`\nProcessing & uploading ${missing.length} files (${CONCURRENCY} parallel)...\n`);

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (file) => {
      const rawPath = file.path; // Use the actual path from scanning
      const masteredPath = path.join(MASTERED_DIR, `${file.uuid}.mp3`);
      const s3Key = `${S3_PREFIX}${file.uuid}.mp3`;

      try {
        // Step 1: Normalize (master) the audio
        await normalizeAudio(rawPath, masteredPath);

        // Step 2: Upload to S3
        execSync(
          `aws s3 cp "${masteredPath}" "s3://${S3_BUCKET}/${s3Key}" --content-type audio/mpeg`,
          { stdio: 'pipe' }
        );

        // Step 3: Clean up mastered file
        await fs.remove(masteredPath);

        processed++;
      } catch (error) {
        console.error(`  Failed ${file.uuid}: ${error.message}`);
        failed++;
      }
    }));

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = rate > 0 ? (missing.length - processed - failed) / rate : 0;
    console.log(`Processed: ${processed}/${missing.length} (${rate.toFixed(1)}/s, ~${Math.ceil(remaining)}s remaining)`);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n✓ Done! Processed: ${processed}, Failed: ${failed} in ${totalTime.toFixed(1)}s`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

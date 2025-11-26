#!/usr/bin/env node

/**
 * Extract Durations from S3 - Parallel Processing
 *
 * Downloads audio files from S3 in parallel and extracts durations using sox.
 * Based on the Python multiprocessing approach from popty-bach.
 *
 * Usage: node scripts/extract-s3-durations-parallel.cjs <course_code> [--workers=N]
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// Configuration
const S3_BUCKET = 'ssi-audio-stage';
const S3_PREFIX = 'mastered/';
const DEFAULT_WORKERS = Math.min(os.cpus().length, 16);

// Initialize S3 client
const s3Client = new S3Client({ region: 'eu-west-1' });

/**
 * Collect all sample IDs from manifest
 */
function collectSampleIds(manifest) {
  const ids = new Set();

  // Introduction/welcome
  if (manifest.introduction?.id) {
    ids.add(manifest.introduction.id);
  }

  // Encouragements
  if (manifest.encouragements) {
    for (const enc of manifest.encouragements) {
      if (enc.uuid) ids.add(enc.uuid);
    }
  }

  // Samples from slices
  const samples = manifest.slices?.[0]?.samples || {};
  for (const variants of Object.values(samples)) {
    for (const v of variants) {
      if (v.id) ids.add(v.id);
    }
  }

  return Array.from(ids);
}

/**
 * Download file from S3 to local path
 */
async function downloadFromS3(uuid, localPath) {
  const key = `${S3_PREFIX}${uuid}.mp3`;

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    const response = await s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    await fs.writeFile(localPath, Buffer.concat(chunks));
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false; // File doesn't exist
    }
    throw error;
  }
}

/**
 * Get audio duration using sox
 */
function getAudioDuration(filePath) {
  try {
    const result = execSync(`sox "${filePath}" -n stat 2>&1`, { encoding: 'utf8' });
    const match = result.match(/Length \(seconds\):\s+([\d.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Process a single sample - download from S3 and extract duration
 */
async function processSample(uuid, tempDir) {
  const localPath = path.join(tempDir, `${uuid}.mp3`);

  try {
    const downloaded = await downloadFromS3(uuid, localPath);
    if (!downloaded) {
      return { uuid, duration: null, error: 'not_found' };
    }

    const duration = getAudioDuration(localPath);

    // Clean up immediately
    await fs.remove(localPath).catch(() => {});

    if (duration && duration > 0) {
      return { uuid, duration, error: null };
    } else {
      return { uuid, duration: null, error: 'invalid_duration' };
    }
  } catch (error) {
    await fs.remove(localPath).catch(() => {});
    return { uuid, duration: null, error: error.message };
  }
}

/**
 * Process samples in parallel using worker approach
 */
async function processInParallel(sampleIds, numWorkers, tempDir) {
  const results = {};
  let completed = 0;
  let found = 0;
  let notFound = 0;
  let errors = 0;
  const total = sampleIds.length;
  const startTime = Date.now();

  // Create a queue of work
  const queue = [...sampleIds];
  const activeWorkers = new Set();

  // Progress display
  const updateProgress = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / elapsed;
    const eta = (total - completed) / rate;
    const etaMin = Math.floor(eta / 60);
    const etaSec = Math.floor(eta % 60);

    process.stdout.write(`\r[${completed}/${total}] Found: ${found} | Missing: ${notFound} | Errors: ${errors} | Rate: ${rate.toFixed(1)}/s | ETA: ${etaMin}m ${etaSec}s    `);
  };

  // Worker function
  const runWorker = async () => {
    while (queue.length > 0) {
      const uuid = queue.shift();
      if (!uuid) break;

      const result = await processSample(uuid, tempDir);

      completed++;
      if (result.duration) {
        results[result.uuid] = result.duration;
        found++;
      } else if (result.error === 'not_found') {
        notFound++;
      } else {
        errors++;
      }

      // Update progress every 10 samples
      if (completed % 10 === 0) {
        updateProgress();
      }
    }
  };

  // Start workers
  console.log(`\nStarting ${numWorkers} parallel workers...\n`);

  const workerPromises = [];
  for (let i = 0; i < numWorkers; i++) {
    workerPromises.push(runWorker());
  }

  await Promise.all(workerPromises);

  // Final progress update
  updateProgress();
  console.log('\n');

  return { results, found, notFound, errors };
}

/**
 * Update manifest with durations
 */
function updateManifestDurations(manifest, durations) {
  let updated = 0;

  // Update introduction
  if (manifest.introduction?.id && durations[manifest.introduction.id]) {
    manifest.introduction.duration = durations[manifest.introduction.id];
    updated++;
  }

  // Update encouragements
  if (manifest.encouragements) {
    for (const enc of manifest.encouragements) {
      if (enc.uuid && durations[enc.uuid]) {
        enc.duration = durations[enc.uuid];
        updated++;
      }
    }
  }

  // Update samples
  const samples = manifest.slices?.[0]?.samples || {};
  for (const variants of Object.values(samples)) {
    for (const v of variants) {
      if (v.id && durations[v.id]) {
        v.duration = durations[v.id];
        updated++;
      }
    }
  }

  return updated;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: node scripts/extract-s3-durations-parallel.cjs <course_code> [options]

Options:
  --workers=N    Number of parallel workers (default: ${DEFAULT_WORKERS})
  --dry-run      Don't save changes to manifest
  --help         Show this help

Example:
  node scripts/extract-s3-durations-parallel.cjs spa_for_eng --workers=8
`);
    process.exit(0);
  }

  const courseCode = args.find(a => !a.startsWith('--'));
  const workersArg = args.find(a => a.startsWith('--workers='));
  const numWorkers = workersArg ? parseInt(workersArg.split('=')[1]) : DEFAULT_WORKERS;
  const dryRun = args.includes('--dry-run');

  if (!courseCode) {
    console.error('Error: Course code required');
    process.exit(1);
  }

  const manifestPath = path.join(__dirname, `../public/vfs/courses/${courseCode}/course_manifest.json`);

  if (!await fs.pathExists(manifestPath)) {
    console.error(`Error: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Extract S3 Durations - Parallel Processing');
  console.log('='.repeat(60));
  console.log(`\nCourse: ${courseCode}`);
  console.log(`Workers: ${numWorkers}`);
  console.log(`S3 Bucket: ${S3_BUCKET}`);
  console.log(`Dry run: ${dryRun}`);

  // Load manifest
  const manifest = await fs.readJson(manifestPath);

  // Collect sample IDs
  const sampleIds = collectSampleIds(manifest);
  console.log(`\nTotal samples to check: ${sampleIds.length}`);

  // Create temp directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 's3-duration-'));
  console.log(`Temp directory: ${tempDir}`);

  try {
    // Process in parallel
    const { results, found, notFound, errors } = await processInParallel(sampleIds, numWorkers, tempDir);

    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total processed: ${sampleIds.length}`);
    console.log(`Found with duration: ${found}`);
    console.log(`Not found in S3: ${notFound}`);
    console.log(`Errors: ${errors}`);

    if (found > 0 && !dryRun) {
      // Update manifest
      const updated = updateManifestDurations(manifest, results);
      console.log(`\nUpdated ${updated} duration values in manifest`);

      // Save manifest
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      console.log(`Saved manifest to ${manifestPath}`);
    } else if (dryRun) {
      console.log('\nDry run - manifest not modified');
    }

    // Save durations to a separate file for reference
    const durationsPath = path.join(path.dirname(manifestPath), 's3_durations.json');
    await fs.writeJson(durationsPath, {
      extracted_at: new Date().toISOString(),
      total_samples: sampleIds.length,
      found: found,
      not_found: notFound,
      errors: errors,
      durations: results
    }, { spaces: 2 });
    console.log(`Saved durations reference to ${durationsPath}`);

  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir).catch(() => {});
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

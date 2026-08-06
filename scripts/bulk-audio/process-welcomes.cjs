#!/usr/bin/env node

/**
 * Process & Upload Welcome Audio
 *
 * Takes generated welcome MP3s, masters them (normalize to -16 LUFS),
 * uploads to S3 (mastered/{UUID}.mp3). No DB insert — welcomes are
 * course-specific and will be referenced when courses are created.
 *
 * Usage:
 *   node process-welcomes.cjs --plan                # Show what will happen
 *   node process-welcomes.cjs --execute             # Process all languages
 *   node process-welcomes.cjs --execute --lang fin   # Process one known language
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// AWS SDK v3
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// =============================================================================
// CONFIG
// =============================================================================

const PRODUCTION_DIR = path.join(__dirname, 'generated/welcomes/production');
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const CONCURRENCY = 20;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// =============================================================================
// AUDIO MASTERING
// =============================================================================

async function masterAndGetDuration(inputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-master-'));
  const outputPath = path.join(tempDir, 'mastered.mp3');

  try {
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outputPath}"`
    );

    const { stdout } = await execAsync(
      `ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    const durationMs = Math.round(parseFloat(stdout.trim()) * 1000);

    const buffer = fs.readFileSync(outputPath);
    return { buffer, durationMs };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// =============================================================================
// S3 OPERATIONS
// =============================================================================

async function uploadToS3(uuid, buffer) {
  const s3Key = `mastered/${uuid}.mp3`;

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: 'audio/mpeg'
  }));

  return s3Key;
}

async function existsInS3(uuid) {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: `mastered/${uuid}.mp3`
    }));
    return true;
  } catch (e) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

// =============================================================================
// CONCURRENCY POOL
// =============================================================================

async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = [];
  for (let w = 0; w < Math.min(concurrency, tasks.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan');
  const isExecute = args.includes('--execute');
  const langFilter = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;

  if (!isPlan && !isExecute) {
    console.log('Usage:');
    console.log('  node process-welcomes.cjs --plan                # Show plan');
    console.log('  node process-welcomes.cjs --execute             # Process all');
    console.log('  node process-welcomes.cjs --execute --lang fin  # Process one known language');
    process.exit(0);
  }

  // Discover known languages with manifests
  const langDirs = fs.readdirSync(PRODUCTION_DIR).filter(d => {
    if (d.startsWith('_') || d.startsWith('.')) return false;
    const manifestPath = path.join(PRODUCTION_DIR, d, '_manifest.json');
    return fs.existsSync(manifestPath);
  });

  const languages = langFilter ? [langFilter] : langDirs;

  // Build plan
  const plan = [];
  for (const lang of languages) {
    const manifestPath = path.join(PRODUCTION_DIR, lang, '_manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`WARNING: No manifest for ${lang}, skipping`);
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    plan.push({
      lang,
      display_name: manifest.display_name,
      voice_id: manifest.voice?.voice_id,
      voice_name: manifest.voice?.name,
      welcomes: manifest.welcomes || [],
      total: (manifest.welcomes || []).length
    });
  }

  const totalSamples = plan.reduce((n, p) => n + p.total, 0);

  // --- PLAN MODE ---
  if (isPlan) {
    console.log(`\n${'='.repeat(65)}`);
    console.log('  PROCESS & UPLOAD PLAN — Welcome Audio');
    console.log(`${'='.repeat(65)}\n`);

    for (const p of plan) {
      console.log(`  ${p.lang.toUpperCase()} (${p.display_name}): ${p.total} welcome samples`);
    }

    console.log(`\n${'-'.repeat(65)}`);
    console.log(`  Known languages: ${plan.length}`);
    console.log(`  Total samples:   ${totalSamples}`);
    console.log(`  Concurrency:     ${CONCURRENCY}`);
    console.log(`  S3 bucket:       ${S3_BUCKET}`);
    console.log(`  S3 path:         mastered/{UUID}.mp3`);
    console.log(`  DB insert:       SKIPPED (welcomes are course-specific)`);
    console.log(`${'-'.repeat(65)}`);

    console.log(`\n  Pipeline per sample:`);
    console.log(`    1. Master (ffmpeg -16 LUFS normalize)`);
    console.log(`    2. Upload to S3 (mastered/{UUID}.mp3)`);
    console.log(`\n  Run with --execute to process.\n`);
    return;
  }

  // --- EXECUTE MODE ---
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('Missing AWS credentials in .env');
    process.exit(1);
  }

  // Check ffmpeg
  try {
    await execAsync('ffmpeg -version');
  } catch {
    console.error('ffmpeg not found. Install ffmpeg first.');
    process.exit(1);
  }

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Global welcome index for cross-referencing
  const globalIndex = {};

  for (const p of plan) {
    console.log(`\n--- ${p.lang.toUpperCase()} (${p.display_name}) — ${p.total} welcomes ---\n`);

    const langDir = path.join(PRODUCTION_DIR, p.lang);
    let langProcessed = 0;
    let langSkipped = 0;
    let langFailed = 0;

    const tasks = p.welcomes.map((welcome, sampleIdx) => async () => {
      const inputPath = path.join(langDir, welcome.file);
      const num = sampleIdx + 1;
      const label = `${p.lang}→${welcome.target_language}`;

      // Check if already in S3
      try {
        const exists = await existsInS3(welcome.uuid);
        if (exists) {
          console.log(`  [${num}/${p.total}] ${label} SKIP (already in S3)`);
          langSkipped++;

          // Still record in global index
          if (!globalIndex[p.lang]) globalIndex[p.lang] = {};
          globalIndex[p.lang][welcome.target_language] = {
            uuid: welcome.uuid,
            s3_key: `mastered/${welcome.uuid}.mp3`,
            skipped: true
          };
          return;
        }
      } catch (e) {
        // S3 check failed, proceed with full pipeline
      }

      if (!fs.existsSync(inputPath)) {
        console.log(`  [${num}/${p.total}] ${label} MISSING file`);
        langFailed++;
        return;
      }

      try {
        // Step 1: Master
        const { buffer, durationMs } = await masterAndGetDuration(inputPath);

        // Step 2: Upload to S3
        const s3Key = await uploadToS3(welcome.uuid, buffer);

        const kb = (buffer.length / 1024).toFixed(1);
        console.log(`  [${num}/${p.total}] ${label} OK (${kb}kb, ${durationMs}ms) → ${s3Key}`);
        langProcessed++;

        // Record in global index
        if (!globalIndex[p.lang]) globalIndex[p.lang] = {};
        globalIndex[p.lang][welcome.target_language] = {
          uuid: welcome.uuid,
          s3_key: s3Key,
          duration_ms: durationMs,
          size_kb: parseFloat(kb)
        };
      } catch (err) {
        console.log(`  [${num}/${p.total}] ${label} FAILED: ${err.message.slice(0, 80)}`);
        langFailed++;
      }
    });

    await runPool(tasks, CONCURRENCY);

    console.log(`  ${p.lang.toUpperCase()} done: ${langProcessed} processed, ${langSkipped} skipped, ${langFailed} failed`);
    totalProcessed += langProcessed;
    totalSkipped += langSkipped;
    totalFailed += langFailed;
  }

  // Write global welcome index
  const indexPath = path.join(PRODUCTION_DIR, '_welcome_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(globalIndex, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n${'='.repeat(65)}`);
  console.log('  PROCESS & UPLOAD COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Known languages: ${plan.length}`);
  console.log(`  Total samples:   ${totalSamples}`);
  console.log(`  Processed:       ${totalProcessed}`);
  console.log(`  Skipped:         ${totalSkipped} (already in S3)`);
  console.log(`  Failed:          ${totalFailed}`);
  console.log(`  Time:            ${elapsed} minutes`);
  console.log(`  S3 bucket:       ${S3_BUCKET}`);
  console.log(`  Welcome index:   ${indexPath}`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

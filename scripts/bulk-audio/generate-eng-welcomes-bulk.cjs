#!/usr/bin/env node

/**
 * Bulk-generate English (robo-Aran) welcome audio for ALL target languages.
 * Uses eleven_multilingual_v2 with stability=0.4, similarity_boost=1.0.
 *
 * Reads eng.json template, fills placeholders per target, generates TTS,
 * masters to -16 LUFS, uploads to S3, and updates _welcome_index.json.
 *
 * Does NOT insert into course_audio — use apply-welcomes-to-courses.cjs for that.
 *
 * Usage:
 *   node generate-eng-welcomes-bulk.cjs --plan              # Show plan
 *   node generate-eng-welcomes-bulk.cjs --execute            # Generate all
 *   node generate-eng-welcomes-bulk.cjs --execute --resume   # Skip already-generated
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// =============================================================================
// CONFIG
// =============================================================================

const VOICE_ID = 'FVdzAUsp8apoOdc0907A'; // robo-Aran
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const CONCURRENCY = 3; // conservative to avoid rate limits

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const TEMPLATE_PATH = path.join(__dirname, 'data/translations/welcomes/eng.json');
const INDEX_PATH = path.join(__dirname, 'generated/welcomes/production/_welcome_index.json');
const PROGRESS_PATH = path.join(__dirname, 'generated/welcomes/production/eng_bulk_progress.json');

// =============================================================================
// HELPERS
// =============================================================================

let _fetch = null;
async function getFetch() {
  if (!_fetch) _fetch = (await import('node-fetch')).default;
  return _fetch;
}

function fillTemplate(template, inKnown, targetEntry) {
  return template
    .replace(/\{in_target\}/g, targetEntry.in_target)
    .replace(/\{a_target_speaker\}/g, targetEntry.a_target_speaker)
    .replace(/\{target_speakers\}/g, targetEntry.target_speakers)
    .replace(/\{in_known\}/g, inKnown);
}

async function generateWithRetry(text, maxRetries = 3) {
  const fetch = await getFetch();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.4, similarity_boost: 1.0 },
          language_code: 'en'
        })
      });

      if (response.status === 429) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        process.stdout.write(`[429, wait ${waitMs / 1000}s] `);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return { success: false, error: errorText, status: response.status };
      }

      const buffer = await response.buffer();
      return { success: true, buffer };
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      return { success: false, error: err.message, status: 0 };
    }
  }
  return { success: false, error: 'Exhausted retries', status: 0 };
}

async function masterAndGetDuration(inputBuffer) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-'));
  const inputPath = path.join(tempDir, 'input.mp3');
  const outputPath = path.join(tempDir, 'mastered.mp3');

  try {
    fs.writeFileSync(inputPath, inputBuffer);
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

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')); }
  catch { return { completed: {} }; }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

function loadIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')); }
  catch { return {}; }
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan');
  const isExecute = args.includes('--execute');
  const isResume = args.includes('--resume');

  if (!isPlan && !isExecute) {
    console.log('Usage:');
    console.log('  node generate-eng-welcomes-bulk.cjs --plan              # Show plan');
    console.log('  node generate-eng-welcomes-bulk.cjs --execute            # Generate all');
    console.log('  node generate-eng-welcomes-bulk.cjs --execute --resume   # Skip completed');
    process.exit(0);
  }

  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  const allTargets = Object.keys(template.targets).sort();
  const progress = loadProgress();
  const completedSet = new Set(Object.keys(progress.completed || {}));

  const jobs = isResume
    ? allTargets.filter(t => !completedSet.has(t))
    : allTargets;

  console.log(`\n${'='.repeat(65)}`);
  console.log('  ENGLISH BULK WELCOME GENERATION (robo-Aran)');
  console.log(`${'='.repeat(65)}\n`);
  console.log(`  Voice:       robo-Aran (${VOICE_ID})`);
  console.log(`  Model:       eleven_multilingual_v2`);
  console.log(`  Settings:    stability=0.4, similarity_boost=1.0`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log(`  Total targets in template: ${allTargets.length}`);
  if (isResume) {
    console.log(`  Already completed: ${completedSet.size}`);
  }
  console.log(`  To generate: ${jobs.length}`);
  console.log(`  Est. cost:   ~${jobs.length * 580} credits`);
  console.log(`\n  Output: _welcome_index.json (eng → target → {uuid, s3_key, ...})`);
  console.log(`${'='.repeat(65)}`);

  if (isPlan) {
    console.log('\n  Targets:');
    for (const t of jobs) {
      console.log(`    ${t} — ${template.targets[t].a_target_speaker}`);
    }
    console.log(`\n  Run with --execute to generate.\n`);
    return;
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  try { await execAsync('ffmpeg -version'); } catch {
    console.error('ffmpeg not found');
    process.exit(1);
  }

  console.log(`\nGenerating ${jobs.length} welcomes (concurrency: ${CONCURRENCY})...\n`);

  const index = loadIndex();
  if (!index.eng) index.eng = {};

  let success = 0;
  const failures = [];

  // Process in batches for concurrency
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (targetCode) => {
      const targetEntry = template.targets[targetCode];
      const text = fillTemplate(template.template, template.in_known, targetEntry);

      process.stdout.write(`  [${i + batch.indexOf(targetCode) + 1}/${jobs.length}] eng→${targetCode}: `);

      const result = await generateWithRetry(text);
      if (!result.success) {
        console.log(`FAILED: ${(result.error || '').toString().substring(0, 60)}`);
        return { targetCode, success: false };
      }

      process.stdout.write('master... ');
      const { buffer: mastered, durationMs } = await masterAndGetDuration(result.buffer);

      const uuid = uuidv4().toUpperCase();
      const s3Key = `mastered/${uuid}.mp3`;

      process.stdout.write('S3... ');
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: mastered,
        ContentType: 'audio/mpeg'
      }));

      const sizeKb = (mastered.length / 1024).toFixed(1);
      console.log(`OK (${sizeKb}kb, ${(durationMs / 1000).toFixed(1)}s)`);

      return { targetCode, success: true, uuid, s3Key, durationMs, sizeKb };
    }));

    for (const r of results) {
      if (r.success) {
        index.eng[r.targetCode] = {
          uuid: r.uuid,
          s3_key: r.s3Key,
          duration_ms: r.durationMs,
          size_kb: parseFloat(r.sizeKb)
        };
        progress.completed[r.targetCode] = { uuid: r.uuid, timestamp: new Date().toISOString() };
        success++;
      } else {
        failures.push(r.targetCode);
      }
    }

    // Save after each batch
    saveIndex(index);
    saveProgress(progress);
  }

  console.log(`\n${'='.repeat(65)}`);
  console.log('  COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Generated: ${success}`);
  console.log(`  Failed:    ${failures.length}`);
  console.log(`  Total eng entries in index: ${Object.keys(index.eng).length}`);
  if (failures.length > 0) {
    console.log(`  Failures:  ${failures.join(', ')}`);
    console.log(`  Re-run with --execute --resume to retry.`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

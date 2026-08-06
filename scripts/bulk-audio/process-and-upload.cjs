#!/usr/bin/env node

/**
 * Process & Upload Encouragement Audio
 *
 * Takes generated encouragement MP3s, masters them (normalize to -16 LUFS),
 * uploads to S3 (mastered/{UUID}.mp3), and inserts into shared_audio table.
 *
 * Usage:
 *   node process-and-upload.cjs --plan                # Show what will happen
 *   node process-and-upload.cjs --execute             # Process all languages
 *   node process-and-upload.cjs --execute --lang fin   # Process one language
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
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// CONFIG
// =============================================================================

const PRODUCTION_DIR = path.join(__dirname, 'generated/encouragements/production');
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const CONCURRENCY = 20; // Parallel mastering + uploads

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

// =============================================================================
// AUDIO MASTERING
// =============================================================================

async function masterAndGetDuration(inputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enc-master-'));
  const outputPath = path.join(tempDir, 'mastered.mp3');

  try {
    // Normalize to -16 LUFS (broadcast standard)
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outputPath}"`
    );

    // Extract duration
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
// DATABASE
// =============================================================================

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function upsertSharedAudio(records) {
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('shared_audio')
      .upsert(batch, {
        onConflict: 'text_normalized,language,audio_type',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`  DB error in batch ${i}-${i + batch.length}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
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
    console.log('  node process-and-upload.cjs --plan                # Show plan');
    console.log('  node process-and-upload.cjs --execute             # Process all');
    console.log('  node process-and-upload.cjs --execute --lang fin  # Process one language');
    process.exit(0);
  }

  // Discover languages with manifests
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
      voice_id: manifest.voice.voice_id,
      voice_name: manifest.voice.name,
      samples: manifest.samples,
      total: manifest.samples.length,
      ordered: manifest.samples.filter(s => s.type === 'ordered').length,
      pooled: manifest.samples.filter(s => s.type === 'pooled').length
    });
  }

  const totalSamples = plan.reduce((n, p) => n + p.total, 0);

  // --- PLAN MODE ---
  if (isPlan) {
    console.log(`\n${'='.repeat(65)}`);
    console.log('  PROCESS & UPLOAD PLAN — Encouragement Audio');
    console.log(`${'='.repeat(65)}\n`);

    for (const p of plan) {
      console.log(`  ${p.lang.toUpperCase()} (${p.display_name}): ${p.total} samples (${p.ordered} ordered + ${p.pooled} pooled)`);
    }

    console.log(`\n${'-'.repeat(65)}`);
    console.log(`  Languages:       ${plan.length}`);
    console.log(`  Total samples:   ${totalSamples}`);
    console.log(`  Concurrency:     ${CONCURRENCY}`);
    console.log(`  S3 bucket:       ${S3_BUCKET}`);
    console.log(`  S3 path:         mastered/{UUID}.mp3`);
    console.log(`  DB table:        shared_audio`);
    console.log(`${'-'.repeat(65)}`);

    console.log(`\n  Pipeline per sample:`);
    console.log(`    1. Master (ffmpeg -16 LUFS normalize)`);
    console.log(`    2. Upload to S3 (mastered/{UUID}.mp3)`);
    console.log(`    3. Insert into shared_audio`);
    console.log(`\n  Run with --execute to process.\n`);
    return;
  }

  // --- EXECUTE MODE ---
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('Missing AWS credentials in .env');
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env');
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
  let totalUploaded = 0;

  for (const p of plan) {
    console.log(`\n--- ${p.lang.toUpperCase()} (${p.display_name}) — ${p.total} samples ---\n`);

    const langDir = path.join(PRODUCTION_DIR, p.lang);
    const dbRecords = [];
    let langProcessed = 0;
    let langSkipped = 0;
    let langFailed = 0;

    const tasks = p.samples.map((sample, sampleIdx) => async () => {
      const inputPath = path.join(langDir, sample.file);
      const num = sampleIdx + 1;
      const typeLabel = sample.type === 'ordered' ? `ord:${sample.position}` : 'pool';

      // Check if already in S3
      try {
        const exists = await existsInS3(sample.uuid);
        if (exists) {
          // Still need DB record — check if it exists too
          const { count } = await supabase
            .from('shared_audio')
            .select('*', { count: 'exact', head: true })
            .eq('text_normalized', normalizeText(sample.text))
            .eq('language', p.lang)
            .eq('audio_type', sample.type === 'ordered' ? 'instruction' : 'encouragement');

          if (count > 0) {
            console.log(`  [${num}/${p.total}] ${p.lang} ${typeLabel} SKIP (already in S3 + DB)`);
            langSkipped++;
            return;
          }
          // In S3 but not in DB — need to get duration and insert
          console.log(`  [${num}/${p.total}] ${p.lang} ${typeLabel} S3 exists, adding to DB...`);
        }
      } catch (e) {
        // S3 check failed, proceed with full pipeline
      }

      if (!fs.existsSync(inputPath)) {
        console.log(`  [${num}/${p.total}] ${p.lang} ${typeLabel} MISSING file`);
        langFailed++;
        return;
      }

      try {
        // Step 1: Master
        const { buffer, durationMs } = await masterAndGetDuration(inputPath);

        // Step 2: Upload to S3
        const s3Key = await uploadToS3(sample.uuid, buffer);

        // Step 3: Build DB record
        dbRecords.push({
          text: sample.text,
          text_normalized: normalizeText(sample.text),
          language: p.lang,
          audio_type: sample.type === 'ordered' ? 'instruction' : 'encouragement',
          voice_id: `elevenlabs_${p.voice_id}`,
          origin: 'tts',
          s3_key: s3Key,
          duration_ms: durationMs
        });

        const kb = (buffer.length / 1024).toFixed(1);
        console.log(`  [${num}/${p.total}] ${p.lang} ${typeLabel} OK (${kb}kb, ${durationMs}ms) → ${s3Key}`);
        langProcessed++;
      } catch (err) {
        console.log(`  [${num}/${p.total}] ${p.lang} ${typeLabel} FAILED: ${err.message.slice(0, 80)}`);
        langFailed++;
      }
    });

    // Process with concurrency pool
    await runPool(tasks, CONCURRENCY);

    // Step 4: Batch insert to shared_audio
    if (dbRecords.length > 0) {
      console.log(`\n  Inserting ${dbRecords.length} records into shared_audio...`);
      const { inserted, errors } = await upsertSharedAudio(dbRecords);
      console.log(`  DB: ${inserted} inserted, ${errors} errors`);
    }

    console.log(`  ${p.lang.toUpperCase()} done: ${langProcessed} processed, ${langSkipped} skipped, ${langFailed} failed`);
    totalProcessed += langProcessed;
    totalSkipped += langSkipped;
    totalFailed += langFailed;
    totalUploaded += dbRecords.length;
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n${'='.repeat(65)}`);
  console.log('  PROCESS & UPLOAD COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Languages:     ${plan.length}`);
  console.log(`  Total samples: ${totalSamples}`);
  console.log(`  Processed:     ${totalProcessed}`);
  console.log(`  Skipped:       ${totalSkipped} (already done)`);
  console.log(`  Failed:        ${totalFailed}`);
  console.log(`  DB records:    ${totalUploaded}`);
  console.log(`  Time:          ${elapsed} minutes`);
  console.log(`  S3 bucket:     ${S3_BUCKET}`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

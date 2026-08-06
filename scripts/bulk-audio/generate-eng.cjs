#!/usr/bin/env node

/**
 * Generate English Encouragements + Instructions
 *
 * Uses a specific ElevenLabs voice to generate the 98 canonical
 * encouragement/instruction texts in English. Skips texts that
 * already exist in shared_audio.
 *
 * Usage:
 *   node generate-eng.cjs --plan              # Show plan with estimates
 *   node generate-eng.cjs --execute           # Generate + master + upload + DB insert
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// CONFIG
// =============================================================================

const VOICE_ID = 'FVdzAUsp8apoOdc0907A';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const CONCURRENCY = 10;
const LANG = 'eng';
const LANG_CODE = 'en';

const OUT_DIR = path.join(__dirname, 'generated/encouragements/production/eng');
const MANIFEST_FILE = path.join(OUT_DIR, '_manifest.json');
const PROGRESS_FILE = path.join(OUT_DIR, '_progress.json');

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

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
// HELPERS
// =============================================================================

let _fetch = null;
async function getFetch() {
  if (!_fetch) _fetch = (await import('node-fetch')).default;
  return _fetch;
}

async function generateWithRetry(voiceId, text, langCode, maxRetries = 3) {
  const fetch = await getFetch();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.4, similarity_boost: 1.0 }
    };
    if (langCode) body.language_code = langCode;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (response.status === 429) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        console.log(`  Rate limited, waiting ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (response.ok === false) {
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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-enc-'));
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

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

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

  if (isPlan === false && isExecute === false) {
    console.log('Usage:');
    console.log('  node generate-eng.cjs --plan     # Show plan');
    console.log('  node generate-eng.cjs --execute   # Generate + master + upload + DB');
    process.exit(0);
  }

  // Load texts
  const eng = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'data/translations/encouragements/eng.json'), 'utf8'
  ));
  const ordered = (eng.orderedEncouragements || []).map(e => ({ ...e, type: 'ordered', audioType: 'instruction' }));
  const pooled = (eng.pooledEncouragements || []).map(e => ({ ...e, type: 'pooled', audioType: 'encouragement' }));
  const allTexts = [...ordered, ...pooled];

  // Check what already exists in DB
  const { data: existing } = await supabase.from('shared_audio')
    .select('text_normalized, audio_type')
    .eq('language', 'eng')
    .in('audio_type', ['encouragement', 'instruction']);

  const existingSet = new Set(existing.map(e => e.text_normalized + '|' + e.audio_type));

  // Filter to missing
  const jobs = [];
  let totalChars = 0;
  for (const item of allTexts) {
    const norm = normalizeText(item.text) + '|' + item.audioType;
    if (existingSet.has(norm) === false) {
      jobs.push(item);
      totalChars += item.text.length;
    }
  }

  const encCount = jobs.filter(j => j.audioType === 'encouragement').length;
  const instrCount = jobs.filter(j => j.audioType === 'instruction').length;

  // --- PLAN ---
  console.log(`\n${'='.repeat(65)}`);
  console.log('  ENGLISH ENCOURAGEMENT GENERATION PLAN');
  console.log(`${'='.repeat(65)}\n`);
  console.log(`  Voice:             ${VOICE_ID}`);
  console.log(`  Language:          English (en)`);
  console.log(`  Model:             eleven_multilingual_v2`);
  console.log(`  Encouragements:    ${encCount} (pooled)`);
  console.log(`  Instructions:      ${instrCount} (ordered)`);
  console.log(`  Total to generate: ${jobs.length}`);
  console.log(`  Total chars:       ${(totalChars / 1000).toFixed(1)}k`);
  console.log(`  Already in DB:     ${existing.length} (will skip)`);
  console.log(`  Concurrency:       ${CONCURRENCY}`);
  console.log(`  Est. time:         ~${Math.ceil(jobs.length / CONCURRENCY * 2 / 60)} minutes`);
  console.log(`\n  Pipeline per sample:`);
  console.log(`    1. ElevenLabs TTS → raw MP3`);
  console.log(`    2. ffmpeg master (-16 LUFS)`);
  console.log(`    3. Upload to S3 (mastered/{UUID}.mp3)`);
  console.log(`    4. Insert into shared_audio DB`);
  console.log(`${'='.repeat(65)}`);

  if (isPlan) {
    console.log(`\n  Run with --execute to generate.\n`);
    return;
  }

  // --- EXECUTE ---
  if (isExecute === false) return;

  if (ELEVENLABS_API_KEY === undefined || ELEVENLABS_API_KEY === '') {
    console.error('Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  try { await execAsync('ffmpeg -version'); } catch {
    console.error('ffmpeg not found');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load or create progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }

  const startTime = Date.now();
  let completed = 0;
  let success = 0;
  const failures = [];
  const dbRecords = [];
  const manifestSamples = [];

  const tasks = jobs.map((job, jobIdx) => async () => {
    const key = `${job.audioType}:${job.type === 'ordered' ? job.position : job.id}`;

    // Skip if already done in this run
    if (progress[key]) {
      completed++;
      return;
    }

    const result = await generateWithRetry(VOICE_ID, job.text, LANG_CODE);
    completed++;
    const pct = ((completed / jobs.length) * 100).toFixed(0);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const typeLabel = job.type === 'ordered' ? `instr:${job.position}` : 'enc';

    if (result.success) {
      // Master
      const { buffer: mastered, durationMs } = await masterAndGetDuration(result.buffer);

      // Upload to S3
      const uuid = uuidv4().toUpperCase();
      const s3Key = await uploadToS3(uuid, mastered);

      // Save raw locally too
      const filename = `${uuid}.mp3`;
      fs.writeFileSync(path.join(OUT_DIR, filename), result.buffer);

      const kb = (mastered.length / 1024).toFixed(1);
      console.log(`[${completed}/${jobs.length} ${pct}% ${elapsed}s] ${typeLabel} OK (${kb}kb, ${durationMs}ms) → ${s3Key}`);
      success++;

      // DB record
      dbRecords.push({
        text: job.text,
        text_normalized: normalizeText(job.text),
        language: LANG,
        audio_type: job.audioType,
        voice_id: `elevenlabs_${VOICE_ID}`,
        origin: 'tts',
        s3_key: s3Key,
        duration_ms: durationMs
      });

      manifestSamples.push({
        uuid, canonical_id: job.id || null, type: job.type,
        position: job.position || null, text: job.text,
        file: filename, size_kb: parseFloat(kb), duration_ms: durationMs
      });

      progress[key] = { uuid, file: filename };
      // Save progress every 10
      if (success % 10 === 0) {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      }
    } else {
      const errShort = (result.error || '').substring(0, 60);
      console.log(`[${completed}/${jobs.length} ${pct}% ${elapsed}s] ${typeLabel} FAILED (${result.status}): ${errShort}`);
      failures.push({ type: job.type, position: job.position, audioType: job.audioType, error: result.error });
    }
  });

  console.log(`\nGenerating ${jobs.length} samples...\n`);
  await runPool(tasks, CONCURRENCY);

  // Save progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  // Save manifest
  const manifest = {
    language: LANG, display_name: 'English',
    voice: { voice_id: VOICE_ID, name: 'Custom', gender: 'unknown' },
    settings: { stability: 0.4, similarity_boost: 1.0, model: 'eleven_multilingual_v2', language_code: LANG_CODE },
    samples: manifestSamples,
    generated_at: new Date().toISOString()
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  // Insert into shared_audio
  if (dbRecords.length > 0) {
    console.log(`\nInserting ${dbRecords.length} records into shared_audio...`);
    const batchSize = 50;
    let inserted = 0;
    let dbErrors = 0;
    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);
      const { error } = await supabase
        .from('shared_audio')
        .upsert(batch, {
          onConflict: 'text_normalized,language,audio_type',
          ignoreDuplicates: false
        });
      if (error) {
        console.error(`  DB error: ${error.message}`);
        dbErrors += batch.length;
      } else {
        inserted += batch.length;
      }
    }
    console.log(`  DB: ${inserted} inserted, ${dbErrors} errors`);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n${'='.repeat(65)}`);
  console.log('  GENERATION COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Generated:     ${success}`);
  console.log(`  Failed:        ${failures.length}`);
  console.log(`  DB records:    ${dbRecords.length}`);
  console.log(`  Time:          ${elapsed} minutes`);
  console.log(`  S3 bucket:     ${S3_BUCKET}`);

  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      console.log(`    - ${f.audioType} ${f.type}:${f.position || '?'}: ${(f.error || '').substring(0, 80)}`);
    }
    console.log(`\n  Re-run with --execute to retry failures.`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

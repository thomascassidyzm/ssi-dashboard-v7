#!/usr/bin/env node

/**
 * Generate Welcome Audio for English-known courses missing welcomes (Batch 2)
 *
 * Uses robo-Aran (FVdzAUsp8apoOdc0907A) with eleven_multilingual_v2.
 * Generates, masters, uploads to S3, and inserts into course_audio.
 *
 * Usage:
 *   node generate-eng-welcomes-batch2.cjs --plan     # Show plan
 *   node generate-eng-welcomes-batch2.cjs --execute   # Generate + master + upload + DB
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
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// CONFIG
// =============================================================================

const VOICE_ID = 'FVdzAUsp8apoOdc0907A';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

// =============================================================================
// WELCOME TEXTS
// =============================================================================

function aOrAn(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// Variant template: first mention uses full variant name, rest uses base language name
const VARIANT_TEMPLATE = (variantName, baseName) =>
  `Welcome to this unusual game that will help you to become ${aOrAn(variantName)} ${variantName} speaker. Here's how it works - I teach you something in ${baseName}, then I say something in English and give you a chance to say it out loud in ${baseName}. Then, you listen carefully to the ${baseName} speakers who will model it for you. It's important that you say something in the gaps, because that's how you learn. Even if you aren't sure, have a go at saying whatever you can, and you'll be starting to speak in ${baseName} sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let's start playing.`;

// Standard template
const STANDARD_TEMPLATE = (langName) =>
  `Welcome to this unusual game that will help you to become ${aOrAn(langName)} ${langName} speaker. Here's how it works - I teach you something in ${langName}, then I say something in English and give you a chance to say it out loud in ${langName}. Then, you listen carefully to the ${langName} speakers who will model it for you. It's important that you say something in the gaps, because that's how you learn. Even if you aren't sure, have a go at saying whatever you can, and you'll be starting to speak in ${langName} sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let's start playing.`;

const WELCOMES = [
  { course_code: 'bul_for_eng',    text: STANDARD_TEMPLATE('Bulgarian'),            lang_code: 'en' },
  { course_code: 'cat_for_eng',    text: STANDARD_TEMPLATE('Catalan'),               lang_code: 'en' },
  { course_code: 'ell_for_eng',    text: STANDARD_TEMPLATE('Greek'),                 lang_code: 'en' },
  { course_code: 'gla_for_eng',    text: STANDARD_TEMPLATE('Scottish Gaelic'),        lang_code: 'en' },
  { course_code: 'hrv_for_eng',    text: STANDARD_TEMPLATE('Croatian'),              lang_code: 'en' },
  { course_code: 'hye_for_eng',    text: STANDARD_TEMPLATE('Armenian'),              lang_code: 'en' },
  { course_code: 'isl_for_eng',    text: STANDARD_TEMPLATE('Icelandic'),             lang_code: 'en' },
  { course_code: 'lav_for_eng',    text: STANDARD_TEMPLATE('Latvian'),               lang_code: 'en' },
  { course_code: 'mkd_for_eng',    text: STANDARD_TEMPLATE('Macedonian'),            lang_code: 'en' },
  { course_code: 'nor_for_eng',    text: STANDARD_TEMPLATE('Norwegian'),             lang_code: 'en' },
  { course_code: 'por_br_for_eng', text: VARIANT_TEMPLATE('Brazilian Portuguese', 'Portuguese'), lang_code: 'en' },
  { course_code: 'ron_for_eng',    text: STANDARD_TEMPLATE('Romanian'),              lang_code: 'en' },
  { course_code: 'tha_for_eng',    text: STANDARD_TEMPLATE('Thai'),                  lang_code: 'en' },
  { course_code: 'ukr_for_eng',    text: STANDARD_TEMPLATE('Ukrainian'),             lang_code: 'en' },
];

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

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan');
  const isExecute = args.includes('--execute');

  if (!isPlan && !isExecute) {
    console.log('Usage:');
    console.log('  node generate-eng-welcomes-batch2.cjs --plan     # Show plan');
    console.log('  node generate-eng-welcomes-batch2.cjs --execute   # Generate all');
    process.exit(0);
  }

  // Check which already have welcome audio
  const existing = new Set();
  for (const w of WELCOMES) {
    const { count } = await sb.from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', w.course_code)
      .eq('role', 'welcome');
    if (count > 0) existing.add(w.course_code);
  }

  const jobs = WELCOMES.filter(w => !existing.has(w.course_code));

  console.log(`\n${'='.repeat(65)}`);
  console.log('  ENGLISH WELCOME GENERATION PLAN (Batch 2)');
  console.log(`${'='.repeat(65)}\n`);
  console.log(`  Voice:     robo-Aran (${VOICE_ID})`);
  console.log(`  Model:     eleven_multilingual_v2`);
  console.log(`  Settings:  stability=0.4, similarity_boost=1.0`);
  console.log(`  voice_id:  elevenlabs_${VOICE_ID}`);
  console.log(`  origin:    tts\n`);

  for (const w of WELCOMES) {
    const skip = existing.has(w.course_code) ? ' (SKIP — already has welcome)' : '';
    console.log(`  ${w.course_code}${skip}`);
  }

  console.log(`\n  To generate: ${jobs.length}`);
  console.log(`  Skipped:     ${existing.size}`);
  console.log(`  Est. cost:   ~${jobs.length * 580} credits (${jobs.length} x ~580 credits each)`);
  console.log(`${'='.repeat(65)}`);

  if (isPlan) {
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

  console.log(`\nGenerating ${jobs.length} welcomes...\n`);

  let success = 0;
  const failures = [];

  for (const job of jobs) {
    process.stdout.write(`  ${job.course_code}: generating... `);

    const result = await generateWithRetry(VOICE_ID, job.text, job.lang_code);
    if (!result.success) {
      console.log(`FAILED (${result.status}): ${(result.error || '').substring(0, 60)}`);
      failures.push(job.course_code);
      continue;
    }

    process.stdout.write('mastering... ');
    const { buffer: mastered, durationMs } = await masterAndGetDuration(result.buffer);

    const uuid = uuidv4().toUpperCase();
    const s3Key = `mastered/${uuid}.mp3`;

    process.stdout.write('uploading... ');
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: mastered,
      ContentType: 'audio/mpeg'
    }));

    process.stdout.write('DB insert... ');
    const { error } = await sb.from('course_audio')
      .upsert({
        course_code: job.course_code,
        text: 'welcome',
        text_normalized: 'welcome',
        language: 'eng',
        role: 'welcome',
        voice_id: `elevenlabs_${VOICE_ID}`,
        origin: 'tts',
        s3_key: s3Key,
        duration_ms: durationMs
      }, { onConflict: 'course_code,text_normalized,language,role' })
      .select('id')
      .single();

    if (error) {
      console.log(`DB ERROR: ${error.message}`);
      failures.push(job.course_code);
    } else {
      const kb = (mastered.length / 1024).toFixed(1);
      console.log(`OK (${kb}kb, ${(durationMs/1000).toFixed(1)}s)`);
      success++;
    }
  }

  console.log(`\n${'='.repeat(65)}`);
  console.log('  COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Generated: ${success}`);
  console.log(`  Failed:    ${failures.length}`);
  if (failures.length > 0) {
    console.log(`  Failures:  ${failures.join(', ')}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

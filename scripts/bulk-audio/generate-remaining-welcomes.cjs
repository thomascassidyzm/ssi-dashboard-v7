#!/usr/bin/env node

/**
 * Generate Welcome Audio for remaining non-English-known courses:
 *   - por_for_aze (Azerbaijani) — ElevenLabs v3, Leyla
 *   - por_for_lit (Lithuanian) — ElevenLabs v3, Vytautas
 *   - eng_for_sin (Sinhala) — Azure TTS, SameeraNeural
 *
 * Usage:
 *   node generate-remaining-welcomes.cjs --plan     # Show plan
 *   node generate-remaining-welcomes.cjs --execute   # Generate + master + upload + DB
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
// WELCOME DEFINITIONS
// =============================================================================

const WELCOMES = [
  {
    course_code: 'por_for_aze',
    language: 'aze',
    engine: 'elevenlabs',
    voice_id: 'WNzdXXWyO3X0TUxG7iQX', // Leyla (female)
    voice_label: 'elevenlabs_WNzdXXWyO3X0TUxG7iQX',
    voice_name: 'Leyla',
    model_id: 'eleven_v3',
    voice_settings: { voice_stability: 0.4 },
    lang_code: 'az',
    text: 'Bu qeyri-adi oyuna xoş gəlmisiniz, bu oyun sizə Portuqal dilində danışan birinə çevrilməyə kömək edəcək. Belə işləyir - əvvəlcə mən sizə Portuqal dilində nəsə öyrədirəm, sonra Azərbaycan dilində nəsə deyirəm və sizə Portuqal dilində ucadan deməyə imkan verirəm. Sonra, Portuqal dilində danışanları diqqətlə dinləyin, onlar sizin üçün nümunə göstərəcəklər. Fasilələrdə nəsə deməyiniz vacibdir, çünki belə öyrənirsiniz. Əmin olmasanız belə, nə deyə bilirsinizsə onu deməyə çalışın, düşündüyünüzdən tez Portuqal dilində danışmağa başlayacaqsınız. Bunu nə qədər çox oyun kimi qəbul etsəniz, nə qədər çox oynaq yanaşsanız, səhv etdikdə nə qədər çox gülsəniz, bir o qədər yaxşı gedəcək və bir o qədər tez öyrənəcəksiniz. Hadi, oynamağa başlayaq.'
  },
  {
    course_code: 'por_for_lit',
    language: 'lit',
    engine: 'elevenlabs',
    voice_id: 'GIMSKllysP5FitVjkwL8', // Vytautas (male)
    voice_label: 'elevenlabs_GIMSKllysP5FitVjkwL8',
    voice_name: 'Vytautas',
    model_id: 'eleven_v3',
    voice_settings: { voice_stability: 0.4 },
    lang_code: 'lt',
    text: 'Sveiki atvykę į šį neįprastą žaidimą, kuris padės jums tapti portugalų kalbos kalbėtoju. Štai kaip tai veikia – pirmiausia išmokysiu jus kažko portugališkai, tada pasakysiu kažką lietuviškai ir duosiu jums galimybę tai pasakyti garsiai portugališkai. Tada atidžiai klausykite portugalų kalbos kalbėtojų, kurie jums parodys, kaip tai skamba. Svarbu, kad pauzių metu kažką sakytumėte, nes būtent taip mokotės. Net jei nesate tikri, pabandykite pasakyti tai, ką galite, ir pradėsite kalbėti portugališkai greičiau nei manote. Kuo labiau žiūrėsite į tai kaip į žaidimą, kuo žaismingesni būsite, kuo daugiau juoksitės iš savo klaidų, tuo geriau seksis ir tuo greičiau išmoksite. Tad pradėkime žaisti.'
  },
  {
    course_code: 'eng_for_sin',
    language: 'sin',
    engine: 'azure',
    voice_name: 'si-LK-SameeraNeural',
    voice_label: 'azure_si-LK-SameeraNeural',
    text: 'ඔබට ඉංග්‍රීසි කතා කරන කෙනෙකු වීමට උපකාර කරන මෙම අසාමාන්‍ය ක්‍රීඩාවට සාදරයෙන් පිළිගනිමු. එය මෙසේ ක්‍රියා කරයි - මම ඔබට ඉංග්‍රීසියෙන් යමක් උගන්වනවා, ඉන්පසු මම සිංහලෙන් යමක් කියනවා, එය ඉංග්‍රීසියෙන් ශබ්ද නඟා කියන්නට ඔබට අවස්ථාවක් දෙනවා. ඉන්පසු, ඉංග්‍රීසි කතා කරන අය ඔබට ආදර්ශය පෙන්වනු ඇත, ඒ අය හොඳින් අසන්න. හිඩැස් වලදී යමක් කීම වැදගත්, මොකද ඔබ ඉගෙන ගන්නේ එහෙමයි. ඔබට විශ්වාස නැති වුණත්, ඔබට කිව හැකි ඕනෑම දෙයක් කියන්න උත්සාහ කරන්න, ඔබ හිතනවාට වඩා ඉක්මනට ඉංග්‍රීසියෙන් කතා කරන්න පටන් ගනීවි. මෙය ක්‍රීඩාවක් ලෙස සලකන තරමට, සෙල්ලම් කරන තරමට, වැරදි වලට සිනාසෙන තරමට, එය වඩා හොඳින් යනවා, වේගයෙන් ඉගෙන ගන්නවා. හරි, ක්‍රීඩා කරන්න පටන් ගමු.'
  }
];

// =============================================================================
// HELPERS
// =============================================================================

let _fetch = null;
async function getFetch() {
  if (!_fetch) _fetch = (await import('node-fetch')).default;
  return _fetch;
}

async function generateElevenLabs(job, maxRetries = 3) {
  const fetch = await getFetch();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = {
      text: job.text,
      model_id: job.model_id,
      voice_settings: job.voice_settings
    };
    if (job.lang_code) body.language_code = job.lang_code;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${job.voice_id}`, {
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

async function generateAzure(job) {
  const sdk = require('microsoft-cognitiveservices-speech-sdk');
  const config = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="si-LK">
    <voice name="${job.voice_name}">${job.text}</voice>
  </speak>`;

  return new Promise((resolve) => {
    config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;
    const synth = new sdk.SpeechSynthesizer(config, null);

    synth.speakSsmlAsync(ssml,
      (result) => {
        synth.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve({ success: true, buffer: Buffer.from(result.audioData) });
        } else {
          resolve({ success: false, error: result.errorDetails || 'Azure TTS failed', status: 0 });
        }
      },
      (err) => {
        synth.close();
        resolve({ success: false, error: err, status: 0 });
      }
    );
  });
}

async function masterAndGetDuration(inputBuffer) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-'));
  const inputPath = path.join(tempDir, 'input.mp3');
  const outputPath = path.join(tempDir, 'mastered.mp3');

  try {
    fs.writeFileSync(inputPath, inputBuffer);
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -ar 44100 -ac 1 -b:a 128k "${outputPath}"`
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
    console.log('  node generate-remaining-welcomes.cjs --plan     # Show plan');
    console.log('  node generate-remaining-welcomes.cjs --execute   # Generate all');
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
  console.log('  REMAINING WELCOME GENERATION PLAN');
  console.log(`${'='.repeat(65)}\n`);

  for (const w of WELCOMES) {
    const skip = existing.has(w.course_code) ? ' (SKIP — already has welcome)' : '';
    const engine = w.engine === 'azure' ? 'Azure' : 'ElevenLabs v3';
    console.log(`  ${w.course_code} — ${w.voice_name} (${engine})${skip}`);
  }

  console.log(`\n  To generate: ${jobs.length}`);
  console.log(`  Skipped:     ${existing.size}`);
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
    const engine = job.engine === 'azure' ? 'Azure' : 'ElevenLabs v3';
    process.stdout.write(`  ${job.course_code} (${job.voice_name}, ${engine}): generating... `);

    let result;
    if (job.engine === 'elevenlabs') {
      result = await generateElevenLabs(job);
    } else {
      result = await generateAzure(job);
    }

    if (!result.success) {
      console.log(`FAILED: ${(result.error || '').toString().substring(0, 80)}`);
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
        language: job.language,
        role: 'welcome',
        voice_id: job.voice_label,
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

#!/usr/bin/env node

/**
 * Apply existing welcome audio to jpn/zho courses + generate variant welcomes.
 *
 * Part 1: Apply already-generated standard welcomes from _welcome_index.json (no TTS)
 * Part 2: Generate new TTS welcomes for regional variants (variant-first-mention pattern)
 *
 * All TTS uses eleven_multilingual_v2 with the selected voice per language.
 * voice_id is set to 'elevenlabs_{voiceId}' and origin='tts'.
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

// Voice config
const DATA_DIR = path.join(__dirname, 'data');
const voices = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voices.json'), 'utf8'));
const selections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voice-selections.json'), 'utf8'));

const JPN_VOICE = voices.voices.jpn.voices[selections.jpn.index];  // Zakira
const CMN_VOICE = voices.voices.cmn.voices[selections.cmn.index];  // LiuPing

// Welcome index from bulk run
const welcomeIndex = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'generated/welcomes/production/_welcome_index.json'), 'utf8'
));

// ========== Part 1: Standard courses — apply existing audio ==========

// Map: course_code → { known_lang_key, target_lang_key } in welcome index
const STANDARD_APPLY = [
  // ara, por, spa moved to Part 2 (need variant-first-mention for Castilian/MSA/European)
  { cc: 'deu_for_jpn',  known: 'jpn', target: 'deu', lang: 'jpn' },
  { cc: 'deu_for_zho',  known: 'cmn', target: 'deu', lang: 'zho' },
  { cc: 'fra_for_jpn',  known: 'jpn', target: 'fra', lang: 'jpn' },
  { cc: 'fra_for_zho',  known: 'cmn', target: 'fra', lang: 'zho' },
  { cc: 'ita_for_jpn',  known: 'jpn', target: 'ita', lang: 'jpn' },
  { cc: 'ita_for_zho',  known: 'cmn', target: 'ita', lang: 'zho' },
  { cc: 'jpn_for_zho',  known: 'cmn', target: 'jpn', lang: 'zho' },
  { cc: 'kor_for_jpn',  known: 'jpn', target: 'kor', lang: 'jpn' },
  { cc: 'kor_for_zho',  known: 'cmn', target: 'kor', lang: 'zho' },
  // por, spa moved to Part 2 (need variant-first-mention for European/Castilian)
  { cc: 'zho_for_jpn',  known: 'jpn', target: 'cmn', lang: 'jpn' },
];

// ========== Part 2: Variant courses — need new TTS ==========

// Japanese welcome templates
const jpnWelcome = JSON.parse(fs.readFileSync(
  path.join(DATA_DIR, 'translations/welcomes/jpn.json'), 'utf8'
));
const cmnWelcome = JSON.parse(fs.readFileSync(
  path.join(DATA_DIR, 'translations/welcomes/cmn.json'), 'utf8'
));

function expandVariantJpn(variantKey, baseKey) {
  // First mention: variant name, rest: base language name
  const variant = jpnWelcome.targets[variantKey] || jpnWelcome.targets[baseKey];
  const base = jpnWelcome.targets[baseKey];
  if (!variant || !base) return null;

  // Replace first {a_target_speaker} with variant, rest with base
  let text = jpnWelcome.template;
  // First replacement: a_target_speaker → variant
  text = text.replace('{a_target_speaker}', variant.a_target_speaker);
  // All remaining: use base language
  text = text.replace(/\{in_target\}/g, base.in_target);
  text = text.replace(/\{target_speakers\}/g, base.target_speakers);
  text = text.replace(/\{in_known\}/g, jpnWelcome.in_known);
  return text;
}

function expandVariantCmn(variantKey, baseKey) {
  const variant = cmnWelcome.targets[variantKey] || cmnWelcome.targets[baseKey];
  const base = cmnWelcome.targets[baseKey];
  if (!variant || !base) return null;

  let text = cmnWelcome.template;
  text = text.replace('{a_target_speaker}', variant.a_target_speaker);
  text = text.replace(/\{in_target\}/g, base.in_target);
  text = text.replace(/\{target_speakers\}/g, base.target_speakers);
  text = text.replace(/\{in_known\}/g, cmnWelcome.in_known);
  return text;
}

// Inject custom entries for variants not in the JSON files
// MSA Arabic (ara_for_* = Saudi voices, MSA)
jpnWelcome.targets['ara_MSA'] = {
  in_target: '現代標準アラビア語',
  a_target_speaker: '現代標準アラビア語を話す人',
  target_speakers: 'アラビア語のネイティブスピーカー'
};
cmnWelcome.targets['ara_MSA'] = {
  in_target: '现代标准阿拉伯语',
  a_target_speaker: '会说现代标准阿拉伯语的人',
  target_speakers: '阿拉伯语母语者'
};

// Castilian Spanish (spa_for_* = es-ES voices, "Spanish from Spain")
jpnWelcome.targets['spa_castilian'] = {
  in_target: 'カスティーリャスペイン語',
  a_target_speaker: 'カスティーリャスペイン語を話す人',
  target_speakers: 'スペイン語のネイティブスピーカー'
};
cmnWelcome.targets['spa_castilian'] = {
  in_target: '卡斯蒂利亚西班牙语',
  a_target_speaker: '会说卡斯蒂利亚西班牙语的人',
  target_speakers: '西班牙语母语者'
};

// Syrian Arabic (ara_sy_for_* — more specific than Levantine)
jpnWelcome.targets['ara_SY'] = {
  in_target: 'シリアアラビア語',
  a_target_speaker: 'シリアアラビア語を話す人',
  target_speakers: 'アラビア語のネイティブスピーカー'
};
cmnWelcome.targets['ara_SY'] = {
  in_target: '叙利亚阿拉伯语',
  a_target_speaker: '会说叙利亚阿拉伯语的人',
  target_speakers: '阿拉伯语母语者'
};

// Mexican Spanish (spa_mx_for_* = es-MX voices)
jpnWelcome.targets['spa_MX'] = {
  in_target: 'メキシコスペイン語',
  a_target_speaker: 'メキシコスペイン語を話す人',
  target_speakers: 'スペイン語のネイティブスピーカー'
};
cmnWelcome.targets['spa_MX'] = {
  in_target: '墨西哥西班牙语',
  a_target_speaker: '会说墨西哥西班牙语的人',
  target_speakers: '西班牙语母语者'
};

// Variant mapping: variantKey for first mention, baseKey for subsequent mentions
const VARIANT_GENERATE = [
  // Standard courses that need variant-first-mention
  { cc: 'ara_for_jpn',    known: 'jpn', variantKey: 'ara_MSA', baseKey: 'ara', lang: 'jpn' },
  { cc: 'ara_for_zho',    known: 'cmn', variantKey: 'ara_MSA', baseKey: 'ara', lang: 'zho' },
  { cc: 'por_for_jpn',    known: 'jpn', variantKey: 'por_EU',  baseKey: 'por', lang: 'jpn' },
  { cc: 'por_for_zho',    known: 'cmn', variantKey: 'por_EU',  baseKey: 'por', lang: 'zho' },
  { cc: 'spa_for_jpn',    known: 'jpn', variantKey: 'spa_castilian', baseKey: 'spa', lang: 'jpn' },
  { cc: 'spa_for_zho',    known: 'cmn', variantKey: 'spa_castilian', baseKey: 'spa', lang: 'zho' },
  // Regional variant courses
  { cc: 'ara_eg_for_jpn', known: 'jpn', variantKey: 'ara_eg',  baseKey: 'ara', lang: 'jpn' },
  { cc: 'ara_eg_for_zho', known: 'cmn', variantKey: 'ara_eg',  baseKey: 'ara', lang: 'zho' },
  { cc: 'ara_sy_for_jpn', known: 'jpn', variantKey: 'ara_SY',  baseKey: 'ara', lang: 'jpn' },
  { cc: 'ara_sy_for_zho', known: 'cmn', variantKey: 'ara_SY',  baseKey: 'ara', lang: 'zho' },
  { cc: 'deu_at_for_jpn', known: 'jpn', variantKey: 'deu_AT',  baseKey: 'deu', lang: 'jpn' },
  { cc: 'deu_at_for_zho', known: 'cmn', variantKey: 'deu_AT',  baseKey: 'deu', lang: 'zho' },
  { cc: 'por_br_for_jpn', known: 'jpn', variantKey: 'por_BR',  baseKey: 'por', lang: 'jpn' },
  { cc: 'por_br_for_zho', known: 'cmn', variantKey: 'por_BR',  baseKey: 'por', lang: 'zho' },
  { cc: 'spa_mx_for_jpn', known: 'jpn', variantKey: 'spa_MX',  baseKey: 'spa', lang: 'jpn' },
  { cc: 'spa_mx_for_zho', known: 'cmn', variantKey: 'spa_MX',  baseKey: 'spa', lang: 'zho' },
];

// ========== TTS Helpers ==========

let _fetch = null;
async function getFetch() {
  if (!_fetch) _fetch = (await import('node-fetch')).default;
  return _fetch;
}

const LANG_CODE_MAP = { jpn: 'ja', cmn: 'zh' };

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
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
        return { success: false, error: errorText, status: response.status };
      }

      const buffer = await response.buffer();
      return { success: true, buffer };
    } catch (err) {
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000 * attempt)); continue; }
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
    await execAsync(`ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outputPath}"`);
    const { stdout } = await execAsync(`ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
    const durationMs = Math.round(parseFloat(stdout.trim()) * 1000);
    const buffer = fs.readFileSync(outputPath);
    return { buffer, durationMs };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ========== Main ==========

const DRY_RUN = !process.argv.includes('--execute');

(async () => {
  if (DRY_RUN) console.log('=== DRY RUN (pass --execute to apply) ===\n');

  // Check which already have welcomes
  const existing = new Set();
  const allCourses = [...STANDARD_APPLY.map(s => s.cc), ...VARIANT_GENERATE.map(v => v.cc)];
  for (const cc of allCourses) {
    const { count } = await sb.from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', cc)
      .eq('role', 'welcome');
    if (count > 0) existing.add(cc);
  }

  // ========== Part 1: Apply standard ==========
  console.log('Part 1: Apply existing standard welcomes\n');
  let applied = 0;

  for (const item of STANDARD_APPLY) {
    if (existing.has(item.cc)) {
      console.log(`  SKIP ${item.cc} (already has welcome)`);
      continue;
    }

    const entry = welcomeIndex[item.known] && welcomeIndex[item.known][item.target];
    if (!entry) {
      console.log(`  MISS ${item.cc} — not in welcome index`);
      continue;
    }

    const voice = item.known === 'jpn' ? JPN_VOICE : CMN_VOICE;
    console.log(`  ADD  ${item.cc} — uuid=${entry.uuid.slice(0,8)} duration=${entry.duration_ms}ms`);

    if (!DRY_RUN) {
      const { error } = await sb.from('course_audio').upsert({
        course_code: item.cc,
        text: 'welcome',
        text_normalized: 'welcome',
        language: item.lang,
        role: 'welcome',
        voice_id: `elevenlabs_${voice.voice_id}`,
        origin: 'tts',
        s3_key: entry.s3_key,
        duration_ms: entry.duration_ms
      }, { onConflict: 'course_code,text_normalized,language,role' });

      if (error) console.log(`    ERROR: ${error.message}`);
      else applied++;
    } else {
      applied++;
    }
  }

  console.log(`\n  Standard applied: ${applied}\n`);

  // ========== Part 2: Generate variants ==========
  console.log('Part 2: Generate variant welcomes (TTS)\n');

  if (!DRY_RUN && !ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY');
    process.exit(1);
  }

  let generated = 0;
  const failures = [];

  for (const item of VARIANT_GENERATE) {
    if (existing.has(item.cc)) {
      console.log(`  SKIP ${item.cc} (already has welcome)`);
      continue;
    }

    const text = item.known === 'jpn'
      ? expandVariantJpn(item.variantKey, item.baseKey)
      : expandVariantCmn(item.variantKey, item.baseKey);

    if (!text) {
      console.log(`  MISS ${item.cc} — no template for variant ${item.variantKey}`);
      failures.push(item.cc);
      continue;
    }

    const voice = item.known === 'jpn' ? JPN_VOICE : CMN_VOICE;
    const langCode = LANG_CODE_MAP[item.known];

    if (DRY_RUN) {
      console.log(`  WILL ${item.cc} — ${item.known} voice=${voice.name} variant=${item.variantKey}→base=${item.baseKey}`);
      generated++;
      continue;
    }

    process.stdout.write(`  ${item.cc}: generating... `);
    const result = await generateWithRetry(voice.voice_id, text, langCode);
    if (!result.success) {
      console.log(`FAILED: ${(result.error || '').substring(0, 60)}`);
      failures.push(item.cc);
      continue;
    }

    process.stdout.write('mastering... ');
    const { buffer: mastered, durationMs } = await masterAndGetDuration(result.buffer);

    const uuid = uuidv4().toUpperCase();
    const s3Key = `mastered/${uuid}.mp3`;

    process.stdout.write('uploading... ');
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET, Key: s3Key, Body: mastered, ContentType: 'audio/mpeg'
    }));

    process.stdout.write('DB... ');
    const { error } = await sb.from('course_audio').upsert({
      course_code: item.cc,
      text: 'welcome',
      text_normalized: 'welcome',
      language: item.lang,
      role: 'welcome',
      voice_id: `elevenlabs_${voice.voice_id}`,
      origin: 'tts',
      s3_key: s3Key,
      duration_ms: durationMs
    }, { onConflict: 'course_code,text_normalized,language,role' });

    if (error) {
      console.log(`ERROR: ${error.message}`);
      failures.push(item.cc);
    } else {
      const kb = (mastered.length / 1024).toFixed(1);
      console.log(`OK (${kb}kb, ${(durationMs/1000).toFixed(1)}s)`);
      generated++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  Standard applied:    ${applied}`);
  console.log(`  Variants generated:  ${generated}`);
  console.log(`  Failed:              ${failures.length}`);
  if (failures.length > 0) console.log(`  Failures: ${failures.join(', ')}`);
  if (DRY_RUN) console.log('\n  Run with --execute to apply.');
  console.log('');
})();

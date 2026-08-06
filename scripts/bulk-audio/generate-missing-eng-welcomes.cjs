#!/usr/bin/env node
/**
 * Generate the missing English-known (robo-Aran) welcomes for the courses that
 * currently have NO role='welcome' row in course_audio (checked live).
 *
 * Renders text from data/translations/welcomes/eng.json (template + per-target
 * placeholders), TTS via ElevenLabs robo-Aran + eleven_multilingual_v2
 * (stability 0.4, similarity_boost 1.0 — Kai's logged preference), masters to
 * -16 LUFS, uploads mastered/{UUID}.mp3, upserts course_audio role='welcome'.
 *
 * Usage:
 *   node generate-missing-eng-welcomes.cjs --plan      # render texts + credit total, NO TTS
 *   node generate-missing-eng-welcomes.cjs --execute   # generate (COSTS credits)
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

const VOICE_ID = 'FVdzAUsp8apoOdc0907A';            // robo-Aran
const VOICE_LABEL = `elevenlabs_${VOICE_ID}`;
const MODEL_ID = 'eleven_multilingual_v2';
const VOICE_SETTINGS = { stability: 0.4, similarity_boost: 1.0 };
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';

// course_code -> welcome template target key (variants map to their own wording).
// All eng-known courses in the DB that lack a role='welcome' row (checked live
// 2026-07-27). Excludes scaffolds: eng_template, zzz_test_for_eng, sbx_for_eng.
const COURSES = {
  // live
  ben_for_eng: 'ben',
  glg_for_eng: 'glg',
  // beta
  afr_for_eng: 'afr',
  ces_for_eng: 'ces',
  hun_for_eng: 'hun',
  rus_for_eng: 'rus',
  srp_for_eng: 'srp',
  // built / not_available
  deu_ch_for_eng: 'gsw', // Swiss German wording
  hak_for_eng: 'hak',
  mar_for_eng: 'mar',
  nan_for_eng: 'nan',
  tel_for_eng: 'tel',
  yue_for_eng: 'yue',
  yor_for_eng: 'yor',
  cor_for_eng: 'cor',
  fur_for_eng: 'fur',
  kan_for_eng: 'kan',
  nap_for_eng: 'nap',
  roh_for_eng: 'roh',
  scn_for_eng: 'scn',
  sme_for_eng: 'sme',
  vec_for_eng: 'vec',
  yid_for_eng: 'yid',
  rgn_for_eng: 'rgn',   // template entry added this session
  lmo_for_eng: 'lmo',   // template entry added this session
  mlt_for_eng: 'mlt',   // template entry added this session
  pdc_for_eng: 'pdc',   // template entry added this session
};

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
});
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/translations/welcomes/eng.json'), 'utf8'));
function render(targetKey) {
  const e = tpl.targets[targetKey];
  if (!e) throw new Error(`no eng.json target entry for '${targetKey}'`);
  return tpl.template
    .replace(/\{in_target\}/g, e.in_target)
    .replace(/\{a_target_speaker\}/g, e.a_target_speaker)
    .replace(/\{target_speakers\}/g, e.target_speakers)
    .replace(/\{in_known\}/g, tpl.in_known);
}

let _fetch = null;
async function getFetch() { if (!_fetch) _fetch = (await import('node-fetch')).default; return _fetch; }

async function generate(text, maxRetries = 3) {
  const fetch = await getFetch();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS })
      });
      if (r.status === 429) { await new Promise(s => setTimeout(s, Math.min(2000 * 2 ** attempt, 30000))); continue; }
      if (!r.ok) { const t = await r.text(); if (attempt < maxRetries) { await new Promise(s => setTimeout(s, 1000 * attempt)); continue; } return { success: false, error: t }; }
      return { success: true, buffer: await r.buffer() };
    } catch (err) { if (attempt < maxRetries) { await new Promise(s => setTimeout(s, 2000 * attempt)); continue; } return { success: false, error: err.message }; }
  }
  return { success: false, error: 'exhausted retries' };
}

async function master(inputBuffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-'));
  const ip = path.join(dir, 'in.mp3'), op = path.join(dir, 'out.mp3');
  try {
    fs.writeFileSync(ip, inputBuffer);
    await execAsync(`ffmpeg -y -i "${ip}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -ar 44100 -ac 1 -b:a 128k "${op}"`);
    const { stdout } = await execAsync(`ffprobe -i "${op}" -show_entries format=duration -v quiet -of csv="p=0"`);
    return { buffer: fs.readFileSync(op), durationMs: Math.round(parseFloat(stdout.trim()) * 1000) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan'), isExecute = args.includes('--execute');
  if (!isPlan && !isExecute) { console.log('Use --plan or --execute'); process.exit(0); }

  // live skip-check
  const jobs = [];
  let totalChars = 0;
  for (const [course_code, targetKey] of Object.entries(COURSES)) {
    const { count } = await sb.from('course_audio').select('*', { count: 'exact', head: true })
      .eq('course_code', course_code).eq('role', 'welcome');
    const text = render(targetKey);
    jobs.push({ course_code, targetKey, text, chars: text.length, skip: count > 0 });
    if (!(count > 0)) totalChars += text.length;
  }

  console.log(`\n${'='.repeat(70)}\n  MISSING ENG WELCOMES — ${MODEL_ID}, robo-Aran ${VOICE_ID}\n${'='.repeat(70)}`);
  for (const j of jobs) {
    console.log(`\n  ${j.course_code}  [${j.targetKey}]  ${j.chars} chars${j.skip ? '  (SKIP — already has welcome)' : ''}`);
    if (isPlan) console.log(`    "${j.text}"`);
  }
  const todo = jobs.filter(j => !j.skip);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  To generate: ${todo.length}   Skipped: ${jobs.length - todo.length}`);
  console.log(`  Total credits (chars): ${totalChars}`);
  console.log(`${'='.repeat(70)}\n`);
  if (isPlan) return;

  if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
  try { await execAsync('ffmpeg -version'); } catch { console.error('ffmpeg not found'); process.exit(1); }

  let ok = 0; const fails = [];
  for (const j of todo) {
    process.stdout.write(`  ${j.course_code}: generating... `);
    const res = await generate(j.text);
    if (!res.success) { console.log(`FAILED: ${String(res.error).slice(0, 80)}`); fails.push(j.course_code); continue; }
    process.stdout.write('mastering... ');
    const { buffer, durationMs } = await master(res.buffer);
    const uuid = uuidv4().toUpperCase();
    const s3Key = `mastered/${uuid}.mp3`;
    process.stdout.write('uploading... ');
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'audio/mpeg' }));
    process.stdout.write('DB... ');
    // plain insert — the skip-if-exists count check above guarantees no dup
    const { error } = await sb.from('course_audio').insert({
      course_code: j.course_code, text: 'welcome', text_normalized: 'welcome',
      language: 'eng', role: 'welcome', voice_id: VOICE_LABEL, origin: 'tts',
      s3_key: s3Key, duration_ms: durationMs
    }).select('id').single();
    if (error) { console.log(`DB ERROR: ${error.message}`); fails.push(j.course_code); }
    else { console.log(`OK (${(durationMs / 1000).toFixed(1)}s)`); ok++; }
  }
  console.log(`\n  Generated: ${ok}   Failed: ${fails.length}${fails.length ? '  → ' + fails.join(', ') : ''}\n`);
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

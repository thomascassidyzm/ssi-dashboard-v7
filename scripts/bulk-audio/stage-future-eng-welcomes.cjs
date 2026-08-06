#!/usr/bin/env node
/**
 * PRE-BAKE English (robo-Aran) welcomes for LIKELY-NEXT courses that don't exist
 * yet. course_audio has an FK to courses, so we can't insert rows now — instead
 * stage the audio: render → TTS → master → upload S3 → append to a pending
 * manifest keyed by welcome target-key. When a course is later built, insert its
 * course_audio welcome row from the manifest (no regeneration).
 *
 * Idempotent/resumable: skips any target-key already in the manifest.
 *
 * Usage:
 *   node stage-future-eng-welcomes.cjs --plan
 *   node stage-future-eng-welcomes.cjs --execute        # COSTS credits
 *   node stage-future-eng-welcomes.cjs --execute --only guj,pan
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

const VOICE_ID = 'FVdzAUsp8apoOdc0907A';
const VOICE_LABEL = `elevenlabs_${VOICE_ID}`;
const MODEL_ID = 'eleven_multilingual_v2';
const VOICE_SETTINGS = { stability: 0.4, similarity_boost: 1.0 };
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const MANIFEST = path.join(__dirname, 'data/pending-welcomes.json');

// target-key -> suggested course_code (null = variant, name TBD at build)
const STAGE = {
  guj: 'guj_for_eng', pan: 'pan_for_eng', tam: 'tam_for_eng', urd: 'urd_for_eng',
  afb: null, ajp: null, ary: null,                       // Arabic dialects (ara_xx_for_eng)
  smj: 'smj_for_eng', smn: 'smn_for_eng', sms: 'sms_for_eng',
  glv: 'glv_for_eng', wuu: null,                          // wuu course_code TBD
  ast: 'ast_for_eng', oci: 'oci_for_eng', cos: 'cos_for_eng', lij: 'lij_for_eng', srd: 'srd_for_eng',
  bar: 'bar_for_eng', fao: 'fao_for_eng', frr: 'frr_for_eng', fry: 'fry_for_eng', lim: 'lim_for_eng',
  ltz: 'ltz_for_eng', sco: 'sco_for_eng', vls: 'vls_for_eng', wln: 'wln_for_eng',
  bel: 'bel_for_eng', bos: 'bos_for_eng', csb: 'csb_for_eng', dsb: 'dsb_for_eng', hsb: 'hsb_for_eng',
  slk: 'slk_for_eng', slv: 'slv_for_eng',
  amh: 'amh_for_eng', fil: 'fil_for_eng', ind: 'ind_for_eng', vie: 'vie_for_eng',
  hau: 'hau_for_eng', ibo: 'ibo_for_eng', ceb: 'ceb_for_eng',
};

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/translations/welcomes/eng.json'), 'utf8'));
function render(k) {
  const e = tpl.targets[k];
  if (!e) throw new Error(`no eng.json target entry for '${k}'`);
  return tpl.template.replace(/\{in_target\}/g, e.in_target).replace(/\{a_target_speaker\}/g, e.a_target_speaker)
    .replace(/\{target_speakers\}/g, e.target_speakers).replace(/\{in_known\}/g, tpl.in_known);
}
function loadManifest() { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return {}; } }
function saveManifest(m) { fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2)); }

let _fetch = null;
async function getFetch() { if (!_fetch) _fetch = (await import('node-fetch')).default; return _fetch; }
async function generate(text, maxRetries = 3) {
  const fetch = await getFetch();
  for (let a = 1; a <= maxRetries; a++) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST', headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }) });
      if (r.status === 429) { await new Promise(s => setTimeout(s, Math.min(2000 * 2 ** a, 30000))); continue; }
      if (!r.ok) { const t = await r.text(); if (a < maxRetries) { await new Promise(s => setTimeout(s, 1000 * a)); continue; } return { success: false, error: t }; }
      return { success: true, buffer: await r.buffer() };
    } catch (e) { if (a < maxRetries) { await new Promise(s => setTimeout(s, 2000 * a)); continue; } return { success: false, error: e.message }; }
  }
  return { success: false, error: 'exhausted retries' };
}
async function master(buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-'));
  const ip = path.join(dir, 'in.mp3'), op = path.join(dir, 'out.mp3');
  try {
    fs.writeFileSync(ip, buf);
    await execAsync(`ffmpeg -y -i "${ip}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -ar 44100 -ac 1 -b:a 128k "${op}"`);
    const { stdout } = await execAsync(`ffprobe -i "${op}" -show_entries format=duration -v quiet -of csv="p=0"`);
    return { buffer: fs.readFileSync(op), durationMs: Math.round(parseFloat(stdout.trim()) * 1000) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan'), isExecute = args.includes('--execute');
  const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  if (!isPlan && !isExecute) { console.log('Use --plan or --execute'); process.exit(0); }

  const manifest = loadManifest();
  let keys = Object.keys(STAGE);
  if (onlyArg) keys = keys.filter(k => onlyArg.includes(k));
  const todo = keys.filter(k => !manifest[k]);
  let total = 0; for (const k of todo) total += render(k).length;
  console.log(`\n${'='.repeat(60)}\n  STAGE FUTURE ENG WELCOMES — ${MODEL_ID}, robo-Aran\n${'='.repeat(60)}`);
  for (const k of keys) console.log(`  ${k.padEnd(8)} ${manifest[k] ? '(SKIP — staged)' : render(k).length + ' chars → ' + (STAGE[k] || 'course_code TBD')}`);
  console.log(`\n  To stage: ${todo.length}   Already staged: ${keys.length - todo.length}   Credits: ${total}`);
  console.log(`  Manifest: ${MANIFEST}\n${'='.repeat(60)}\n`);
  if (isPlan) return;
  if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
  try { await execAsync('ffmpeg -version'); } catch { console.error('ffmpeg not found'); process.exit(1); }

  let ok = 0; const fails = [];
  for (const k of todo) {
    process.stdout.write(`  ${k}: generating... `);
    const text = render(k);
    const res = await generate(text);
    if (!res.success) { console.log(`FAILED: ${String(res.error).slice(0, 80)}`); fails.push(k); continue; }
    process.stdout.write('mastering... ');
    const { buffer, durationMs } = await master(res.buffer);
    const uuid = uuidv4().toUpperCase();
    const s3Key = `mastered/${uuid}.mp3`;
    process.stdout.write('uploading... ');
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'audio/mpeg' }));
    manifest[k] = { target_key: k, suggested_course_code: STAGE[k], variant: STAGE[k] === null,
      s3_key: s3Key, duration_ms: durationMs, text, voice_id: VOICE_LABEL, model_id: MODEL_ID,
      language: 'eng', role: 'welcome', staged_at_run: uuid };
    saveManifest(manifest);   // persist after each — resumable
    console.log(`staged (${(durationMs / 1000).toFixed(1)}s)`);
    ok++;
  }
  console.log(`\n  Staged: ${ok}   Failed: ${fails.length}${fails.length ? '  → ' + fails.join(', ') : ''}`);
  console.log(`  Manifest now holds ${Object.keys(manifest).length} pre-baked welcomes.\n`);
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

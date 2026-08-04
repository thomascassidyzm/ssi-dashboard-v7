#!/usr/bin/env node
/**
 * Overnight phonology audit: for every xAI TARGET-role clip (target1/target2),
 * run whisper language auto-detect and flag clips whose spoken language isn't
 * the course's target language (e.g. a German clip rendered with English
 * phonology). Mirrors tts-service detectSpokenLanguage. Detection only — no TTS,
 * no writes to S3/DB. Resumable JSONL. Low concurrency (whisper is CPU-heavy).
 *
 *   node scripts/deepening/phono-audit.cjs <course1> [course2 ...]
 */
require('dotenv').config({ path: '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/.env' });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const S3_BASE = `https://${S3_BUCKET}.s3.eu-west-1.amazonaws.com/`;
const WHISPER_BIN = process.env.WHISPER || '/opt/homebrew/bin/whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || '/tmp/whisper-models/ggml-small.bin';
const FFMPEG = 'ffmpeg';
const CONCURRENCY = parseInt(process.env.PHONO_CONCURRENCY, 10) || 3;
const TARGET_ROLES = ['target1', 'target2'];
const isXai = v => /^xai/.test(v || '') || /^(eve|ara|leo|rex|sal|comp:)/.test(v || '');
// course target_lang (3-letter or code) -> whisper ISO-639-1
const ISO = { deu: 'de', ger: 'de', de: 'de', fra: 'fr', fre: 'fr', fr: 'fr', spa: 'es', ita: 'it', por: 'pt', zho: 'zh', jpn: 'ja', kor: 'ko' };

const courses = process.argv.slice(2);
if (!courses.length) { console.error('usage: phono-audit.cjs <course...>'); process.exit(1); }
if (!fs.existsSync(WHISPER_BIN) || !fs.existsSync(WHISPER_MODEL)) {
  console.error(`whisper not ready: BIN ${fs.existsSync(WHISPER_BIN)} MODEL ${fs.existsSync(WHISPER_MODEL)}`); process.exit(1);
}

const OUT = path.join(__dirname, 'phono-audit-results.jsonl');
const PROG = path.join(__dirname, 'phono-audit-progress.txt');
const done = new Set();
if (fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) { if (l.trim()) try { done.add(JSON.parse(l).id); } catch {} }
const outStream = fs.createWriteStream(OUT, { flags: 'a' });
const log = m => { const s = `[${new Date().toISOString()}] ${m}`; console.log(s); try { fs.appendFileSync(PROG, s + '\n'); } catch {} };

function whisperLang(wav) {
  return new Promise(resolve => {
    execFile(WHISPER_BIN, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', String(process.env.WHISPER_THREADS || 4), '-f', wav],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, _o, stderr) => {
        const m = /auto-detected language: (\w+)/.exec(stderr || '');
        resolve(m ? m[1] : null);
      });
  });
}
function toWav(mp3, wav) {
  return new Promise(resolve => execFile(FFMPEG, ['-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav], err => resolve(!err)));
}

async function pageTargets(course) {
  const { data: crow } = await sb.from('courses').select('target_lang').eq('course_code', course).single();
  const exp = ISO[(crow?.target_lang || '').toLowerCase()] || (crow?.target_lang || '').toLowerCase().slice(0, 2);
  let rows = [], f = 0;
  for (;;) {
    const { data, error } = await sb.from('course_audio').select('id, role, voice_id, s3_key, text').eq('course_code', course).range(f, f + 999);
    if (error) throw error; rows.push(...data); if (data.length < 1000) break; f += 1000;
  }
  const clips = rows.filter(r => TARGET_ROLES.includes(r.role) && isXai(r.voice_id) && r.s3_key && !r.s3_key.startsWith('pending/'));
  return { exp, clips };
}

async function checkOne(course, exp, row, tmpDir) {
  const mp3 = path.join(tmpDir, `${row.id}.mp3`), wav = path.join(tmpDir, `${row.id}.wav`);
  try {
    const r = await fetch(S3_BASE + row.s3_key);
    if (!r.ok) throw new Error(`GET ${r.status}`);
    fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
    if (!(await toWav(mp3, wav))) throw new Error('ffmpeg wav failed');
    const detected = await whisperLang(wav);
    const defect = detected && exp && detected !== exp;
    outStream.write(JSON.stringify({ course, id: row.id, role: row.role, expected: exp, detected, defect: !!defect, text: (row.text || '').slice(0, 80) }) + '\n');
    return defect ? 'defect' : (detected ? 'ok' : 'unknown');
  } catch (e) {
    outStream.write(JSON.stringify({ course, id: row.id, role: row.role, error: e.message }) + '\n');
    return 'error';
  } finally { for (const f of [mp3, wav]) try { fs.unlinkSync(f); } catch {} }
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phonoaudit-'));
  let all = [];
  for (const c of courses) { const { exp, clips } = await pageTargets(c); log(`${c}: ${clips.length} xAI target clips (expected lang=${exp})`); clips.forEach(r => r._exp = exp); all.push(...clips.map(r => ({ course: c, exp, row: r }))); }
  const todo = all.filter(x => !done.has(x.row.id));
  log(`TOTAL ${all.length} target clips, ${done.size} done, ${todo.length} to check (concurrency ${CONCURRENCY})`);
  let i = 0, defect = 0, ok = 0, unknown = 0, error = 0, n = 0;
  async function worker() {
    while (i < todo.length) {
      const x = todo[i++];
      const res = await checkOne(x.course, x.exp, x.row, tmpDir);
      if (res === 'defect') defect++; else if (res === 'ok') ok++; else if (res === 'unknown') unknown++; else error++;
      if (++n % 200 === 0) log(`progress ${n}/${todo.length} | LEAKS ${defect}, ok ${ok}, unknown ${unknown}, errors ${error}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  log(`DONE. checked ${n} | PHONOLOGY LEAKS ${defect} | ok ${ok} | unknown ${unknown} | errors ${error}`);
  outStream.end();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
})().catch(e => { log(`FATAL ${e.message}`); process.exit(1); });

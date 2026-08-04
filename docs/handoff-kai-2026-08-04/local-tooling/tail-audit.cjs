#!/usr/bin/env node
/**
 * Overnight tail-click audit: run audioProcessor.detectTailClick over EVERY
 * xAI core-role clip in the given courses. Detection only — writes nothing to
 * S3/DB. Results appended to a JSONL (resumable: re-run skips done ids).
 * No TTS. Downloads from the public S3 URL (same construction as declick-tail).
 *
 *   node scripts/deepening/tail-audit.cjs <course1> [course2 ...]
 */
require('dotenv').config({ path: '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/.env' });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const audioProcessor = require('../../services/audio-processor.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const S3_BASE = `https://${S3_BUCKET}.s3.eu-west-1.amazonaws.com/`;
const CONCURRENCY = parseInt(process.env.AUDIT_CONCURRENCY, 10) || 12;
const CORE = ['known', 'target1', 'target2', 'presentation'];
const isXai = v => /^xai/.test(v || '') || /^(eve|ara|leo|rex|sal|comp:)/.test(v || '');

const courses = process.argv.slice(2);
if (!courses.length) { console.error('usage: tail-audit.cjs <course...>'); process.exit(1); }

const OUT = path.join(__dirname, 'tail-audit-results.jsonl');
const PROG = path.join(__dirname, 'tail-audit-progress.txt');
const done = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).id); } catch {}
  }
}
const outStream = fs.createWriteStream(OUT, { flags: 'a' });
const log = m => { const s = `[${new Date().toISOString()}] ${m}`; console.log(s); try { fs.appendFileSync(PROG, s + '\n'); } catch {} };

async function pageXai(course) {
  let rows = [], f = 0;
  for (;;) {
    const { data, error } = await sb.from('course_audio')
      .select('id, role, voice_id, s3_key, text, language')
      .eq('course_code', course).range(f, f + 999);
    if (error) throw error;
    rows.push(...data); if (data.length < 1000) break; f += 1000;
  }
  return rows.filter(r => CORE.includes(r.role) && isXai(r.voice_id) && r.s3_key && !r.s3_key.startsWith('pending/'));
}

async function checkOne(course, row, tmpDir) {
  const dest = path.join(tmpDir, `${row.id}.mp3`);
  try {
    const r = await fetch(S3_BASE + row.s3_key);
    if (!r.ok) throw new Error(`GET ${r.status}`);
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    const det = await audioProcessor.detectTailClick(dest);
    const rec = { course, id: row.id, role: row.role, voice_id: row.voice_id,
      click: !!det.click, kind: det.kind || null, text: (row.text || '').slice(0, 80) };
    outStream.write(JSON.stringify(rec) + '\n');
    return rec.click ? 'defect' : 'clean';
  } catch (e) {
    outStream.write(JSON.stringify({ course, id: row.id, role: row.role, error: e.message }) + '\n');
    return 'error';
  } finally { try { fs.unlinkSync(dest); } catch {} }
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tailaudit-'));
  let all = [];
  for (const c of courses) { const rows = await pageXai(c); log(`${c}: ${rows.length} xAI core clips`); all.push(...rows); }
  const todo = all.filter(r => !done.has(r.id));
  log(`TOTAL ${all.length} clips, ${done.size} already done, ${todo.length} to check (concurrency ${CONCURRENCY})`);
  let i = 0, defect = 0, clean = 0, error = 0, n = 0;
  async function worker() {
    while (i < todo.length) {
      const row = todo[i++];
      const res = await checkOne(row.course, row, tmpDir);
      if (res === 'defect') defect++; else if (res === 'clean') clean++; else error++;
      if (++n % 500 === 0) log(`progress ${n}/${todo.length} | defects ${defect}, clean ${clean}, errors ${error}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  log(`DONE. checked ${n} | DEFECTS ${defect} | clean ${clean} | errors ${error}`);
  log(`defect ids in ${OUT} (grep '"click":true')`);
  outStream.end();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
})().catch(e => { log(`FATAL ${e.message}`); process.exit(1); });

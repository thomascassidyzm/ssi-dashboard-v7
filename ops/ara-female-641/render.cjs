#!/usr/bin/env node
'use strict';
// Job #641·AD: re-record clips IN PLACE through Popty's one audio route (POST /api/audio/render, replaceAudioId).
// Make-before-break is the route's own (new object uploaded + verified before the row moves; old object retained).
//   node render.cjs <plan.json> <done.jsonl> [--dry] [--limit N] [--sample N] [--conc K]
// plan.json: [{ course, role: 'target1'|'target2', audioId, text, spoken }]  (spoken === text → no spokenText sent)
// done.jsonl: one line per answered clip; a re-run skips ids already ok. Any refusal STOPS new work (never retried).
const fs = require('fs');
const [planPath, donePath, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? Number(rest[i + 1]) : d; };
const dry = rest.includes('--dry');
const limit = opt('--limit', Infinity), sample = opt('--sample', 0), conc = opt('--conc', 1);
const URL = 'http://localhost:3470/api/audio/render';
let plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (sample) { const step = Math.max(1, Math.floor(plan.length / sample)); plan = plan.filter((_, i) => i % step === 0).slice(0, sample); }
const done = new Set();
if (!dry && fs.existsSync(donePath)) for (const l of fs.readFileSync(donePath, 'utf8').split('\n')) { try { const j = JSON.parse(l); if (j.ok) done.add(j.audioId); } catch {} }
const todo = plan.filter((p) => !done.has(p.audioId)).slice(0, limit);
let n = 0, chars = 0, stop = null; const sources = {};
async function one(p) {
  const body = { courseCode: p.course, role: p.role, text: p.text, replaceAudioId: p.audioId, job: '#641',
    purpose: '#641 re-record from corrected speaker-gender text (Kai approved 5 Nov 17:12Z)', dryRun: dry };
  if (p.spoken !== p.text) body.spokenText = p.spoken;
  let r, j;
  try {
    r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'kai-watson-641' }, body: JSON.stringify(body) });
    j = await r.json();
  } catch (e) { stop = stop || `transport ${p.audioId} ${e.message}`; return; }
  n++;
  const rec = { audioId: p.audioId, course: p.course, role: p.role, ok: !!j.ok, status: r.status, source: j.source, chars: j.charsSpent || j.wouldSpendChars || 0, spoken: j.spoken, code: j.code, error: j.error, revision: j.revision, s3Key: j.s3Key };
  const k = j.source || j.code || r.status; sources[k] = (sources[k] || 0) + 1;
  chars += rec.chars;
  if (!dry) fs.appendFileSync(donePath, JSON.stringify(rec) + '\n');
  if (!j.ok) { stop = stop || `REFUSED ${JSON.stringify(rec)}`; }
  if (n % 200 === 0) console.log(JSON.stringify({ n, chars, sources, at: new Date().toISOString() }));
}
(async () => {
  let i = 0;
  const workers = Array.from({ length: conc }, async () => { while (!stop && i < todo.length) await one(todo[i++]); });
  await Promise.all(workers);
  if (stop) { console.error('STOPPED:', stop); console.log(JSON.stringify({ n, chars, sources, dry })); process.exit(3); }
  console.log('FINISHED', JSON.stringify({ n, chars, sources, dry, todo: todo.length }));
})();

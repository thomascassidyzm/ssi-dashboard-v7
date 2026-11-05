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
// --skip a,b: clips held back as reported gaps (e.g. a request the proxy times out on); never silently dropped.
const skip = new Set(((() => { const i = rest.indexOf('--skip'); return i >= 0 ? rest[i + 1] : ''; })()).split(',').filter(Boolean));
const todo = plan.filter((p) => !done.has(p.audioId) && !skip.has(p.audioId)).slice(0, limit);
if (skip.size) console.log(JSON.stringify({ skipped: [...skip] }));
let n = 0, chars = 0, stop = null; const sources = {};
// Pre-run s3 key of every planned clip, from the read-only clip dump taken before the run (<course>.clips.json).
const preKey = {};
for (const c of ['ara_eg_for_eng', 'ara_lb_for_eng']) {
  const f = `${__dirname}/${c}.clips.json`;
  if (fs.existsSync(f)) for (const v of Object.values(JSON.parse(fs.readFileSync(f, 'utf8')).voices)) for (const x of v) preKey[x.id] = x.s3_key;
}
/** The clip's live s3 key, read through Popty (no DB access of our own). */
async function liveKey(p) {
  try {
    const res = await fetch(`http://localhost:3470/api/production/${p.course}/audio/${p.audioId}/url`);
    const u = (await res.json()).url || '';
    const m = u.match(/amazonaws\.com\/([^?]+)/); return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}
async function one(p) {
  const body = { courseCode: p.course, role: p.role, text: p.text, replaceAudioId: p.audioId, job: '#641',
    purpose: '#641 re-record from corrected speaker-gender text (Kai approved 5 Nov 17:12Z)', dryRun: dry };
  if (p.spoken !== p.text) body.spokenText = p.spoken;
  let r, j;
  // A 503 / transport failure is NOT proof nothing happened: phase8 can render and save the take while :3470 answers
  // "socket hang up" (Tom's Watson, 5 Nov: ~25 clips paid twice that way). So never blindly re-send. Wait for Popty,
  // then READ the clip's live key (GET .../audio/:id/url). If it has moved off the pre-run key, the take was saved:
  // record it and move on. Only if it has not moved is the clip sent again (at most 3 sends; Popty re-records are
  // idempotent since 73d23d088, so even that cannot pay twice for the same words). A refusal still stops the run.
  for (let attempt = 1; ; attempt++) {
    try {
      r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'kai-watson-641' }, body: JSON.stringify(body) });
      j = await r.json();
      if (r.status === 503) throw new Error(`503 ${j && j.error}`);
      break;
    } catch (e) {
      console.log(JSON.stringify({ transport: p.audioId, attempt, error: e.message, at: new Date().toISOString() }));
      for (let w = 0; w < 60; w++) { await new Promise((s) => setTimeout(s, 10000)); try { const h = await fetch('http://localhost:3470/api/audio/health'); if (h.ok) break; } catch {} }
      const key = await liveKey(p);
      if (key && preKey[p.audioId] && key !== preKey[p.audioId]) {
        r = { status: 200 }; j = { ok: true, source: 'saved-before-503', s3Key: key, spoken: p.spoken };
        break;
      }
      if (attempt >= 3) { stop = stop || `transport ${p.audioId} ${e.message} (live key unchanged: ${key})`; return; }
    }
  }
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

#!/usr/bin/env node
'use strict';
// Job #641·AD: re-record clips IN PLACE through Popty's one audio route (POST /api/audio/render, replaceAudioId).
// Make-before-break is the route's own (new object uploaded + verified before the row moves; old object retained).
//   node render.cjs <plan.json> <done.jsonl> [--dry] [--limit N]
// plan.json: [{ course, role: 'target1'|'target2', audioId, text, spoken }]  (spoken === text → no spokenText sent)
// done.jsonl: one line per answered clip; a re-run skips ids already ok. Any refusal STOPS the run (never retried).
const fs = require('fs');
const [planPath, donePath, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
const li = rest.indexOf('--limit'); const limit = li >= 0 ? Number(rest[li + 1]) : Infinity;
const URL = 'http://localhost:3470/api/audio/render';
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const done = new Set();
if (!dry && fs.existsSync(donePath)) for (const l of fs.readFileSync(donePath, 'utf8').split('\n')) { try { const j = JSON.parse(l); if (j.ok) done.add(j.audioId); } catch {} }
(async () => {
  let n = 0, chars = 0, sources = {};
  for (const p of plan) {
    if (done.has(p.audioId)) continue;
    if (n >= limit) break;
    const body = { courseCode: p.course, role: p.role, text: p.text, replaceAudioId: p.audioId, job: '#641',
      purpose: '#641 re-record from corrected speaker-gender text (Kai approved 5 Nov 17:12Z)', dryRun: dry };
    if (p.spoken !== p.text) body.spokenText = p.spoken;
    let r, j;
    try {
      r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'kai-watson-641' }, body: JSON.stringify(body) });
      j = await r.json();
    } catch (e) { console.error('transport', p.audioId, e.message); process.exit(2); }
    n++;
    const rec = { audioId: p.audioId, course: p.course, role: p.role, ok: !!j.ok, status: r.status, source: j.source, chars: j.charsSpent || j.wouldSpendChars || 0, spoken: j.spoken, code: j.code, error: j.error, revision: j.revision, s3Key: j.s3Key };
    sources[j.source || j.code || r.status] = (sources[j.source || j.code || r.status] || 0) + 1;
    chars += rec.chars;
    if (!dry) fs.appendFileSync(donePath, JSON.stringify(rec) + '\n');
    if (!j.ok) { console.error('REFUSED — stopping:', JSON.stringify(rec)); console.log(JSON.stringify({ n, chars, sources })); process.exit(3); }
    if (n % 200 === 0) console.log(JSON.stringify({ n, chars, sources }));
  }
  console.log('FINISHED', JSON.stringify({ n, chars, sources, dry }));
})();

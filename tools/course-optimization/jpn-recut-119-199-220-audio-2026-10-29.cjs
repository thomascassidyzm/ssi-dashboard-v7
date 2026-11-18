#!/usr/bin/env node
'use strict';
// jpn_for_eng 119/199/220 re-cut (job #564): the clips the re-cut needs, through the ONE audio route (POST /api/audio/render:
// library first, spend guard, ONE render, no retries). Kai approved the clip spend for this job (stop and report past 300 clips).
//   node …cjs pre-dry|pre <asks.json> <log.jsonl>     # known / target1 / target2 clips — rendered BEFORE the edit, then linked inside the edit-batch
//   node …cjs post-dry|post <asks.json> <log.jsonl>   # the three LEGO intros — named by legoId so the route binds each as the LEGO's presentation
// One call per distinct (role,text); stops at the first refusal (402/NOT_IN_CHAIN/etc.) or network failure; never retries; resumes from the log.
const fs = require('fs');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const COURSE = 'jpn_for_eng';
const WHO = 'kai-564-jpn-recut';
const PURPOSE = 'job #564 jpn_for_eng seeds 119/199/220 LEGO re-cut: clips for the new/changed LEGO text and phrases (Kai approved 29 Oct)';
(async () => {
  const [mode, asksFile, logFile] = process.argv.slice(2);
  if (!/^(pre|post)(-dry)?$/.test(mode || '') || !asksFile || !logFile) { console.error('usage: pre-dry|pre|post-dry|post <asks.json> <log.jsonl>'); process.exit(1); }
  const dry = mode.endsWith('-dry'), post = mode.startsWith('post');
  const asks = JSON.parse(fs.readFileSync(asksFile, 'utf8')).filter((a) => (a.role === 'presentation') === post);
  const seen = new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => (l.status === 200 || l.reuse) && l.dry === dry).map((l) => l.k) : []);
  let n = 0;
  for (const a of asks) {
    if (seen.has(a.k)) continue;
    const body = { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: dry };
    if (post) body.legoId = a.why[0].split(' ')[0];
    let status = 0, out = {};
    try {
      const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
      status = r.status; out = await r.json().catch(() => ({}));
    } catch (e) { out = { error: String(e.name) }; }
    // RERECORD_NOT_PERMITTED (Tom 2026-10-11): the slot's words already have a working clip in this course. That is not a failure and
    // not something to route around — the clip is what we wanted. Its id is in the refusal; the edit-batch links it (audio.link checks it speaks the words).
    const reuse = status === 403 && out && out.code === 'RERECORD_NOT_PERMITTED' ? (String(out.error).match(/working clip \(([0-9a-f-]{36}) in ([^)]*)\)/) || null) : null;
    if (reuse) out = { ...out, audioId: reuse[1], reusedVoice: reuse[2] };
    fs.appendFileSync(logFile, JSON.stringify({ k: a.k, role: a.role, text: a.text, dry, status, reuse: !!reuse, body: out }) + '\n');
    n++;
    if (status !== 200 && !reuse) { console.log('STOP', status, JSON.stringify(out).slice(0, 400)); process.exit(2); }
  }
  console.log('done', n, 'calls this run;', asks.length, 'distinct asks in this phase');
})();

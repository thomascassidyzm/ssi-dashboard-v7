#!/usr/bin/env node
// cs #738·AI: Popty edit-batch DRY RUNS (no "apply") of each course's auto plan, in chunks of <= 50 ops,
// one at a time, 2 s apart, and only while the shared DB is quiet (<= 6 active backends in the newest
// db-watchdog sample; otherwise wait, bounded). A dry run is a real transaction rolled back: every
// "expect" is checked against the live row, so a row another job changed since the snapshot fails here.
// usage: node dry-all.cjs <course…>   -> <course>/batches/auto-NN.dry.json, prints one line per chunk
// cs #968·AI: every Popty call here needs --live-ok '<why>' AND 22:00-07:00 UK (ops/paid-cleanup-livegate.cjs, exit 77).
// The item-9 NIGHT runner (../night-run.sh) does not use this file; it applies through tools/changeset and night-audio.cjs.
const LIVEGATE = require('../../paid-cleanup-livegate.cjs'); LIVEGATE.install();
const fs = require('fs');
const path = require('path');
const os = require('os');
const L = require('./lib.cjs');
LIVEGATE.requireLive(`item9 dry-all.cjs ${process.argv.slice(2).join(' ')}`);
const H = { 'Content-Type': 'application/json', 'x-agent-id': 'cs-738-item9', 'x-agent-role': 'paid-cleanup-item9' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const active = () => {
  try {
    const d = path.join(os.homedir(), '.local/state/db-watchdog/freezes');
    const f = fs.readdirSync(d).filter(x => x.startsWith('samples-')).sort().pop();
    const lines = fs.readFileSync(path.join(d, f), 'utf8').trim().split('\n');
    const j = JSON.parse(lines[lines.length - 1]);
    return (j.activity || []).filter(a => a.state === 'active').reduce((t, a) => t + (a.count || 0), 0);
  } catch { return 0; }
};
(async () => {
  for (const course of process.argv.slice(2)) {
    const bdir = path.join(L.ITEM_DIR, course, 'batches');
    const f = path.join(bdir, 'auto.ops.json');
    if (!fs.existsSync(f)) continue;
    const ops = JSON.parse(fs.readFileSync(f, 'utf8')).ops;
    for (let i = 0, n = 1; i < ops.length; i += 50, n++) {
      let chunk = ops.slice(i, i + LIVEGATE.MAX_CHUNK); // cs #968·AI: <= 10 (was 50)
      const dropped = [];
      const out = path.join(bdir, `auto-${String(n).padStart(2, '0')}.dry.json`);
      if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, 'utf8')).ok) { console.log(`${course} #${n} already ok`); continue; }
      let res;
      for (let attempt = 0; attempt < 8; attempt++) {
      for (let w = 0; w < 30 && active() > 6; w++) await sleep(60000);
      const t0 = Date.now();
      let status = 0, b = {};
      try {
        const r = await fetch(`http://localhost:3470/api/production/${course}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops: chunk }) });
        status = r.status; const t = await r.text(); try { b = JSON.parse(t); } catch { b = { raw: t.slice(0, 1000) }; }
      } catch (e) { b = { error: String(e) }; }
      res = { at: new Date().toISOString(), status, ms: Date.now() - t0, ok: status === 200 && b.ok === true, applied: !!b.applied,
        ops: chunk.length, error: b.error || null, code: b.code || null, index: b.index ?? null,
        failed_op: b.index != null && b.index >= 0 ? chunk[b.index] : null };
      // A row that moved since the snapshot: drop it from the plan (listed), re-run the rest of the chunk.
      if (!res.ok && res.failed_op && /EXPECT|NOT_FOUND|MISMATCH|CONFLICT/i.test(String(res.code) + res.error) && chunk.length > 1) {
        dropped.push({ op: res.failed_op, code: res.code, error: res.error }); chunk = chunk.filter((_, k) => k !== res.index);
        console.log(`${course} #${n} dropped ${res.failed_op.phrase_id}: ${res.code}`); await sleep(2000); continue;
      }
      break;
      }
      res.dropped = dropped;
      fs.writeFileSync(out, JSON.stringify(res, null, 1));
      console.log(`${course} #${n} ops ${chunk.length}: HTTP ${res.status} ${res.ok ? 'ok' : 'FAILED ' + (res.code || '') + ' ' + (res.error || '').slice(0, 160)} ${res.ms}ms`);
      if (res.applied) { console.log('APPLIED?! stopping'); process.exit(3); }
      await sleep(2000);
    }
  }
})();

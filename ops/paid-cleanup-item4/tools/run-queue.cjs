#!/usr/bin/env node
// Serial apply queue for item 4 (cs #759·AI, after the 18 Nov DB hold). ONE writer, small batches:
//   node run-queue.cjs <course> <seedList e.g. 251-298,485-545> [maxOps=50]
// For each planned, not-yet-applied seed (in order) it groups consecutive seeds into batches of <= maxOps ops,
// then per batch: DB-load gate -> build.cjs -> post validate -> post dry -> post apply, 2 s pause between batches.
// Gate: newest line of ~/.local/state/db-watchdog/freezes/samples-<UTC date>T<hour>.jsonl, active backends <= 6,
// else wait 60 s (max 60 waits, then stop and say so). A batch that fails build/validate/dry is SKIPPED and listed
// (never forced); an apply that fails stops the queue (the operator reads it). Everything goes through Popty routes.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('./lib.cjs');
const [course, list, maxOpsArg] = process.argv.slice(2);
const MAX = Number(maxOpsArg || 50);
const OWNER = process.env.ITEM4_OWNER || '759';
const cdir = path.join(L.ITEM_DIR, course);
const T = __dirname;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const want = new Set();
for (const part of list.split(',')) { const [a, b] = part.split('-').map(Number); for (let s = a; s <= (b || a); s++) want.add(s); }
const applied = new Set();
for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter(f => f.endsWith('.apply.json'))) {
  const a = JSON.parse(fs.readFileSync(path.join(cdir, 'batches', f), 'utf8')); if (a.applied) a.seeds.forEach(s => applied.add(s));
}
const planned = fs.readdirSync(path.join(cdir, 'plans')).filter(f => /^S\d{4}\.json$/.test(f)).map(f => Number(f.slice(1, 5)))
  .filter(s => want.has(s) && !applied.has(s)).sort((a, b) => a - b);
const opsOf = (s) => { const p = JSON.parse(fs.readFileSync(path.join(cdir, 'plans', `S${String(s).padStart(4, '0')}.json`), 'utf8'));
  let n = 0; for (const e of Object.values(p.legos || {})) n += (e.delete || []).length + Object.keys(e.update || {}).length + (e.insert || []).length; return n; };
// batches of consecutive planned seeds; a range build only picks planned seeds, so gaps inside a range are harmless
const batches = []; let cur = null;
for (const s of planned) {
  const n = opsOf(s);
  if (!n) continue;
  const gapHasApplied = cur && [...applied].some(a => a > cur.to && a < s && fs.existsSync(path.join(cdir, 'plans', `S${String(a).padStart(4, '0')}.json`)));
  if (cur && !gapHasApplied && cur.ops + n <= MAX) { cur.to = s; cur.ops += n; cur.seeds.push(s); }
  else { cur = { from: s, to: s, ops: n, seeds: [s] }; batches.push(cur); }
}
log(`${course}: ${planned.length} planned unapplied seeds -> ${batches.length} batches (<= ${MAX} ops)`);

function load() {
  const d = new Date().toISOString();
  const f = path.join(process.env.HOME, '.local/state/db-watchdog/freezes', `samples-${d.slice(0, 13)}.jsonl`);
  try { const last = fs.readFileSync(f, 'utf8').trim().split('\n').pop(); const j = JSON.parse(last);
    return (j.activity || []).filter(x => x.state === 'active').reduce((a, x) => a + (x.count || 1), 0); } catch { return 0; }
}
function gate() {
  for (let i = 0; i < 60; i++) { const n = load(); if (n <= 6) return n; log(`DB load ${n} > 6, waiting 60 s`); sleep(60000); }
  return -1;
}
const run = (args) => { const r = spawnSync('node', args, { cwd: cdir, encoding: 'utf8', env: { ...process.env, ITEM4_OWNER: OWNER } });
  const out = (r.stdout + r.stderr).split('\n').filter(l => l && !/language-code|pre-existing/.test(l)).join('\n');
  return { ok: r.status === 0, out }; };

const skipped = [], done = [];
for (const b of batches) {
  const name = `q${OWNER}-${String(b.from).padStart(3, '0')}-${String(b.to).padStart(3, '0')}`;
  if (fs.existsSync(path.join(cdir, 'batches', `${name}.apply.json`)) && JSON.parse(fs.readFileSync(path.join(cdir, 'batches', `${name}.apply.json`))).applied) continue;
  const n = gate(); if (n < 0) { log('DB load stayed > 6 for an hour: stopping'); break; }
  let r = run([path.join(T, 'build.cjs'), course, name, String(b.from), String(b.to)]);
  if (!r.ok) { log(`${name} BUILD errors, skipped:\n${r.out.slice(-1500)}`); skipped.push({ name, stage: 'build', out: r.out.slice(-3000) }); continue; }
  r = run([path.join(T, 'post.cjs'), 'validate', course, name]); log(r.out.split('\n').slice(0, 6).join('\n'));
  if (!r.ok) { skipped.push({ name, stage: 'validate', out: r.out.slice(-3000) }); continue; }
  r = run([path.join(T, 'post.cjs'), 'dry', course, name]); log(r.out);
  if (!r.ok) { skipped.push({ name, stage: 'dry', out: r.out.slice(-3000) }); continue; }
  if (gate() < 0) { log('DB load stayed > 6 for an hour: stopping'); break; }
  r = run([path.join(T, 'post.cjs'), 'apply', course, name]); log(r.out);
  if (!r.ok) { log(`${name} APPLY failed: stopping the queue`); skipped.push({ name, stage: 'apply', out: r.out.slice(-3000) }); break; }
  done.push(name);
  sleep(2000);
}
fs.writeFileSync(path.join(cdir, `queue-${OWNER}-last.json`), JSON.stringify({ at: new Date().toISOString(), list, done, skipped }, null, 1));
log(`DONE ${done.length} applied, ${skipped.length} skipped/failed`);

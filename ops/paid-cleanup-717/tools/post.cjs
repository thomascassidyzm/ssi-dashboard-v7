#!/usr/bin/env node
// Post a planned item's op GROUPS to Popty's edit-batch route, one course at a time (cs #717·AI).
//   node post.cjs <item> <course> dry|apply [--chunk N] [--limit N]
// Reads ops/paid-cleanup-717/<item>/<course>/plan.json  ({ rows: [{ id, ops:[…] }] } — a row's ops are one group).
// A group is all-or-nothing. Popty runs a whole request in one transaction and aborts it on the first refusal
// (DRIFT = the row changed since the QA-copy read; a clip that does not speak the words; an id already taken);
// the refusing op's index names its group, which goes to the "refused" list with Popty's own error, and the
// chunk is re-sent without it. Nothing is ever forced: no allow_text_mismatch, no retry of a refused group.
// apply: dry-runs each chunk first, then applies it; saves event id, undo_file and undo_ops per chunk.
// Writes <item>/<course>/post-<mode>.json (append-only log of chunks) and events.json (applied events).
// Undo: POST :3470/api/production/<course>/edit-batch {"undo_file":"<name>","apply":true}
'use strict';
// cs #968·AI: every Popty call here needs --live-ok '<why>' AND 22:00-07:00 UK (ops/paid-cleanup-livegate.cjs, exit 77).
// Dry runs (and the dry run before each apply) go in chunks of 10 or fewer: --chunk above 10 is clamped.
const LIVEGATE = require('../../paid-cleanup-livegate.cjs'); LIVEGATE.install();
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
{ const { Agent, setGlobalDispatcher } = require(path.join(L.ROOT, 'node_modules/undici'));
  setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 })); }

const [item, course, mode] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const CHUNK = LIVEGATE.clampChunk(arg('--chunk', LIVEGATE.MAX_CHUNK)), LIMIT = arg('--limit', Infinity);
if (!item || !course || !['dry', 'apply'].includes(mode)) { console.error("usage: post.cjs <item> <course> dry|apply [--chunk N<=10] [--limit N] --live-ok '<why>'"); process.exit(2); }
LIVEGATE.requireLive(`717 post.cjs ${item} ${course} ${mode}`);
const dir = path.join(L.ITEM_DIR, item, course);
const plan = L.rd(path.join(dir, 'plan.json'));
const H = { 'Content-Type': 'application/json', 'x-agent-id': 'cs-717-paid-cleanup', 'x-agent-role': `paid-cleanup-717-${item}` };
async function batch(ops, apply) {
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now();
    const r = await fetch(`http://localhost:3470/api/production/${course}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops, apply }) });
    const txt = await r.text(); let b; try { b = JSON.parse(txt); } catch { b = { raw: txt.slice(0, 500) }; }
    // A statement timeout on the contended live DB is the server failing, not a refusal of our rows: wait and resend
    // (the transaction rolled back). Bounded; a refusal (4xx with an op index) is never retried.
    if (r.status >= 500 && /timeout|ECONN|terminat/i.test(JSON.stringify(b)) && attempt < 4) { await new Promise((ok) => setTimeout(ok, 15000 * (attempt + 1))); continue; }
    return { status: r.status, ms: Date.now() - t0, b };
  }
}
const logF = path.join(dir, `post-${mode}.json`), evF = path.join(dir, 'events.json'), refF = path.join(dir, 'refused.json');
const log = fs.existsSync(logF) ? L.rd(logF) : [];
const events = fs.existsSync(evF) ? L.rd(evF) : [];
const refused = fs.existsSync(refF) ? L.rd(refF) : [];
const done = new Set([...events.flatMap((e) => e.rows), ...refused.map((r) => r.id)]);

(async () => {
  let groups = plan.rows.filter((r) => !done.has(r.id)).slice(0, LIMIT);
  console.log(`${course} ${item} ${mode}: ${groups.length} groups to send (${done.size} already done/refused)`);
  while (groups.length) {
    let chunk = groups.splice(0, CHUNK);
    for (const phase of mode === 'apply' ? ['dry', 'apply'] : ['dry']) {
      while (chunk.length) {
        const ops = chunk.flatMap((g) => g.ops);
        const { status, ms, b } = await batch(ops, phase === 'apply');
        const ok = status === 200 && b.ok === true;
        log.push({ at: new Date().toISOString(), phase, groups: chunk.length, ops: ops.length, status, ms, ok, event_id: b.event_id || null, error: ok ? null : (b.error || b.raw || null), code: b.code || null, index: b.index ?? null });
        if (ok) {
          if (phase === 'apply') {
            if (!b.applied) { console.error('apply answered ok but not applied; stopping'); process.exit(1); }
            events.push({ at: new Date().toISOString(), event_id: b.event_id, undo_file: b.undo_file, rows: chunk.map((g) => g.id), undo_ops: b.undo_ops });
            L.wr(evF, events);
          }
          console.log(`  ${phase} ok ${chunk.length} groups / ${ops.length} ops ${ms}ms ${b.event_id || ''}`);
          break;
        }
        const idx = b.index;
        if (idx == null || idx < 0 || idx >= ops.length) { console.error(`  ${phase} FAILED without an op index: HTTP ${status} ${JSON.stringify(b).slice(0, 400)}`); L.wr(logF, log); process.exit(1); }
        let n = 0, gi = 0; for (; gi < chunk.length; gi++) { n += chunk[gi].ops.length; if (idx < n) break; }
        const g = chunk[gi];
        refused.push({ id: g.id, phase, at: new Date().toISOString(), code: b.code || null, error: b.error || null, op: ops[idx] && ops[idx].op });
        L.wr(refF, refused);
        console.log(`  ${phase} refused ${g.id}: ${b.code || ''} ${String(b.error || '').slice(0, 160)}`);
        chunk.splice(gi, 1);
      }
    }
    L.wr(logF, log);
  }
  L.wr(logF, log);
  console.log(`${course} ${item} ${mode} done: events ${events.length}, refused ${refused.length}`);
})().catch((e) => { L.wr(logF, log); console.error(e); process.exit(1); });

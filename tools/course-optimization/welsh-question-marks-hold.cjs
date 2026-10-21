#!/usr/bin/env node
'use strict';
// welsh-question-marks-hold.cjs — the HOLD on job #504 (2026-10-21).
//
// Tom ruled on 2026-10-13 that a question mark that changes the meaning makes a DISTINCT
// recording, so a take read before the '?' was added was probably read as a statement.
// Whether those takes stay or are re-recorded is Aran's call. Until he answers, a row
// that had ANY linked take (known, target1 or target2) when the '?' pass ran goes back
// to its old text. Rows with no take keep their '?'.
//
//   node welsh-question-marks-hold.cjs <course> --plan <course.plan.json> --out <dir> [--apply]
//
// The plan is the one welsh-question-marks-apply.cjs applied; its `expect` blocks are the
// pre-edit state. The revert batch runs in the reverse of the apply order, so takes stay linked:
//   1. relabelled clips get their old text back FIRST (audio.update);
//   2. the row gets its old text back (the trigger sees a matching clip and keeps it);
//   3. clips from other courses, and LEGO presentation clips, are linked back to the row.
// Every op asserts the current (post-'?') state; drift aborts the batch. Popty's door only.

const fs = require('fs');
const path = require('path');
const { linksKept } = require('./welsh-question-marks-apply.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-504-welsh-question-marks';

const rowRef = (o) => String(o.phrase_id || o.lego_id || o.seed_number);
const hadTake = (o) => !!(o.expect && (o.expect.known_audio_id || o.expect.target1_audio_id || o.expect.target2_audio_id));

/** The revert ops for every row of the plan that had a take. */
function holdOps(plan) {
  const rows = plan.ops.filter((o) => /^(seed|lego|phrase)\.update$/.test(o.op) && hadTake(o));
  const held = new Set(rows.map(rowRef));
  const clipIds = new Set();
  for (const o of rows) for (const s of ['known', 'target1', 'target2']) if (o.expect[`${s}_audio_id`]) clipIds.add(o.expect[`${s}_audio_id`]);
  const ops = [];
  for (const o of plan.ops) {
    if (o.op === 'audio.update' && clipIds.has(o.audio_id)) {
      ops.push({ op: 'audio.update', audio_id: o.audio_id, set: { text: o.expect.text }, expect: { text: o.set.text } });
    }
  }
  for (const o of rows) {
    const set = {}, expect = {};
    for (const c of Object.keys(o.set)) { set[c] = o.expect[c]; expect[c] = o.set[c]; }
    for (const s of ['known', 'target1', 'target2']) expect[`${s}_audio_id`] = o.expect[`${s}_audio_id`] || null;
    const { set: _s, expect: _e, ...key } = o;
    ops.push({ ...key, set, expect });
  }
  // Every slot the row had goes back on it — including clips whose text ALREADY ended in
  // '?' (the apply left those alone, so putting the row's old text back would unlink them).
  const linked = new Set();
  for (const o of plan.ops) if (o.op === 'audio.link' && held.has(rowRef(o))) { ops.push(o); linked.add(`${rowRef(o)}|${o.slot}`); }
  for (const o of rows) {
    const kind = o.op.split('.')[0];
    const target = kind === 'seed' ? { target: 'seed', seed_number: o.seed_number } : kind === 'lego' ? { target: 'lego', lego_id: o.lego_id } : { target: 'phrase', phrase_id: o.phrase_id };
    for (const s of ['known', 'target1', 'target2']) {
      const a = o.expect[`${s}_audio_id`];
      if (a && !linked.has(`${rowRef(o)}|${s}`)) ops.push({ op: 'audio.link', ...target, slot: s, audio_id: a, allow_text_mismatch: true });
    }
  }
  return { ops, rows };
}

module.exports = { holdOps, hadTake };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const course = argv[0];
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  (async () => {
    const plan = JSON.parse(fs.readFileSync(arg('--plan'), 'utf8'));
    const { ops, rows } = holdOps(plan);
    const out = arg('--out');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${course}.hold-plan.json`), JSON.stringify({ rows: rows.length, ops }, null, 1));
    console.log(JSON.stringify({ course, heldRows: rows.length, ops: ops.length }));
    const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }),
    });
    const json = await r.json();
    fs.writeFileSync(path.join(out, `${course}.hold-${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
    if (!json.ok) { console.error('REFUSED', JSON.stringify(json).slice(0, 600)); process.exit(1); }
    const lost = linksKept(json.results);
    console.log(JSON.stringify({ ok: true, applied: json.applied, results: json.results.length, linksLost: lost.length, undo_file: json.undo_file || null }));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
  })().catch((e) => { console.error(e); process.exit(1); });
}

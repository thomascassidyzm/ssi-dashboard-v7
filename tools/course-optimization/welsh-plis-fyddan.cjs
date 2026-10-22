#!/usr/bin/env node
'use strict';
// welsh-plis-fyddan.cjs — Aran's rulings of 2026-10-22 (job #193), applied only through Popty:
//   1. 'byddan nhw'n barod wyt ti'n meddwl?' -> 'fyddan nhw'n barod wyt ti'n meddwl?' (soft mutation
//      after a question-initial verb), on the exact line only.
//   2. 'plîs' -> 'os gwelwch yn dda' in every seed / LEGO / practice phrase of the course
//      (sentence-initial 'Plîs' -> 'Os'). A phrase's decomposition[].target carries the same word, so it moves too.
// The SPOKEN WORDS change, so linked Welsh takes must drop: a plain target_text edit unlinks them by trigger
// (the opposite of welsh-question-marks-rulings.cjs, which re-links). Every op carries `expect` on the old text.
//   node welsh-plis-fyddan.cjs <course> --out <dir> [--only fyddan|plis] [--agent <label>] [--apply]
const fs = require('fs');
const path = require('path');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const PLIS = /plîs/gi;
const OS = 'os gwelwch yn dda';

/** Pure: 'plîs' -> 'os gwelwch yn dda', capital kept at the start of the line. */
function replacePlis(text) {
  return String(text).replace(PLIS, (m, off, s) => {
    const atStart = !s.slice(0, off).replace(/[\s'"’‘“”¿¡-]+/g, '');
    return atStart && m[0] === 'P' ? 'Os gwelwch yn dda' : OS;
  });
}
/** Pure: the exact fyddan line. */
const FYDDAN_OLD = 'byddan nhw’n barod wyt ti’n meddwl?', FYDDAN_NEW = 'fyddan nhw’n barod wyt ti’n meddwl?';

const takes = (o) => ({ t1: o.target1_audio_id || null, t2: o.target2_audio_id || null });
const hasTake = (o) => !!(o.target1_audio_id || o.target2_audio_id);

/** Pure: course data -> { ops, changed } for both rulings. */
function plan(data) {
  const ops = [], changed = [];
  const push = (kind, id, o, newTarget, op, extra = {}) => {
    ops.push({ op, [kind === 'seed' ? 'seed_number' : kind === 'lego' ? 'lego_id' : 'phrase_id']: id,
      set: { target_text: newTarget, ...extra.set }, expect: { target_text: o.target_text, ...extra.expect } });
    changed.push({ kind, id, known: o.known_text, old: o.target_text, new: newTarget, takes: takes(o), presentation: !!o.presentation_audio_id });
  };
  for (const s of data.seeds) {
    if (PLIS.test(s.target_text)) push('seed', s.seed_number, s, replacePlis(s.target_text), 'seed.update');
    PLIS.lastIndex = 0;
    for (const l of s.legos || []) {
      if (PLIS.test(l.target_text)) push('lego', l.lego_id, l, replacePlis(l.target_text), 'lego.update');
      PLIS.lastIndex = 0;
      for (const p of l.basket_phrases || []) {
        const dec = Array.isArray(p.decomposition) ? p.decomposition : null;
        const decHit = dec && dec.some((d) => PLIS.test(d.target || '') || (PLIS.lastIndex = 0));
        PLIS.lastIndex = 0;
        const textHit = PLIS.test(p.target_text); PLIS.lastIndex = 0;
        if (p.target_text === FYDDAN_OLD) { push('phrase', p.id, p, FYDDAN_NEW, 'phrase.update'); continue; }
        if (!textHit) continue;
        const extra = {};
        if (decHit) {
          extra.set = { decomposition: dec.map((d) => ({ ...d, target: replacePlis(d.target || '') })) };
          extra.expect = { decomposition: dec };
        }
        push('phrase', p.id, p, replacePlis(p.target_text), 'phrase.update', extra);
      }
    }
  }
  return { ops, changed };
}

module.exports = { plan, replacePlis, FYDDAN_OLD, FYDDAN_NEW };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const course = argv[0], apply = argv.includes('--apply'), out = arg('--out');
  const agent = arg('--agent') || 'aran-ruling-plis-to-os-gwelwch-yn-dda';
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    let data; // the full read can hit the statement cap while the box is busy: retry, never proceed on an error body
    for (let i = 0; i < 6 && !(data && data.seeds); i++) {
      if (i) await new Promise((r) => setTimeout(r, 8000));
      data = await (await fetch(`${BASE}/api/production/${course}/seeds?status=all`, { headers: { 'x-agent-id': agent } })).json();
    }
    if (!data.seeds) throw new Error(`could not read ${course}: ${JSON.stringify(data).slice(0, 200)}`);
    const p = plan(data);
    // separate batches carry separate x-agent-id labels on the Re-record card
    const only = arg('--only'); // 'fyddan' | 'plis'
    if (only) {
      const keep = p.changed.map((c) => (c.new === FYDDAN_NEW) === (only === 'fyddan'));
      p.ops = p.ops.filter((_, i) => keep[i]); p.changed = p.changed.filter((_, i) => keep[i]);
    }
    fs.writeFileSync(path.join(out, `${course}${only ? '.' + only : ''}.plan.json`), JSON.stringify(p, null, 1));
    console.log(JSON.stringify({ course, ops: p.ops.length, changed: p.changed.length }));
    const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': agent }, body: JSON.stringify({ ops: p.ops, apply }) });
    const json = await r.json();
    fs.writeFileSync(path.join(out, `${course}${only ? '.' + only : ''}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
    console.log(JSON.stringify({ ok: json.ok, applied: json.applied, results: (json.results || []).length, undo_file: json.undo_file || null, error: json.ok ? undefined : JSON.stringify(json).slice(0, 500) }));
  })().catch((e) => { console.error(e); process.exit(1); });
}

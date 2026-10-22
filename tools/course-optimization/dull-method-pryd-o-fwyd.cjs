#!/usr/bin/env node
'use strict';
// dull-method-pryd-o-fwyd.cjs — Aran's rulings of 2026-10-22 (job #230, retry of #203), applied only through Popty:
//   method  : Welsh 'dull' (ddull/nhull) with 'approach' on the known side -> 'method' ('an approach' -> 'a method').
//             Welsh is untouched, so Welsh takes stay linked; the edit only touches known_text (+ decomposition/components known).
//   pryd    : Welsh 'pryd bwyd' -> 'pryd o fwyd' (bryd bwyd -> bryd o fwyd, ...). Spoken words change, so the plain
//             target_text edit unlinks Welsh takes onto the Re-record card. Plurals ('prydau bwyd') are never edited.
// Every op carries `expect` on the old values. Dry run unless --apply.
//   node dull-method-pryd-o-fwyd.cjs <course> --mode method|pryd --out <dir> [--apply]
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const DULL = /(^|[^\p{L}])(d|dd|n)?(dull|hull)(?![\p{L}])/iu;
const PRYD = /(^|[^\p{L}])([pb]|ph|mh)ryd(\s+)(b|f|m)?wyd(?![\p{L}])/giu;

/** Pure: 'an approach' -> 'a method', 'approach' -> 'method' (case kept at the start). */
function toMethod(text) {
  return String(text)
    .replace(/\b(an)(\s+)approach(?![\p{L}])/giu, (m, a) => (a[0] === 'A' ? 'A' : 'a') + ' method')
    .replace(/\bapproach(?![\p{L}])/giu, (m) => (m[0] === 'A' ? 'Method' : 'method'));
}
/** Pure: 'pryd bwyd' -> 'pryd o fwyd' with the mutation the Welsh already shows on 'pryd'. */
function toPrydOFwyd(text) {
  return String(text).replace(PRYD, (m, pre, p) => `${pre}${p}ryd o fwyd`);
}
const hasPlural = (t) => /prydau\s+bwyd/i.test(t || '');

const MODES = {
  method: { fields: ['known_text'], match: (o) => /approach/i.test(o.known_text || '') && DULL.test(o.target_text || ''),
    f: toMethod, dec: 'known', agent: 'aran-ruling-dull-is-method' },
  pryd: { fields: ['target_text'], match: (o) => new RegExp(PRYD.source, 'iu').test(o.target_text || ''),
    f: toPrydOFwyd, dec: 'target', agent: 'aran-ruling-pryd-o-fwyd' },
};

function plan(data, mode) {
  const M = MODES[mode], ops = [], changed = [], skipped = [];
  const push = (kind, id, o, extra) => {
    const set = {}, expect = {};
    for (const k of M.fields) { set[k] = M.f(o[k]); expect[k] = o[k]; }
    const dec = Array.isArray(o.decomposition) ? o.decomposition : null;
    if (dec && dec.some((d) => M.f(d[M.dec] || '') !== (d[M.dec] || ''))) {
      set.decomposition = dec.map((d) => ({ ...d, [M.dec]: M.f(d[M.dec] || '') })); expect.decomposition = dec;
    }
    const comp = Array.isArray(o.components) ? o.components : null;
    if (comp && comp.some((d) => M.f(d[M.dec] || '') !== (d[M.dec] || ''))) {
      set.components = comp.map((d) => ({ ...d, [M.dec]: M.f(d[M.dec] || '') })); expect.components = comp;
    }
    const key = kind === 'seed' ? { seed_number: id } : kind === 'lego' ? { lego_id: id } : { phrase_id: id };
    ops.push({ op: `${kind}.update`, ...key, set, expect });
    changed.push({ kind, id, known: o.known_text, target: o.target_text, set: set[M.fields[0]], hadWelshTake: !!(o.target1_audio_id || o.target2_audio_id), hadKnownTake: !!o.known_audio_id });
  };
  const visit = (kind, id, o) => {
    if (!M.match(o)) return;
    if (mode === 'pryd' && hasPlural(o.target_text)) { skipped.push({ kind, id, target: o.target_text, why: 'plural prydau bwyd' }); return; }
    push(kind, id, o);
  };
  for (const s of data.seeds) {
    visit('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      visit('lego', l.lego_id, l);
      for (const p of l.basket_phrases || []) visit('phrase', p.id, p);
    }
  }
  return { ops, changed, skipped };
}
module.exports = { plan, toMethod, toPrydOFwyd };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const course = argv[0], mode = arg('--mode'), out = arg('--out'), apply = argv.includes('--apply');
  const agent = MODES[mode].agent;
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    let data = arg('--from') ? JSON.parse(fs.readFileSync(arg('--from'), 'utf8')) : null; // --from: a saved /seeds?status=all read (the ops still carry expect, so drift aborts)
    // full read can hit the statement cap on a busy box: retry, never proceed on an error body
    for (let i = 0; i < 6 && !(data && data.seeds); i++) {
      if (i) await new Promise((r) => setTimeout(r, 8000));
      data = await (await fetch(`${BASE}/api/production/${course}/seeds?status=all`, { headers: { 'x-agent-id': agent } })).json();
    }
    if (!data.seeds) throw new Error(`could not read ${course}`);
    const p = plan(data, mode);
    const tag = `${course}.${mode}`;
    fs.writeFileSync(path.join(out, `${tag}.plan.json`), JSON.stringify(p, null, 1));
    console.log(JSON.stringify({ course, mode, seeds: data.seeds.length, ops: p.ops.length, skipped: p.skipped.length }));
    const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': agent }, body: JSON.stringify({ ops: p.ops, apply }) });
    const json = await r.json();
    fs.writeFileSync(path.join(out, `${tag}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
    console.log(JSON.stringify({ ok: json.ok, applied: json.applied, results: (json.results || []).length, undo_file: json.undo_file || null, error: json.ok ? undefined : JSON.stringify(json).slice(0, 500) }));
  })().catch((e) => { console.error(e); process.exit(1); });
}

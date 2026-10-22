#!/usr/bin/env node
'use strict';
// welsh-question-marks-rulings.cjs — applies Aran's rulings on the 'unsure' question-mark review
// page (job #181; items N###/S### from ops/welsh-question-marks-504/unsure-items.json).
//
//   node welsh-question-marks-rulings.cjs --rulings qm-rulings.json --out <dir> [--apply]
//
//   accept → '?' on the Welsh and the English of every row in the item (punctuation only).
//   own    → the row becomes a question with NEW English (the whole known text is replaced), and
//            any linked ENGLISH (known) clip is unlinked (the words changed; it goes to the
//            English booth). The Welsh clips stay linked.
//   HOLD   → a row whose Welsh text would change (gets a '?') and which has ANY linked take is
//            left untouched, as is a component of a held LEGO (job #563's rule, Tom 2026-10-13:
//            a meaning-changing '?' is a distinct recording; Aran has not yet chosen keep/re-record).
// Reads and writes only through Popty (GET …/seeds, POST …/edit-batch; dry run unless --apply).
// Every op carries `expect`, so a row that moved since the read aborts the whole batch.

const fs = require('fs');
const path = require('path');
const { withQuestionMark } = require('./welsh-question-marks.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-181-qm-rulings';
const strip = (t) => String(t || '').replace(/\s*\?\s*$/, '').trim();
const hasTake = (o) => !!(o.known_audio_id || o.target1_audio_id || o.target2_audio_id);
const hasWelshTake = (o) => !!(o.target1_audio_id || o.target2_audio_id);

function find(data, id) {
  const m = id.match(/^(.*)#(\d+)$/);
  const bare = id.replace(/^[a-z_]+:/, '');
  for (const s of data.seeds) {
    if (String(s.seed_number) === id) return { kind: 'seed', row: s };
    for (const l of s.legos || []) {
      if (l.lego_id === id) return { kind: 'lego', row: l };
      if (m && l.lego_id === m[1]) return { kind: 'comp', row: l.components[+m[2]], lego: l, index: +m[2] };
      for (const p of l.basket_phrases || []) if (p.id === id || p.id === bare) return { kind: 'phrase', row: p };
    }
  }
  return null;
}

/** Pure: from the rulings, items and fresh course data → { ops, changed, held, skipped, unlinks }. */
function plan(course, data, items, rulings) {
  const changed = [], held = [], skipped = [], unlinks = [];
  const rowEdits = new Map(); // `${kind}|${id}` → {kind,id,row,known,target}
  const compEdits = new Map(); // lego_id → components copy
  const heldLegos = new Set();
  const want = [];
  for (const it of items.filter((i) => i.course === course)) {
    const accept = rulings.accept.includes(it.id), own = rulings.own[it.id];
    if (!accept && !own) continue;
    const newEnglish = own ? own.match(/English becomes '(.*)'/)[1] : null;
    for (const r of it.rows) want.push({ it, r, accept, newEnglish });
  }
  // rows first, components after (so a held parent LEGO is known)
  for (const pass of ['row', 'comp']) for (const { it, r, accept, newEnglish } of want) {
    const f = find(data, r);
    if (!f) { skipped.push({ item: it.id, row: r, why: 'row not found' }); continue; }
    if ((f.kind === 'comp') !== (pass === 'comp')) continue;
    const o = f.row;
    const known = o.known_text ?? o.known, target = o.target_text ?? o.target;
    if (strip(known) !== strip(it.known) || strip(target) !== strip(it.target)) { skipped.push({ item: it.id, row: r, why: `text moved: ${known} | ${target}` }); continue; }
    const newKnown = newEnglish ? (newEnglish.endsWith('?') ? newEnglish : newEnglish + '?') : withQuestionMark(known);
    const newTarget = withQuestionMark(target);
    const welshChanges = newTarget !== target;
    if (f.kind === 'comp') {
      if (heldLegos.has(f.lego.lego_id)) { held.push({ item: it.id, row: r, kind: 'comp', known, target, why: 'component of a held LEGO' }); continue; }
      if (!compEdits.has(f.lego.lego_id)) compEdits.set(f.lego.lego_id, JSON.parse(JSON.stringify(f.lego.components)));
      const c = compEdits.get(f.lego.lego_id)[f.index];
      c.known = newKnown; c.target = newTarget;
      changed.push({ item: it.id, row: r, kind: 'comp', oldKnown: known, newKnown, oldTarget: target, newTarget });
      continue;
    }
    if (welshChanges && hasWelshTake(o)) {
      held.push({ item: it.id, row: r, kind: f.kind, known, target, why: 'Welsh row has takes', takes: { t1: o.target1_audio_id || null, t2: o.target2_audio_id || null } });
      if (f.kind === 'lego') heldLegos.add(o.lego_id);
      continue;
    }
    const key = `${f.kind}|${r}`;
    rowEdits.set(key, { own: !!newEnglish, kind: f.kind, id: f.kind === 'seed' ? o.seed_number : f.kind === 'lego' ? o.lego_id : o.id, row: o, newKnown, newTarget });
    changed.push({ item: it.id, row: r, kind: f.kind, oldKnown: known, newKnown, oldTarget: target, newTarget });
    if (newEnglish && o.known_audio_id) unlinks.push({ row: r, audio: o.known_audio_id });
  }
  const ops = [], links = [];
  const legoById = new Map();
  for (const s of data.seeds) for (const l of s.legos || []) legoById.set(l.lego_id, l);
  const done = new Set();
  for (const e of rowEdits.values()) {
    const o = e.row, set = {}, expect = {};
    if (e.newKnown !== (o.known_text)) { set.known_text = e.newKnown; expect.known_text = o.known_text; }
    if (e.newTarget !== (o.target_text)) { set.target_text = e.newTarget; expect.target_text = o.target_text; }
    for (const s of ['known', 'target1', 'target2']) expect[`${s}_audio_id`] = o[`${s}_audio_id`] || null;
    if (e.own && o.known_audio_id) set.known_audio_id = null;
    let op, target;
    if (e.kind === 'seed') { op = { op: 'seed.update', seed_number: e.id }; target = { target: 'seed', seed_number: e.id }; }
    else if (e.kind === 'lego') {
      op = { op: 'lego.update', lego_id: e.id }; target = { target: 'lego', lego_id: e.id };
      if (compEdits.has(e.id)) { set.components = compEdits.get(e.id); expect.components = o.components; done.add(e.id); }
    } else { op = { op: 'phrase.update', phrase_id: e.id }; target = { target: 'phrase', phrase_id: e.id }; }
    ops.push({ ...op, set, expect });
    // text trigger drops presentation clips and (via the '?' key) maybe takes: put them straight back
    if (o.presentation_audio_id) links.push({ op: 'audio.link', ...target, slot: 'presentation', audio_id: o.presentation_audio_id });
    for (const s of ['target1', 'target2']) if (o[`${s}_audio_id`]) links.push({ op: 'audio.link', ...target, slot: s, audio_id: o[`${s}_audio_id`], allow_text_mismatch: true });
    if (o.known_audio_id && !set.hasOwnProperty('known_audio_id') && set.known_text) links.push({ op: 'audio.link', ...target, slot: 'known', audio_id: o.known_audio_id, allow_text_mismatch: true });
  }
  for (const [lid, comps] of compEdits) if (!done.has(lid)) ops.push({ op: 'lego.update', lego_id: lid, set: { components: comps }, expect: { components: legoById.get(lid).components } });
  return { ops: [...ops, ...links], changed, held, skipped, unlinks };
}

module.exports = { plan, find };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  (async () => {
    const rulings = JSON.parse(fs.readFileSync(arg('--rulings'), 'utf8'));
    const items = JSON.parse(fs.readFileSync(path.join(__dirname, '../../ops/welsh-question-marks-504/unsure-items.json'), 'utf8'));
    const out = arg('--out'); fs.mkdirSync(out, { recursive: true });
    for (const course of [...new Set(items.filter((i) => rulings.accept.includes(i.id) || rulings.own[i.id]).map((i) => i.course))]) {
      const data = await (await fetch(`${BASE}/api/production/${course}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json(); // fresh read
      const p = plan(course, data, items, rulings);
      fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify(p, null, 1));
      console.log(JSON.stringify({ course, changed: p.changed.length, held: p.held.length, skipped: p.skipped.length, ops: p.ops.length }));
      if (!p.ops.length) continue;
      const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops: p.ops, apply }) });
      const json = await r.json();
      fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
      if (!json.ok) { console.error('REFUSED', JSON.stringify(json).slice(0, 600)); process.exit(1); }
      const { linksKept } = require('./welsh-question-marks-apply.cjs');
      const lost = linksKept(json.results);
      console.log(JSON.stringify({ ok: true, applied: json.applied, results: json.results.length, linksLost: lost.length, undo_file: json.undo_file || null }));
      if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}

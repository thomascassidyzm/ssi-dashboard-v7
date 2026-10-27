#!/usr/bin/env node
'use strict';
// practise-jesd-apply-341.cjs — Aran's two TEXT-ONLY rulings (job #341) for cym_nv2_for_eng / cym_sv2_for_eng:
//   (1) English known side: every VERB use of 'practice' becomes UK 'practise' (practicing → practising, practiced → practised).
//       The noun stays. The census found no noun hits in either course, but anything the verb test cannot place is NOT edited (see unplaced).
//   (2) Welsh target side: 'jyst' → 'jesd', 'Jyst' → 'Jesd'. Same sound, so no re-record.
// Planning and the take-keeping batch (relabel clip text FIRST, then the row; relink for legacy-owned clips; hold on shared clips) are
// welsh-question-marks-apply.cjs's buildOps — see its header. Every write is Popty's edit-batch: dry run unless --apply. No database code.
//
//   node practise-jesd-apply-341.cjs <course> --data <seeds.json> --others <a.json,b.json> --out <dir> [--apply]
const fs = require('fs');
const path = require('path');
const { clipRefs, buildOps, linksKept, probeClips } = require('./welsh-question-marks-apply.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-341-practise-jesd';
const SLOTS = { known: ['known'], target: ['target1', 'target2'] };

const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
const PRACTICE = /\bpractic(e|es|ed|ing)\b/gi;
// Words that make a following 'practice' a noun: "a practice session", "the practice", "in practice", "some practice".
const NOUN_BEFORE = /\b(a|an|the|some|more|much|enough|no|in|his|her|my|our|your|their|this|that|any|good|extra|regular|daily|plenty of|lots of)\s+$/i;
const NOUN_AFTER = /^\s+(session|makes|time|room|book|test|exam|run|match|round)\b/i;

/** New known text, or null when nothing changes. `unplaced` collects 'practice' hits that look like the noun (left alone, listed for Aran). */
function practiseVerbs(text, unplaced) {
  if (typeof text !== 'string') return null;
  let touched = false;
  const out = text.replace(PRACTICE, (m, suf, idx) => {
    const noun = NOUN_BEFORE.test(text.slice(0, idx)) || NOUN_AFTER.test(text.slice(idx + m.length));
    if (noun) { if (unplaced) unplaced.push(text); return m; }
    touched = true;
    return keepCase(m, 'practis' + suf);
  });
  return touched ? out : null;
}
const jesd = (text) => {
  if (typeof text !== 'string' || !/\bjyst\b/i.test(text)) return null;
  return text.replace(/\bjyst\b/gi, (m) => (m === 'JYST' ? 'JESD' : keepCase(m, 'jesd')));
};

/** Every row (seed, LEGO, LEGO component, phrase) of the course that changes, in buildOps' row shape. */
function changesFor(data, unplaced) {
  const out = [];
  const audio = (r) => ({ known: r.known_audio_id || null, target1: r.target1_audio_id || null, target2: r.target2_audio_id || null });
  const push = (kind, id, row, extra = {}) => {
    const nk = practiseVerbs(row.known_text, unplaced), nt = jesd(row.target_text);
    if (nk || nt) out.push({ kind, id, known: row.known_text, target: row.target_text, audio: audio(row), newKnown: nk, newTarget: nt, ...extra });
  };
  for (const s of data.seeds) {
    push('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      push('lego', l.lego_id, l);
      (l.components || []).forEach((c, i) => {
        if (!c || typeof c !== 'object') return;
        const nk = practiseVerbs(c.known, unplaced), nt = jesd(c.target);
        if (nk || nt) out.push({ kind: 'lego_component', id: `${l.lego_id}#${i}`, lego_id: l.lego_id, index: i, known: c.known, target: c.target, audio: {}, newKnown: nk, newTarget: nt });
      });
      for (const p of l.basket_phrases || []) push('phrase', p.id, p);
    }
  }
  return out;
}

async function post(course, body) {
  const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}

module.exports = { practiseVerbs, jesd, changesFor };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const course = argv[0];
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  const out = arg('--out');
  (async () => {
    const data = JSON.parse(fs.readFileSync(arg('--data'), 'utf8'));
    const others = (arg('--others') || '').split(',').filter(Boolean).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    const unplaced = [];
    const chg = changesFor(data, unplaced);
    const ids = new Set();
    for (const c of chg) for (const side of ['known', 'target']) {
      if (!(side === 'known' ? c.newKnown : c.newTarget)) continue;
      for (const slot of SLOTS[side]) if (c.audio[slot]) ids.add(c.audio[slot]);
    }
    const candidates = [course, ...others.map((d) => d.courseCode).filter((c) => c !== course), 'cym_n_for_eng', 'cym_s_for_eng'];
    const { found, unknown } = ids.size ? await probeClips([...ids], candidates) : { found: new Map(), unknown: [] };
    // A clip shared with a row of the OTHER course that this same job changes the same way is not a blocker (buildOps only knows this course's changes).
    const refs = clipRefs([data, ...others]);
    for (const o of others) {
      const slotsOf = (c) => [...(c.newKnown ? ['known'] : []), ...(c.newTarget ? ['target1', 'target2'] : [])];
      const willChange = new Set(changesFor(o, []).filter((c) => c.kind !== 'lego_component').flatMap((c) => slotsOf(c).map((sl) => `${o.courseCode}|${c.kind}|${c.id}|${sl}`)));
      for (const [clip, list] of refs) refs.set(clip, list.filter((r) => !willChange.has(`${r.course}|${r.kind}|${r.id}|${r.slot}`)));
    }
    const plan = buildOps(course, data, chg, found, refs);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify(plan, null, 1));
    console.log(JSON.stringify({ course, changes: chg.length, rows: plan.rowCount, componentLegos: plan.componentLegos, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds.length, unplaced: unplaced.length, unknownClips: unknown, ops: plan.ops.length }));
    const res = await post(course, { ops: plan.ops, apply });
    fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(res.json, null, 1));
    if (!res.json.ok) { console.error('REFUSED', JSON.stringify(res.json).slice(0, 600)); process.exit(1); }
    const lost = linksKept(res.json.results);
    console.log(JSON.stringify({ ok: res.json.ok, applied: res.json.applied, results: res.json.results.length, linksLost: lost.length, undo_file: res.json.undo_file || null }));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
  })().catch((e) => { console.error(e); process.exit(1); });
}

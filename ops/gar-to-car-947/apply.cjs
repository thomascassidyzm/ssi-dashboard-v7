#!/usr/bin/env node
'use strict';
// Job #947 (Aran 2026-10-23): standalone 'gar …' -> 'car …' in cym_nv2/sv2. Standalone LEGOs,
// components and bare-component phrases are unmutated; 'dy gar', 'yn gar', 'clywes i gar' etc. stay.
// Aran said it correctly on the take, so no re-record: reuses the #504 RELABEL/RELINK planner
// (relabel clip text first, then the row, take links verified kept). Dry run unless --apply.
const fs = require('fs');
const path = require('path');
const { buildOps, clipRefs, probeClips, linksKept } = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-947';
const apply = process.argv.includes('--apply');
const DATA = process.env.HOME + '/.tmpbig/gar947';
const out = __dirname;
const C = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];

// Every change, by course. kind: lego | lego_component | phrase.
const WANT = {
  cym_nv2_for_eng: {
    lego: ['S1561L03'], component: [['S1121L03', 1], ['S1561L03', 0]],
    phrase: ['cym_nv2_for_eng:S1561L03B04', 'cym_nv2_for_eng:S1561L03C01', 'cym_nv2_for_eng:S1121L03C02'],
  },
  cym_sv2_for_eng: { lego: [], component: [['S1561L02', 1]], phrase: ['cym_sv2_for_eng:S1561L02C02'] },
};
const car = (t) => t.replace(/(^|[^\p{L}])gar(?=[^\p{L}]|$)/gu, '$1car');
const audio = (r) => ({ known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id });

async function post(course, body) {
  const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) });
  return r.json();
}

(async () => {
  const datas = C.map((c) => JSON.parse(fs.readFileSync(`${DATA}/${c}.json`, 'utf8')));
  for (const [i, course] of C.entries()) {
    const data = datas[i], w = WANT[course];
    const legos = new Map(), phrases = new Map();
    for (const s of data.seeds) for (const l of s.legos) { legos.set(l.lego_id, l); for (const p of l.basket_phrases || []) phrases.set(p.id, p); }
    const chg = [];
    for (const id of w.lego) { const l = legos.get(id); chg.push({ kind: 'lego', id, known: l.known_text, target: l.target_text, newKnown: null, newTarget: car(l.target_text), audio: audio(l) }); }
    for (const [id, idx] of w.component) { const k = legos.get(id).components[idx]; chg.push({ kind: 'lego_component', lego_id: id, index: idx, newTarget: car(k.target), old: k.target }); }
    for (const id of w.phrase) { const p = phrases.get(id); chg.push({ kind: 'phrase', id, known: p.known_text, target: p.target_text, newKnown: null, newTarget: car(p.target_text), audio: audio(p) }); }
    // the LEGO's own components fold into its op: S1561L03 component 0 is part of the LEGO row edit
    const ids = new Set();
    for (const c of chg) if (c.kind !== 'lego_component') for (const s of ['target1', 'target2']) if (c.audio[s]) ids.add(c.audio[s]);
    const { found, unknown } = ids.size ? await probeClips([...ids], [course]) : { found: new Map(), unknown: [] };
    if (unknown.length) throw new Error(`${course}: clips not in course: ${unknown}`);
    const plan = buildOps(course, data, chg, found, clipRefs([data]));
    fs.writeFileSync(`${out}/${course}.plan.json`, JSON.stringify({ chg, plan, clips: [...found.values()] }, null, 1));
    console.log(course, JSON.stringify({ rows: plan.rowCount, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds }), 'ops', plan.ops.length);
    const res = await post(course, { ops: plan.ops, apply });
    fs.writeFileSync(`${out}/${course}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(res, null, 1));
    if (!res.ok) { console.error('REFUSED', JSON.stringify(res).slice(0, 800)); process.exit(1); }
    const lost = linksKept(res.results);
    console.log(JSON.stringify({ ok: res.ok, applied: res.applied, linksLost: lost.length, undo_file: res.undo_file || null }));
    for (const x of res.results) console.log(' ', x.op, JSON.stringify(x.key), JSON.stringify((x.before||{}).target_text ?? (x.before||{}).text), '->', JSON.stringify((x.after||{}).target_text ?? (x.after||{}).text));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost)); process.exit(2); }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

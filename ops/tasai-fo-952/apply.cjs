#!/usr/bin/env node
'use strict';
// Job #952 (Aran 2026-10-23): whole-word 'tasai o' -> 'tasai fo' (also "tasai o'n") in cym_nv2/sv2_for_eng.
// Text-only: takes stay (no re-record). Reuses the #504 RELABEL/RELINK planner as #947 did:
// clip text relabelled first, then the row, link-kept check. Dry run unless --apply.
const fs = require('fs');
const { buildOps, clipRefs, probeClips, linksKept } = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-952';
const apply = process.argv.includes('--apply');
const out = __dirname;
const C = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const RX = /(^|[^\p{L}])(tasai\s+)([oO])(?![\p{L}])/u;
const fix = (t) => t.replace(/(^|[^\p{L}])(tasai\s+)o(?![\p{L}])/giu, '$1$2fo').replace(/(^|[^\p{L}])(tasai\s+)O(?![\p{L}])/gu, '$1$2Fo');
const audio = (r) => ({ known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id });
const get = async (c) => (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
const post = async (c, body) => (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) })).json();

(async () => {
  for (const course of C) {
    const data = await get(course);
    const chg = [], decomp = new Map();
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) chg.push({ kind: 'seed', id: s.seed_number, known: s.known_text, target: s.target_text, newKnown: null, newTarget: fix(s.target_text), audio: audio(s) });
      for (const l of s.legos) {
        if (l.is_new && RX.test(l.target_text)) chg.push({ kind: 'lego', id: l.lego_id, known: l.known_text, target: l.target_text, newKnown: null, newTarget: fix(l.target_text), audio: audio(l) });
        (l.components || []).forEach((k, i) => { if (l.is_new && RX.test(k.target)) chg.push({ kind: 'lego_component', lego_id: l.lego_id, index: i, newTarget: fix(k.target), old: k.target }); });
        for (const p of l.basket_phrases || []) if (RX.test(p.target_text)) {
          chg.push({ kind: 'phrase', id: p.id, known: p.known_text, target: p.target_text, newKnown: null, newTarget: fix(p.target_text), audio: audio(p) });
          decomp.set(p.id, p.decomposition);
        }
      }
    }
    console.log(course, 'rows to change', chg.length);
    if (!chg.length) continue;
    const ids = new Set();
    for (const c of chg) if (c.kind !== 'lego_component') for (const s of ['target1', 'target2']) if (c.audio[s]) ids.add(c.audio[s]);
    const { found, unknown } = ids.size ? await probeClips([...ids], [course]) : { found: new Map(), unknown: [] };
    if (unknown.length) throw new Error(`${course}: clips not in course: ${unknown}`);
    const plan = buildOps(course, data, chg, found, clipRefs([data]));
    // phrase decomposition segments carry the words too ("tasai", " o"): fix them in the same op
    for (const op of plan.ops) if (op.op === 'phrase.update' && decomp.has(op.phrase_id)) {
      const dec = decomp.get(op.phrase_id) || [];
      const segs = dec.map((x) => x.target || '');
      const joined = segs.join('');
      if (!RX.test(joined)) continue;
      const nd = JSON.parse(JSON.stringify(dec));
      nd.forEach((x, i) => {
        if (x.target) x.target = fix(x.target);
        if (i && /^\s*[oO]$/.test(nd[i].target || '') && /tasai\s*$/i.test(nd[i - 1].target || '')) x.target = x.target.replace(/o/, 'fo').replace(/O/, 'Fo');
      });
      if (nd.map((x) => x.target).join('') !== fix(joined)) throw new Error('decomposition rebuild mismatch ' + op.phrase_id);
      op.set.decomposition = nd; op.expect.decomposition = dec;
    }
    fs.writeFileSync(`${out}/${course}.plan.json`, JSON.stringify({ chg, plan, clips: [...found.values()] }, null, 1));
    console.log(course, JSON.stringify({ rows: plan.rowCount, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds }), 'ops', plan.ops.length);
    if (plan.holds.length) { console.error('HOLDS — stopping'); process.exit(3); }
    const res = await post(course, { ops: plan.ops, apply });
    fs.writeFileSync(`${out}/${course}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(res, null, 1));
    if (!res.ok) { console.error('REFUSED', JSON.stringify(res).slice(0, 800)); process.exit(1); }
    const lost = linksKept(res.results);
    console.log(JSON.stringify({ ok: res.ok, applied: res.applied, linksLost: lost.length, undo_file: res.undo_file || null }));
    for (const x of res.results) console.log(' ', x.op, JSON.stringify(x.key), JSON.stringify((x.before || {}).target_text ?? (x.before || {}).text), '->', JSON.stringify((x.after || {}).target_text ?? (x.after || {}).text));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost)); process.exit(2); }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #942): Welsh 'miwsig' -> 'cerddoriaeth' in cym_nv2_for_eng (cym_sv2 census found none).
// Takes stay: reuses welsh-question-marks-apply's buildOps (relabel clip text FIRST, then the row; presentation clip re-linked).
// Every hit is the bare noun after a verb/preposition (no article, no adjective), so no mutation follows. Dry run unless --apply.
const fs = require('fs');
const path = require('path');
const { buildOps, clipRefs, probeClips, linksKept } = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-942-miwsig';
const course = 'cym_nv2_for_eng';
const RX = /miwsig/;
const fix = (t) => t.replace(/miwsig/g, 'cerddoriaeth');
const out = process.argv[2]; const apply = process.argv.includes('--apply');
(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(out, `${course}.seeds.json`), 'utf8'));
  data.courseCode = data.courseCode || course;
  const chg = [];
  for (const s of data.seeds) {
    if (RX.test(s.target_text)) chg.push({ kind: 'seed', id: s.seed_number, known: s.known_text, target: s.target_text, newTarget: fix(s.target_text), audio: { known: s.known_audio_id, target1: s.target1_audio_id, target2: s.target2_audio_id } });
    for (const l of s.legos) {
      if (RX.test(l.target_text)) chg.push({ kind: 'lego', id: l.lego_id, known: l.known_text, target: l.target_text, newTarget: fix(l.target_text), audio: { known: l.known_audio_id, target1: l.target1_audio_id, target2: l.target2_audio_id } });
      (l.components || []).forEach((k, i) => { if (RX.test(k.target)) chg.push({ kind: 'lego_component', lego_id: l.lego_id, index: i, newTarget: fix(k.target) }); });
      for (const p of l.basket_phrases || []) if (RX.test(p.target_text)) chg.push({ kind: 'phrase', id: p.id, known: p.known_text, target: p.target_text, newTarget: fix(p.target_text), audio: { known: p.known_audio_id, target1: p.target1_audio_id, target2: p.target2_audio_id } });
    }
  }
  const ids = new Set(); for (const c of chg) if (c.audio) for (const k of ['target1', 'target2']) if (c.audio[k]) ids.add(c.audio[k]);
  const { found, unknown } = await probeClips([...ids], [course, 'cym_sv2_for_eng', 'cym_n_for_eng', 'cym_s_for_eng']);
  const plan = buildOps(course, data, chg, found, clipRefs([data]));
  // phrase decompositions carry the word too: fold in
  for (const op of plan.ops) if (op.op === 'phrase.update') {
    const p = data.seeds.flatMap((s) => s.legos).flatMap((l) => l.basket_phrases || []).find((x) => x.id === op.phrase_id);
    const dec = (p.decomposition || []).map((g) => (g.target && RX.test(g.target) ? { ...g, target: fix(g.target) } : g));
    if (JSON.stringify(dec) !== JSON.stringify(p.decomposition)) { op.set.decomposition = dec; op.expect.decomposition = p.decomposition; }
  }
  fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify({ chg, plan, unknown }, null, 1));
  console.log(JSON.stringify({ changes: chg.length, rows: plan.rowCount, comps: plan.componentLegos, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds, unknown, ops: plan.ops.length }));
  const r = await (await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops: plan.ops, apply }) })).json();
  fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(r, null, 1));
  if (!r.ok) { console.error('REFUSED', JSON.stringify(r).slice(0, 800)); process.exit(1); }
  console.log(JSON.stringify({ ok: r.ok, applied: r.applied, results: r.results.length, linksLost: linksKept(r.results).length, undo: r.undo_file || null }));
})().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
'use strict';
// answer-tag-qmark-197 — Aran's ruling 2026-10-22: in "question? answer?" rows the answer half is a
// statement, so its trailing '?' goes. TEXT-ONLY, KEEP TAKES: reuses welsh-question-marks-apply's
// relabel/relink planner. Reads GET …/seeds, writes only via POST …/edit-batch (dry run unless --apply).
//   node apply.cjs <course> <other-course> <seeds.json> <other-seeds.json> <out-dir> [--apply]
const fs = require('fs');
const path = require('path');
const A = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-ruling-english-statement-no-qmark';
const segs = (s) => String(s || '').trim().split(/(?<=\?)\s+/);
// Answer halves that read as statements without doubt. Anything else is listed for Aran, not edited.
// Aran 2026-10-22: clearly declarative English known text takes no '?'. English side ONLY (newTarget stays null).
// The list was picked by reading every '?' row in both courses; ids are phrase ids as stored.
const EXPLICIT = new Set(['cym_nv2_for_eng:S0216L01B07', 'cym_sv2_for_eng:S0050L01B02', 'cym_sv2_for_eng:S0228L01B07', 'cym_sv2_for_eng:S1373L01U04']);
function dropLast(t) { const s = segs(t); s[s.length - 1] = s[s.length - 1].replace(/\s*\?\s*$/, ''); return s.join(' '); }
function candidates(course, data) {
  const out = [];
  for (const s of data.seeds) for (const l of s.legos || []) for (const p of l.basket_phrases || []) {
    if (!EXPLICIT.has(String(p.id))) continue;
    out.push({ kind: 'phrase', id: p.id, known: p.known_text, target: p.target_text, newKnown: dropLast(p.known_text), newTarget: null,
      audio: { known: p.known_audio_id || null, target1: p.target1_audio_id || null, target2: p.target2_audio_id || null } });
  }
  return { out, skipped: [] };
}
async function post(course, body) {
  const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) });
  return r.json();
}
(async () => {
  const [course, other, f1, f2, out] = process.argv.slice(2);
  const apply = process.argv.includes('--apply');
  const data = JSON.parse(fs.readFileSync(f1, 'utf8')), od = JSON.parse(fs.readFileSync(f2, 'utf8'));
  const { out: chg, skipped } = candidates(course, data);
  // the planner reads row ids as stored: phrases carry the "<course>:" prefix in `id`
  const ids = new Set();
  for (const c of chg) for (const [side, slots] of [['newKnown', ['known']], ['newTarget', ['target1', 'target2']]]) if (c[side]) for (const s of slots) if (c.audio[s]) ids.add(c.audio[s]);
  const cands = [course, other, 'cym_n_for_eng', 'cym_s_for_eng', 'cym_for_eng', 'cym_nv1_for_eng', 'cym_sv1_for_eng'];
  const { found, unknown } = ids.size ? await A.probeClips([...ids], [...new Set(cands)]) : { found: new Map(), unknown: [] };
  const plan = A.buildOps(course, data, chg, found, A.clipRefs([data, od]));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify({ chg, plan, skipped, unknown }, null, 1));
  console.log(JSON.stringify({ course, rows: chg.length, planRows: plan.rowCount, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds, skippedOtherJob: skipped, unknown, ops: plan.ops.length }));
  const res = await post(course, { ops: plan.ops, apply });
  fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(res, null, 1));
  if (!res.ok) { console.error('REFUSED', JSON.stringify(res).slice(0, 800)); process.exit(1); }
  const lost = A.linksKept(res.results);
  console.log(JSON.stringify({ ok: res.ok, applied: res.applied, linksLost: lost.length, lost: lost.slice(0, 5), undo_file: res.undo_file || null }));
})().catch((e) => { console.error(e); process.exit(1); });

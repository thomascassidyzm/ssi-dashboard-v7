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
const AGENT = 'aran-ruling-answer-not-question';
const segs = (s) => String(s || '').trim().split(/(?<=\?)\s+/);
// Answer halves that read as statements without doubt. Anything else is listed for Aran, not edited.
const Q = /^(are|is|do|does|did|can|could|would|should|shall|will|have|has|had|was|were|what|why|how|where|when|who|which)\b/i;
const S = /^(i\b|i[’']|it[’']?s?\b|that[’']?s?\b|she\b|he\b|we\b|they\b|you[’']re|you can|yes\b|thank|because|no thank|no i\b|the dog)/i;
const AMBIGUOUS_ROWS = new Set(['cym_sv2_for_eng:S1373L01U04']); // Welsh half is an interrogative form (oedd e'n brydferth?)
const OTHER_JOB = /plîs|byddan/i; // job #193 owns these
function dropLast(t) { const s = segs(t); s[s.length - 1] = s[s.length - 1].replace(/\s*\?\s*$/, ''); return s.join(' '); }
function candidates(course, data) {
  const out = [], skipped = [];
  const add = (kind, id, r) => {
    const k = segs(r.known_text), t = segs(r.target_text);
    if (k.length < 2 || !/\?$/.test(k[k.length - 1])) return;
    const last = k[k.length - 1].replace(/\?$/, '').trim();
    if (Q.test(last) || !S.test(last)) return;
    if (AMBIGUOUS_ROWS.has(`${course}:${id}`)) return;
    if (OTHER_JOB.test(r.target_text) || OTHER_JOB.test(r.known_text)) { skipped.push(id); return; }
    const wel = t.length === k.length && /\?$/.test(t[t.length - 1]);
    out.push({ kind, id, known: r.known_text, target: r.target_text, newKnown: dropLast(r.known_text),
      newTarget: wel ? dropLast(r.target_text) : null,
      audio: { known: r.known_audio_id || null, target1: r.target1_audio_id || null, target2: r.target2_audio_id || null } });
  };
  for (const s of data.seeds) { add('seed', s.seed_number, s); for (const l of s.legos || []) { add('lego', l.lego_id, l); for (const p of l.basket_phrases || []) add('phrase', p.id, p); } }
  return { out, skipped };
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

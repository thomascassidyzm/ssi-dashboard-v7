#!/usr/bin/env node
'use strict';
// Job #622: capitalise the first letter of each lowercase English SEED line of cym_n_for_eng (Aran, 2026-10-29).
//   node apply.cjs <dir-with-seed-json> <outdir> [--limit N] [--only 11,12] [--apply]
// Reuses the question-marks tool's clip logic (relabel own clips first, relink foreign clips, hold shared-with-unchanged).
// Only the first character changes. All writes are Popty's edit-batch.
const fs = require('fs'), path = require('path');
const T = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
const COURSE = 'cym_n_for_eng', BASE = process.env.POPTY_URL || 'http://localhost:3470';
const argv = process.argv.slice(2), arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const [dir, out] = argv;
const load = (c) => JSON.parse(fs.readFileSync(path.join(dir, `${c}.json`), 'utf8'));
const data = { courseCode: COURSE, seeds: load(COURSE).seeds };
const others = ['cym_s_for_eng', 'cym_nv2_for_eng', 'cym_sv2_for_eng'].map((c) => ({ courseCode: c, seeds: load(c).seeds }));
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
let rows = data.seeds.filter((s) => /^\p{Ll}/u.test(s.known_text || '') && /^[a-z]+(['’][a-z]+)?[,.;:!?]?$/i.test(s.known_text.split(/\s+/)[0]));
if (arg('--only')) { const o = new Set(arg('--only').split(',').map(Number)); rows = rows.filter((s) => o.has(s.seed_number)); }
if (arg('--limit')) rows = rows.slice(0, +arg('--limit'));
const chg = rows.map((s) => {
  const nk = capFirst(s.known_text);
  if (nk.slice(1) !== s.known_text.slice(1)) throw new Error('more than first char changed');
  return { id: s.seed_number, kind: 'seed', known: s.known_text, target: s.target_text, newKnown: nk, newTarget: null,
    audio: { known: s.known_audio_id, target1: s.target1_audio_id, target2: s.target2_audio_id } };
});
// One dry-run audio.update per clip per candidate course, 8 at a time (the batch probe retried one NOT_FOUND per round trip: ~2s each).
async function probe(ids, courses) {
  const found = new Map(); let left = ids;
  for (const course of courses) {
    const miss = []; let i = 0;
    await Promise.all(Array.from({ length: 8 }, async () => { while (i < left.length) {
      const id = left[i++];
      const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': 'aran-watson-622-cym-n-capitalise' }, body: JSON.stringify({ ops: [{ op: 'audio.update', audio_id: id, set: { text: '__probe__' } }] }) });
      const j = await r.json();
      if (j.ok) found.set(id, j.results[0].before); else if (j.code === 'NOT_FOUND') miss.push(id); else throw new Error(JSON.stringify(j).slice(0, 300));
    } }));
    left = miss;
  }
  return { found, unknown: left };
}
(async () => {
  const ids = chg.map((c) => c.audio.known).filter(Boolean);
  const { found, unknown } = await probe([...new Set(ids)], [COURSE, ...others.map((o) => o.courseCode)]);
  const plan = T.buildOps(COURSE, data, chg, found, T.clipRefs([data, ...others]));
  // Rows the tool HOLDs because their clip is shared with an unchanged row (another course, or a LEGO/phrase): the clip's own text is left
  // alone (it is theirs too, and the match key is case-blind anyway); the seed is edited and the SAME clip is linked straight back.
  for (const h of plan.holds) {
    const c = chg.find((x) => x.id === h.id);
    plan.ops.push({ op: 'seed.update', seed_number: c.id, set: { known_text: c.newKnown }, expect: { known_text: c.known, known_audio_id: c.audio.known, target1_audio_id: c.audio.target1 || null, target2_audio_id: c.audio.target2 || null } });
    plan.ops.push({ op: 'audio.link', target: 'seed', seed_number: c.id, slot: 'known', audio_id: c.audio.known, allow_text_mismatch: true });
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(plan, null, 1));
  console.log(JSON.stringify({ changes: chg.length, rows: plan.rowCount, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds.length, unknownClips: unknown, ops: plan.ops.length }));
  const apply = argv.includes('--apply');
  const r = await fetch(`${BASE}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': 'aran-watson-622-cym-n-capitalise' }, body: JSON.stringify({ ops: plan.ops, apply }) });
  const j = await r.json();
  fs.writeFileSync(path.join(out, apply ? 'applied.json' : 'dryrun.json'), JSON.stringify(j, null, 1));
  if (!j.ok) { console.error('REFUSED', JSON.stringify(j).slice(0, 800)); process.exit(1); }
  const lost = T.linksKept(j.results);
  console.log(JSON.stringify({ ok: j.ok, applied: j.applied, results: j.results.length, linksLost: lost.length, undo_file: j.undo_file || null }));
  if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
})().catch((e) => { console.error(e); process.exit(1); });

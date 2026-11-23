#!/usr/bin/env node
// cs #791·AK (overnight #785·AK item 8): how many rows that paid-cleanup ITEM 12 inserted (seed sentence added as a
// practice phrase; #957·AI night changesets, #964·AI seed fixes, #976·AI follow-up) duplicate a phrase the course
// already has. Reads JSON only, never a database: the course snapshot written by the committed
// tools/paid-cleanup-717/snapshot.cjs (run on the nightly QA copy) and the committed item-12 op files.
// "The same row" is the item-12 kit's own key (ops/paid-cleanup-717/tools/lib.cjs load().key = ZUT-normalised known |
// target, punctuation-only differences ignored), so this census and item 18's recount agree on what a duplicate is.
//   same_basket   : an item-12 row whose key another row in the SAME LEGO basket already has
//   same_target   : same basket, different known but the same target (a learner hears the target twice)
//   cross_basket  : the key exists in another basket of the course (played rows: build/use under a NEW LEGO) — and
//                   not in its own basket
//   with_seed_lego: the key equals a LEGO pair of the course (the seed is one whole LEGO) — reported, not a row dup
//   clean         : none of the above
// usage: P717_SNAP=<snap dir> node dup12.cjs <out dir> [course …]
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../../paid-cleanup-717/tools/lib.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const [outDir, ...rest] = process.argv.slice(2);
if (!outDir) { console.error('usage: P717_SNAP=<dir> node dup12.cjs <outDir> [course…]'); process.exit(2); }
const courses = rest.length ? rest : L.COURSES;
const I12 = path.join(ROOT, 'ops/paid-cleanup-717');

// Every phrase id item 12 inserted, with the file that inserted it.
function item12Ids(course) {
  const ids = new Map();
  const add = (o, src) => { if (o.op === 'phrase.insert' && o.row && o.row.id && o.row.seed_number != null) ids.set(L.short(o.row.id) || o.row.id, src); };
  const cs = path.join(I12, 'item12', course, 'item12.changeset.jsonl');
  if (fs.existsSync(cs)) fs.readFileSync(cs, 'utf8').split('\n').slice(1).filter(Boolean).forEach((l) => add(JSON.parse(l), '#957 changeset'));
  for (const [dir, tag] of [['item12-seed-fixes/batches', '#964 seed fix'], ['item12-followup-976/batches', '#976 follow-up'], ['item12-followup-976/batches-v2', '#976 follow-up v2']]) {
    const d = path.join(I12, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((f) => f.startsWith(course + '.') && f.endsWith('.json') && !/\.dry\.|HELD/.test(f))) {
      const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
      (j.ops || []).forEach((o) => add(o, tag));
    }
  }
  return ids;
}

fs.mkdirSync(outDir, { recursive: true });
const tot = { planned_inserts: 0, on_copy: 0, same_basket: 0, same_target: 0, cross_basket: 0, with_seed_lego: 0, clean: 0 };
const table = [];
for (const course of courses) {
  const ids = item12Ids(course);
  const C = L.load(course);
  const rowsById = new Map();
  for (const l of C.legos) for (const p of l.rows) rowsById.set(p.sid, [p, l]);
  // course-wide index of played rows by key (excluding the row itself when compared)
  const byKey = new Map();
  for (const l of C.legos) for (const p of l.rows) if (C.played(p, l)) { const k = C.key(p.known_text, p.target_text); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(p.sid); }
  const legoKeys = new Map(C.legos.map((l) => [C.key(l.known_text, l.target_text), l.lego_id]));
  const out = { course, db: C.db, planned_inserts: ids.size, on_copy: 0, same_basket: [], same_target: [], cross_basket: [], with_seed_lego: [], clean: 0, missing: [] };
  for (const [sid, src] of ids) {
    const hit = rowsById.get(sid);
    if (!hit) { out.missing.push(sid); continue; }
    out.on_copy++;
    const [p, l] = hit;
    const k = C.key(p.known_text, p.target_text);
    const twin = l.rows.find((q) => q.sid !== sid && (q.phrase_role === 'build' || q.phrase_role === 'use') && C.key(q.known_text, q.target_text) === k);
    const tTwin = !twin && l.rows.find((q) => q.sid !== sid && (q.phrase_role === 'build' || q.phrase_role === 'use') && C.zt(q.target_text) === C.zt(p.target_text));
    const elsewhere = (byKey.get(k) || []).filter((x) => x !== sid && x.slice(0, 8) !== l.lego_id);
    const rec = { id: sid, src, known: p.known_text, target: p.target_text };
    let dup = false;
    if (twin) { out.same_basket.push({ ...rec, twin: twin.sid, twin_is_item12: ids.has(twin.sid) }); dup = true; }
    else if (tTwin) { out.same_target.push({ ...rec, twin: tTwin.sid, twin_known: tTwin.known_text }); dup = true; }
    if (!twin && elsewhere.length) { out.cross_basket.push({ ...rec, first: elsewhere[0], n: elsewhere.length, others_item12: elsewhere.filter((x) => ids.has(x)).length }); dup = true; }
    if (legoKeys.has(k)) out.with_seed_lego.push({ ...rec, lego: legoKeys.get(k) });
    if (!dup) out.clean++;
  }
  fs.writeFileSync(path.join(outDir, `${course}.json`), JSON.stringify(out, null, 1));
  const n = { planned_inserts: out.planned_inserts, on_copy: out.on_copy, same_basket: out.same_basket.length, same_target: out.same_target.length,
    cross_basket: out.cross_basket.length, with_seed_lego: out.with_seed_lego.length, clean: out.clean };
  for (const [k2, v] of Object.entries(n)) tot[k2] += v;
  table.push({ course, ...n });
}
fs.writeFileSync(path.join(outDir, 'SUMMARY.json'), JSON.stringify({ copy: table.length ? JSON.parse(fs.readFileSync(path.join(outDir, `${table[0].course}.json`))).db : null, total: tot, courses: table }, null, 1));
const cols = ['planned_inserts', 'on_copy', 'same_basket', 'same_target', 'cross_basket', 'with_seed_lego', 'clean'];
console.log(['course', ...cols].join('\t'));
for (const r of table) console.log([r.course, ...cols.map((c) => r[c])].join('\t'));
console.log(['TOTAL', ...cols.map((c) => tot[c])].join('\t'));

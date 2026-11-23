#!/usr/bin/env node
// Recount items 12/14/15/16/18 over the QA-copy snapshots (cs #717·AI). Read-only; writes recount JSON.
//   node recount.cjs [course…]  → ops/paid-cleanup-717/recount/<course>.json + a summary line per course
// Definitions are the #447 detector's (ops/paid-cleanup-scan-447/detect.cjs on cs/482), restated here so the
// recount and the planners read one snapshot shape: played = build/use row under an is_new LEGO (canon P25).
'use strict';
const path = require('path');
const L = require('./lib.cjs');
const QM = /[?？؟]\s*$/;
const courses = process.argv.slice(2).length ? process.argv.slice(2) : L.COURSES;
const scan = L.rd(path.join(L.ITEM_DIR, 'scan-rows-447-real.json'));
const tot = {};
for (const course of courses) {
  const C = L.load(course);
  const out = { course, db: C.db, item12: [], item14: [], item15: [], item16: [], item18_same: [], item18_cross: [] };
  const playedRows = [];
  for (const l of C.legos) for (const p of l.rows) if (C.played(p, l)) playedRows.push([p, l]);
  // 12 — seed sentence not a played row anywhere.
  const playedKeys = new Set(playedRows.map(([p]) => C.key(p.known_text, p.target_text)));
  for (const s of C.seeds.values()) if (!playedKeys.has(C.key(s.known_text, s.target_text))) out.item12.push(s.seed_number);
  // 14 — question mark on one side only, played rows.
  for (const [p] of playedRows) if (QM.test(String(p.known_text || '').trim()) !== QM.test(String(p.target_text || '').trim())) out.item14.push(p.sid);
  // 15 — scan's formal rows whose LEGO/row text is unchanged since 17 Nov.
  for (const r of scan.filter((r) => r.fam === 'FORMAL' && r.course === course)) {
    const id = String(r.row);
    const cur = /^S\d{4}L\d{2}$/.test(id) ? C.byLego.get(id) : (C.byLego.get(id.slice(0, 8)) || { rows: [] }).rows.find((p) => p.sid === id);
    if (cur && cur.known_text === r.known) out.item15.push(id);
  }
  // 16 — a LEGO pair taught NEW twice, or not-new and never taught before.
  const first = new Map();
  for (const l of C.legos) {
    const k = C.key(l.known_text, l.target_text); const f = first.get(k);
    if (l.is_new === false && !f) out.item16.push({ id: l.lego_id, kind: 'notnew_untaught' });
    if (l.is_new === true && f) out.item16.push({ id: l.lego_id, kind: 'dup_debut', earlier: f });
    if (!f) first.set(k, l.lego_id);
  }
  // 18 — same pair twice: in one basket; across baskets (played rows only).
  const seenCourse = new Map();
  for (const l of C.legos) {
    if (!l.is_new) continue;
    const seen = new Map();
    for (const p of l.rows) {
      if (!C.played(p, l)) continue;
      const k = C.key(p.known_text, p.target_text);
      if (seen.has(k)) { out.item18_same.push({ id: p.sid, twin: seen.get(k) }); continue; }
      seen.set(k, p.sid);
      if (seenCourse.has(k)) out.item18_cross.push({ id: p.sid, first: seenCourse.get(k) }); else seenCourse.set(k, p.sid);
    }
  }
  // cs #791·AK: P717_RECOUNT_OUT writes elsewhere (the 19 Nov recount/ stays as committed).
  L.wr(path.join(process.env.P717_RECOUNT_OUT || path.join(L.ITEM_DIR, 'recount'), `${course}.json`), out);
  const n = { i12: out.item12.length, i14: out.item14.length, i15: out.item15.length, i16: out.item16.length, i18s: out.item18_same.length, i18x: out.item18_cross.length };
  for (const [k, v] of Object.entries(n)) tot[k] = (tot[k] || 0) + v;
  console.log(course.padEnd(16), JSON.stringify(n));
}
console.log('TOTAL', JSON.stringify(tot));

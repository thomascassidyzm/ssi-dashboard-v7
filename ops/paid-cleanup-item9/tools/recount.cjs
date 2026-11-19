#!/usr/bin/env node
// Live recount of item 9 ("word used before it is taught", canon P1/K8) for cs #713·AI.
// Reads ONLY the JSON fetch.sh pulled from Popty (no DB code) and the 17 Nov scan rows.
// Tokeniser is the scan's own (ops/paid-cleanup-scan-447/combined/untaught.cjs on cs/482); the
// taught set is stricter than that detector's on one point, which is the canon's (P2, ralph
// "Vocabulary Constraints"): a word counts as taught only from an earlier seed's LEGO,
// or an earlier-or-same-index LEGO of the row's own seed — never a later sibling.
// usage: node recount.cjs <out.json> <course…>
// Each scan row gets a status:
//   gone     — row no longer in the live course (deleted by another job): dropped
//   changed  — words differ from the 17 Nov scan (another job rewrote it): dropped, re-read if it still flags
//   seedcov  — every untaught word is in the row's OWN seed sentence (S3/L27 gap: rebuild the seed's split)
//   earlier  — every untaught word is in an EARLIER seed sentence, never in a LEGO (that seed has the S3 gap)
//   other    — untaught word in no seed sentence by then: delete USE / reword BUILD (K14/K15)
//   silent   — the token check finds nothing (the scan judged a FORM, e.g. a conjugation): read by hand
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [outFile, ...courses] = process.argv.slice(2);
const toks = (t) => (String(t || '').toLowerCase().normalize('NFC').replace(/[ً-ْ]/g, '').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu) || []).map(w => w.replace(/’/g, "'"));
const scanAll = JSON.parse(fs.readFileSync(path.join(L.ITEM_DIR, 'scan-rows-2026-11-17.json'), 'utf8'));
const out = { at: new Date().toISOString(), courses: {} };
for (const course of courses) {
  if (L.isChinese(course)) { out.courses[course] = { note: 'spaceless target: token recount not possible, read by hand' }; }
  const seeds = L.loadLive(course);
  const byId = new Map(), seedOf = new Map();
  // first[w] = [seed, lego_index] of the first LEGO/component carrying w
  const first = new Map();
  const seedFirst = new Map();
  for (const s of seeds) {
    seedOf.set(s.seed_number, s);
    for (const w of toks(s.target_text)) if (!seedFirst.has(w)) seedFirst.set(w, s.seed_number);
    for (const l of s.legos) {
      // LEGO target text only: components are never introduced or played (canon L23/O13; DB trigger
      // components_never_introduced), and live component targets carry words their LEGO never says
      // (eng_for_deu S0004L04 "how to say" has a component reading "says").
      const ws = toks(l.target_text);
      for (const w of ws) if (!first.has(w)) first.set(w, [s.seed_number, l.lego_index]);
      for (const p of l.basket_phrases) byId.set(L.short(p.id), { p, l, s });
    }
  }
  const taught = (w, sn, li) => { const f = first.get(w); return f && (f[0] < sn || (f[0] === sn && f[1] <= li)); };
  const rows = [];
  for (const r of scanAll.filter(x => x.course === course)) {
    const m = String(r.row).match(/^S(\d{4})(L\d{2})?([BU]\d+)?$/);
    if (m && !m[2]) { rows.push({ ...r, status: 'seed-level', note: 'scan row is a whole seed, read by hand' }); continue; }
    if (m && !m[3]) { // a LEGO row (the scan's "notnew_untaught": a not-new LEGO whose word was never taught new)
      const s = seedOf.get(Number(m[1])); const l = s && s.legos.find(x => x.lego_id === r.row);
      rows.push({ row: r.row, family: r.family, status: l ? (l.target_text === r.target ? 'lego-level' : 'changed') : 'gone',
        is_new: l ? l.is_new : null, lego: l ? `${l.known_text} | ${l.target_text}` : null, scan_target: r.target, fix: r.fix }); continue; }
    const hit = byId.get(r.row);
    if (!hit) { rows.push({ row: r.row, family: r.family, status: 'gone', known: r.known, target: r.target }); continue; }
    const { p, l, s } = hit;
    const base = { row: r.row, family: r.family, role: p.phrase_role, is_new: l.is_new, known: p.known_text, target: p.target_text,
      lego: `${l.known_text} | ${l.target_text}`, updated_at: p.updated_at, ev: p.last_edit_event_id || null };
    if (p.known_text !== r.known || p.target_text !== r.target) { rows.push({ ...base, status: 'changed', scan_known: r.known, scan_target: r.target }); continue; }
    if (L.isChinese(course)) { rows.push({ ...base, status: 'silent' }); continue; }
    const un = [...new Set(toks(p.target_text).filter(w => !taught(w, s.seed_number, l.lego_index)))];
    const own = new Set(toks(s.target_text));
    let status = 'silent';
    if (un.length) {
      if (un.every(w => own.has(w))) status = 'seedcov';
      else if (un.every(w => own.has(w) || (seedFirst.get(w) || 1e9) < s.seed_number)) status = 'earlier';
      else status = 'other';
    }
    rows.push({ ...base, status, untaught: un, taught_at: Object.fromEntries(un.map(w => [w, first.get(w) ? `S${String(first.get(w)[0]).padStart(4, '0')}L${String(first.get(w)[1]).padStart(2, '0')}` : null])) });
  }
  const count = {};
  for (const r of rows) count[r.status] = (count[r.status] || 0) + 1;
  out.courses[course] = { scan: rows.length, count, rows };
  console.log(course.padEnd(16), JSON.stringify(count));
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

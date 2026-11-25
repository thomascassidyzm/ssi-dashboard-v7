#!/usr/bin/env node
// cs #868 read-back: does the nightly COPY serve the clip each fill ledger linked? Offline: reads copy dumps made by
// ops/paid-cleanup-scan-447/copy-read.cjs dump (one <course>.json per course in <dumpDir>). No DB.
// A slot whose copy clip differs is cross-checked against item 8's ledgers (a later gender take replaced it: expected).
//   node readback.cjs <dumpDir> <out.json> <ledger.jsonl...>
const fs = require('fs'), path = require('path');
const [dumpDir, out, ...ledgers] = process.argv.slice(2);
const ROLE = { known: 'ka', target1: 't1', target2: 't2' };
const dumps = {}, later = new Map();
const dump = (c) => {
  if (!(c in dumps)) {
    const f = path.join(dumpDir, `${c}.json`); dumps[c] = null;
    if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); const m = new Map();
      for (const s of d.seeds) for (const l of s.legos) for (const p of l.phrases) m.set(p.id, p); dumps[c] = { copy: d.copy_db, m }; }
  }
  return dumps[c];
};
const i8 = path.join(__dirname, '../item8');
for (const f of fs.existsSync(i8) ? fs.readdirSync(i8).filter((x) => /^(ledger|reask)-.*\.jsonl$/.test(x)) : [])
  for (const l of fs.readFileSync(path.join(i8, f), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l); if (r.ok && r.audioId) for (const s of r.slots || []) later.set(s, r.audioId);
  }
const res = { copy: null, byCourse: {}, problems: [] };
for (const lf of ledgers) for (const l of fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l); const c = r.course; const t = (res.byCourse[c] ||= {});
  const bump = (k) => { t[k] = (t[k] || 0) + 1; };
  if (!(r.ok && r.audioId && r.link && r.link.ok)) { bump('not_linked_in_ledger'); continue; }
  if (r.target !== 'phrase') { bump('lego_slot_not_in_dump'); continue; }
  const d = dump(c); if (!d) { bump('no_dump'); continue; } res.copy = d.copy;
  const p = d.m.get(r.id); if (!p) { bump('row_gone'); res.problems.push({ c, id: r.id, role: r.role, why: 'row gone' }); continue; }
  const v = p[ROLE[r.role]];
  if (v === r.audioId) bump('serving');
  else if (!v) { bump('EMPTY'); res.problems.push({ c, id: r.id, role: r.role, why: 'empty on copy', linked: r.audioId }); }
  else if (later.get(`phrase:${r.id}`) === v) bump('replaced_by_item8_take');
  else { bump('OTHER_CLIP'); res.problems.push({ c, id: r.id, role: r.role, why: 'other clip', linked: r.audioId, copy: v }); }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(res.copy, JSON.stringify(res.byCourse), 'problems', res.problems.length);

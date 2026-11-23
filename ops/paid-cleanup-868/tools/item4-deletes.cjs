#!/usr/bin/env node
// cs #868 L3: paid-cleanup item 4 (generator filler / template practice rows), Kai-approved 18 Nov, for the two courses
// never planned (por_for_eng, eng_for_sin). Kai's standing ruling (19 Nov) "thin baskets over bad phrases": delete the
// bad rows now and never gate the deletes on back-fill. Computed on the NIGHTLY COPY only (copy-read.cjs dump); no DB.
// Per scan row (ops/paid-cleanup-item4/scan-rows-2026-11-17.json):
//   - gone from the copy, or its text changed since the scan -> listed as stale, no op (someone already changed it);
//   - "delete unless it is the seed's own answer" (T1b) and the row says the seed's own target -> kept;
//   - canon P30 (HARD, Tom 30 Sep): a debut LEGO (is_new) must keep at least one real BUILD/USE row (never the bare
//     LEGO). A delete that would empty a debut's basket is HELD (listed for back-fill), never applied;
//   - otherwise phrase.delete with expect = the copy's text.
//   node item4-deletes.cjs <course> <copy-dump.json> <out-dir>   -> <out-dir>/deletes.ops.json + plan.json
const fs = require('fs');
const path = require('path');
const [course, dumpFile, outDir] = process.argv.slice(2);
const scan = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../paid-cleanup-item4/scan-rows-2026-11-17.json'), 'utf8')).filter((r) => r.course === course);
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const norm = (t) => String(t == null ? '' : t).normalize('NFC').trim();
const P = new Map(); const L = new Map();
for (const s of d.seeds) for (const l of s.legos) {
  L.set(l.id, { ...l, seed: s });
  for (const p of l.phrases) if (p.type !== 'lego_debut') P.set(p.id.split(':').pop(), { ...p, lego: l, seed: s });
}
const plan = { course, copy_db: d.copy_db, scan_rows: scan.length, delete: [], stale: [], kept_seed_answer: [], held_p30: [] };
const want = [];
for (const r of scan) {
  const p = P.get(r.row);
  if (!p) { plan.stale.push({ row: r.row, why: 'not on the copy (already deleted or moved)' }); continue; }
  if (norm(p.known) !== norm(r.known) || norm(p.target) !== norm(r.target)) { plan.stale.push({ row: r.row, why: 'text changed since the scan', scan: [r.known, r.target], copy: [p.known, p.target] }); continue; }
  if (/unless it is the seed/.test(r.fix) && norm(p.target).replace(/[.?!]$/, '') === norm(p.seed.target).replace(/[.?!]$/, '')) { plan.kept_seed_answer.push(r.row); continue; }
  want.push({ r, p });
}
// P30: per debut LEGO, real rows left after the deletes
const gone = new Set(want.map((w) => w.p.id));
for (const { r, p } of want) {
  const l = p.lego;
  if (l.is_new === false) { plan.delete.push(r.row); continue; }
  const real = l.phrases.filter((x) => x.type !== 'lego_debut' && !gone.has(x.id) && !(norm(x.known) === norm(l.known) && norm(x.target) === norm(l.target)));
  if (real.length === 0) plan.held_p30.push({ row: r.row, lego: l.id, why: 'would leave debut LEGO with no real practice row (P30); needs back-fill first' });
  else plan.delete.push(r.row);
}
// held rows stay, so re-admit them for the P30 count is not needed: a held row keeps its basket non-empty.
const ops = plan.delete.map((rid) => { const p = P.get(rid); return { op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known, target_text: p.target } }; });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'deletes.ops.json'), JSON.stringify({ ops }, null, 1));
fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify(plan, null, 1));
console.log(`${course}: scan ${scan.length}, delete ${plan.delete.length}, stale ${plan.stale.length}, kept (seed answer) ${plan.kept_seed_answer.length}, held P30 ${plan.held_p30.length} (copy ${d.copy_db})`);

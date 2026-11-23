#!/usr/bin/env node
// cs #868: edit-door ops (computed on the NIGHTLY COPY, each row op carrying `expect` = the copy's text) -> one
// ssi-changeset/1 file for the governed night applier (tools/changeset/apply-changeset.cjs) + its guards sidecar for
// Kai's 19 Nov live pre-check (ops/paid-cleanup-item9/tools/precheck-guards.cjs: the op's seed and LEGO text as the
// copy held them; a LEGO re-cut by this same file also accepts its new text). No database: reads a copy dump made by
// ops/paid-cleanup-scan-447/copy-read.cjs dump.
// Order written: phrase ops (each row's text op followed by its audio.link ops), then lego ops, then seed ops — a guard
// cannot name a seed's after-text, so seed edits go last and never hold the rows under them on a resumed night.
//   node mk-changeset.cjs <ops.json> <copy-dump.json> <out.changeset.jsonl> --id <id> --job "#868" --why "..." --kai-go "..."
// NEVER rebuild a file after its first night: the applier's ledger records ops by line index.
const fs = require('fs');
const path = require('path');
const cs = require('../../../services/shared/changeset.cjs');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const [opsFile, dumpFile, out] = argv;
if (fs.existsSync(`${out}.applied.jsonl`)) { console.error(`${out} has a ledger; never rebuilt`); process.exit(1); }
const ops = JSON.parse(fs.readFileSync(opsFile, 'utf8')).ops;
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const S = new Map(d.seeds.map((s) => [s.n, s]));
const lidOf = (o) => o.lego_id || (o.phrase_id ? String(o.phrase_id).split(':').pop().slice(0, 8) : null);
const seedOf = (o) => o.seed_number || Number(String(lidOf(o)).slice(1, 5));
const after = new Map();
for (const o of ops) if (o.op === 'lego.update' && o.set) after.set(o.lego_id, o.set);
const rank = (o) => (o.target === 'seed' || o.op === 'seed.update' ? 2 : (o.target === 'lego' || o.op === 'lego.update' ? 1 : 0));
const rowKey = (o) => o.phrase_id || o.lego_id || `SEED${o.seed_number}`;
const groups = new Map();
for (const o of ops) { const k = rowKey(o); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
const ordered = [...groups.values()].sort((a, b) => rank(a[0]) - rank(b[0])).flat();
const guards = ordered.map((o) => {
  const sn = seedOf(o), s = S.get(sn);
  if (!s) throw new Error(`no copy seed ${sn} for ${JSON.stringify(o).slice(0, 120)}`);
  let lid = lidOf(o) || `S${String(sn).padStart(4, '0')}L01`;
  let l = s.legos.find((x) => x.id === lid) || (o.op === 'seed.update' || o.target === 'seed' ? s.legos[0] : null);
  if (!l) throw new Error(`no copy LEGO ${lid}`);
  lid = l.id;
  const lego = [{ known_text: l.known, target_text: l.target }];
  const a = after.get(lid);
  if (a) lego.push({ known_text: a.known_text ?? l.known, target_text: a.target_text ?? l.target });
  return { seed_number: sn, seed: { known_text: s.known, target_text: s.target }, lego_id: lid, lego };
});
cs.write(out, { id: opt('--id'), course: d.course, job: opt('--job', '#868'), why: opt('--why'), kai_go: opt('--kai-go'),
  source: `nightly copy ${d.copy_db} built ${d.copy_built}` }, ordered.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
fs.writeFileSync(out.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: opt('--id'), copy_db: d.copy_db, guards }));
const n = {}; for (const o of ordered) n[o.op] = (n[o.op] || 0) + 1;
console.log(`${out}: ${ordered.length} ops ${JSON.stringify(n)} (copy ${d.copy_db})`);

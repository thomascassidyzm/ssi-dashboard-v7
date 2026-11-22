#!/usr/bin/env node
// cs #358 (Kai approved item 4 on 18 Nov, 200k Cartesia cap): turn the item-4 plans still to apply into ONE
// ssi-changeset/1 file per course for the governed night applier (tools/changeset/apply-changeset.cjs), the shape
// item 9 used (#960·AI). Computed on the NIGHTLY COPY only:
//   1. the copy snapshot (ops/paid-cleanup-item9/tools/copy-live.cjs, the committed #931 reader) sits in ITEM4_LIVE_DIR;
//   2. build.cjs builds exactly the seeds <course>/status-358.json lists under to_apply (ITEM4_ONLY), with every
//      check it always runs (seen/scan/collision, containment, taught words, ZUT course-wide, floors). ANY error stops
//      this tool: nothing is dropped automatically, a plan with an error is fixed by hand first;
//   3. the ops keep build.cjs's order (inserts, then rewrites, then deletes: a basket never empties mid-way), each
//      rewrite/delete carrying `expect` = the copy's text; inserts carry the builder's own makePhraseId id (the door
//      refuses an id that exists, so a re-run can never double-insert);
//   4. Kai's live pre-check (19 Nov): the door's `expect` covers the row; each op's SEED and LEGO text from the copy
//      go in <name>.guards.json, which ops/paid-cleanup-item9/tools/precheck-guards.cjs compares with live right
//      before the applier runs (a mismatch is written to the ledger as drift: held, never forced).
// usage: ITEM4_LIVE_DIR=<copy snapshot dir> node to-changesets.cjs <course> [<course> …]
//   writes <course>/changesets/r358.changeset.jsonl + r358.guards.json + r358.summary.json
// NEVER rebuild a file after its first night: the applier's ledger records ops by line index.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const L = require('./lib.cjs');
const JOB = '#358·AI';
const KAI_GO = 'Kai approved paid-cleanup item 4 (filler/template rows) with a 200,000-character Cartesia cap, 18 Nov 2026';
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
if (!process.env.ITEM4_LIVE_DIR) { console.error('set ITEM4_LIVE_DIR to the copy snapshot dir (copy-live.cjs output)'); process.exit(2); }

for (const course of process.argv.slice(2)) {
  const cdir = path.join(L.ITEM_DIR, course);
  const odir = path.join(cdir, 'changesets');
  const file = path.join(odir, 'r358.changeset.jsonl');
  if (fs.existsSync(`${file}.applied.jsonl`)) { console.log(`${course}: ${file} has a ledger; never rebuilt`); continue; }
  const status = rd(path.join(cdir, 'status-358.json'));
  const only = status.to_apply;
  const copy = rd(path.join(process.env.ITEM4_LIVE_DIR, `${course}.json`));
  const batch = 'r358-changeset';
  try {
    execFileSync('node', [path.join(__dirname, 'build.cjs'), course, batch, String(Math.min(...only)), String(Math.max(...only))],
      { cwd: cdir, env: { ...process.env, ITEM4_ONLY: only.join(',') }, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { /* errors are read from the check file below */ }
  const check = rd(path.join(cdir, 'batches', `${batch}.check.json`));
  if (check.errors.length) { console.log(`${course}: build has ${check.errors.length} errors, nothing written:\n  ${check.errors.slice(0, 10).join('\n  ')}`); process.exitCode = 1; continue; }
  const built = new Set(check.seeds);
  const missing = only.filter((s) => !built.has(s));
  if (missing.length) { console.log(`${course}: seeds in to_apply with no plan built: ${missing.join(',')}`); process.exitCode = 1; continue; }
  const ops = rd(path.join(cdir, 'batches', `${batch}.ops.json`)).ops;
  const seedOf = (o) => o.row ? o.row.seed_number : Number(String(o.phrase_id).replace(/^.*:/, '').slice(1, 5));
  const lidOf = (o) => o.row ? `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}` : String(o.phrase_id).replace(/^.*:/, '').slice(0, 8);
  const guards = ops.map((o) => {
    const sn = seedOf(o), lid = lidOf(o);
    const seed = copy.seeds.find((x) => x.seed_number === sn);
    const lego = seed && seed.legos.find((l) => l.lego_id === lid);
    if (!seed || !lego) throw new Error(`${course}: no copy seed/LEGO for ${lid}`);
    return { seed_number: sn, seed: { known_text: seed.known_text, target_text: seed.target_text }, lego_id: lid,
      lego: [{ known_text: lego.known_text, target_text: lego.target_text }] };
  });
  fs.mkdirSync(odir, { recursive: true });
  cs.write(file, { id: `item4-${course}-r358`, course, job: JOB, kai_go: KAI_GO,
    why: 'paid cleanup item 4: generator filler/template practice rows re-said or removed, thin baskets back-filled from taught words (plans/, hand-authored)',
    source: `nightly copy ${copy.copy_db} built ${copy.copy_built}` }, ops.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
  fs.writeFileSync(path.join(odir, 'r358.guards.json'), JSON.stringify({ changeset: `item4-${course}-r358`, copy_db: copy.copy_db, guards }));
  const n = (k) => ops.filter((o) => o.op === k).length;
  const summary = { course, copy_db: copy.copy_db, copy_built: copy.copy_built, seeds: only.length, ops: ops.length,
    insert: n('phrase.insert'), rewrite: n('phrase.update'), delete: n('phrase.delete'), warnings: check.warnings };
  fs.writeFileSync(path.join(odir, 'r358.summary.json'), JSON.stringify(summary, null, 1));
  for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith(`${batch}.`))) fs.unlinkSync(path.join(cdir, 'batches', f));
  console.log(`${course}: ${file} — ${only.length} seeds, ${ops.length} ops (insert ${summary.insert}, rewrite ${summary.rewrite}, delete ${summary.delete})`);
}

#!/usr/bin/env node
// cs #960: rebuild the item-9 "live" snapshot of one course FROM THE NIGHTLY COPY, in the shape build.cjs reads
// (fetch.cjs's shape: seeds[].legos[].basket_phrases[] full rows), so every op's `expect` is what the copy holds.
// Reads ONLY through the committed #931 reader ops/paid-cleanup-scan-447/copy-read.cjs (which refuses any URL that is
// not the local copy). No SQL here; nothing is written to any database.
// usage: node copy-live.cjs <course> <outDir>      → <outDir>/<course>.json   (then ITEM9_LIVE_DIR=<outDir> node build.cjs …)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [course, outDir] = process.argv.slice(2);
if (!course || !outDir) { console.error('usage: copy-live.cjs <course> <outDir>'); process.exit(1); }
const READER = path.resolve(__dirname, '../../paid-cleanup-scan-447/copy-read.cjs');
fs.mkdirSync(outDir, { recursive: true });
const tmp = (n) => path.join(outDir, `.${course}.${n}.json`);
for (const f of [tmp('snap'), tmp('baskets')]) if (fs.existsSync(f)) fs.unlinkSync(f);
execFileSync('node', [READER, 'snap', course, tmp('snap')], { stdio: ['ignore', 'inherit', 'inherit'] });
execFileSync('node', [READER, 'baskets', course, tmp('baskets'), 'all'], { stdio: ['ignore', 'inherit', 'inherit'] });
const snap = JSON.parse(fs.readFileSync(tmp('snap'), 'utf8'));
const baskets = JSON.parse(fs.readFileSync(tmp('baskets'), 'utf8'));
const lid = (n, i) => `S${String(n).padStart(4, '0')}L${String(i).padStart(2, '0')}`;
const legosBySeed = new Map();
for (const l of snap.legos) {
  if (!legosBySeed.has(l.seed_number)) legosBySeed.set(l.seed_number, []);
  legosBySeed.get(l.seed_number).push({ lego_id: lid(l.seed_number, l.lego_index), lego_index: l.lego_index, type: l.type, is_new: l.is_new,
    known_text: l.known_text, target_text: l.target_text, components: l.components || [], partial_rows: false,
    known_audio_id: l.ka, target1_audio_id: l.t1, target2_audio_id: l.t2,
    basket_phrases: baskets[lid(l.seed_number, l.lego_index)] || [] });
}
const seeds = snap.seeds.map((s) => ({ seed_number: s.seed_number, known_text: s.known_text, target_text: s.target_text, status: s.status,
  legos: legosBySeed.get(s.seed_number) || [] }));
const out = path.join(outDir, `${course}.json`);
fs.writeFileSync(out, JSON.stringify({ courseCode: course, fetched_at: snap.at, via: `nightly copy ${snap.db} built ${snap.copy_built}`,
  copy_db: snap.db, copy_built: snap.copy_built, count: seeds.length, seeds }));
for (const f of [tmp('snap'), tmp('baskets')]) fs.unlinkSync(f);
console.log(`${course}: ${seeds.length} seeds from ${snap.db} -> ${out}`);

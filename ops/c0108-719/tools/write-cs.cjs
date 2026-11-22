#!/usr/bin/env node
// cs #374·AI: write build_cs.py's ops as ONE ssi-changeset/1 file with Popty's own writer (services/shared/changeset.cjs).
// No database. usage: node write-cs.cjs <ops.json> <out.changeset.jsonl> <course> <copy_db> <copy_built>
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const [opsFile, out, course, copyDb, copyBuilt] = process.argv.slice(2);
const { ops } = JSON.parse(fs.readFileSync(opsFile, 'utf8'));
cs.write(out, { id: `c0108-${course}-r374`, course, job: '#374·AI',
  kai_go: "Kai said yes 18 Nov 2026 13:22Z to the whole C0108 'hope' -> 'expect' change (Aran agreed the wording 13:17Z), re-commissioned 22 Nov; the new expect LEGO teaches the verb the seed now uses",
  why: "C0108 seed 108: 'We didn't hope to wake in the middle of the night' -> 'We didn't expect to wake up in the middle of the night' (seed, LEGOs, practice rows), plans #770/#771/#772·AI re-cut on the copy",
  source: `nightly copy ${copyDb} built ${copyBuilt}` }, ops.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
console.log(`changeset ${out}: ${ops.length} op(s)`);

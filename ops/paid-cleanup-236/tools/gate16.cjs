#!/usr/bin/env node
// cs #236·AL item 16 gate: from files only (no DB, no network). A row is MOVED by an insert in item16-moves and a
// delete in item16-flips; the delete must never run unless its insert landed. Once every op of <course>/item16-moves
// has a fate in its ledger, write <course>/item16-flips.ready.changeset.jsonl (+ guards) holding only the flip ops of
// groups whose every moves op is "applied" or "already". Written ONCE and never regenerated (its ledger is keyed by op
// index), so a re-run is a no-op. Groups left out are listed in item16-flips.withheld.json.
//   node gate16.cjs <course dir>   exit 0 = ready file exists (or nothing to flip) · 3 = moves not finished yet
'use strict';
const fs = require('fs');
const path = require('path');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const dir = process.argv[2];
const moves = path.join(dir, 'item16-moves.changeset.jsonl');
const flips = path.join(dir, 'item16-flips.changeset.jsonl');
const ready = path.join(dir, 'item16-flips.ready.changeset.jsonl');
if (fs.existsSync(ready) || !fs.existsSync(flips)) process.exit(0);
const m = cs.read(moves);
const led = loadLedger(`${moves}.applied.jsonl`);
if (m.ops.some((_, i) => !led.has(i))) { console.log(`gate16 ${dir}: moves not finished`); process.exit(3); }
const bad = new Set();
m.ops.forEach((o, i) => { if (!['applied', 'already'].includes(led.get(i))) bad.add(o.group); });
const f = cs.read(flips);
const g = JSON.parse(fs.readFileSync(flips.replace(/\.changeset\.jsonl$/, '.guards.json'), 'utf8'));
const keep = [], guards = [];
f.ops.forEach((o, i) => { if (!bad.has(o.group)) { keep.push(o); guards.push(g.guards[i]); } });
const id = `${f.header.id}-ready`;
cs.write(ready, { ...f.header, id, source: f.header.computed_from }, keep);
fs.writeFileSync(ready.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: id, copy_db: g.copy_db, guards }));
fs.writeFileSync(path.join(dir, 'item16-flips.withheld.json'), JSON.stringify([...bad], null, 1));
console.log(`gate16 ${dir}: ${keep.length} flip op(s) ready, ${bad.size} group(s) withheld (an insert did not land)`);

#!/usr/bin/env node
// Item 12 plan → quiet-hours changeset (cs #914·AI, successor of #717·AI). Item 12 is ~17k ops across 48 courses,
// far past the "few hundred edits" a daytime job may apply (Tom r-2026-11-18 no-hammering), so it goes to
// tools/changeset/apply-changeset.cjs at night. Each row's group (phrase.insert + 3 audio.link) stays in order,
// insert first, so a refused insert leaves its links refused too rather than linking into nothing.
//   node to-changeset.cjs [course…] → ops/paid-cleanup-717/item12/<course>/item12.changeset.jsonl
'use strict';
const path = require('path');
const L = require('./lib.cjs');
const cs = require(path.join(L.ROOT, 'services/shared/changeset.cjs'));
let tot = 0;
for (const c of process.argv.slice(2).length ? process.argv.slice(2) : L.COURSES) {
  const p = L.rd(path.join(L.ITEM_DIR, 'item12', c, 'plan.json'));
  if (!p.rows.length) continue;
  const ops = p.rows.flatMap((r) => r.ops);
  cs.write(path.join(L.ITEM_DIR, 'item12', c, 'item12.changeset.jsonl'),
    { id: `${c}-item12-cs914`, course: c, job: '#914·AI', source: p.db,
      why: 'paid cleanup item 12 (canon P26): seed sentence never said — add it as a USE row under its own last new LEGO, linked to the seed\'s own three clips (0 chars). Kai approved 18 Nov.' }, ops);
  tot += ops.length; console.log(c.padEnd(16), p.rows.length, 'rows', ops.length, 'ops');
}
console.log('TOTAL ops', tot);

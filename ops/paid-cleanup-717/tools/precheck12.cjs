#!/usr/bin/env node
// Item 12 pre-check sidecar (cs #914·AI). Kai's rule, 19 Nov 10:38Z: immediately before each write batch, read on live
// (governed Popty route, same small batch) every row about to change AND its LEGO and seed, and hold any row whose
// live values differ from what the plan was built on. A phrase.insert carries no `expect`, and apply-changeset.cjs
// does not read the LEGO or seed, so this file records, per planned row, the seed and home-LEGO values the plan was
// built on, plus the seed's three clip ids the row links to. An applier that honours the rule compares these on live
// first (e.g. a DRY-RUN edit-batch of seed.update/lego.update ops whose `expect` = these values; a dry run rolls back).
//   node precheck12.cjs [course…] → ops/paid-cleanup-717/item12/<course>/precheck.json
'use strict';
const path = require('path');
const L = require('./lib.cjs');
for (const c of process.argv.slice(2).length ? process.argv.slice(2) : L.COURSES) {
  const p = L.rd(path.join(L.ITEM_DIR, 'item12', c, 'plan.json'));
  if (!p.rows.length) continue;
  const C = L.load(c);
  const out = { course: c, built_from: p.db, rule: 'Kai 19 Nov 10:38Z: hold on any mismatch, never force', rows: {} };
  for (const r of p.rows) {
    const s = C.seeds.get(r.seed), l = C.byLego.get(r.lego);
    out.rows[r.id] = {
      seed: { seed_number: s.seed_number, known_text: s.known_text, target_text: s.target_text,
        known_audio_id: s.ka, target1_audio_id: s.t1, target2_audio_id: s.t2 },
      lego: { lego_id: l.lego_id, known_text: l.known_text, target_text: l.target_text, is_new: l.is_new },
      phrase_absent: true };
  }
  L.wr(path.join(L.ITEM_DIR, 'item12', c, 'precheck.json'), out);
  console.log(c.padEnd(16), Object.keys(out.rows).length);
}

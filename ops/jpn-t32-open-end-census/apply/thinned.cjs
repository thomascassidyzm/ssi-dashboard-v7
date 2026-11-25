#!/usr/bin/env node
// cs #234·AL: which LEGOs the deletes changeset thins, from FILES only (no DB).  node thinned.cjs <live.json> > thinned.json
// Floor = the builder's ramp (phraseFloor in phrase-structure.cjs, canon P30): S1-S3 one BUILD + one USE, S4+ 3 BUILD + 5 USE.
// A row that IS the bare LEGO never counts as practice (P30). Kai's rule "thin baskets over bad phrases": the deletes go ahead;
// this only lists what they leave below the floor, and flags debuts (is_new) left with NO real practice phrase (P30's HARD case).
'use strict'
const fs = require('fs')
const path = require('path')
const cs = require('../../../services/shared/changeset.cjs')
const live = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const { ops } = cs.read(path.join(__dirname, 'deletes.changeset.jsonl'))
const gone = new Set(ops.map((o) => o.phrase_id))
const floor = (seed) => (seed <= 3 ? { build: 1, use: 1 } : { build: 3, use: 5 })
const out = []
for (const s of live.seeds) for (const l of s.legos) {
  const real = (p) => p.target_text !== l.target_text
  const hit = l.basket_phrases.filter((p) => gone.has(p.id))
  if (!hit.length) continue
  const count = (ps) => ({ build: ps.filter((p) => p.phrase_role === 'build' && real(p)).length, use: ps.filter((p) => p.phrase_role === 'use' && real(p)).length })
  const before = count(l.basket_phrases), after = count(l.basket_phrases.filter((p) => !gone.has(p.id))), f = floor(s.seed_number)
  const below = after.build < f.build || after.use < f.use
  out.push({ lego_id: l.lego_id, is_new: l.is_new, lego: `${l.known_text} | ${l.target_text}`, deleted: hit.length, before, after, floor: f,
    below_floor: below, was_below: before.build < f.build || before.use < f.use, empty_debut: !!l.is_new && after.build + after.use === 0 })
}
const sum = { legos_touched: out.length, below_floor_after: out.filter((x) => x.below_floor).length, newly_below: out.filter((x) => x.below_floor && !x.was_below).length,
  debuts_below_floor: out.filter((x) => x.below_floor && x.is_new).length, empty_debuts: out.filter((x) => x.empty_debut).map((x) => x.lego_id) }
console.log(JSON.stringify({ summary: sum, legos: out }, null, 1))

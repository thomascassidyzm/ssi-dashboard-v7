#!/usr/bin/env node
'use strict';
// node ops/deu-435/print-shard.cjs <dump.json> <fromSeed> <toSeed>
// Job #435 (deu_for_eng English↔German mismatch pass): prints every seed, LEGO and practice phrase of a seed range in
// reading order, one pair per line, so a reader can judge EVERY row. Dump = tools/course-optimization/course-dump-readonly-2026-10-14.cjs.
// Tags: [NEW r123] new LEGO at round 123 · [not-new: basket never played, P25] · role build/use/component (components are tiles, never played).
const fs = require('fs');
const [file, a, b] = process.argv.slice(2);
if (!file || !a || !b) throw new Error('usage: <dump.json> <fromSeed> <toSeed>');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const from = +a, to = +b;
const sid = (id) => String(id).split(':').pop();
let n = { seeds: 0, legos: 0, phrases: 0 };
for (const s of d.seeds.filter((x) => x.seed_number >= from && x.seed_number <= to)) {
  n.seeds++;
  console.log(`\n=== SEED ${s.seed_number} | ${s.known_text} | ${s.target_text}`);
  for (const l of d.legos.filter((x) => x.seed_number === s.seed_number)) {
    n.legos++;
    const comp = Array.isArray(l.components) && l.components.length ? `  {${l.components.map((c) => `${c.known}=${c.target}`).join('; ')}}` : '';
    console.log(`  -- ${l.lego_id} [${l.is_new ? `NEW r${l.round_index ?? '?'}` : 'not-new: basket never played, P25'}] ${l.known_text} | ${l.target_text}${comp}`);
    for (const p of d.phrases.filter((x) => x.seed_number === s.seed_number && x.lego_index === l.lego_index)) {
      n.phrases++;
      console.log(`     ${sid(p.id)} ${p.phrase_role}: ${p.known_text} | ${p.target_text}`);
    }
  }
}
// phrases whose lego_index matches no LEGO row (should be none) — printed so nothing is silently skipped
const legoKeys = new Set(d.legos.map((l) => `${l.seed_number}/${l.lego_index}`));
for (const p of d.phrases.filter((x) => x.seed_number >= from && x.seed_number <= to && !legoKeys.has(`${x.seed_number}/${x.lego_index}`))) {
  n.phrases++; console.log(`     ORPHAN ${sid(p.id)} ${p.phrase_role}: ${p.known_text} | ${p.target_text}`);
}
console.log(`\nREAD COUNT seeds ${from}-${to}: ${n.seeds} seeds, ${n.legos} LEGOs, ${n.phrases} phrases`);

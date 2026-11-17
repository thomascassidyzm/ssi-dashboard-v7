#!/usr/bin/env node
'use strict';
// cs #440·AI read-back: every touched seed's baskets as Popty serves them NOW (GET /api/production/:c/seed/:n/baskets),
// checked against the texts the plan meant to leave live. Prints mismatches; writes the live baskets to <out>.
const fs = require('fs');
const { blocks } = require('./plan.cjs');
const [out] = process.argv.slice(2);
const all = Object.values(blocks).flat();
const seedOf = (it) => it.seed || (it.id && +it.id.match(/S0*(\d+)L/)[1]) || (it.lego && +it.lego.match(/S0*(\d+)L/)[1]) || (it.row && it.row.seed_number);
const seeds = [...new Set(all.map(seedOf))].sort((a, b) => a - b);
(async () => {
  const live = {}; let bad = 0, checked = 0;
  for (const s of seeds) {
    const r = await (await fetch(`http://localhost:3470/api/production/deu_for_eng/seed/${s}/baskets`)).json();
    live[s] = r;
    const pairs = new Set(); const legos = new Set();
    for (const b of Object.values(r.baskets || {})) { legos.add(`${b.lego.known}|${b.lego.target}`); for (const p of b.practice_phrases) pairs.add(`${p.known}|${p.target}`); }
    for (const it of all.filter((x) => seedOf(x) === s)) {
      if (it.t === 'N' || (it.t === 'U' && it.known && it.target)) { checked++; if (!pairs.has(`${it.known}|${it.target}`)) { bad++; console.log('MISSING phrase', s, it.id || '', it.known, '|', it.target); } }
      if (it.t === 'L' && it.set.known_text && it.set.target_text) { checked++; if (!legos.has(`${it.set.known_text}|${it.set.target_text}`)) { bad++; console.log('MISSING lego', it.lego); } }
      if (it.t === 'LI') { checked++; if (!legos.has(`${it.row.known_text}|${it.row.target_text}`)) { bad++; console.log('MISSING new lego', s, it.row.known_text); } }
      if (it.t === 'S' && it.set.target_text) { checked++; if (r.seed_pair.target !== it.set.target_text) { bad++; console.log('SEED', s, r.seed_pair.target); } }
      if (it.t === 'S' && it.set.known_text) { checked++; if (r.seed_pair.known !== it.set.known_text) { bad++; console.log('SEED known', s, r.seed_pair.known); } }
    }
  }
  fs.writeFileSync(out, JSON.stringify(live, null, 1));
  console.log(`${seeds.length} seeds read live; ${checked} checks; ${bad} mismatches`);
})();

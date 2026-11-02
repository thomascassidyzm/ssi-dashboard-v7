#!/usr/bin/env node
'use strict';
// node ops/deu-435/taught.cjs <dump.json> <seed> <word> [word…]
// Job #435: is a German (or English) word taught by seed <seed>? Lists the earliest LEGOs (and components) up to and
// including that seed whose target or known text contains the word as a whole word, case-insensitive.
const fs = require('fs');
const [file, seed, ...ws] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const words = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').split(/\s+/).filter(Boolean);
for (const w of ws.map((x) => x.toLowerCase())) {
  const hits = [];
  for (const l of d.legos) {
    if (l.seed_number > +seed) continue;
    const parts = [[l.known_text, l.target_text], ...(l.components || []).map((c) => [c.known, c.target])];
    for (const [k, t] of parts) if (words(t).includes(w) || words(k).includes(w)) { hits.push(`${l.lego_id}${l.is_new ? '' : '(not-new)'} ${k} | ${t}`); break; }
  }
  console.log(`${w}: ${hits.length ? hits.slice(0, 6).join('  ·  ') + (hits.length > 6 ? `  (+${hits.length - 6})` : '') : 'NOT TAUGHT by seed ' + seed}`);
}

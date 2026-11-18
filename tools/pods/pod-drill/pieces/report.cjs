#!/usr/bin/env node
// Per-language table from the plans and recorded.json. node tools/pods/pod-drill/pieces/report.cjs > <a table you publish>
const fs = require('fs'), path = require('path');
const s = JSON.parse(fs.readFileSync(path.join(require('./paths.cjs').DATA, 'recorded.json'), 'utf8'));
console.log('| Course | Turns | Whole | Split | Pieces | Sides | New clips | New chars | Shared clips |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|');
let tot = 0, az = 0;
for (const k in s.clips) if (!k.startsWith('cartesia_')) az += s.clips[k].charsSpent || 0;
for (const [c, uses] of Object.entries(s.uses)) {
  const p = JSON.parse(fs.readFileSync(path.join(require('./paths.cjs').DATA, c === 'ita_for_eng' ? 'ita' : c, 'plan.json'), 'utf8'));
  const pieces = p.turns.reduce((n, t) => n + (t.pieces ? t.pieces.length : 0), 0), whole = p.turns.filter((t) => t.whole).length;
  const keys = [...new Set(uses.map((u) => u.key))], own = keys.filter((k) => s.clips[k].course === c);
  const ch = own.reduce((n, k) => n + (s.clips[k].charsSpent || 0), 0); tot += ch;
  console.log(`| ${c} | ${p.turns.length} | ${whole} | ${p.turns.length - whole} | ${pieces} | ${uses.length} | ${own.length} | ${ch} | ${uses.length - own.length} |`);
}
console.log(`\nTotal ${Object.keys(s.clips).length} clips, ${tot} characters: ${tot - az} Cartesia, ${az} Azure.`);

#!/usr/bin/env node
// What has been TAUGHT before seed N (every NEW or not LEGO target + components, seed order),
// so a back-fill phrase is built from taught chunks only (canon P1/P2).
// usage: node vocab.cjs <course> <seed> [grep-regex]     (prints "S0012L02 known | target")
const L = require('./lib.cjs');
const [course, seedArg, pat] = process.argv.slice(2);
const n = Number(seedArg);
const re = pat ? new RegExp(pat, 'i') : null;
for (const s of L.loadLive(course)) {
  if (s.seed_number > n) break;
  for (const l of s.legos) {
    const line = `${l.lego_id} ${l.known_text} | ${l.target_text}` +
      (l.type === 'M' && l.components ? `  {${l.components.map(c => `${c.known}=${c.target}`).join('; ')}}` : '');
    if (!re || re.test(line)) console.log(line);
  }
}

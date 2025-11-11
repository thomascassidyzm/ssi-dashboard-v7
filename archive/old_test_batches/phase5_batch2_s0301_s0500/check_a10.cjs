const fs = require('fs');
const registry = JSON.parse(fs.readFileSync('registry/lego_registry_s0001_s0500.json', 'utf8'));
const whitelist = new Set();
for (const lid in registry.legos) {
  const lego = registry.legos[lid];
  if (lego.spanish_words) {
    lego.spanish_words.forEach(w => whitelist.add(w.lower()));
  }
}

const a10 = JSON.parse(fs.readFileSync('batch_output/agent_10_baskets.json', 'utf8'));
const viols = {};
for (const sid in a10.seeds) {
  for (const lid in a10.seeds[sid].legos) {
    const lego = a10.seeds[sid].legos[lid];
    if (!lego.practice_phrases) continue;
    for (const [eng, spa] of lego.practice_phrases) {
      const words = spa.toLowerCase().replace(/[¿?¡!,;:.()[\]{}]/g, ' ').split(/\s+/).filter(w => w.length > 0);
      for (const w of words) {
        if (!whitelist.has(w)) {
          viols[w] = (viols[w] || 0) + 1;
        }
      }
    }
  }
}

const sorted = Object.entries(viols).sort((a, b) => b[1] - a[1]);
console.log('Agent 10 violations:');
sorted.slice(0, 15).forEach(([w, cnt]) => console.log(`  "${w}": ${cnt}`));

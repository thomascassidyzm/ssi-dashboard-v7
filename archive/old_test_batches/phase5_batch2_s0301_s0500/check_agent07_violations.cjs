const fs = require('fs');

const registry = JSON.parse(fs.readFileSync('registry/lego_registry_s0001_s0500.json', 'utf8'));
const whitelist = new Set();
for (const legoId in registry.legos) {
  const lego = registry.legos[legoId];
  if (lego.spanish_words) {
    lego.spanish_words.forEach(word => whitelist.add(word));
  }
}

const agent07 = JSON.parse(fs.readFileSync('batch_output/agent_07_baskets.json', 'utf8'));
const seeds = agent07.seeds || agent07;

const violations = {};
let total = 0;

for (const seedId in seeds) {
  if (!seedId.match(/^S\d{4}$/)) continue;
  const seed = seeds[seedId];
  const legos = seed.legos || seed;

  for (const legoId in legos) {
    if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
    const lego = legos[legoId];
    if (!lego.practice_phrases) continue;

    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [english, spanish] = lego.practice_phrases[i];
      const words = spanish.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      for (const word of words) {
        if (!whitelist.has(word)) {
          violations[word] = (violations[word] || 0) + 1;
          total++;
        }
      }
    }
  }
}

console.log(`Agent 07: ${total} total violations`);
console.log('\nTop violating words:');
const sorted = Object.entries(violations).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 15).forEach(([word, count]) => {
  console.log(`  "${word}": ${count} times`);
});

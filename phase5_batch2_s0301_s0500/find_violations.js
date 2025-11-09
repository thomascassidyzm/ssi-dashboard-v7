import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build complete whitelist up to S0500
const whitelist = [];
for (const legoId in registry.legos) {
  if (registry.legos[legoId].spanish_words) {
    registry.legos[legoId].spanish_words.forEach(w => {
      const word = w.toLowerCase();
      if (!whitelist.includes(word)) whitelist.push(word);
    });
  }
}

// Add NEW words from all seeds in the basket
for (const seedId in data.seeds) {
  const seed = data.seeds[seedId];
  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];
    if (lego.lego && lego.lego[1]) {
      const words = lego.lego[1].toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);
      words.forEach(w => {
        if (!whitelist.includes(w)) whitelist.push(w);
      });
    }
  }
}

// Find violations
const violations = new Map();
for (const seedId in data.seeds) {
  const seed = data.seeds[seedId];
  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];
    for (const [eng, spa] of lego.practice_phrases) {
      const words = spa.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);
      for (const word of words) {
        if (!whitelist.includes(word)) {
          violations.set(word, (violations.get(word) || 0) + 1);
        }
      }
    }
  }
}

const sorted = Array.from(violations.entries()).sort((a,b) => b[1] - a[1]);
console.log('Top 50 violating words:\n');
sorted.slice(0, 50).forEach(([word, count]) => {
  console.log(count.toString().padStart(3) + 'x  ' + word);
});
console.log('\nTotal unique violating words:', violations.size);
console.log('Total violations:', sorted.reduce((sum, [w, c]) => sum + c, 0));

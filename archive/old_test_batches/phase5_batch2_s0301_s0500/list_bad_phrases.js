import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist
function buildWhitelist(seedNum) {
  const whitelist = [];
  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    if (legoSeedNum <= seedNum && registry.legos[legoId].spanish_words) {
      registry.legos[legoId].spanish_words.forEach(w => {
        const word = w.toLowerCase();
        if (!whitelist.includes(word)) whitelist.push(word);
      });
    }
  }

  // Add NEW words from seed
  const seed = data.seeds[`S${seedNum.toString().padStart(4, '0')}`];
  if (seed) {
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

  return whitelist;
}

// Check phrases
let badPhraseCount = 0;
const seedIds = Object.keys(data.seeds).sort();

for (const seedId of seedIds) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = buildWhitelist(seedNum);
  const seed = data.seeds[seedId];

  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];

    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [eng, spa] = lego.practice_phrases[i];
      const words = spa.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      const badWords = words.filter(w => !whitelist.includes(w));

      if (badWords.length > 0) {
        badPhraseCount++;
        console.log(`\n${legoId} phrase ${i + 1}:`);
        console.log(`  EN: ${eng}`);
        console.log(`  ES: ${spa}`);
        console.log(`  Bad: ${badWords.join(', ')}`);
      }
    }
  }
}

console.log(`\n\nTotal phrases with violations: ${badPhraseCount}`);
console.log(`This is approximately ${Math.round(badPhraseCount / 10)} LEGOs that need work`);

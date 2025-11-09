#!/usr/bin/env node

const fs = require('fs');

console.log('Fixing Agent 05: Removing violations (caminando, hacia, prepararnos)...\n');

const data = JSON.parse(fs.readFileSync('batch_output/agent_05_baskets.json', 'utf8'));

let fixed = 0;
let removedPhrases = [];

const seeds = data.seeds || data;

for (const seedId in seeds) {
  if (!seedId.match(/^S\d{4}$/)) continue;
  const seed = seeds[seedId];
  const legos = seed.legos || seed;

  for (const legoId in legos) {
    if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
    const lego = legos[legoId];

    if (!lego.practice_phrases) continue;

    const originalCount = lego.practice_phrases.length;
    lego.practice_phrases = lego.practice_phrases.filter(phrase => {
      const spanish = phrase[1].toLowerCase();
      const hasViolation = spanish.includes('caminando') ||
                          spanish.includes('hacia') ||
                          spanish.includes('prepararnos');

      if (hasViolation) {
        removedPhrases.push({
          lego: legoId,
          english: phrase[0],
          spanish: phrase[1]
        });
        fixed++;
      }

      return !hasViolation;
    });

    if (lego.practice_phrases.length < 10 && lego.practice_phrases.length !== originalCount) {
      console.log(`⚠️  ${legoId}: Removed ${originalCount - lego.practice_phrases.length} phrases, now has ${lego.practice_phrases.length}`);
    }
  }
}

console.log(`\nRemoved ${fixed} phrases with violations`);

if (removedPhrases.length > 0 && removedPhrases.length <= 10) {
  console.log('\nRemoved phrases:');
  removedPhrases.forEach(p => {
    console.log(`  ${p.lego}: "${p.spanish}"`);
  });
}

if (fixed > 0) {
  fs.writeFileSync('batch_output/agent_05_baskets.json', JSON.stringify(data, null, 2));
  console.log('\n✅ Agent 05 fixed and saved');
} else {
  console.log('\n❌ No violations found to fix');
}

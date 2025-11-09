#!/usr/bin/env node

const fs = require('fs');

console.log('Fixing Agent 07: Removing "correcto" violations...\n');

const data = JSON.parse(fs.readFileSync('batch_output/agent_07_baskets.json', 'utf8'));

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

    // Filter out phrases containing "correcto", "infelices", or "aburridos"
    const originalCount = lego.practice_phrases.length;
    lego.practice_phrases = lego.practice_phrases.filter(phrase => {
      const spanish = phrase[1].toLowerCase();
      const hasViolation = spanish.includes('correcto') ||
                          spanish.includes('infelices') ||
                          spanish.includes('aburridos');

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

    // If we removed phrases, we need to check if we still have 10
    if (lego.practice_phrases.length < 10 && lego.practice_phrases.length !== originalCount) {
      console.log(`⚠️  ${legoId}: Removed ${originalCount - lego.practice_phrases.length} phrases, now has ${lego.practice_phrases.length}`);
    }
  }
}

console.log(`\nRemoved ${fixed} phrases with violations`);

if (removedPhrases.length > 0 && removedPhrases.length <= 5) {
  console.log('\nRemoved phrases:');
  removedPhrases.forEach(p => {
    console.log(`  ${p.lego}: "${p.spanish}"`);
  });
} else if (removedPhrases.length > 5) {
  console.log('\nFirst 5 removed phrases:');
  removedPhrases.slice(0, 5).forEach(p => {
    console.log(`  ${p.lego}: "${p.spanish}"`);
  });
  console.log(`  ... and ${removedPhrases.length - 5} more`);
}

if (fixed > 0) {
  fs.writeFileSync('batch_output/agent_07_baskets.json', JSON.stringify(data, null, 2));
  console.log('\n✅ Agent 07 fixed and saved');
  console.log('\n⚠️  Note: Some LEGOs may now have fewer than 10 phrases.');
  console.log('This will need to be addressed in a subsequent step if required.');
} else {
  console.log('\n❌ No violations found to fix');
}

#!/usr/bin/env node

/**
 * Validate that practice phrases actually contain the LEGO they're practicing
 */

const fs = require('fs');
const path = require('path');

const basketsDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/phase5_baskets_staging';

// Parse command line args for seed range
const startSeed = parseInt(process.argv[2]) || 121;
const endSeed = parseInt(process.argv[3]) || 140;

console.log(`\n🔍 Validating LEGOs in practice phrases (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})\n`);

let totalSeeds = 0;
let totalLegos = 0;
let totalPhrases = 0;
let failedLegos = 0;
let failedPhrases = 0;

const failures = [];

for (let i = startSeed; i <= endSeed; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const filename = `seed_${seedId}_baskets.json`;
  const filepath = path.join(basketsDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  ${seedId}: File not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  totalSeeds++;

  for (const [legoId, basket] of Object.entries(data)) {
    totalLegos++;
    const lego = basket.lego;
    const legoTarget = lego.target.toLowerCase().trim();
    const legoKnown = lego.known.toLowerCase().trim();

    let legoFailedPhrases = 0;
    const badPhrases = [];

    for (let idx = 0; idx < basket.practice_phrases.length; idx++) {
      const phrase = basket.practice_phrases[idx];
      totalPhrases++;

      const phraseTarget = phrase.target.toLowerCase().trim();
      const phraseKnown = phrase.known.toLowerCase().trim();

      // Check if target phrase contains the target LEGO
      const containsTarget = phraseTarget.includes(legoTarget);
      // Check if known phrase contains the known LEGO
      const containsKnown = phraseKnown.includes(legoKnown);

      if (!containsTarget || !containsKnown) {
        failedPhrases++;
        legoFailedPhrases++;
        badPhrases.push({
          idx: idx + 1,
          known: phrase.known,
          target: phrase.target,
          missingTarget: !containsTarget,
          missingKnown: !containsKnown
        });
      }
    }

    if (legoFailedPhrases > 0) {
      failedLegos++;
      failures.push({
        seedId,
        legoId,
        lego,
        totalPhrases: basket.practice_phrases.length,
        failedPhrases: legoFailedPhrases,
        badPhrases
      });
    }
  }
}

console.log(`📊 SUMMARY\n`);
console.log(`Total Seeds:   ${totalSeeds}`);
console.log(`Total LEGOs:   ${totalLegos}`);
console.log(`Total Phrases: ${totalPhrases}`);
console.log(`Failed LEGOs:  ${failedLegos} (${((failedLegos / totalLegos) * 100).toFixed(1)}%)`);
console.log(`Failed Phrases: ${failedPhrases} (${((failedPhrases / totalPhrases) * 100).toFixed(1)}%)`);

if (failures.length > 0) {
  console.log(`\n❌ FAILURES (${failures.length} LEGOs with bad phrases):\n`);

  for (const failure of failures) {
    console.log(`${failure.legoId}:`);
    console.log(`  LEGO: "${failure.lego.known}" → "${failure.lego.target}"`);
    console.log(`  Failed: ${failure.failedPhrases}/${failure.totalPhrases} phrases\n`);

    for (const bad of failure.badPhrases) {
      console.log(`  ❌ Phrase ${bad.idx}:`);
      if (bad.missingKnown) {
        console.log(`     Known: "${bad.known}" (missing "${failure.lego.known}")`);
      } else {
        console.log(`     Known: "${bad.known}" ✓`);
      }
      if (bad.missingTarget) {
        console.log(`     Target: "${bad.target}" (missing "${failure.lego.target}")`);
      } else {
        console.log(`     Target: "${bad.target}" ✓`);
      }
      console.log();
    }
  }
} else {
  console.log(`\n✅ All phrases contain their LEGOs!\n`);
}

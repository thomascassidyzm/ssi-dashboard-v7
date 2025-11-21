#!/usr/bin/env node

/**
 * Remove practice phrases that don't contain the LEGO
 * Run this to clean up baskets after generation
 */

const fs = require('fs');
const path = require('path');

const basketsDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/phase5_baskets_staging';

const startSeed = parseInt(process.argv[2]) || 1;
const endSeed = parseInt(process.argv[3]) || 668;
const dryRun = process.argv[4] === '--dry-run';

console.log(`\n🧹 Cleaning baskets (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})`);
if (dryRun) console.log('DRY RUN - no files will be modified\n');

let totalSeeds = 0;
let totalLegos = 0;
let totalPhrases = 0;
let removedPhrases = 0;
let modifiedLegos = 0;

for (let i = startSeed; i <= endSeed; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const filename = `seed_${seedId}_baskets.json`;
  const filepath = path.join(basketsDir, filename);

  if (!fs.existsSync(filepath)) continue;

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  totalSeeds++;
  let seedModified = false;

  for (const [legoId, basket] of Object.entries(data)) {
    totalLegos++;
    const lego = basket.lego;
    const legoTarget = lego.target.toLowerCase().trim();
    const legoKnown = lego.known.toLowerCase().trim();

    const originalPhrases = [...basket.practice_phrases];
    const validPhrases = [];

    for (const phrase of originalPhrases) {
      totalPhrases++;
      const phraseTarget = phrase.target.toLowerCase().trim();
      const phraseKnown = phrase.known.toLowerCase().trim();

      const containsTarget = phraseTarget.includes(legoTarget);
      const containsKnown = phraseKnown.includes(legoKnown);

      if (containsTarget && containsKnown) {
        validPhrases.push(phrase);
      } else {
        removedPhrases++;
        if (!dryRun) {
          console.log(`  ❌ ${legoId}: Removed "${phrase.known}" (missing LEGO)`);
        }
      }
    }

    if (validPhrases.length !== originalPhrases.length) {
      modifiedLegos++;
      seedModified = true;
      basket.practice_phrases = validPhrases;
      basket.phrase_count = validPhrases.length;

      if (!dryRun) {
        console.log(`  ✅ ${legoId}: ${originalPhrases.length} → ${validPhrases.length} phrases`);
      }
    }
  }

  if (seedModified && !dryRun) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
  }
}

console.log('\n📊 SUMMARY\n');
console.log(`Seeds processed:   ${totalSeeds}`);
console.log(`LEGOs checked:     ${totalLegos}`);
console.log(`Total phrases:     ${totalPhrases}`);
console.log(`Removed phrases:   ${removedPhrases} (${((removedPhrases / totalPhrases) * 100).toFixed(1)}%)`);
console.log(`Modified LEGOs:    ${modifiedLegos} (${((modifiedLegos / totalLegos) * 100).toFixed(1)}%)`);

if (dryRun) {
  console.log('\n⚠️  DRY RUN - No files were modified');
  console.log('Run without --dry-run to apply changes\n');
} else {
  console.log('\n✅ Baskets cleaned!\n');
}

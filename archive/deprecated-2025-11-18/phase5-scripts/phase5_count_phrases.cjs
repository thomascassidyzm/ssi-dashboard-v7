#!/usr/bin/env node

/**
 * Count total phrases across all baskets
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'cmn_for_eng';
const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

const basketFiles = fs.readdirSync(phase5OutputsDir)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
  .sort();

let totalPhrases = 0;
let totalLegos = 0;
let totalSeeds = basketFiles.length;
let phrasesPerSeed = {};
let legosPerSeed = {};

basketFiles.forEach(filename => {
  const basketPath = path.join(phase5OutputsDir, filename);
  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

  const seedMatch = filename.match(/seed_S(\d{4})_baskets\.json/);
  const seedNum = parseInt(seedMatch[1]);
  const seedId = `S${String(seedNum).padStart(4, '0')}`;

  let seedPhraseCount = 0;
  let seedLegoCount = 0;

  Object.entries(basketData).forEach(([legoId, legoData]) => {
    seedLegoCount++;
    if (legoData.practice_phrases) {
      seedPhraseCount += legoData.practice_phrases.length;
    }
  });

  phrasesPerSeed[seedId] = seedPhraseCount;
  legosPerSeed[seedId] = seedLegoCount;
  totalPhrases += seedPhraseCount;
  totalLegos += seedLegoCount;
});

console.log('📊 Phase 5 Basket Statistics');
console.log('═'.repeat(60));
console.log();
console.log(`Total seeds with baskets: ${totalSeeds}`);
console.log(`Total LEGOs: ${totalLegos}`);
console.log(`Total practice phrases: ${totalPhrases}`);
console.log();
console.log(`Average LEGOs per seed: ${(totalLegos / totalSeeds).toFixed(1)}`);
console.log(`Average phrases per LEGO: ${(totalPhrases / totalLegos).toFixed(1)}`);
console.log(`Average phrases per seed: ${(totalPhrases / totalSeeds).toFixed(1)}`);
console.log();

// Show seeds with fewer than 10 phrases per LEGO (quality check)
const lowPhraseSeeds = [];
Object.entries(phrasesPerSeed).forEach(([seedId, count]) => {
  const legoCount = legosPerSeed[seedId];
  const avgPerLego = count / legoCount;
  if (avgPerLego < 9) {
    lowPhraseSeeds.push({ seedId, phrases: count, legos: legoCount, avg: avgPerLego.toFixed(1) });
  }
});

if (lowPhraseSeeds.length > 0) {
  console.log(`⚠️  Seeds with < 9 phrases per LEGO (${lowPhraseSeeds.length} seeds):`);
  lowPhraseSeeds.forEach(s => {
    console.log(`   ${s.seedId}: ${s.phrases} phrases / ${s.legos} LEGOs = ${s.avg} avg`);
  });
  console.log();
}

console.log('✅ Phrase counting complete');
console.log();

#!/usr/bin/env node
/**
 * Merge Phase 5 outputs from phase5_outputs/ into lego_baskets.json
 *
 * Usage: node merge-phase5-outputs.cjs [courseCode]
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);
const outputsDir = path.join(courseDir, 'phase5_outputs');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

console.log(`\n🔗 Merging Phase 5 Outputs`);
console.log(`Course: ${courseCode}`);
console.log(`Source: ${outputsDir}`);
console.log(`Target: ${legoBasketsPath}\n`);

// Read existing lego_baskets.json
if (!fs.existsSync(legoBasketsPath)) {
  console.error(`❌ lego_baskets.json not found at: ${legoBasketsPath}`);
  process.exit(1);
}

const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const existingBaskets = legoBasketsData.baskets || {};

console.log(`Existing baskets: ${Object.keys(existingBaskets).length}`);

// Read all seed basket files from phase5_outputs
if (!fs.existsSync(outputsDir)) {
  console.error(`❌ phase5_outputs directory not found at: ${outputsDir}`);
  process.exit(1);
}

const seedFiles = fs.readdirSync(outputsDir)
  .filter(f => f.startsWith('seed_S') && f.endsWith('_baskets.json'))
  .sort();

console.log(`Found ${seedFiles.length} seed basket files\n`);

// Merge all seed baskets
const mergedBaskets = { ...existingBaskets };
let newBasketsCount = 0;
let updatedBasketsCount = 0;
const processedSeeds = new Set();

for (const seedFile of seedFiles) {
  const seedPath = path.join(outputsDir, seedFile);
  const seedBaskets = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  // Extract seed ID from filename (e.g., seed_S0510_baskets.json -> S0510)
  const seedMatch = seedFile.match(/seed_(S\d{4})_baskets\.json/);
  if (seedMatch) {
    processedSeeds.add(seedMatch[1]);
  }

  let fileNewCount = 0;
  let fileUpdatedCount = 0;

  for (const [legoId, basket] of Object.entries(seedBaskets)) {
    if (existingBaskets[legoId]) {
      updatedBasketsCount++;
      fileUpdatedCount++;
    } else {
      newBasketsCount++;
      fileNewCount++;
    }
    mergedBaskets[legoId] = basket;
  }

  console.log(`✓ ${seedFile}: ${Object.keys(seedBaskets).length} baskets (${fileNewCount} new, ${fileUpdatedCount} updated)`);
}

// Update metadata
legoBasketsData.baskets = mergedBaskets;
legoBasketsData.generated_at = new Date().toISOString();
legoBasketsData.seeds_processed = Array.from(processedSeeds).sort();
legoBasketsData.total_baskets = Object.keys(mergedBaskets).length;

// Write updated lego_baskets.json (2-space indent for readability)
fs.writeFileSync(legoBasketsPath, JSON.stringify(legoBasketsData, null, 2));

console.log(`\n${'='.repeat(60)}`);
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`Total baskets: ${Object.keys(mergedBaskets).length}`);
console.log(`  - New baskets: ${newBasketsCount}`);
console.log(`  - Updated baskets: ${updatedBasketsCount}`);
console.log(`  - Unchanged baskets: ${Object.keys(existingBaskets).length - updatedBasketsCount}`);
console.log(`\nSeeds processed: ${processedSeeds.size}`);
console.log(`\nOutput: ${legoBasketsPath}\n`);

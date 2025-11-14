#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Merge all phase5_outputs (seed_s0001-s0100.json) into lego_baskets.json
 */

const PHASE5_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_outputs');
const OUTPUT_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_baskets.json');

console.log('📦 Merging phase5_outputs into lego_baskets.json...\n');

const files = fs.readdirSync(PHASE5_DIR)
  .filter(f => f.match(/^seed_s\d{4}\.json$/))
  .sort();

const legoBaskets = {
  version: "1.0.0",
  phase: "5",
  methodology: "Phase 5 Practice Basket Generation",
  generated_at: new Date().toISOString(),
  course: "spa_for_eng",
  seeds_processed: [],
  total_baskets: 0,
  baskets: {}
};

let totalSeeds = 0;
let totalBaskets = 0;
let totalPhrases = 0;

for (const file of files) {
  const filePath = path.join(PHASE5_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.legos || Object.keys(data.legos).length === 0) {
      console.log(`⊘ ${file}: no baskets found`);
      continue;
    }

    const seedId = data.seed_id;
    legoBaskets.seeds_processed.push(seedId);

    let basketsInSeed = 0;
    let phrasesInSeed = 0;

    // Copy all baskets from this seed
    for (const [legoId, basket] of Object.entries(data.legos)) {
      legoBaskets.baskets[legoId] = basket;
      basketsInSeed++;
      totalBaskets++;

      if (basket.practice_phrases && Array.isArray(basket.practice_phrases)) {
        phrasesInSeed += basket.practice_phrases.length;
        totalPhrases += basket.practice_phrases.length;
      }
    }

    console.log(`✓ ${file}: ${basketsInSeed} baskets, ${phrasesInSeed} phrases`);
    totalSeeds++;
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

legoBaskets.total_baskets = totalBaskets;

// Write merged output
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(legoBaskets, null, 2), 'utf8');

console.log('\n📊 Merge Summary:');
console.log(`Seeds processed: ${totalSeeds}`);
console.log(`Total baskets: ${totalBaskets}`);
console.log(`Total phrases: ${totalPhrases}`);
console.log(`\n✓ Created: ${OUTPUT_PATH}`);

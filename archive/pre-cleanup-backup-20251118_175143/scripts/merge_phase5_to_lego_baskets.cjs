#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Merge all phase5_outputs (seed_S0001_baskets.json, etc.) into lego_baskets.json
 * Usage: node merge_phase5_to_lego_baskets.cjs [courseCode]
 */

const courseCode = process.argv[2] || 'spa_for_eng';

const PHASE5_DIR = path.join(__dirname, '../public/vfs/courses', courseCode, 'phase5_outputs');
const OUTPUT_PATH = path.join(__dirname, '../public/vfs/courses', courseCode, 'lego_baskets.json');

console.log(`📦 Merging phase5_outputs into lego_baskets.json for ${courseCode}...\n`);

if (!fs.existsSync(PHASE5_DIR)) {
  console.error(`❌ Error: phase5_outputs directory not found at ${PHASE5_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(PHASE5_DIR)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
  .sort();

console.log(`Found ${files.length} basket files to merge\n`);

// Load existing lego_baskets.json or create new
let legoBaskets = {
  version: "1.0.0",
  phase: "5",
  methodology: "Phase 5 Practice Basket Generation",
  generated_at: new Date().toISOString(),
  course: courseCode,
  seeds_processed: [],
  total_baskets: 0,
  baskets: {}
};

if (fs.existsSync(OUTPUT_PATH)) {
  console.log('Loading existing lego_baskets.json...');
  legoBaskets = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  legoBaskets.course = courseCode;
  legoBaskets.generated_at = new Date().toISOString();

  // Ensure seeds_processed is an array
  if (!Array.isArray(legoBaskets.seeds_processed)) {
    legoBaskets.seeds_processed = [];
  }
}

let totalSeeds = 0;
let totalBaskets = 0;
let totalPhrases = 0;

for (const file of files) {
  const filePath = path.join(PHASE5_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Handle both old format (data.legos) and new format (data.baskets)
    const baskets = data.baskets || data.legos || {};

    if (Object.keys(baskets).length === 0) {
      console.log(`⊘ ${file}: no baskets found`);
      continue;
    }

    const seedId = data.seed_id || file.match(/seed_S(\d{4})/)?.[0];
    if (seedId && !legoBaskets.seeds_processed.includes(seedId)) {
      legoBaskets.seeds_processed.push(seedId);
    }

    let basketsInSeed = 0;
    let phrasesInSeed = 0;

    // Copy all baskets from this seed
    for (const [legoId, basket] of Object.entries(baskets)) {
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

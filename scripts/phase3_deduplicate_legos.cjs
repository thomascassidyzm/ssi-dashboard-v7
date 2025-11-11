#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 3: Deduplicate LEGOs
 *
 * Marks duplicate LEGOs across seeds to avoid regenerating practice baskets.
 * Usage: node phase3_deduplicate_legos.cjs <course_path>
 * Example: node phase3_deduplicate_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase3_deduplicate_legos.cjs <course_path>');
  console.error('Example: node phase3_deduplicate_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100');
  process.exit(1);
}

// Resolve paths
const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const legoPairsPath = path.join(fullCoursePath, 'lego_pairs.json');

// Validate paths
if (!fs.existsSync(fullCoursePath)) {
  console.error(`❌ Error: Course directory not found: ${fullCoursePath}`);
  process.exit(1);
}

if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

console.log('🔍 Deduplicating LEGOs across seeds');
console.log(`📁 Course: ${coursePath}\n`);

// Read lego_pairs.json
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Track seen LEGOs: key = "target|known", value = first seed_id
const seenLegos = new Map();
let duplicateCount = 0;

// Process each seed in order
legoPairs.seeds.forEach((seed) => {
  const seedId = seed.seed_id;

  seed.legos.forEach((lego) => {
    const key = `${lego.target}|${lego.known}`;

    if (seenLegos.has(key)) {
      // Duplicate found!
      const firstSeedId = seenLegos.get(key);
      lego.new = false;
      lego.ref = firstSeedId;
      duplicateCount++;

      console.log(`❌ ${lego.id} (${lego.type}): "${lego.target}" / "${lego.known}"`);
      console.log(`   → Duplicate of ${firstSeedId}\n`);
    } else {
      // First occurrence
      seenLegos.set(key, seedId);
      lego.new = true;

      // Remove ref if it exists (from previous runs)
      delete lego.ref;
    }
  });
});

// Write updated file
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

console.log(`\n📊 Summary:`);
console.log(`   Total seeds: ${legoPairs.seeds.length}`);
console.log(`   Total LEGOs: ${legoPairs.seeds.reduce((sum, s) => sum + s.legos.length, 0)}`);
console.log(`   Duplicates found: ${duplicateCount}`);
console.log(`   Unique LEGOs: ${seenLegos.size}`);
console.log(`\n✅ Deduplication complete! Updated: ${legoPairsPath}`);

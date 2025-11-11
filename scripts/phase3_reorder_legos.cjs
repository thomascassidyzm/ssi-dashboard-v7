#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 3: Reorder LEGOs (A-types before M-types)
 *
 * Ensures all A-type LEGOs come before M-type LEGOs within each seed.
 * Critical for pedagogical progression.
 *
 * Usage: node phase3_reorder_legos.cjs <course_path>
 * Example: node phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase3_reorder_legos.cjs <course_path>');
  console.error('Example: node phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100');
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

console.log('🔄 Reordering LEGOs: A-types before M-types within each seed');
console.log(`📁 Course: ${coursePath}\n`);

// Read lego_pairs.json
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Process each seed
legoPairs.seeds.forEach((seed) => {
  const seedId = seed.seed_id;
  const originalOrder = seed.legos.map(l => `${l.id}(${l.type})`).join(', ');

  // Separate A-types and M-types
  const aTypes = seed.legos.filter(l => l.type === 'A');
  const mTypes = seed.legos.filter(l => l.type === 'M');

  // Concatenate: A-types first, then M-types
  const reordered = [...aTypes, ...mTypes];

  // Renumber IDs
  reordered.forEach((lego, idx) => {
    const newId = `${seedId}L${String(idx + 1).padStart(2, '0')}`;
    lego.id = newId;
  });

  // Update seed
  seed.legos = reordered;

  const newOrder = reordered.map(l => `${l.id}(${l.type})`).join(', ');

  if (originalOrder !== newOrder) {
    console.log(`✅ ${seedId}:`);
    console.log(`   Before: ${originalOrder}`);
    console.log(`   After:  ${newOrder}\n`);
  } else {
    console.log(`✓ ${seedId}: Already correctly ordered\n`);
  }
});

// Write updated file
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

console.log(`\n🎉 Reordering complete! Updated: ${legoPairsPath}`);

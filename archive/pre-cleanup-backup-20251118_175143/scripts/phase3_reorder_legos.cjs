#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 3.5: Re-order LEGOs for Optimal Pedagogy
 *
 * Ensures LEGOs are presented in pedagogically optimal order:
 * 1. A-types (atoms) before M-types (molecules) that use them
 * 2. Simpler M-types before complex M-types that contain them
 * 3. Preserves LEGO IDs (S0004L01, S0004L02, etc.)
 *
 * Usage: node phase3_reorder_legos.cjs <course_path>
 * Example: node phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase3_reorder_legos.cjs <course_path>');
  console.error('Example: node phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng');
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

console.log('🔄 Re-ordering LEGOs for optimal pedagogy');
console.log(`📁 Course: ${coursePath}\n`);

// Read lego_pairs.json
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

/**
 * Calculate dependency score for a LEGO
 * Lower score = should come earlier
 * A-types: score = 0
 * M-types: score = number of components + length of target phrase
 */
function calculateDependencyScore(lego) {
  if (lego.type === 'A') {
    return 0; // A-types always come first
  }

  // M-types: use component count + target word count as complexity measure
  const componentCount = lego.components ? lego.components.length : 0;
  const targetWordCount = lego.target.split(/\s+/).length;

  return (componentCount * 10) + targetWordCount;
}

/**
 * Check if legoA should come before legoB based on dependencies
 * Returns: -1 if A before B, 1 if B before A, 0 if equal
 */
function compareLegoOrder(legoA, legoB) {
  // A-types always before M-types
  if (legoA.type === 'A' && legoB.type === 'M') return -1;
  if (legoA.type === 'M' && legoB.type === 'A') return 1;

  // Both same type: use dependency score
  const scoreA = calculateDependencyScore(legoA);
  const scoreB = calculateDependencyScore(legoB);

  if (scoreA !== scoreB) {
    return scoreA - scoreB;
  }

  // If equal scores, maintain original order (stable sort)
  return 0;
}

let totalReordered = 0;
let seedsReordered = 0;

// Process each seed
legoPairs.seeds.forEach((seed) => {
  const originalOrder = seed.legos.map(l => l.id);

  // Sort LEGOs by pedagogical order
  seed.legos.sort(compareLegoOrder);

  const newOrder = seed.legos.map(l => l.id);

  // Check if order changed
  const orderChanged = originalOrder.some((id, idx) => id !== newOrder[idx]);

  if (orderChanged) {
    seedsReordered++;
    console.log(`🔄 ${seed.seed_id}: Re-ordered LEGOs`);
    console.log(`   Original: ${originalOrder.join(', ')}`);
    console.log(`   New:      ${newOrder.join(', ')}\n`);

    // Re-assign LEGO IDs to maintain sequential numbering
    seed.legos.forEach((lego, idx) => {
      const newId = `${seed.seed_id}L${String(idx + 1).padStart(2, '0')}`;
      if (lego.id !== newId) {
        totalReordered++;
        console.log(`   📝 ${lego.id} → ${newId}: "${lego.known}" / "${lego.target}"`);
      }
      lego.id = newId;
    });
    console.log('');
  }
});

// Write updated file
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

console.log(`\n📊 Summary:`);
console.log(`   Total seeds: ${legoPairs.seeds.length}`);
console.log(`   Seeds re-ordered: ${seedsReordered}`);
console.log(`   LEGOs re-numbered: ${totalReordered}`);
console.log(`\n✅ Re-ordering complete! Updated: ${legoPairsPath}`);

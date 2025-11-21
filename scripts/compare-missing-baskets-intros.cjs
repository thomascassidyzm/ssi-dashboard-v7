#!/usr/bin/env node
/**
 * Compare missing baskets vs missing introductions
 * Determines if LEGOs without baskets are expected (no introductions) or a real gap
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
const introductionsPath = path.join(courseDir, 'introductions.json');

console.log(`\n🔍 Comparing Missing Baskets vs Missing Introductions`);
console.log(`Course: ${courseCode}\n`);

// Read files
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || legoBasketsData;
const introsData = JSON.parse(fs.readFileSync(introductionsPath, 'utf8'));

// Get all LEGO IDs from lego_pairs
const allLegos = new Set();
legoPairs.seeds.forEach(seed => {
  if (seed.legos && Array.isArray(seed.legos)) {
    seed.legos.forEach(lego => {
      if (lego.id) {
        allLegos.add(lego.id);
      }
    });
  }
});

// Get LEGOs with introductions
const legosWithIntros = new Set(Object.keys(introsData.presentations || {}));

// Get LEGOs with baskets
const legosWithBaskets = new Set(Object.keys(baskets));

// Find missing baskets
const missingBaskets = Array.from(allLegos).filter(id => !legosWithBaskets.has(id));

// Find missing introductions
const missingIntros = Array.from(allLegos).filter(id => !legosWithIntros.has(id));

// Find LEGOs that have intros but no baskets (REAL GAPS)
const realGaps = missingBaskets.filter(id => legosWithIntros.has(id));

// Find LEGOs that have neither intros nor baskets (EXPECTED)
const expectedGaps = missingBaskets.filter(id => !legosWithIntros.has(id));

console.log(`${'='.repeat(60)}`);
console.log('COVERAGE ANALYSIS');
console.log('='.repeat(60));
console.log(`Total LEGOs in lego_pairs:           ${allLegos.size}`);
console.log(`LEGOs with introductions:            ${legosWithIntros.size}`);
console.log(`LEGOs with baskets:                  ${legosWithBaskets.size}`);
console.log(`\nLEGOs missing baskets:               ${missingBaskets.length}`);
console.log(`  - Without introductions (EXPECTED): ${expectedGaps.length}`);
console.log(`  - With introductions (REAL GAPS):   ${realGaps.length}`);

if (realGaps.length > 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('⚠️  REAL GAPS: LEGOs with introductions but no baskets');
  console.log('='.repeat(60));

  // Group by seed
  const gapsBySeed = {};
  realGaps.forEach(id => {
    const seedId = id.substring(0, 5);
    if (!gapsBySeed[seedId]) {
      gapsBySeed[seedId] = [];
    }
    gapsBySeed[seedId].push(id);
  });

  Object.keys(gapsBySeed).sort().forEach(seedId => {
    const legos = gapsBySeed[seedId];
    console.log(`\n${seedId}: ${legos.length} missing`);
    legos.forEach(id => console.log(`   - ${id}`));
  });
} else {
  console.log(`\n✅ Perfect! All LEGOs with introductions have baskets.`);
}

if (expectedGaps.length > 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('ℹ️  EXPECTED GAPS: LEGOs without introductions yet');
  console.log('='.repeat(60));
  console.log(`${expectedGaps.length} LEGOs in lego_pairs don't have introductions yet`);
  console.log(`(These are part of the full course structure but content not created yet)`);

  // Show first few examples
  console.log(`\nFirst 10 examples:`);
  expectedGaps.slice(0, 10).forEach(id => {
    console.log(`   - ${id}`);
  });
  if (expectedGaps.length > 10) {
    console.log(`   ... and ${expectedGaps.length - 10} more`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`✅ All introductions covered:  ${realGaps.length === 0 ? 'YES' : 'NO'}`);
console.log(`📊 Basket coverage:            ${legosWithBaskets.size}/${legosWithIntros.size} (${((legosWithBaskets.size / legosWithIntros.size) * 100).toFixed(1)}%)`);
console.log(`📋 Course structure complete:  ${allLegos.size - expectedGaps.length}/${allLegos.size} (${(((allLegos.size - expectedGaps.length) / allLegos.size) * 100).toFixed(1)}%)`);

if (realGaps.length === 0) {
  console.log(`\n✅ All LEGOs with introductions have baskets! Ready to proceed.\n`);
  process.exit(0);
} else {
  console.log(`\n❌ ${realGaps.length} LEGOs have introductions but missing baskets.\n`);
  process.exit(1);
}

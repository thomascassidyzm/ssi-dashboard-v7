#!/usr/bin/env node
/**
 * Validate that every LEGO in lego_pairs.json has a basket in lego_baskets.json
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

console.log(`\n🔍 Validating LEGO Pairs ↔ Baskets Alignment`);
console.log(`Course: ${courseCode}\n`);

// Read files
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || legoBasketsData;

// Get all LEGO IDs from lego_pairs
const allLegoIds = new Set();
legoPairs.seeds.forEach(seed => {
  if (seed.legos && Array.isArray(seed.legos)) {
    seed.legos.forEach(lego => {
      if (lego.id) {
        allLegoIds.add(lego.id);
      }
    });
  }
});

console.log(`LEGO Pairs: ${allLegoIds.size} LEGOs`);
console.log(`Baskets: ${Object.keys(baskets).length} LEGOs\n`);

// Check for missing baskets
const missingBaskets = [];
const presentBaskets = [];

for (const legoId of allLegoIds) {
  if (!baskets[legoId]) {
    missingBaskets.push(legoId);
  } else {
    presentBaskets.push(legoId);
  }
}

// Check for extra baskets (baskets not in lego_pairs)
const extraBaskets = [];
for (const basketId of Object.keys(baskets)) {
  if (!allLegoIds.has(basketId)) {
    extraBaskets.push(basketId);
  }
}

// Report results
console.log(`${'='.repeat(60)}`);
console.log('VALIDATION RESULTS');
console.log('='.repeat(60));

if (missingBaskets.length === 0) {
  console.log(`\n✅ All ${allLegoIds.size} LEGOs from lego_pairs.json have baskets!`);
} else {
  console.log(`\n❌ Missing ${missingBaskets.length} baskets for LEGOs in lego_pairs:\n`);

  // Group by seed
  const missingSeedGroups = {};
  missingBaskets.forEach(id => {
    const seedId = id.substring(0, 5);
    if (!missingSeedGroups[seedId]) {
      missingSeedGroups[seedId] = [];
    }
    missingSeedGroups[seedId].push(id);
  });

  Object.keys(missingSeedGroups).sort().forEach(seedId => {
    const legos = missingSeedGroups[seedId];
    console.log(`   ${seedId}: ${legos.length} missing (${legos.join(', ')})`);
  });
}

if (extraBaskets.length > 0) {
  console.log(`\n⚠️  Found ${extraBaskets.length} baskets NOT in lego_pairs.json:`);
  extraBaskets.slice(0, 20).forEach(id => {
    const basket = baskets[id];
    const legoText = basket.lego?.known || basket.lego?.target || 'unknown';
    console.log(`   - ${id}: "${legoText}"`);
  });
  if (extraBaskets.length > 20) {
    console.log(`   ... and ${extraBaskets.length - 20} more`);
  }
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`LEGOs in lego_pairs: ${allLegoIds.size}`);
console.log(`LEGOs with baskets: ${presentBaskets.length}/${allLegoIds.size} (${((presentBaskets.length / allLegoIds.size) * 100).toFixed(1)}%)`);
console.log(`Missing baskets: ${missingBaskets.length}`);
console.log(`Extra baskets: ${extraBaskets.length}`);

if (missingBaskets.length === 0 && extraBaskets.length === 0) {
  console.log(`\n✅ Perfect alignment! Ready to compile course.\n`);
  process.exit(0);
} else if (missingBaskets.length === 0) {
  console.log(`\n⚠️  All required baskets present, but ${extraBaskets.length} extra baskets found.\n`);
  process.exit(0);
} else {
  console.log(`\n❌ Alignment issues detected.\n`);
  process.exit(1);
}

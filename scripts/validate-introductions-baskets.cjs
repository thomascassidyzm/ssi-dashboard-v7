#!/usr/bin/env node
/**
 * Validate that every introduction has a corresponding basket
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

const introductionsPath = path.join(courseDir, 'introductions.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

console.log(`\n🔍 Validating Introductions ↔ Baskets Alignment`);
console.log(`Course: ${courseCode}\n`);

// Read files
const introductions = JSON.parse(fs.readFileSync(introductionsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || {};

// Get all LEGO IDs from introductions
const introLegoIds = Object.keys(introductions.presentations || {});
console.log(`Introductions: ${introLegoIds.length} LEGOs`);

// Get all basket IDs
const basketIds = Object.keys(baskets);
console.log(`Baskets: ${basketIds.length} LEGOs\n`);

// Check for missing baskets
const missingBaskets = [];
const presentBaskets = [];

for (const legoId of introLegoIds) {
  if (!baskets[legoId]) {
    missingBaskets.push(legoId);
  } else {
    presentBaskets.push(legoId);
  }
}

// Check for extra baskets (baskets without introductions)
const extraBaskets = [];
for (const basketId of basketIds) {
  if (!introductions.presentations[basketId]) {
    extraBaskets.push(basketId);
  }
}

// Report results
console.log(`${'='.repeat(60)}`);
console.log('VALIDATION RESULTS');
console.log('='.repeat(60));

if (missingBaskets.length === 0) {
  console.log(`\n✅ All ${introLegoIds.length} introductions have baskets!`);
} else {
  console.log(`\n❌ Missing ${missingBaskets.length} baskets for introductions:\n`);
  missingBaskets.slice(0, 20).forEach(id => {
    console.log(`   - ${id}: "${introductions.presentations[id].substring(0, 60)}..."`);
  });
  if (missingBaskets.length > 20) {
    console.log(`   ... and ${missingBaskets.length - 20} more`);
  }
}

if (extraBaskets.length > 0) {
  console.log(`\n⚠️  Found ${extraBaskets.length} baskets without introductions:`);
  extraBaskets.slice(0, 10).forEach(id => {
    const basket = baskets[id];
    console.log(`   - ${id}: "${basket.lego?.known || 'unknown'}"`);
  });
  if (extraBaskets.length > 10) {
    console.log(`   ... and ${extraBaskets.length - 10} more`);
  }
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Introductions with baskets: ${presentBaskets.length}/${introLegoIds.length} (${((presentBaskets.length / introLegoIds.length) * 100).toFixed(1)}%)`);
console.log(`Missing baskets: ${missingBaskets.length}`);
console.log(`Extra baskets: ${extraBaskets.length}`);

if (missingBaskets.length === 0 && extraBaskets.length === 0) {
  console.log(`\n✅ Perfect alignment! Ready to compile course.\n`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Alignment issues detected.\n`);
  process.exit(1);
}

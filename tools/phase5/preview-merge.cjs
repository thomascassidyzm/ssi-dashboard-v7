#!/usr/bin/env node
/**
 * Preview Phase 5 Basket Merge
 *
 * Shows what WOULD be merged without actually merging.
 * Safe read-only operation.
 *
 * Usage:
 *   node tools/phase5/preview-merge.cjs <course>
 *   node tools/phase5/preview-merge.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

// Parse command line args
const course = process.argv[2];

if (!course) {
  console.error('Usage: node preview-merge.cjs <course>');
  console.error('Example: node preview-merge.cjs cmn_for_eng');
  process.exit(1);
}

const NORMALIZED_PATH = path.join(__dirname, '../../public/vfs/courses', course, 'phase5_baskets_normalized.json');
const CANON_PATH = path.join(__dirname, '../../public/vfs/courses', course, 'lego_baskets.json');

console.log('=== Phase 5 Merge Preview ===\n');
console.log(`Course: ${course}\n`);

// Check files exist
if (!fs.existsSync(NORMALIZED_PATH)) {
  console.error(`❌ Normalized file not found: ${NORMALIZED_PATH}`);
  console.error('Run: node tools/phase5/extract-and-normalize.cjs ' + course);
  process.exit(1);
}

if (!fs.existsSync(CANON_PATH)) {
  console.error(`❌ Canon file not found: ${CANON_PATH}`);
  process.exit(1);
}

// Load files
console.log('Loading files...');
const normalized = JSON.parse(fs.readFileSync(NORMALIZED_PATH, 'utf8'));
const canon = JSON.parse(fs.readFileSync(CANON_PATH, 'utf8'));

console.log(`✅ Normalized: ${Object.keys(normalized.baskets).length} baskets`);
console.log(`✅ Canon: ${Object.keys(canon.baskets).length} baskets\n`);

// Analyze what would be merged
const newBaskets = {};
const existingBaskets = {};
const conflicts = {};

for (const [legoId, basket] of Object.entries(normalized.baskets)) {
  if (canon.baskets[legoId]) {
    // Check if content is identical
    const canonBasket = canon.baskets[legoId];
    const normalizedJson = JSON.stringify(basket);
    const canonJson = JSON.stringify(canonBasket);

    if (normalizedJson === canonJson) {
      existingBaskets[legoId] = basket;
    } else {
      conflicts[legoId] = {
        normalized: basket,
        canon: canonBasket
      };
    }
  } else {
    newBaskets[legoId] = basket;
  }
}

console.log('=== Merge Analysis ===\n');
console.log(`📊 Baskets to add (new): ${Object.keys(newBaskets).length}`);
console.log(`📊 Baskets already in canon: ${Object.keys(existingBaskets).length}`);
console.log(`⚠️  Conflicts (different content): ${Object.keys(conflicts).length}`);

if (Object.keys(newBaskets).length > 0) {
  console.log('\n✅ NEW BASKETS (will be added):');
  const sampleNew = Object.keys(newBaskets).sort().slice(0, 10);
  for (const id of sampleNew) {
    console.log(`  ${id}: ${newBaskets[id].practice_phrases.length} phrases`);
  }
  if (Object.keys(newBaskets).length > 10) {
    console.log(`  ... and ${Object.keys(newBaskets).length - 10} more`);
  }
}

if (Object.keys(existingBaskets).length > 0) {
  console.log('\n📋 EXISTING BASKETS (already in canon, will skip):');
  const sampleExisting = Object.keys(existingBaskets).sort().slice(0, 5);
  for (const id of sampleExisting) {
    console.log(`  ${id}`);
  }
  if (Object.keys(existingBaskets).length > 5) {
    console.log(`  ... and ${Object.keys(existingBaskets).length - 5} more`);
  }
}

if (Object.keys(conflicts).length > 0) {
  console.log('\n⚠️  CONFLICTS (same ID, different content):');
  for (const id of Object.keys(conflicts).sort()) {
    const conflict = conflicts[id];
    console.log(`  ${id}:`);
    console.log(`    Canon: ${conflict.canon.practice_phrases.length} phrases`);
    console.log(`    Normalized: ${conflict.normalized.practice_phrases.length} phrases`);
  }
  console.log('\n❌ Cannot merge with conflicts present!');
  console.log('   Options:');
  console.log('   1. Keep canon version (default)');
  console.log('   2. Force overwrite with normalized');
  console.log('   3. Manual review and resolution');
}

// Calculate final state
const finalCount = Object.keys(canon.baskets).length + Object.keys(newBaskets).length;

console.log('\n=== Final State (after merge) ===\n');
console.log(`Current canon: ${Object.keys(canon.baskets).length} baskets`);
console.log(`+ New baskets: ${Object.keys(newBaskets).length}`);
console.log(`= Final total: ${finalCount} baskets`);

if (Object.keys(conflicts).length === 0 && Object.keys(newBaskets).length > 0) {
  console.log('\n✅ Ready to merge!');
  console.log('Run: node tools/phase5/merge-to-canon.cjs ' + course);
} else if (Object.keys(conflicts).length > 0) {
  console.log('\n❌ Conflicts must be resolved before merge');
} else {
  console.log('\n⚠️  No new baskets to merge');
}

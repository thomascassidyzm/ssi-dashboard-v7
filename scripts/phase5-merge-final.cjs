#!/usr/bin/env node

/**
 * Phase 5: Final Merge
 *
 * Merges 3 segment files into final lego_baskets.json
 *
 * Usage: node scripts/phase5-merge-final.cjs <course_code>
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/phase5-merge-final.cjs <course_code>');
  process.exit(1);
}

console.log('🔗 Phase 5: Final Merge of All Segments\n');
console.log(`Course: ${courseCode}\n`);

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const segmentsDir = path.join(courseDir, 'phase5_segments');

// Find all segment files
const segmentFiles = [];
for (let i = 1; i <= 3; i++) {
  const segmentFile = path.join(segmentsDir, `segment_${String(i).padStart(2, '0')}_baskets.json`);
  if (fs.existsSync(segmentFile)) {
    segmentFiles.push(segmentFile);
  }
}

console.log(`Found ${segmentFiles.length}/3 segment files:\n`);
segmentFiles.forEach(f => console.log(`  ✓ ${path.basename(f)}`));

if (segmentFiles.length !== 3) {
  console.error(`\n❌ ERROR: Expected 3 segment files, found ${segmentFiles.length}`);
  console.error('Complete all segments first.');
  process.exit(1);
}

// Merge all segment outputs
const merged = {};
let totalBaskets = 0;

for (const segmentFile of segmentFiles) {
  const segmentData = JSON.parse(fs.readFileSync(segmentFile, 'utf8'));
  const basketCount = Object.keys(segmentData).length;
  console.log(`\n✓ Reading ${path.basename(segmentFile)}: ${basketCount} baskets`);

  Object.assign(merged, segmentData);
  totalBaskets += basketCount;
}

console.log(`\nTotal baskets merged: ${totalBaskets}`);
console.log(`Unique LEGO IDs: ${Object.keys(merged).length}`);

// Check for duplicates
if (totalBaskets !== Object.keys(merged).length) {
  console.warn(`\n⚠️  WARNING: ${totalBaskets - Object.keys(merged).length} duplicate LEGO IDs found`);
}

// Verify against lego_pairs.json
const legoPairsFile = path.join(courseDir, 'lego_pairs.json');
if (fs.existsSync(legoPairsFile)) {
  console.log('\n${'='.repeat(60)}');
  console.log('VALIDATION');
  console.log('='.repeat(60));

  const legoPairs = JSON.parse(fs.readFileSync(legoPairsFile, 'utf8'));
  const expectedLegoIds = [];

  for (const seed of legoPairs.seeds) {
    const [_, __, legos] = seed;
    for (const lego of legos) {
      expectedLegoIds.push(lego[0]);
    }
  }

  const missingLegos = expectedLegoIds.filter(id => !merged[id]);
  const extraLegos = Object.keys(merged).filter(id => !expectedLegoIds.includes(id));

  if (missingLegos.length === 0) {
    console.log('\n✓ All LEGOs present');
  } else {
    console.warn(`\n⚠️  Missing ${missingLegos.length} LEGOs:`);
    missingLegos.slice(0, 10).forEach(id => console.log(`   - ${id}`));
    if (missingLegos.length > 10) {
      console.log(`   ... and ${missingLegos.length - 10} more`);
    }
  }

  if (extraLegos.length === 0) {
    console.log('✓ No unexpected LEGOs');
  } else {
    console.warn(`\n⚠️  Found ${extraLegos.length} unexpected LEGOs`);
  }

  console.log(`\nExpected LEGOs: ${expectedLegoIds.length}`);
  console.log(`Generated baskets: ${Object.keys(merged).length}`);
  console.log(`Coverage: ${Math.round((Object.keys(merged).length / expectedLegoIds.length) * 100)}%`);
}

// Write final file
const outputFile = path.join(courseDir, 'lego_baskets.json');
fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));

console.log(`\n${'='.repeat(60)}`);
console.log('FINAL MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nOutput: ${outputFile}`);
console.log(`Total baskets: ${Object.keys(merged).length}`);
console.log(`\n✅ Phase 5 complete! All segments merged.\n`);

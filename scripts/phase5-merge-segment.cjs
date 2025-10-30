#!/usr/bin/env node

/**
 * Phase 5: Merge Segment Orchestrators
 *
 * Merges 3 orchestrator output files into a single segment file
 *
 * Usage: node scripts/phase5-merge-segment.cjs <course_code> <segment_number>
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];
const segmentNum = process.argv[3];

if (!courseCode || !segmentNum) {
  console.error('Usage: node scripts/phase5-merge-segment.cjs <course_code> <segment_number>');
  process.exit(1);
}

console.log(`🔗 Phase 5: Merging Segment ${segmentNum} Orchestrators\n`);
console.log(`Course: ${courseCode}`);
console.log(`Segment: ${segmentNum}\n`);

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const segmentDir = path.join(courseDir, 'phase5_segments', `segment_${String(segmentNum).padStart(2, '0')}`);

// Find all orchestrator files
const orchFiles = [];
for (let i = 1; i <= 3; i++) {
  const orchFile = path.join(segmentDir, `orch_${String(i).padStart(2, '0')}_baskets.json`);
  if (fs.existsSync(orchFile)) {
    orchFiles.push(orchFile);
  }
}

console.log(`Found ${orchFiles.length}/3 orchestrator files:\n`);
orchFiles.forEach(f => console.log(`  ✓ ${path.basename(f)}`));

if (orchFiles.length !== 3) {
  console.error(`\n❌ ERROR: Expected 3 orchestrator files, found ${orchFiles.length}`);
  console.error('Wait for all orchestrators to complete.');
  process.exit(1);
}

// Merge all orchestrator outputs
const merged = {};
let totalBaskets = 0;

for (const orchFile of orchFiles) {
  const orchData = JSON.parse(fs.readFileSync(orchFile, 'utf8'));
  const basketCount = Object.keys(orchData).length;
  console.log(`\n✓ Reading ${path.basename(orchFile)}: ${basketCount} baskets`);

  Object.assign(merged, orchData);
  totalBaskets += basketCount;
}

console.log(`\nTotal baskets merged: ${totalBaskets}`);
console.log(`Unique LEGO IDs: ${Object.keys(merged).length}`);

// Check for duplicates
if (totalBaskets !== Object.keys(merged).length) {
  console.warn(`\n⚠️  WARNING: ${totalBaskets - Object.keys(merged).length} duplicate LEGO IDs found`);
}

// Write segment file
const segmentFile = path.join(courseDir, 'phase5_segments', `segment_${String(segmentNum).padStart(2, '0')}_baskets.json`);
fs.writeFileSync(segmentFile, JSON.stringify(merged, null, 2));

console.log(`\n${'='.repeat(60)}`);
console.log('SEGMENT MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nOutput: ${segmentFile}`);
console.log(`Total baskets: ${Object.keys(merged).length}`);
console.log(`\n✅ Segment ${segmentNum} complete!\n`);

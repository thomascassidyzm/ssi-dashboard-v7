#!/usr/bin/env node

/**
 * Phase 6: Final Merge of All Introduction Segments
 *
 * Merges 3 segment introduction files into final introductions.json
 *
 * Usage: node scripts/phase6-merge-all-intros.cjs <course_code>
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/phase6-merge-all-intros.cjs <course_code>');
  process.exit(1);
}

console.log('🔗 Phase 6: Final Merge of All Segments\n');
console.log(`Course: ${courseCode}\n`);

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const segmentsDir = path.join(courseDir, 'phase6_segments');
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

// Read course metadata from lego_pairs.json
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ ERROR: ${legoPairsPath} not found`);
  process.exit(1);
}

const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const targetLang = legoPairsData.target;
const knownLang = legoPairsData.known;
const version = legoPairsData.version;

// Find all segment introduction files
const segmentFiles = [];
for (let i = 1; i <= 3; i++) {
  const segmentDir = path.join(segmentsDir, `segment_${String(i).padStart(2, '0')}`);
  const segmentFile = path.join(segmentDir, 'introductions.json');
  if (fs.existsSync(segmentFile)) {
    segmentFiles.push(segmentFile);
  }
}

console.log(`Found ${segmentFiles.length}/3 segment files:\n`);
segmentFiles.forEach(f => console.log(`  ✓ ${path.basename(path.dirname(f))}/introductions.json`));

if (segmentFiles.length !== 3) {
  console.error(`\n❌ ERROR: Expected 3 segment files, found ${segmentFiles.length}`);
  console.error('Complete all segments first.');
  process.exit(1);
}

// Merge all segment outputs
const mergedIntros = {};
let totalIntros = 0;

for (const segmentFile of segmentFiles) {
  const segmentData = JSON.parse(fs.readFileSync(segmentFile, 'utf8'));
  const introCount = Object.keys(segmentData).length;
  console.log(`\n✓ Reading ${path.basename(path.dirname(segmentFile))}/introductions.json: ${introCount} intros`);

  Object.assign(mergedIntros, segmentData);
  totalIntros += introCount;
}

console.log(`\nTotal intros merged: ${totalIntros}`);
console.log(`Unique LEGO IDs: ${Object.keys(mergedIntros).length}`);

// Check for duplicates
if (totalIntros !== Object.keys(mergedIntros).length) {
  console.warn(`\n⚠️  WARNING: ${totalIntros - Object.keys(mergedIntros).length} duplicate LEGO IDs found`);
}

// Verify against lego_pairs.json
console.log('\n' + '='.repeat(60));
console.log('VALIDATION');
console.log('='.repeat(60));

const expectedLegoIds = [];

for (const seed of legoPairsData.seeds) {
  const [_, __, legos] = seed;
  for (const lego of legos) {
    expectedLegoIds.push(lego[0]);
  }
}

const missingLegos = expectedLegoIds.filter(id => !mergedIntros[id]);
const extraLegos = Object.keys(mergedIntros).filter(id => !expectedLegoIds.includes(id));

if (missingLegos.length === 0) {
  console.log('\n✓ All LEGOs have introductions');
} else {
  console.warn(`\n⚠️  Missing ${missingLegos.length} LEGO introductions:`);
  missingLegos.slice(0, 10).forEach(id => console.log(`   - ${id}`));
  if (missingLegos.length > 10) {
    console.log(`   ... and ${missingLegos.length - 10} more`);
  }
}

if (extraLegos.length === 0) {
  console.log('✓ No unexpected LEGOs');
} else {
  console.warn(`\n⚠️  Found ${extraLegos.length} unexpected LEGO introductions`);
}

console.log(`\nExpected LEGOs: ${expectedLegoIds.length}`);
console.log(`Generated introductions: ${Object.keys(mergedIntros).length}`);
console.log(`Coverage: ${Math.round((Object.keys(mergedIntros).length / expectedLegoIds.length) * 100)}%`);

// Create final output with metadata
const finalOutput = {
  version: version,
  course: courseCode,
  target: targetLang,
  known: knownLang,
  generated: new Date().toISOString(),
  total_introductions: Object.keys(mergedIntros).length,
  introductions: mergedIntros
};

// Write final file
const outputFile = path.join(courseDir, 'introductions.json');
fs.writeFileSync(outputFile, JSON.stringify(finalOutput, null, 2));

console.log(`\n${'='.repeat(60)}`);
console.log('FINAL MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nOutput: ${outputFile}`);
console.log(`Total introductions: ${Object.keys(mergedIntros).length}`);
console.log(`\n✅ Phase 6 complete! All segments merged.\n`);

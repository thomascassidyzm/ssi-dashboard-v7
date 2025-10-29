#!/usr/bin/env node
/**
 * Phase 5: Merge Batches with Smart Deduplication
 *
 * Merges batch outputs into final lego_baskets.json
 * Handles duplicate LEGOs by referencing canonical baskets
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../vfs/courses', courseCode);

console.log('🔗 Phase 5: Merging Batches with Smart Deduplication\n');
console.log(`Course: ${courseCode}\n`);

// Read manifest
const manifestFile = path.join(courseDir, 'batches', 'manifest.json');
if (!fs.existsSync(manifestFile)) {
  console.error('❌ manifest.json not found. Run prepare_batches first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
console.log(`Expected batches: ${manifest.batch_count}`);
console.log(`Unique LEGOs: ${manifest.unique_legos}`);
console.log(`Duplicate LEGOs: ${manifest.duplicate_legos}\n`);

// Find all batch output files
const batchOutputPattern = path.join(courseDir, 'lego_baskets_batch_*.json');
const batchFiles = glob.sync(batchOutputPattern).sort();

console.log(`Found ${batchFiles.length} batch output files\n`);

if (batchFiles.length !== manifest.batch_count) {
  console.warn(`⚠️  Expected ${manifest.batch_count} batches, found ${batchFiles.length}`);
}

// Read all batch outputs
const allBaskets = {};
let basketCount = 0;

for (const batchFile of batchFiles) {
  const batchBaskets = JSON.parse(fs.readFileSync(batchFile, 'utf8'));

  console.log(`✓ Reading ${path.basename(batchFile)}: ${Object.keys(batchBaskets).length} baskets`);

  Object.assign(allBaskets, batchBaskets);
  basketCount += Object.keys(batchBaskets).length;
}

console.log(`\nTotal baskets merged: ${basketCount}`);

// Read batch data to get duplicate map
const firstBatchFile = path.join(courseDir, 'batches', 'batch_01.json');
const firstBatch = JSON.parse(fs.readFileSync(firstBatchFile, 'utf8'));
const duplicateMap = firstBatch.duplicate_map || {};

console.log(`Duplicate mappings: ${Object.keys(duplicateMap).length}\n`);

// Create complete output with duplicate references
const completeBaskets = { ...allBaskets };

// For each duplicate, create a reference to the canonical basket
for (const [duplicateId, canonicalId] of Object.entries(duplicateMap)) {
  if (!allBaskets[canonicalId]) {
    console.warn(`⚠️  Warning: Canonical basket ${canonicalId} not found for duplicate ${duplicateId}`);
    continue;
  }

  // Create a reference entry for the duplicate
  completeBaskets[duplicateId] = {
    _duplicate_of: canonicalId,
    lego: allBaskets[canonicalId].lego,
    note: `This is a duplicate. Basket generated at ${canonicalId} (first occurrence).`
  };
}

// Write complete output
const outputFile = path.join(courseDir, 'lego_baskets.json');
fs.writeFileSync(outputFile, JSON.stringify(completeBaskets, null, 2));

console.log(`✓ Created lego_baskets.json`);

// Generate statistics
const generatedBaskets = Object.values(completeBaskets).filter(b => !b._duplicate_of).length;
const referenceBaskets = Object.values(completeBaskets).filter(b => b._duplicate_of).length;

console.log(`\n${'='.repeat(60)}`);
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nTotal entries: ${Object.keys(completeBaskets).length}`);
console.log(`  - Generated baskets: ${generatedBaskets}`);
console.log(`  - Duplicate references: ${referenceBaskets}`);
console.log(`\nOutput: ${outputFile}`);

// Validation
console.log(`\n${'='.repeat(60)}`);
console.log('VALIDATION');
console.log('='.repeat(60));

// Check all expected LEGOs are present
const legoPairsFile = path.join(courseDir, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsFile, 'utf8'));

const expectedLegoIds = [];
for (const seed of legoPairs.seeds) {
  const [_, __, legos] = seed;
  for (const lego of legos) {
    expectedLegoIds.push(lego[0]);
  }
}

const missingLegos = expectedLegoIds.filter(id => !completeBaskets[id]);
const extraLegos = Object.keys(completeBaskets).filter(id => !expectedLegoIds.includes(id));

if (missingLegos.length === 0) {
  console.log('✓ All LEGOs present');
} else {
  console.warn(`⚠️  Missing ${missingLegos.length} LEGOs:`);
  missingLegos.slice(0, 10).forEach(id => console.log(`   - ${id}`));
  if (missingLegos.length > 10) {
    console.log(`   ... and ${missingLegos.length - 10} more`);
  }
}

if (extraLegos.length === 0) {
  console.log('✓ No unexpected LEGOs');
} else {
  console.warn(`⚠️  Found ${extraLegos.length} unexpected LEGOs`);
}

// Sample a few baskets to check quality
console.log(`\n${'='.repeat(60)}`);
console.log('SAMPLE BASKETS');
console.log('='.repeat(60));

const sampleIds = Object.keys(completeBaskets)
  .filter(id => !completeBaskets[id]._duplicate_of)
  .slice(0, 3);

for (const id of sampleIds) {
  const basket = completeBaskets[id];
  console.log(`\n${id}: "${basket.lego[0]}" / "${basket.lego[1]}"`);
  console.log(`  E-phrases: ${basket.e?.length || 0}`);
  console.log(`  D-phrases: ${basket.d ? Object.values(basket.d).flat().length : 0}`);
}

// Show a duplicate example
const duplicateExample = Object.keys(completeBaskets).find(
  id => completeBaskets[id]._duplicate_of
);

if (duplicateExample) {
  const dup = completeBaskets[duplicateExample];
  console.log(`\n${duplicateExample}: "${dup.lego[0]}" / "${dup.lego[1]}"`);
  console.log(`  → Duplicate of ${dup._duplicate_of}`);
}

console.log(`\n✅ Merge complete! Next step: Run Phase 5.5 validation\n`);

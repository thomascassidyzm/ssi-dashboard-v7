#!/usr/bin/env node
/**
 * Phase 5: Merge Baskets with Smart Deduplication
 *
 * Supports two modes:
 * 1. ORCHESTRATOR MODE (--orchestrator): Merges 5 chunk files from orchestrators
 * 2. DIRECT MODE (default): Merges N batch output files from direct agents
 *
 * Handles duplicate LEGOs by referencing canonical baskets
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const args = process.argv.slice(2);
const orchestratorMode = args.includes('--orchestrator');
const courseCode = args.find(a => !a.startsWith('--')) || 'spa_for_eng';
const courseDir = path.join(__dirname, '../vfs/courses', courseCode);

console.log('🔗 Phase 5: Merging Baskets with Smart Deduplication\n');
console.log(`Course: ${courseCode}`);
console.log(`Mode: ${orchestratorMode ? 'ORCHESTRATOR (5 chunks)' : 'DIRECT (N batches)'}\n`);

// Read manifest
const manifestDir = orchestratorMode
  ? path.join(courseDir, 'orchestrator_batches', 'phase5')
  : path.join(courseDir, 'batches');

const manifestFile = path.join(manifestDir, 'manifest.json');
if (!fs.existsSync(manifestFile)) {
  console.error(`❌ manifest.json not found at: ${manifestFile}`);
  console.error('Run phase4-prepare-batches.cjs first');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const expectedCount = orchestratorMode ? 5 : manifest.batch_count;

console.log(`Expected ${orchestratorMode ? 'chunks' : 'batches'}: ${expectedCount}`);
console.log(`Unique LEGOs: ${manifest.unique_legos}`);
console.log(`Duplicate LEGOs: ${manifest.duplicate_legos}\n`);

// Find all chunk/batch output files
let batchFiles;
if (orchestratorMode) {
  const chunkPattern = path.join(manifestDir, 'chunk_*.json');
  batchFiles = glob.sync(chunkPattern).sort();
  console.log(`Found ${batchFiles.length} chunk files\n`);
} else {
  const batchOutputPattern = path.join(courseDir, 'lego_baskets_batch_*.json');
  batchFiles = glob.sync(batchOutputPattern).sort();
  console.log(`Found ${batchFiles.length} batch output files\n`);
}

if (batchFiles.length !== expectedCount) {
  console.warn(`⚠️  Expected ${expectedCount}, found ${batchFiles.length}`);
}

// Read all chunk/batch outputs
const allBaskets = {};
let basketCount = 0;

for (const batchFile of batchFiles) {
  const fileContent = JSON.parse(fs.readFileSync(batchFile, 'utf8'));

  let batchBaskets;
  if (orchestratorMode) {
    // Chunk files have baskets nested under "baskets" key
    batchBaskets = fileContent.baskets || {};
  } else {
    // Direct mode output files are flat basket objects
    batchBaskets = fileContent;
  }

  console.log(`✓ Reading ${path.basename(batchFile)}: ${Object.keys(batchBaskets).length} baskets`);

  Object.assign(allBaskets, batchBaskets);
  basketCount += Object.keys(batchBaskets).length;
}

console.log(`\nTotal baskets merged: ${basketCount}`);

// Read batch data to get duplicate map
const firstBatchPath = orchestratorMode
  ? path.join(manifestDir, 'orchestrator_batch_01.json')
  : path.join(courseDir, 'batches', 'batch_01.json');

const firstBatch = JSON.parse(fs.readFileSync(firstBatchPath, 'utf8'));
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

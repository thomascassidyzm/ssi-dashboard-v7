#!/usr/bin/env node

/**
 * Phase 3: Prepare seed batches for parallel LEGO extraction
 *
 * This script splits S0101-S0200 into 10 batches of 10 seeds each,
 * and prepares them for parallel agent extraction.
 *
 * Usage:
 *   node scripts/phase3_prepare_batches.cjs
 *
 * Output:
 *   phase3_test_s0101_s0200/batch_input/seeds_0101_0110.json (batch 1)
 *   phase3_test_s0101_s0200/batch_input/seeds_0111_0120.json (batch 2)
 *   ...
 *   phase3_test_s0101_s0200/batch_input/seeds_0191_0200.json (batch 10)
 */

const fs = require('fs');
const path = require('path');

const SEED_PAIRS_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/seed_pairs.json');
const BATCH_OUTPUT_DIR = path.join(__dirname, '../phase3_test_s0101_s0200/batch_input');

const START_SEED = 101;
const END_SEED = 200;
const BATCH_SIZE = 10;

console.log('📦 Phase 3: Preparing seed batches for S0101-S0200');
console.log('='.repeat(60));

// Load seed_pairs.json
const seedPairsData = JSON.parse(fs.readFileSync(SEED_PAIRS_PATH, 'utf8'));
const allSeeds = seedPairsData.translations;

console.log(`✓ Loaded ${Object.keys(allSeeds).length} total seeds from seed_pairs.json`);

// Extract S0101-S0200
const targetSeeds = {};
for (let i = START_SEED; i <= END_SEED; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  if (allSeeds[seedId]) {
    targetSeeds[seedId] = allSeeds[seedId];
  } else {
    console.warn(`⚠️  Warning: ${seedId} not found in seed_pairs.json`);
  }
}

console.log(`✓ Extracted ${Object.keys(targetSeeds).length} seeds (S0101-S0200)`);

// Split into batches
const batches = [];
const seedIds = Object.keys(targetSeeds).sort();

for (let i = 0; i < seedIds.length; i += BATCH_SIZE) {
  const batchSeeds = seedIds.slice(i, i + BATCH_SIZE);
  const batchData = {
    batch_id: `${batchSeeds[0]}_${batchSeeds[batchSeeds.length - 1]}`,
    batch_number: (i / BATCH_SIZE) + 1,
    total_batches: Math.ceil(seedIds.length / BATCH_SIZE),
    seed_range: {
      start: batchSeeds[0],
      end: batchSeeds[batchSeeds.length - 1]
    },
    seeds: []
  };

  for (const seedId of batchSeeds) {
    batchData.seeds.push({
      seed_id: seedId,
      seed_pair: {
        target: targetSeeds[seedId][0],
        known: targetSeeds[seedId][1]
      }
    });
  }

  batches.push(batchData);
}

console.log(`✓ Created ${batches.length} batches of ${BATCH_SIZE} seeds each`);
console.log('');

// Ensure output directory exists
if (!fs.existsSync(BATCH_OUTPUT_DIR)) {
  fs.mkdirSync(BATCH_OUTPUT_DIR, { recursive: true });
}

// Write batch files
for (const batch of batches) {
  const filename = `seeds_${batch.seed_range.start.substring(1)}_${batch.seed_range.end.substring(1)}.json`;
  const filepath = path.join(BATCH_OUTPUT_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(batch, null, 2), 'utf8');
  console.log(`✓ Wrote batch ${batch.batch_number}/${batch.total_batches}: ${filename} (${batch.seeds.length} seeds)`);
}

console.log('');
console.log('✅ Batch preparation complete!');
console.log('');
console.log('Next steps:');
console.log('1. Launch 10 parallel agents (one per batch)');
console.log('2. Each agent extracts LEGOs from their 10 seeds');
console.log('3. Run merge coordinator to assign final IDs');
console.log('');
console.log('Batch files ready at:');
console.log(`  ${BATCH_OUTPUT_DIR}/`);

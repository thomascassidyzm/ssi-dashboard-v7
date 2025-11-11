#!/usr/bin/env node
/**
 * Prepare Batch 2: S0361-S0520 for parallel LEGO extraction
 * Creates 8 input files of 20 seeds each + cumulative registry (S0001-S0360)
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing Batch 2: S0361-S0520\n');

// Read seed pairs
const seedPairsFile = path.join(__dirname, '../public/vfs/courses/spa_for_eng/seed_pairs.json');
const seedPairs = JSON.parse(fs.readFileSync(seedPairsFile, 'utf8'));

// Extract S0361-S0520
const allSeeds = Object.entries(seedPairs.translations)
  .filter(([seedId]) => {
    const num = parseInt(seedId.substring(1));
    return num >= 361 && num <= 520;
  })
  .sort((a, b) => {
    const numA = parseInt(a[0].substring(1));
    const numB = parseInt(b[0].substring(1));
    return numA - numB;
  });

console.log(`Total seeds: ${allSeeds.length}`);
console.log(`Range: ${allSeeds[0][0]} - ${allSeeds[allSeeds.length - 1][0]}\n`);

// Split into 8 batches of 20 seeds
const batchSize = 20;
const numBatches = 8;

for (let i = 0; i < numBatches; i++) {
  const startIdx = i * batchSize;
  const endIdx = startIdx + batchSize;
  const batchSeeds = allSeeds.slice(startIdx, endIdx);

  const batchData = {
    batch_id: `batch2_agent${i + 1}`,
    batch_number: i + 1,
    seed_range: `${batchSeeds[0][0]}-${batchSeeds[batchSeeds.length - 1][0]}`,
    total_seeds: batchSeeds.length,
    seeds: batchSeeds.map(([seedId, [target, known]]) => ({
      seed_id: seedId,
      target: target,
      known: known
    }))
  };

  const outputFile = path.join(__dirname, 'batch_input', `batch_${i + 1}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(batchData, null, 2));

  console.log(`✓ batch_${i + 1}.json: ${batchSeeds[0][0]} - ${batchSeeds[batchSeeds.length - 1][0]} (${batchSeeds.length} seeds)`);
}

console.log('\n✅ Batch input files created!\n');

// Build cumulative registry (S0001-S0360)
console.log('📚 Building cumulative registry (S0001-S0360)...\n');

const s0001_s0100 = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json'),
  'utf8'
));

const s0101_s0200 = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json'),
  'utf8'
));

const s0201_s0360 = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../phase3_batch1_s0201_s0360/lego_pairs_s0201_s0360.json'),
  'utf8'
));

// Combine all new LEGOs
const registry = {};

// Add S0001-S0100 LEGOs
s0001_s0100.seeds.forEach(seed => {
  seed.legos.filter(lego => lego.new).forEach(lego => {
    registry[lego.id] = {
      id: lego.id,
      type: lego.type,
      target: lego.target,
      known: lego.known,
      source_seed: seed.seed_id,
      components: lego.components || null
    };
  });
});

// Add S0101-S0200 LEGOs
s0101_s0200.seeds.forEach(seed => {
  seed.legos.filter(lego => lego.new).forEach(lego => {
    registry[lego.id] = {
      id: lego.id,
      type: lego.type,
      target: lego.target,
      known: lego.known,
      source_seed: seed.seed_id,
      components: lego.components || null
    };
  });
});

// Add S0201-S0360 LEGOs
s0201_s0360.seeds.forEach(seed => {
  seed.legos.filter(lego => lego.new).forEach(lego => {
    registry[lego.id] = {
      id: lego.id,
      type: lego.type,
      target: lego.target,
      known: lego.known,
      source_seed: seed.seed_id,
      components: lego.components || null
    };
  });
});

const registryFile = path.join(__dirname, 'registry', 'lego_registry_s0001_s0360.json');
fs.writeFileSync(registryFile, JSON.stringify({
  version: "1.0.0",
  range: "S0001-S0360",
  total_legos: Object.keys(registry).length,
  generated: new Date().toISOString(),
  legos: registry
}, null, 2));

console.log(`✓ Registry created: ${Object.keys(registry).length} LEGOs`);
console.log(`  S0001-S0100: 278 LEGOs`);
console.log(`  S0101-S0200: 273 LEGOs`);
console.log(`  S0201-S0360: 375 LEGOs`);
console.log(`  Total: 926 LEGOs\n`);

console.log('='.repeat(60));
console.log('BATCH 2 PREPARATION COMPLETE');
console.log('='.repeat(60));
console.log('\nNext step: Launch 8 parallel agents with batch input files\n');

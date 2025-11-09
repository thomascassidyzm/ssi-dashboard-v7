#!/usr/bin/env node
/**
 * Prepare Batch 3: S0521-S0668 for parallel LEGO extraction
 * Creates 8 input files (7×20 seeds + 1×8 seeds) + cumulative registry (S0001-S0520)
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing Batch 3: S0521-S0668 (FINAL BATCH)\n');

// Read seed pairs
const seedPairsFile = path.join(__dirname, '../public/vfs/courses/spa_for_eng/seed_pairs.json');
const seedPairs = JSON.parse(fs.readFileSync(seedPairsFile, 'utf8'));

// Extract S0521-S0668
const allSeeds = Object.entries(seedPairs.translations)
  .filter(([seedId]) => {
    const num = parseInt(seedId.substring(1));
    return num >= 521 && num <= 668;
  })
  .sort((a, b) => {
    const numA = parseInt(a[0].substring(1));
    const numB = parseInt(b[0].substring(1));
    return numA - numB;
  });

console.log(`Total seeds: ${allSeeds.length}`);
console.log(`Range: ${allSeeds[0][0]} - ${allSeeds[allSeeds.length - 1][0]}\n`);

// Split into 8 batches (7×20 + 1×8)
const batches = [
  { start: 0, end: 20, name: 'batch_1' },   // S0521-S0540
  { start: 20, end: 40, name: 'batch_2' },  // S0541-S0560
  { start: 40, end: 60, name: 'batch_3' },  // S0561-S0580
  { start: 60, end: 80, name: 'batch_4' },  // S0581-S0600
  { start: 80, end: 100, name: 'batch_5' }, // S0601-S0620
  { start: 100, end: 120, name: 'batch_6' },// S0621-S0640
  { start: 120, end: 140, name: 'batch_7' },// S0641-S0660
  { start: 140, end: 148, name: 'batch_8' } // S0661-S0668 (8 seeds)
];

batches.forEach((batch, idx) => {
  const batchSeeds = allSeeds.slice(batch.start, batch.end);

  const batchData = {
    batch_id: `batch3_agent${idx + 1}`,
    batch_number: idx + 1,
    seed_range: `${batchSeeds[0][0]}-${batchSeeds[batchSeeds.length - 1][0]}`,
    total_seeds: batchSeeds.length,
    seeds: batchSeeds.map(([seedId, [target, known]]) => ({
      seed_id: seedId,
      target: target,
      known: known
    }))
  };

  const outputFile = path.join(__dirname, 'batch_input', `batch_${idx + 1}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(batchData, null, 2));

  console.log(`✓ batch_${idx + 1}.json: ${batchSeeds[0][0]} - ${batchSeeds[batchSeeds.length - 1][0]} (${batchSeeds.length} seeds)`);
});

console.log('\n✅ Batch input files created!\n');

// Build cumulative registry (S0001-S0520)
console.log('📚 Building cumulative registry (S0001-S0520)...\n');

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

const s0361_s0520 = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json'),
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

// Add S0361-S0520 LEGOs
s0361_s0520.seeds.forEach(seed => {
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

const registryFile = path.join(__dirname, 'registry', 'lego_registry_s0001_s0520.json');
fs.writeFileSync(registryFile, JSON.stringify({
  version: "1.0.0",
  range: "S0001-S0520",
  total_legos: Object.keys(registry).length,
  generated: new Date().toISOString(),
  legos: registry
}, null, 2));

console.log(`✓ Registry created: ${Object.keys(registry).length} LEGOs`);
console.log(`  S0001-S0100: 278 LEGOs`);
console.log(`  S0101-S0200: 273 LEGOs`);
console.log(`  S0201-S0360: 375 LEGOs`);
console.log(`  S0361-S0520: 453 LEGOs`);
console.log(`  Total: 1379 LEGOs\n`);

console.log('='.repeat(60));
console.log('BATCH 3 PREPARATION COMPLETE (FINAL BATCH)');
console.log('='.repeat(60));
console.log('\nNext step: Launch 8 parallel agents with batch input files');
console.log('Note: Batch 8 has only 8 seeds (S0661-S0668)\n');

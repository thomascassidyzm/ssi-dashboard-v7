#!/usr/bin/env node

/**
 * Phase 3: Prepare all batches for S0201-S0668 (3 waves)
 *
 * Wave 1: S0201-S0360 (16 agents × 10 seeds)
 * Wave 2: S0361-S0520 (16 agents × 10 seeds)
 * Wave 3: S0521-S0668 (15 agents × 10 seeds, last has 8)
 *
 * Usage: node scripts/phase3_prepare_all_batches.cjs
 */

const fs = require('fs');
const path = require('path');

const SEED_PAIRS_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/seed_pairs.json');

console.log('📦 Phase 3: Preparing batches for S0201-S0668 (3 waves)');
console.log('='.repeat(60));

// Load seed_pairs.json
const seedPairsData = JSON.parse(fs.readFileSync(SEED_PAIRS_PATH, 'utf8'));
const allSeeds = seedPairsData.translations;

console.log(`✓ Loaded ${Object.keys(allSeeds).length} total seeds`);
console.log('');

// Wave configurations
const waves = [
  { name: 'wave1_s0201_s0360', start: 201, end: 360, dir: 'phase3_s0201_s0668/wave1_s0201_s0360' },
  { name: 'wave2_s0361_s0520', start: 361, end: 520, dir: 'phase3_s0201_s0668/wave2_s0361_s0520' },
  { name: 'wave3_s0521_s0668', start: 521, end: 668, dir: 'phase3_s0201_s0668/wave3_s0521_s0668' }
];

for (const wave of waves) {
  console.log(`\n📊 Processing ${wave.name}: S${String(wave.start).padStart(4, '0')}-S${String(wave.end).padStart(4, '0')}`);

  const batchInputDir = path.join(__dirname, '..', wave.dir, 'batch_input');

  // Ensure directory exists
  if (!fs.existsSync(batchInputDir)) {
    fs.mkdirSync(batchInputDir, { recursive: true });
  }

  let batchNumber = 1;
  for (let i = wave.start; i <= wave.end; i += 10) {
    const batchStart = i;
    const batchEnd = Math.min(i + 9, wave.end);

    const batchData = {
      batch_id: `S${String(batchStart).padStart(4, '0')}_S${String(batchEnd).padStart(4, '0')}`,
      batch_number: batchNumber,
      wave: wave.name,
      seed_range: {
        start: `S${String(batchStart).padStart(4, '0')}`,
        end: `S${String(batchEnd).padStart(4, '0')}`
      },
      seeds: []
    };

    // Add seeds to batch
    for (let seedNum = batchStart; seedNum <= batchEnd; seedNum++) {
      const seedId = `S${String(seedNum).padStart(4, '0')}`;
      if (allSeeds[seedId]) {
        batchData.seeds.push({
          seed_id: seedId,
          seed_pair: {
            target: allSeeds[seedId][0],
            known: allSeeds[seedId][1]
          }
        });
      }
    }

    // Write batch file
    const filename = `seeds_${String(batchStart).padStart(4, '0')}_${String(batchEnd).padStart(4, '0')}.json`;
    const filepath = path.join(batchInputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(batchData, null, 2), 'utf8');

    console.log(`  ✓ Batch ${batchNumber}: ${filename} (${batchData.seeds.length} seeds)`);
    batchNumber++;
  }
}

console.log('');
console.log('✅ All batches prepared!');
console.log('');
console.log('Wave Summary:');
console.log('  Wave 1: 16 batches (S0201-S0360, 160 seeds)');
console.log('  Wave 2: 16 batches (S0361-S0520, 160 seeds)');
console.log('  Wave 3: 15 batches (S0521-S0668, 148 seeds)');
console.log('');
console.log('Total: 47 batches, 468 seeds');
console.log('');
console.log('Ready for parallel execution!');

#!/usr/bin/env node

/**
 * Phase 3: Prepare ALL batches for S0001-S0668
 * Creates 3 orchestrator batches: ~223 seeds each
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0] || 'spa_for_eng';

const SEED_PAIRS_PATH = path.join(__dirname, `../public/vfs/courses/${courseCode}/seed_pairs.json`);
const BATCH_DIR = path.join(__dirname, `../public/vfs/courses/${courseCode}/orchestrator_batches/phase3`);

console.log(`📦 Phase 3: Preparing orchestrator batches for ${courseCode} (S0001-S0668)`);
console.log('='.repeat(60));

// Load seed_pairs.json
const seedPairsData = JSON.parse(fs.readFileSync(SEED_PAIRS_PATH, 'utf8'));
const allSeeds = seedPairsData.translations;

console.log(`✓ Loaded ${Object.keys(allSeeds).length} total seeds\n`);

// Ensure directory exists
if (!fs.existsSync(BATCH_DIR)) {
  fs.mkdirSync(BATCH_DIR, { recursive: true });
}

// Create 3 orchestrator batches (~223 seeds each)
const batches = [
  { id: 1, start: 1, end: 223 },
  { id: 2, start: 224, end: 445 },
  { id: 3, start: 446, end: 668 }
];

for (const batch of batches) {
  console.log(`📊 Orchestrator Batch ${batch.id}: S${String(batch.start).padStart(4, '0')}-S${String(batch.end).padStart(4, '0')}`);

  const batchData = {
    orchestrator_id: `phase3_orch_${batch.id}`,
    batch_number: batch.id,
    course_code: courseCode,
    seed_range: {
      start: batch.start,
      end: batch.end
    },
    total_seeds: batch.end - batch.start + 1,
    seeds: {}
  };

  // Add seeds to batch
  for (let i = batch.start; i <= batch.end; i++) {
    const seedId = `S${String(i).padStart(4, '0')}`;
    if (allSeeds[seedId]) {
      batchData.seeds[seedId] = allSeeds[seedId];
    }
  }

  const outputPath = path.join(BATCH_DIR, `orchestrator_batch_${batch.id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(batchData, null, 2));
  console.log(`  ✓ Written: orchestrator_batch_${batch.id}.json (${Object.keys(batchData.seeds).length} seeds)\n`);
}

console.log('✅ All orchestrator batches prepared!');
console.log('\nBatch Summary:');
batches.forEach(b => {
  console.log(`  Batch ${b.id}: S${String(b.start).padStart(4, '0')}-S${String(b.end).padStart(4, '0')} (${b.end - b.start + 1} seeds)`);
});
console.log('\nReady to spawn 3 Phase 3 orchestrators!');

#!/usr/bin/env node

/**
 * Merge Batch 3: S0521-S0668 LEGO Extraction (FINAL BATCH)
 * Combines 8 agent outputs into final lego_pairs format
 */

const fs = require('fs');
const path = require('path');

console.log('🔀 Merging Batch 3: S0521-S0668 (FINAL BATCH)');
console.log('='.repeat(60));

const BATCH_OUTPUT_DIR = path.join(__dirname, 'batch_output');
const REGISTRY_FILE = path.join(__dirname, 'registry', 'lego_registry_s0001_s0520.json');
const OUTPUT_FILE = path.join(__dirname, 'lego_pairs_s0521_s0668.json');

// Load registry
console.log('📖 Loading S0001-S0520 registry...');
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
console.log(`✓ Loaded ${registry.total_legos} existing LEGOs\n`);

// Build master LEGO map from registry
const masterLEGOs = new Map();
Object.values(registry.legos).forEach(lego => {
  const key = `${lego.target.toLowerCase()}::${lego.known.toLowerCase()}`;
  masterLEGOs.set(key, lego);
});

// Read all 8 batch output files
console.log('📦 Reading batch output files...');
const batchFiles = [];
for (let i = 1; i <= 8; i++) {
  const filename = `batch_${i}_output.json`;
  const filepath = path.join(BATCH_OUTPUT_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Missing file: ${filename}`);
    process.exit(1);
  }

  const batch = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  batchFiles.push(batch);
  console.log(`✓ ${filename}: ${batch.seeds.length} seeds`);
}
console.log('');

// Process batches sequentially, assigning final IDs
console.log('🔧 Processing seeds and assigning final IDs...\n');

const finalSeeds = [];
let cumulativeNewLEGOs = registry.total_legos; // Start from S0001-S0520 count
let newLEGOsInBatch = 0;
let referencedLEGOs = 0;

batchFiles.forEach((batch, batchIdx) => {
  console.log(`Processing Batch ${batchIdx + 1} (${batch.seed_range})...`);

  batch.seeds.forEach(seed => {
    // Handle both format variations
    const seedPair = seed.seed_pair || { target: seed.target, known: seed.known };
    const legosArray = seed.legos || seed.lego_pairs || [];

    const processedSeed = {
      seed_id: seed.seed_id,
      seed_pair: seedPair,
      legos: []
    };

    let legoCounter = 1; // Counter for LEGOs without IDs

    legosArray.forEach((lego) => {
      const key = `${lego.target.toLowerCase()}::${lego.known.toLowerCase()}`;

      // Determine if this is a reference or new LEGO
      let isReference = false;
      let refId = null;

      // Check if explicitly marked as reference
      if (lego.ref) {
        isReference = true;
        refId = lego.ref;
      } else if (lego.new === false && lego.id) {
        isReference = true;
        refId = lego.id;
      } else if (!lego.id && masterLEGOs.has(key)) {
        // No ID but exists in registry - it's a reference
        isReference = true;
        refId = masterLEGOs.get(key).id;
      } else if (lego.id && lego.id.match(/^S\d+L\d+$/) && masterLEGOs.has(key)) {
        // Has proper ID and exists in registry
        isReference = true;
        refId = lego.id;
      }

      // Normalize type (B→A, C→M)
      let normalizedType = lego.type;
      if (lego.type === 'B') normalizedType = 'A';
      if (lego.type === 'C') normalizedType = 'M';

      if (isReference) {
        // Referenced LEGO
        const existingLego = masterLEGOs.get(key);

        processedSeed.legos.push({
          id: refId,
          type: normalizedType,
          target: lego.target,
          known: lego.known,
          new: false,
          components: (existingLego && existingLego.components) || lego.components || null
        });

        referencedLEGOs++;
      } else {
        // New LEGO - check if we've seen it in this batch already
        if (masterLEGOs.has(key)) {
          // Already exists from earlier in this batch
          const existingLego = masterLEGOs.get(key);

          processedSeed.legos.push({
            id: existingLego.id,
            type: normalizedType,
            target: lego.target,
            known: lego.known,
            new: false,
            components: existingLego.components || lego.components || null
          });

          referencedLEGOs++;
        } else {
          // Brand new LEGO - assign final ID
          cumulativeNewLEGOs++;
          const finalId = `${seed.seed_id}L${String(legoCounter).padStart(2, '0')}`;
          legoCounter++;

          const newLego = {
            id: finalId,
            type: normalizedType,
            target: lego.target,
            known: lego.known,
            new: true,
            components: lego.components || null
          };

          processedSeed.legos.push(newLego);

          // Add to master registry
          masterLEGOs.set(key, {
            id: finalId,
            type: normalizedType,
            target: lego.target,
            known: lego.known,
            components: lego.components || null
          });

          newLEGOsInBatch++;
        }
      }
    });

    finalSeeds.push(processedSeed);
  });

  console.log(`  ✓ Processed ${batch.seeds.length} seeds`);
});

console.log('');
console.log('='.repeat(60));
console.log('MERGE STATISTICS');
console.log('='.repeat(60));
console.log(`Total seeds: ${finalSeeds.length}`);
console.log(`New LEGOs in batch: ${newLEGOsInBatch}`);
console.log(`Referenced LEGOs: ${referencedLEGOs}`);
console.log(`Cumulative total (S0001-S0668): ${cumulativeNewLEGOs}`);
console.log(`Average new per seed: ${(newLEGOsInBatch / finalSeeds.length).toFixed(2)}`);
console.log('');

// Create final output
const output = {
  version: "7.7.0",
  methodology: "Phase 3 LEGO Extraction - Parallel Batch Processing",
  extraction_date: new Date().toISOString().split('T')[0],
  seed_range: "S0521-S0668",
  batch_number: 3,
  cumulative_range: "S0001-S0668",
  total_seeds: finalSeeds.length,
  new_legos_this_batch: newLEGOsInBatch,
  referenced_legos: referencedLEGOs,
  cumulative_legos: cumulativeNewLEGOs,
  seeds: finalSeeds
};

// Write output
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log(`✅ Merge complete!`);
console.log(`📄 Output: ${OUTPUT_FILE}`);
console.log('');
console.log('🎉 FINAL BATCH COMPLETE - All S0001-S0668 extracted! 🎉');
console.log('');

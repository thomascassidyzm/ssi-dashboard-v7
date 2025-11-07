#!/usr/bin/env node

/**
 * Phase 3: Merge coordinator for parallel LEGO extraction
 *
 * This script:
 * 1. Reads 10 provisional batch files (from parallel agents)
 * 2. Builds master LEGO registry (deduplicates across batches)
 * 3. Assigns final LEGO IDs (S0XXXLXX format)
 * 4. Marks references vs new LEGOs
 * 5. Calculates cumulative LEGO counts
 * 6. Outputs final lego_pairs_s0101_s0200.json
 *
 * Usage:
 *   node scripts/phase3_merge_batches.cjs
 */

const fs = require('fs');
const path = require('path');

const BATCH_INPUT_DIR = path.join(__dirname, '../phase3_test_s0101_s0200/batch_output');
const EXISTING_LEGO_PAIRS = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json');
const OUTPUT_PATH = path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json');

console.log('🔀 Phase 3: Merging parallel LEGO extraction batches');
console.log('='.repeat(60));

// Load existing S0001-S0100 LEGOs
console.log('📖 Loading existing S0001-S0100 LEGOs...');
const existingData = JSON.parse(fs.readFileSync(EXISTING_LEGO_PAIRS, 'utf8'));

const masterLEGOs = new Map(); // targetKey → {id, seed_id, type, known, components}
let cumulativeLEGOs = 0;

// Build master registry from S0001-S0100
for (const seed of existingData.seeds) {
  for (const lego of seed.legos) {
    if (lego.new) {
      const targetKey = lego.target.toLowerCase();
      masterLEGOs.set(targetKey, {
        id: lego.id,
        seed_id: seed.seed_id,
        type: lego.type,
        known: lego.known,
        components: lego.components || null
      });
      cumulativeLEGOs++;
    }
  }
}

console.log(`✓ Loaded ${cumulativeLEGOs} existing LEGOs from S0001-S0100`);
console.log('');

// Read all batch files
console.log('📦 Reading provisional batch files...');
const batchFiles = fs.readdirSync(BATCH_INPUT_DIR)
  .filter(f => f.startsWith('batch_') && f.endsWith('_provisional.json'))
  .sort();

if (batchFiles.length === 0) {
  console.error('❌ Error: No provisional batch files found in', BATCH_INPUT_DIR);
  process.exit(1);
}

console.log(`✓ Found ${batchFiles.length} batch files`);
console.log('');

// Process batches sequentially
const finalSeeds = [];
let newLEGOsAdded = 0;
let referencesMarked = 0;
let legoIdCounter = {}; // per-seed counter for LEGO numbering

for (const batchFile of batchFiles) {
  const batchPath = path.join(BATCH_INPUT_DIR, batchFile);
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

  console.log(`Processing ${batchFile} (${batch.seeds.length} seeds)...`);

  for (const seed of batch.seeds) {
    const processedSeed = {
      seed_id: seed.seed_id,
      seed_pair: seed.seed_pair,
      legos: [],
      cumulative_legos: 0
    };

    // Initialize LEGO counter for this seed
    if (!legoIdCounter[seed.seed_id]) {
      legoIdCounter[seed.seed_id] = 0;
    }

    for (const lego of seed.legos) {
      const targetKey = lego.target.toLowerCase();

      // Normalize type (some agents may use B/C instead of A/M)
      const normalizedType = lego.type === 'B' ? 'A' : lego.type === 'C' ? 'M' : lego.type;

      if (masterLEGOs.has(targetKey)) {
        // DUPLICATE - mark as reference
        const existing = masterLEGOs.get(targetKey);

        // For M-type LEGOs, ensure components are included (pull from registry if needed)
        const components = lego.components || existing.components || null;

        processedSeed.legos.push({
          id: existing.id,
          type: normalizedType,
          target: lego.target,
          known: lego.known,
          ref: existing.seed_id,
          ...(normalizedType === 'M' && components && { components })
        });
        referencesMarked++;
      } else {
        // NEW - assign final ID
        legoIdCounter[seed.seed_id]++;
        const legoNum = String(legoIdCounter[seed.seed_id]).padStart(2, '0');
        const finalId = `${seed.seed_id}L${legoNum}`;

        processedSeed.legos.push({
          id: finalId,
          type: normalizedType,
          target: lego.target,
          known: lego.known,
          new: true,
          ...(lego.components && { components: lego.components })
        });

        // Add to master registry
        masterLEGOs.set(targetKey, {
          id: finalId,
          seed_id: seed.seed_id,
          type: normalizedType,
          known: lego.known,
          components: lego.components || null
        });

        cumulativeLEGOs++;
        newLEGOsAdded++;
      }
    }

    processedSeed.cumulative_legos = cumulativeLEGOs;
    finalSeeds.push(processedSeed);
  }
}

console.log('');
console.log('✅ Merge complete!');
console.log('');
console.log('📊 Statistics:');
console.log(`  - Total seeds processed: ${finalSeeds.length}`);
console.log(`  - New LEGOs added (S0101-S0200): ${newLEGOsAdded}`);
console.log(`  - References marked: ${referencesMarked}`);
console.log(`  - Cumulative LEGOs (S0001-S0200): ${cumulativeLEGOs}`);
console.log('');

// Write final output
const outputData = {
  version: '7.7.0',
  course: 'spa_for_eng',
  seed_range: 'S0101-S0200',
  cumulative_range: 'S0001-S0200',
  total_seeds: finalSeeds.length,
  cumulative_legos: cumulativeLEGOs,
  new_legos_this_batch: newLEGOsAdded,
  merged_at: new Date().toISOString(),
  seeds: finalSeeds
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf8');
console.log(`✅ Final output saved to: ${path.basename(OUTPUT_PATH)}`);
console.log('');
console.log('Next steps:');
console.log('1. Validate seed reconstruction');
console.log('2. Check FD compliance (spot-check)');
console.log('3. If quality is good → Proceed to Phase 5 (basket generation)');

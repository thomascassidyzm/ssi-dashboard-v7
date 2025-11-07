#!/usr/bin/env node

/**
 * Phase 3: Build LEGO registry from S0001-S0100
 *
 * This creates a quick reference lookup for agents extracting S0101-S0200,
 * so they can check if a LEGO already exists in the first 100 seeds.
 *
 * Output format (for agent reference):
 * {
 *   "quiero": {"id": "S0001L01", "type": "A", "seed": "S0001"},
 *   "hablar": {"id": "S0001L02", "type": "A", "seed": "S0001"},
 *   "estoy intentando": {"id": "S0002L01", "type": "M", "seed": "S0002"},
 *   ...
 * }
 */

const fs = require('fs');
const path = require('path');

const LEGO_PAIRS_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json');
const OUTPUT_PATH = path.join(__dirname, '../phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json');

console.log('🔍 Building LEGO registry from S0001-S0100...');
console.log('='.repeat(60));

// Load lego_pairs.json
const legoPairsData = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

const registry = {};
let totalLEGOs = 0;
let atomicCount = 0;
let molecularCount = 0;

// Process each seed
for (const seed of legoPairsData.seeds) {
  const seedId = seed.seed_id;

  // Only process S0001-S0100
  const seedNum = parseInt(seedId.substring(1));
  if (seedNum > 100) continue;

  // Process each LEGO
  for (const lego of seed.legos) {
    // Only register NEW LEGOs (not references)
    if (lego.new) {
      const targetKey = lego.target.toLowerCase();

      registry[targetKey] = {
        id: lego.id,
        type: lego.type,
        seed: seedId,
        target: lego.target,
        known: lego.known
      };

      totalLEGOs++;
      if (lego.type === 'A') atomicCount++;
      if (lego.type === 'M') molecularCount++;
    }
  }
}

console.log(`✓ Processed ${totalLEGOs} unique LEGOs from S0001-S0100`);
console.log(`  - Atomic (A): ${atomicCount}`);
console.log(`  - Molecular (M): ${molecularCount}`);
console.log('');

// Write registry
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2), 'utf8');
console.log(`✅ Registry saved to: ${path.basename(OUTPUT_PATH)}`);
console.log('');
console.log('This registry will help agents:');
console.log('1. Check if a LEGO already exists (mark as reference)');
console.log('2. Avoid duplicate extraction');
console.log('3. Maintain consistency with S0001-S0100');

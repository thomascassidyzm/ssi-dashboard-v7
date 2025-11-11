#!/usr/bin/env node

/**
 * Phase 5 Batch 1 Preparation Script
 *
 * Purpose:
 * 1. Extract LEGOs from S0101-S0300 lego_pairs files
 * 2. Build complete LEGO registry (S0001-S0300) for GATE validation
 * 3. Split 200 seeds into 20 agent assignments (10 seeds each)
 * 4. Create 20 agent input JSON files
 */

const fs = require('fs');
const path = require('path');

console.log('=== PHASE 5 BATCH 1 PREPARATION ===\n');

// Step 1: Load LEGO pairs data
console.log('Step 1: Loading LEGO pairs data...');

const legoPairsS0101_S0200 = JSON.parse(
  fs.readFileSync('../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json', 'utf8')
);

const legoPairsS0201_S0360 = JSON.parse(
  fs.readFileSync('../phase3_batch1_s0201_s0360/lego_pairs_s0201_s0360.json', 'utf8')
);

// Also need S0001-S0100 for complete registry
const mainLegoPairs = JSON.parse(
  fs.readFileSync('../public/vfs/courses/spa_for_eng/lego_pairs.json', 'utf8')
);

console.log(`✓ Loaded ${legoPairsS0101_S0200.seeds.length} seeds from S0101-S0200`);
console.log(`✓ Loaded ${legoPairsS0201_S0360.seeds.length} seeds from S0201-S0360`);
console.log(`✓ Loaded main lego_pairs for S0001-S0100\n`);

// Step 2: Build complete LEGO registry (S0001-S0300)
console.log('Step 2: Building LEGO registry (S0001-S0300)...');

const legoRegistry = {
  version: "1.0.0",
  purpose: "Complete LEGO registry for GATE validation",
  range: "S0001-S0300",
  total_legos: 0,
  legos: {}
};

// Helper to extract Spanish words from LEGO
function extractSpanishWords(targetText) {
  if (!targetText) return [];
  // Split by spaces and common punctuation, filter empty
  return targetText
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

// Helper to add LEGOs from a seed
function addLegosFromSeed(seed, sourceRange) {
  if (!seed || !seed.legos) return 0;

  let count = 0;
  for (const lego of seed.legos) {
    if (!legoRegistry.legos[lego.id]) {
      const words = extractSpanishWords(lego.target);
      legoRegistry.legos[lego.id] = {
        id: lego.id,
        type: lego.type,
        target: lego.target,
        known: lego.known,
        source_range: sourceRange,
        spanish_words: words
      };
      count++;
    }
  }
  return count;
}

// Add LEGOs from S0001-S0100 (from main file)
let registryCount = 0;
if (mainLegoPairs.seeds) {
  const s0001_s0100 = mainLegoPairs.seeds.filter(seed => {
    const num = parseInt(seed.seed_id.substring(1));
    return num >= 1 && num <= 100;
  });

  for (const seed of s0001_s0100) {
    registryCount += addLegosFromSeed(seed, 'S0001-S0100');
  }
  console.log(`  Added ${registryCount} LEGOs from S0001-S0100`);
}

// Add LEGOs from S0101-S0200
const count101_200 = legoPairsS0101_S0200.seeds.reduce((acc, seed) => {
  return acc + addLegosFromSeed(seed, 'S0101-S0200');
}, 0);
registryCount += count101_200;
console.log(`  Added ${count101_200} LEGOs from S0101-S0200`);

// Add LEGOs from S0201-S0300
const seeds201_300 = legoPairsS0201_S0360.seeds.filter(seed => {
  const num = parseInt(seed.seed_id.substring(1));
  return num >= 201 && num <= 300;
});
const count201_300 = seeds201_300.reduce((acc, seed) => {
  return acc + addLegosFromSeed(seed, 'S0201-S0300');
}, 0);
registryCount += count201_300;
console.log(`  Added ${count201_300} LEGOs from S0201-S0300`);

legoRegistry.total_legos = Object.keys(legoRegistry.legos).length;
console.log(`✓ Registry complete: ${legoRegistry.total_legos} total LEGOs\n`);

// Save registry
fs.writeFileSync(
  'registry/lego_registry_s0001_s0300.json',
  JSON.stringify(legoRegistry, null, 2)
);
console.log('✓ Saved: registry/lego_registry_s0001_s0300.json\n');

// Step 3: Extract seeds S0101-S0300 for basket generation
console.log('Step 3: Extracting seeds S0101-S0300...');

const targetSeeds = [
  ...legoPairsS0101_S0200.seeds,
  ...seeds201_300
];

console.log(`✓ Extracted ${targetSeeds.length} seeds for basket generation\n`);

// Step 4: Split into 20 agent assignments (10 seeds each)
console.log('Step 4: Splitting into 20 agent assignments...');

const AGENTS = 20;
const SEEDS_PER_AGENT = 10;

for (let agentNum = 1; agentNum <= AGENTS; agentNum++) {
  const startIdx = (agentNum - 1) * SEEDS_PER_AGENT;
  const endIdx = startIdx + SEEDS_PER_AGENT;
  const agentSeeds = targetSeeds.slice(startIdx, endIdx);

  const agentInput = {
    agent_id: agentNum,
    agent_name: `agent_${String(agentNum).padStart(2, '0')}`,
    seed_range: `${agentSeeds[0].seed_id}-${agentSeeds[agentSeeds.length - 1].seed_id}`,
    total_seeds: agentSeeds.length,
    registry_path: '../registry/lego_registry_s0001_s0300.json',
    spec_path: '../docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md',
    seeds: agentSeeds
  };

  const filename = `batch_input/agent_${String(agentNum).padStart(2, '0')}_seeds.json`;
  fs.writeFileSync(filename, JSON.stringify(agentInput, null, 2));

  console.log(`  ✓ Agent ${String(agentNum).padStart(2, '0')}: ${agentInput.seed_range} (${agentSeeds.length} seeds)`);
}

console.log(`\n✓ Created 20 agent input files in batch_input/\n`);

console.log('=== PREPARATION COMPLETE ===');
console.log(`\nNext step: Launch 20 parallel agents for basket generation`);
console.log(`Each agent will generate 10 baskets per seed (10 practice phrases per LEGO)\n`);

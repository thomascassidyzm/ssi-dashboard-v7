#!/usr/bin/env node

/**
 * Phase 5 Batch 2 Preparation Script
 * S0301-S0500 (200 seeds, 10 agents × 20 seeds each)
 */

const fs = require('fs');
const path = require('path');

console.log('=== PHASE 5 BATCH 2 PREPARATION ===\n');

// Load LEGO pairs data
console.log('Step 1: Loading LEGO pairs data...');

const legoPairsS0201_S0360 = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../phase3_batch1_s0201_s0360/lego_pairs_s0201_s0360.json'), 'utf8')
);

const legoPairsS0361_S0520 = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json'), 'utf8')
);

const mainLegoPairs = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json'), 'utf8')
);

console.log(`✓ Loaded S0201-S0360 batch`);
console.log(`✓ Loaded S0361-S0520 batch`);
console.log(`✓ Loaded main lego_pairs\n`);

// Step 2: Build complete LEGO registry (S0001-S0500)
console.log('Step 2: Building LEGO registry (S0001-S0500)...');

const legoRegistry = {
  version: "1.0.0",
  purpose: "Complete LEGO registry for GATE validation",
  range: "S0001-S0500",
  total_legos: 0,
  legos: {}
};

function extractSpanishWords(targetText) {
  if (!targetText) return [];
  return targetText
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

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

// Add LEGOs from S0001-S0100
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

// Add from Batch 1 test (S0101-S0200)
const legoPairsS0101_S0200 = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json'), 'utf8')
);
const count101_200 = legoPairsS0101_S0200.seeds.reduce((acc, seed) => {
  return acc + addLegosFromSeed(seed, 'S0101-S0200');
}, 0);
registryCount += count101_200;
console.log(`  Added ${count101_200} LEGOs from S0101-S0200`);

// Add S0201-S0360
const count201_360 = legoPairsS0201_S0360.seeds.reduce((acc, seed) => {
  return acc + addLegosFromSeed(seed, 'S0201-S0360');
}, 0);
registryCount += count201_360;
console.log(`  Added ${count201_360} LEGOs from S0201-S0360`);

// Add S0361-S0500
const seeds361_500 = legoPairsS0361_S0520.seeds.filter(seed => {
  const num = parseInt(seed.seed_id.substring(1));
  return num >= 361 && num <= 500;
});
const count361_500 = seeds361_500.reduce((acc, seed) => {
  return acc + addLegosFromSeed(seed, 'S0361-S0500');
}, 0);
registryCount += count361_500;
console.log(`  Added ${count361_500} LEGOs from S0361-S0500`);

legoRegistry.total_legos = Object.keys(legoRegistry.legos).length;
console.log(`✓ Registry complete: ${legoRegistry.total_legos} total LEGOs\n`);

fs.writeFileSync(
  'registry/lego_registry_s0001_s0500.json',
  JSON.stringify(legoRegistry, null, 2)
);
console.log('✓ Saved: registry/lego_registry_s0001_s0500.json\n');

// Step 3: Extract seeds S0301-S0500
console.log('Step 3: Extracting seeds S0301-S0500...');

const seeds301_360 = legoPairsS0201_S0360.seeds.filter(seed => {
  const num = parseInt(seed.seed_id.substring(1));
  return num >= 301 && num <= 360;
});

const targetSeeds = [...seeds301_360, ...seeds361_500];
console.log(`✓ Extracted ${targetSeeds.length} seeds for basket generation\n`);

// Step 4: Split into 10 agent assignments (20 seeds each)
console.log('Step 4: Splitting into 10 agent assignments (20 seeds each)...');

const AGENTS = 10;
const SEEDS_PER_AGENT = 20;

for (let agentNum = 1; agentNum <= AGENTS; agentNum++) {
  const startIdx = (agentNum - 1) * SEEDS_PER_AGENT;
  const endIdx = startIdx + SEEDS_PER_AGENT;
  const agentSeeds = targetSeeds.slice(startIdx, endIdx);

  const agentInput = {
    agent_id: agentNum,
    agent_name: `agent_${String(agentNum).padStart(2, '0')}`,
    seed_range: `${agentSeeds[0].seed_id}-${agentSeeds[agentSeeds.length - 1].seed_id}`,
    total_seeds: agentSeeds.length,
    registry_path: '../registry/lego_registry_s0001_s0500.json',
    spec_path: '../docs/phase_intelligence/AGENT_PROMPT_phase5_basket_generation_v4_VALIDATED.md',
    seeds: agentSeeds
  };

  const filename = `batch_input/agent_${String(agentNum).padStart(2, '0')}_seeds.json`;
  fs.writeFileSync(filename, JSON.stringify(agentInput, null, 2));

  console.log(`  ✓ Agent ${String(agentNum).padStart(2, '0')}: ${agentInput.seed_range} (${agentSeeds.length} seeds)`);
}

console.log(`\n✓ Created 10 agent input files in batch_input/\n`);

console.log('=== PREPARATION COMPLETE ===');
console.log(`\nBatch 2 ready: 10 agents × 20 seeds each = 200 seeds total`);
console.log(`Registry: ${legoRegistry.total_legos} LEGOs available (S0001-S0500)\n`);

#!/usr/bin/env node

/**
 * Phase 5: Prepare agent-level scaffolds for S0001-S0100
 * Groups individual seed scaffolds into 5 agent batches
 */

const fs = require('fs');
const path = require('path');

const SCAFFOLDS_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_scaffolds');
const NUM_AGENTS = 5;
const SEEDS_PER_AGENT = 20;

console.log('🧺 Phase 5: Preparing agent-level scaffolds for S0001-S0100');
console.log('='.repeat(60));

// Create agent batches
for (let agentNum = 1; agentNum <= NUM_AGENTS; agentNum++) {
  const startSeed = (agentNum - 1) * SEEDS_PER_AGENT + 1;
  const endSeed = agentNum * SEEDS_PER_AGENT;

  const seeds = {};

  // Load all seed scaffolds for this agent
  for (let seedNum = startSeed; seedNum <= endSeed; seedNum++) {
    const seedId = `S${String(seedNum).padStart(4, '0')}`;
    const seedFile = path.join(SCAFFOLDS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);

    if (fs.existsSync(seedFile)) {
      const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
      seeds[seedId] = seedData;
    }
  }

  const agentData = {
    version: "curated_v7_spanish",
    agent_id: agentNum,
    seed_range: `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`,
    generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
    seeds: seeds
  };

  const agentFile = path.join(SCAFFOLDS_DIR, `agent_${String(agentNum).padStart(2, '0')}.json`);
  fs.writeFileSync(agentFile, JSON.stringify(agentData, null, 2), 'utf8');

  console.log(`✓ Agent ${agentNum}: ${agentFile} (Seeds S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}, ${Object.keys(seeds).length} seeds)`);
}

console.log('');
console.log('✅ Agent-level scaffolds created!');
console.log('Ready to spawn 5 parallel agents for basket generation.');

#!/usr/bin/env node

/**
 * Phase 5: Prepare basket generation batches for S0101-S0200
 *
 * Strategy: 20 agents × ~14 LEGOs each (273 new LEGOs / 20 agents)
 *
 * Input: phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
 * Output: phase5_baskets_s0101_s0200/batch_input/*.json
 */

const fs = require('fs');
const path = require('path');

const LEGO_PAIRS_PATH = path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json');
const OUTPUT_DIR = path.join(__dirname, '../phase5_baskets_s0101_s0200/batch_input');

console.log('🧺 Phase 5: Preparing basket generation batches');
console.log('='.repeat(60));

// Load lego_pairs
const legoPairsData = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

// Extract NEW LEGOs only (agents generate baskets for new LEGOs only)
const newLEGOs = [];
for (const seed of legoPairsData.seeds) {
  for (const lego of seed.legos) {
    if (lego.new) {
      newLEGOs.push({
        lego_id: lego.id,
        seed_id: seed.seed_id,
        type: lego.type,
        target: lego.target,
        known: lego.known,
        components: lego.components || null,
        cumulative_legos: seed.cumulative_legos
      });
    }
  }
}

console.log(`✓ Found ${newLEGOs.length} NEW LEGOs to generate baskets for`);
console.log('');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Split into 20 agent batches
const NUM_AGENTS = 20;
const legosPerAgent = Math.ceil(newLEGOs.length / NUM_AGENTS);

console.log(`📊 Splitting into ${NUM_AGENTS} agent batches (~${legosPerAgent} LEGOs each)`);
console.log('');

for (let agentNum = 1; agentNum <= NUM_AGENTS; agentNum++) {
  const startIdx = (agentNum - 1) * legosPerAgent;
  const endIdx = Math.min(startIdx + legosPerAgent, newLEGOs.length);
  const agentLEGOs = newLEGOs.slice(startIdx, endIdx);

  if (agentLEGOs.length === 0) continue;

  const batchData = {
    agent_number: agentNum,
    total_agents: NUM_AGENTS,
    lego_range: {
      start: agentLEGOs[0].lego_id,
      end: agentLEGOs[agentLEGOs.length - 1].lego_id
    },
    seed_range: {
      start: agentLEGOs[0].seed_id,
      end: agentLEGOs[agentLEGOs.length - 1].seed_id
    },
    total_legos: agentLEGOs.length,
    legos: agentLEGOs
  };

  const filename = `agent_${String(agentNum).padStart(2, '0')}_legos.json`;
  const filepath = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(batchData, null, 2), 'utf8');

  console.log(`✓ Agent ${String(agentNum).padStart(2, ' ')}: ${filename} (${agentLEGOs.length} LEGOs, ${agentLEGOs[0].lego_id} to ${agentLEGOs[agentLEGOs.length - 1].lego_id})`);
}

console.log('');
console.log('✅ Batch preparation complete!');
console.log('');
console.log('Next steps:');
console.log('1. Launch 20 agents in parallel');
console.log('2. Each agent generates baskets for their LEGOs');
console.log('3. Merge all basket files');
console.log('4. Validate against GATE constraints');
console.log('');
console.log('Estimated time: ~30-40 minutes (20 agents × ~14 LEGOs × 2-3 min/LEGO)');

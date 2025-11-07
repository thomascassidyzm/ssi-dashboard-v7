#!/usr/bin/env node

/**
 * Phase 5: Merge basket generation outputs from parallel agents
 *
 * Merges 20 agent basket files into single output file
 *
 * Input: phase5_baskets_s0101_s0200/batch_output/agent_XX_baskets.json (20 files)
 * Output: phase5_baskets_s0101_s0200/lego_baskets_s0101_s0200.json
 *
 * Usage: node scripts/phase5_merge_baskets.cjs
 */

const fs = require('fs');
const path = require('path');

const BATCH_OUTPUT_DIR = path.join(__dirname, '../phase5_baskets_s0101_s0200/batch_output');
const OUTPUT_FILE = path.join(__dirname, '../phase5_baskets_s0101_s0200/lego_baskets_s0101_s0200.json');

console.log('🧺 Phase 5: Merging basket generation outputs');
console.log('='.repeat(60));
console.log('');

// Ensure output directory exists
if (!fs.existsSync(BATCH_OUTPUT_DIR)) {
  console.error(`❌ Batch output directory not found: ${BATCH_OUTPUT_DIR}`);
  console.error('   Run Phase 5 agents first to generate baskets');
  process.exit(1);
}

// Collect all agent basket files
const agentFiles = fs.readdirSync(BATCH_OUTPUT_DIR)
  .filter(f => f.startsWith('agent_') && f.endsWith('_baskets.json'))
  .sort();

if (agentFiles.length === 0) {
  console.error('❌ No agent basket files found in batch_output/');
  console.error('   Expected: agent_01_baskets.json, agent_02_baskets.json, ...');
  process.exit(1);
}

console.log(`✓ Found ${agentFiles.length} agent basket files`);
console.log('');

// Merge all baskets
const mergedBaskets = {};
let totalBasketsProcessed = 0;
let totalAgentsProcessed = 0;

for (const filename of agentFiles) {
  const filepath = path.join(BATCH_OUTPUT_DIR, filename);
  console.log(`Processing: ${filename}`);

  try {
    const agentData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    if (!agentData.baskets || typeof agentData.baskets !== 'object') {
      console.error(`  ⚠️  Invalid format: missing or invalid "baskets" field`);
      continue;
    }

    const agentNumber = agentData.agent_number;
    const basketCount = Object.keys(agentData.baskets).length;

    // Merge baskets
    for (const [legoId, basket] of Object.entries(agentData.baskets)) {
      if (mergedBaskets[legoId]) {
        console.error(`  ⚠️  Duplicate basket for ${legoId} (keeping first)`);
        continue;
      }
      mergedBaskets[legoId] = basket;
    }

    console.log(`  ✓ Agent ${agentNumber}: ${basketCount} baskets merged`);
    totalBasketsProcessed += basketCount;
    totalAgentsProcessed++;

  } catch (err) {
    console.error(`  ❌ Error processing ${filename}: ${err.message}`);
  }
}

console.log('');
console.log('📊 Merge Summary:');
console.log(`  - Agents processed: ${totalAgentsProcessed}`);
console.log(`  - Total baskets: ${totalBasketsProcessed}`);
console.log('');

// Write merged output
const output = {
  metadata: {
    generated_at: new Date().toISOString(),
    range: 'S0101-S0200',
    total_baskets: totalBasketsProcessed,
    agents_count: totalAgentsProcessed
  },
  baskets: mergedBaskets
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

console.log(`✅ Merged baskets written to: ${path.basename(OUTPUT_FILE)}`);
console.log('');
console.log('Next steps:');
console.log('1. Validate: node scripts/phase5_validate_baskets.cjs');
console.log('2. Merge with existing baskets (S0001-S0100)');
console.log('');

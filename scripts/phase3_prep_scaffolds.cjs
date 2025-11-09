#!/usr/bin/env node

/**
 * Phase 3 Scaffold Preparation - Mechanical Prep for LEGO Extraction
 *
 * This script does ALL the mechanical work so AI only does linguistic intelligence:
 * 1. Reads seed_pairs.json
 * 2. Splits into 34 agent batches (20 seeds each)
 * 3. Builds incremental FCFS registry for each agent
 * 4. Generates scaffold files
 *
 * Usage: node scripts/phase3_prep_scaffolds.cjs <courseDir>
 *
 * Reads: <courseDir>/seed_pairs.json
 * Writes: <courseDir>/phase3_scaffolds/agent_XX.json (34 files)
 */

const fs = require('fs-extra');
const path = require('path');

async function preparePhase3Scaffolds(courseDir) {
  console.log(`[Phase 3 Prep] Starting scaffold generation for: ${courseDir}`);

  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  // Check if seed_pairs.json exists
  if (!await fs.pathExists(seedPairsPath)) {
    throw new Error(`seed_pairs.json not found at: ${seedPairsPath}`);
  }

  // Load seed pairs
  const seedPairs = await fs.readJson(seedPairsPath);
  const translations = seedPairs.translations;
  const seedIds = Object.keys(translations).sort(); // Alphanumeric sort

  console.log(`[Phase 3 Prep] Loaded ${seedIds.length} seeds from seed_pairs.json`);

  // Configuration
  const SEEDS_PER_AGENT = 20;
  const totalAgents = Math.ceil(seedIds.length / SEEDS_PER_AGENT);

  console.log(`[Phase 3 Prep] Splitting into ${totalAgents} agents (${SEEDS_PER_AGENT} seeds each)`);

  // Create output directory
  const scaffoldsDir = path.join(courseDir, 'phase3_scaffolds');
  await fs.ensureDir(scaffoldsDir);

  // Track cumulative LEGOs for FCFS registry
  const cumulativeLegos = [];

  // Generate scaffold for each agent
  for (let agentNum = 1; agentNum <= totalAgents; agentNum++) {
    const startIdx = (agentNum - 1) * SEEDS_PER_AGENT;
    const endIdx = Math.min(startIdx + SEEDS_PER_AGENT, seedIds.length);
    const agentSeedIds = seedIds.slice(startIdx, endIdx);

    const startSeed = parseInt(agentSeedIds[0].substring(1)); // Remove 'S' prefix
    const endSeed = parseInt(agentSeedIds[agentSeedIds.length - 1].substring(1));

    console.log(`[Phase 3 Prep] Agent ${agentNum}: S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')} (${agentSeedIds.length} seeds)`);

    // Build FCFS registry (only LEGOs from prior agents)
    const fcfsRegistry = [...cumulativeLegos]; // Copy current cumulative

    // Build seeds array for this agent
    const seeds = {};
    for (const seedId of agentSeedIds) {
      const [target, known] = translations[seedId];
      seeds[seedId] = {
        seed_pair: {
          target,
          known
        },
        legos: [], // Agent fills this
        _metadata: {
          seed_id: seedId,
          cumulative_lego_count_before: cumulativeLegos.length
        }
      };
    }

    // Create scaffold
    const scaffold = {
      agent_id: agentNum,
      seed_range: `S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`,
      seeds_count: agentSeedIds.length,
      fcfs_registry: fcfsRegistry,
      fcfs_registry_size: fcfsRegistry.length,
      seeds: seeds,
      _instructions: {
        task: "Extract LEGOs from these seeds using Phase 3 Ultimate Intelligence",
        fcfs_note: "Check fcfs_registry for collisions before marking any LEGO as new",
        output: `Write to: ${courseDir}/phase3_outputs/agent_${String(agentNum).padStart(2, '0')}_provisional.json`
      }
    };

    // Write scaffold
    const scaffoldPath = path.join(scaffoldsDir, `agent_${String(agentNum).padStart(2, '0')}.json`);
    await fs.writeJson(scaffoldPath, scaffold, { spaces: 2 });

    // Simulate adding ~2.5 LEGOs per seed to cumulative registry
    // (Real LEGOs will be added after extraction, but we need estimates for next agent's registry)
    // For now, just note that next agent will load actual LEGOs from previous agents' outputs
  }

  console.log(`[Phase 3 Prep] ✅ Generated ${totalAgents} scaffold files`);
  console.log(`[Phase 3 Prep] Output directory: ${scaffoldsDir}`);

  // Create outputs directory
  const outputsDir = path.join(courseDir, 'phase3_outputs');
  await fs.ensureDir(outputsDir);
  console.log(`[Phase 3 Prep] Created outputs directory: ${outputsDir}`);

  return {
    success: true,
    totalAgents,
    scaffoldsDir,
    outputsDir
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase3_prep_scaffolds.cjs <courseDir>');
    console.error('Example: node scripts/phase3_prep_scaffolds.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  preparePhase3Scaffolds(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 3 scaffolds ready!`);
      console.log(`   Total agents: ${result.totalAgents}`);
      console.log(`   Next step: Run master prompt to spawn agents`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scaffold preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { preparePhase3Scaffolds };

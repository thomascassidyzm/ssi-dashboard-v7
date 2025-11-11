#!/usr/bin/env node

/**
 * Phase 5 Scaffold Preparation - Mechanical Prep for Basket Generation
 *
 * This script does ALL the mechanical work so AI only does linguistic intelligence:
 * 1. Reads lego_pairs.json
 * 2. Builds whitelist using 3-category rule (A-types, M-types, M-components)
 * 3. Splits into 34 agent batches (20 seeds each)
 * 4. Generates scaffold files with empty practice_phrases arrays
 * 5. Marks final LEGOs in each seed
 *
 * Usage: node scripts/phase5_prep_scaffolds.cjs <courseDir>
 *
 * Reads: <courseDir>/lego_pairs.json
 * Writes: <courseDir>/phase5_scaffolds/agent_XX.json (34 files)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Extract individual Spanish words from text
 */
function extractSpanishWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}""«»]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Build whitelist using 3-category rule up to a specific LEGO count
 *
 * Returns pairs of [target, known] for:
 * Category 1: Atomic LEGOs (A-type) - complete LEGO pair
 * Category 2: Molecular LEGOs (M-type) - complete LEGO pair
 * Category 3: Component pairs from M-type LEGOs (literal translations)
 */
function buildWhitelistUpToLegoCount(legoPairsData, availableLegos) {
  const whitelistPairs = new Map(); // target -> known
  let legoCount = 0;

  for (const seed of legoPairsData.seeds) {
    for (const lego of seed.legos) {
      // Only include new LEGOs in the count
      if (lego.new) {
        if (legoCount >= availableLegos) {
          // Convert Map to array of pairs and sort by target
          return Array.from(whitelistPairs.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
        }
        legoCount++;
      }

      // Add all LEGOs (new and references) to whitelist if within count
      if (legoCount <= availableLegos) {
        // Category 1 & 2: Add the complete LEGO pair (works for both A and M types)
        whitelistPairs.set(lego.target, lego.known);

        // Category 3: If M-type, ALSO add component pairs (literal translations)
        if (lego.type === 'M' && lego.components) {
          for (const [targetComponent, knownComponent] of lego.components) {
            whitelistPairs.set(targetComponent, knownComponent);
          }
        }
      }
    }
  }

  // Convert Map to array of pairs and sort by target
  return Array.from(whitelistPairs.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Generate scaffold for a single seed
 */
function generateSeedScaffold(seed, legoPairsData, cumulativeBeforeSeed) {
  const legos = {};
  const finalLegoIndex = seed.legos.length - 1;
  let legoCount = cumulativeBeforeSeed;

  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];

    // Only generate baskets for NEW LEGOs
    if (!lego.new) continue;

    const isFinalLego = (i === finalLegoIndex);
    const availableLegos = legoCount; // LEGOs available BEFORE this one

    // Build whitelist up to this LEGO (not including current LEGO)
    const whitelistPairs = buildWhitelistUpToLegoCount(legoPairsData, availableLegos);

    legoCount++; // Increment for next LEGO

    const legoData = {
      lego: [lego.known, lego.target],
      type: lego.type,
      available_legos: availableLegos,
      is_final_lego: isFinalLego,
      practice_phrases: [], // AI fills this
      phrase_distribution: {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0
      },
      _metadata: {
        lego_id: lego.id,
        seed_context: {
          target: seed.seed_pair[0],
          known: seed.seed_pair[1]
        },
        whitelist_pairs: whitelistPairs
      }
    };

    // Add components for M-type LEGOs
    if (lego.type === 'M' && lego.components) {
      legoData.components = lego.components;
    }

    legos[lego.id] = legoData;
  }

  // Build recent context (last 5 seeds before this one) with LEGO tiling
  const recentSeeds = {};
  const allSeedsArray = legoPairsData.seeds;
  const currentIndex = allSeedsArray.findIndex(s => s.seed_id === seed.seed_id);

  if (currentIndex > 0) {
    const startIndex = Math.max(0, currentIndex - 5);
    for (let i = startIndex; i < currentIndex; i++) {
      const recentSeed = allSeedsArray[i];

      // Build tiled sentence with pipes separating LEGOs
      const targetTiled = recentSeed.legos.map(l => l.target).join(' | ');
      const knownTiled = recentSeed.legos.map(l => l.known).join(' | ');

      recentSeeds[recentSeed.seed_id] = [targetTiled, knownTiled];
    }
  }

  return {
    seed: seed.seed_id,
    seed_pair: {
      target: seed.seed_pair[0],
      known: seed.seed_pair[1]
    },
    recent_context: recentSeeds,
    legos: legos
  };
}

async function preparePhase5Scaffolds(courseDir) {
  console.log(`[Phase 5 Prep] Starting scaffold generation for: ${courseDir}`);

  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  // Check if lego_pairs.json exists
  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found at: ${legoPairsPath}`);
  }

  // Load LEGO pairs
  const legoPairs = await fs.readJson(legoPairsPath);

  // Handle both array and object formats
  // Array format: {seeds: [{seed_id: "S0001", ...}, ...]}
  // Object format: {seeds: {"S0001": {...}, "S0002": {...}, ...}}
  let seeds = legoPairs.seeds || legoPairs;

  if (!Array.isArray(seeds)) {
    // Convert object format to array
    if (typeof seeds === 'object' && seeds !== null) {
      seeds = Object.keys(seeds)
        .sort()
        .map(seedId => ({
          seed_id: seedId,
          ...seeds[seedId]
        }));
      console.log(`[Phase 5 Prep] Converted object format to array (${seeds.length} seeds)`);
    } else {
      throw new Error('Invalid lego_pairs.json format: seeds should be an array or object');
    }
  }

  console.log(`[Phase 5 Prep] Loaded ${seeds.length} seeds from lego_pairs.json`);

  // Configuration
  const SEEDS_PER_AGENT = 10; // Production standard: 10 seeds per agent
  const totalAgents = Math.ceil(seeds.length / SEEDS_PER_AGENT);

  console.log(`[Phase 5 Prep] Splitting into ${totalAgents} agents (${SEEDS_PER_AGENT} seeds each)`);

  // Create output directory
  const scaffoldsDir = path.join(courseDir, 'phase5_scaffolds');
  await fs.ensureDir(scaffoldsDir);

  // Generate scaffold for each agent
  for (let agentNum = 1; agentNum <= totalAgents; agentNum++) {
    const startIdx = (agentNum - 1) * SEEDS_PER_AGENT;
    const endIdx = Math.min(startIdx + SEEDS_PER_AGENT, seeds.length);
    const agentSeeds = seeds.slice(startIdx, endIdx);

    const firstSeed = agentSeeds[0];
    const lastSeed = agentSeeds[agentSeeds.length - 1];
    const startSeedNum = parseInt(firstSeed.seed_id.substring(1));
    const endSeedNum = parseInt(lastSeed.seed_id.substring(1));

    console.log(`[Phase 5 Prep] Agent ${agentNum}: S${String(startSeedNum).padStart(4, '0')}-S${String(endSeedNum).padStart(4, '0')} (${agentSeeds.length} seeds)`);

    // Build seeds object for this agent
    const seedsScaffold = {};
    let totalNewLegos = 0;
    let cumulativeCount = 0;

    // Calculate cumulative count up to this agent's first seed
    for (const s of seeds) {
      if (s.seed_id === firstSeed.seed_id) break;
      cumulativeCount += s.legos.filter(l => l.new).length;
    }

    for (const seed of agentSeeds) {
      const seedScaffold = generateSeedScaffold(seed, { seeds }, cumulativeCount);

      // Only include seeds that have new LEGOs
      if (Object.keys(seedScaffold.legos).length > 0) {
        seedsScaffold[seed.seed_id] = seedScaffold;
        totalNewLegos += Object.keys(seedScaffold.legos).length;
      }

      // Update cumulative count for next seed
      cumulativeCount += seed.legos.filter(l => l.new).length;
    }

    // Create scaffold
    const scaffold = {
      version: "curated_v7_spanish",
      agent_id: agentNum,
      seed_range: `S${String(startSeedNum).padStart(4, '0')}-S${String(endSeedNum).padStart(4, '0')}`,
      generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
      seeds: seedsScaffold,
      _instructions: {
        task: "Fill practice_phrases arrays using Phase 5 Ultimate Intelligence v5.0",
        methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md (v5.0)",
        output: `Write to: ${courseDir}/phase5_outputs/agent_${String(agentNum).padStart(2, '0')}_provisional.json`,
        whitelist_note: "3-category rule applied: A-types, M-types, M-components with literal translations"
      },
      _stats: {
        seeds_in_range: agentSeeds.length,
        seeds_with_new_legos: Object.keys(seedsScaffold).length,
        new_legos_to_generate: totalNewLegos,
        estimated_phrases: totalNewLegos * 10
      }
    };

    // Write scaffold
    const scaffoldPath = path.join(scaffoldsDir, `agent_${String(agentNum).padStart(2, '0')}.json`);
    await fs.writeJson(scaffoldPath, scaffold, { spaces: 2 });

    console.log(`[Phase 5 Prep]   → ${totalNewLegos} new LEGOs, ${totalNewLegos * 10} phrases to generate`);
  }

  console.log(`[Phase 5 Prep] ✅ Generated ${totalAgents} scaffold files`);
  console.log(`[Phase 5 Prep] Output directory: ${scaffoldsDir}`);

  // Create outputs directory
  const outputsDir = path.join(courseDir, 'phase5_outputs');
  await fs.ensureDir(outputsDir);
  console.log(`[Phase 5 Prep] Created outputs directory: ${outputsDir}`);

  // Generate whitelist validation file (for debugging)
  const exampleSeed = seeds[10]; // Use seed 11 as example
  if (exampleSeed) {
    // Calculate cumulative before seed 11
    let cumulative = 0;
    for (let i = 0; i < 10; i++) {
      cumulative += seeds[i].legos.filter(l => l.new).length;
    }

    const whitelistPairs = buildWhitelistUpToLegoCount({ seeds }, cumulative);
    const whitelistDebug = {
      example_seed: exampleSeed.seed_id,
      cumulative_before_seed: cumulative,
      whitelist_size: whitelistPairs.length,
      sample_pairs: whitelistPairs.slice(0, 20),
      note: "This shows how whitelist is built using 3-category rule (LEGO pairs + component pairs)"
    };

    await fs.writeJson(
      path.join(scaffoldsDir, '_whitelist_example.json'),
      whitelistDebug,
      { spaces: 2 }
    );
    console.log(`[Phase 5 Prep] Generated whitelist example: _whitelist_example.json`);
  }

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
    console.error('Usage: node scripts/phase5_prep_scaffolds.cjs <courseDir>');
    console.error('Example: node scripts/phase5_prep_scaffolds.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  preparePhase5Scaffolds(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 5 scaffolds ready!`);
      console.log(`   Total agents: ${result.totalAgents}`);
      console.log(`   Next step: Run master prompt to spawn agents`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scaffold preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { preparePhase5Scaffolds };

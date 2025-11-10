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
 * Build whitelist using 3-category rule
 *
 * Category 1: Atomic LEGOs (A-type) - complete word(s)
 * Category 2: Molecular LEGOs (M-type) - complete phrase split into words
 * Category 3: Component words from M-type LEGOs (literal translations)
 */
function buildWhitelistUpToSeed(legoPairsData, upToSeedId) {
  const whitelist = new Set();
  const wordSources = {}; // Track where each word came from (for debugging)

  for (const seed of legoPairsData.seeds) {
    const seedNum = parseInt(seed.seed_id.substring(1));
    const upToSeedNum = parseInt(upToSeedId.substring(1));

    if (seedNum > upToSeedNum) break;

    for (const lego of seed.legos) {
      // Category 1 & 2: Extract words from target (works for both A and M types)
      const targetWords = extractSpanishWords(lego.target);
      for (const word of targetWords) {
        whitelist.add(word);
        if (!wordSources[word]) wordSources[word] = [];
        wordSources[word].push(`${lego.id}:target`);
      }

      // Category 3: If M-type, ALSO extract component words (literal translations)
      if (lego.type === 'M' && lego.components) {
        for (const [targetComponent, knownComponent] of lego.components) {
          const componentWords = extractSpanishWords(targetComponent);
          for (const word of componentWords) {
            whitelist.add(word);
            if (!wordSources[word]) wordSources[word] = [];
            wordSources[word].push(`${lego.id}:component[${knownComponent}]`);
          }
        }
      }
    }
  }

  return {
    words: Array.from(whitelist).sort(),
    sources: wordSources
  };
}

/**
 * Calculate available_legos for a LEGO
 * (Total cumulative LEGOs before this seed, minus future LEGOs in the same seed)
 */
function calculateAvailableLegos(seed, legoIndex) {
  const cumulativeBeforeSeed = seed.cumulative_legos - seed.legos.length;
  return cumulativeBeforeSeed + legoIndex;
}

/**
 * Generate scaffold for a single seed
 */
function generateSeedScaffold(seed, legoPairsData) {
  const legos = {};
  const finalLegoIndex = seed.legos.length - 1;

  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];

    // Only generate baskets for NEW LEGOs
    if (!lego.new) continue;

    const isFinalLego = (i === finalLegoIndex);
    const availableLegos = calculateAvailableLegos(seed, i);

    // Build whitelist up to this LEGO
    const { words, sources } = buildWhitelistUpToSeed(legoPairsData, seed.seed_id);

    legos[lego.id] = {
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
        whitelist_size: words.length
      }
    };
  }

  return {
    seed: seed.seed_id,
    seed_pair: {
      target: seed.seed_pair[0],
      known: seed.seed_pair[1]
    },
    whitelist: buildWhitelistUpToSeed(legoPairsData, seed.seed_id).words,
    cumulative_legos: seed.cumulative_legos,
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

  // Handle both formats: {seeds: [...]} and {version, seeds: [...]}
  const seeds = legoPairs.seeds || legoPairs;

  if (!Array.isArray(seeds)) {
    throw new Error('Invalid lego_pairs.json format: seeds should be an array');
  }

  console.log(`[Phase 5 Prep] Loaded ${seeds.length} seeds from lego_pairs.json`);

  // Configuration
  const SEEDS_PER_AGENT = 20;
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

    for (const seed of agentSeeds) {
      const seedScaffold = generateSeedScaffold(seed, { seeds });

      // Only include seeds that have new LEGOs
      if (Object.keys(seedScaffold.legos).length > 0) {
        seedsScaffold[seed.seed_id] = seedScaffold;
        totalNewLegos += Object.keys(seedScaffold.legos).length;
      }
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
    const { words, sources } = buildWhitelistUpToSeed({ seeds }, exampleSeed.seed_id);
    const whitelistDebug = {
      example_seed: exampleSeed.seed_id,
      whitelist_size: words.length,
      sample_words: words.slice(0, 50),
      sample_sources: Object.fromEntries(
        Object.entries(sources).slice(0, 10).map(([word, srcs]) => [
          word,
          srcs.slice(0, 3) // First 3 sources
        ])
      ),
      note: "This shows how whitelist is built using 3-category rule"
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

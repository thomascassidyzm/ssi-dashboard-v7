#!/usr/bin/env node

/**
 * Phase 5 Scaffold Preparation - Mechanical Prep for Basket Generation v7.0
 *
 * This script does ALL the mechanical work so AI only does linguistic intelligence:
 * 1. Reads lego_pairs.json
 * 2. Builds recent context (10 most recent seeds with LEGO tiles)
 * 3. Tracks current seed's earlier LEGOs (incremental availability)
 * 4. Generates scaffold files with empty practice_phrases arrays
 * 5. Marks final LEGOs in each seed
 * 6. ALWAYS uses 2-2-2-4 distribution (10 phrases per LEGO)
 *
 * Usage: node scripts/phase5_prep_scaffolds.cjs <courseDir>
 *
 * Reads: <courseDir>/lego_pairs.json
 * Writes: <courseDir>/phase5_scaffolds/seed_sXXXX.json (one per seed)
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
 * Build recent seed pairs (just the sentences, no LEGOs)
 * Provides 10 most recent complete sentences for context
 */
function buildRecentSeedPairs(legoPairsData, currentSeedIndex, maxRecent = 10) {
  const recentSeeds = [];
  const allSeedsArray = legoPairsData.seeds;

  if (currentSeedIndex > 0) {
    const startIndex = Math.max(0, currentSeedIndex - maxRecent);
    for (let i = startIndex; i < currentSeedIndex; i++) {
      const recentSeed = allSeedsArray[i];
      recentSeeds.push({
        seed_id: recentSeed.seed_id,
        known: recentSeed.seed_pair[1],  // Spanish
        target: recentSeed.seed_pair[0]  // English
      });
    }
  }

  return recentSeeds;
}

/**
 * Build list of 30 most recent NEW LEGOs (sliding window)
 * This ensures agents focus on recently introduced vocabulary
 */
function buildRecentNewLegos(legoPairsData, currentSeedIndex, maxLegos = 30) {
  const recentNewLegos = [];
  const allSeedsArray = legoPairsData.seeds;

  // Walk backwards through seeds, collecting NEW LEGOs
  for (let i = currentSeedIndex - 1; i >= 0 && recentNewLegos.length < maxLegos; i--) {
    const seed = allSeedsArray[i];

    // Extract NEW LEGOs from this seed (in reverse order to get most recent first)
    const newLegosInSeed = seed.legos
      .filter(l => l.new)
      .reverse();

    for (const lego of newLegosInSeed) {
      if (recentNewLegos.length >= maxLegos) break;

      recentNewLegos.push({
        id: lego.id,
        known: lego.known,
        target: lego.target,
        type: lego.type
      });
    }
  }

  // Reverse to get chronological order (oldest to newest)
  return recentNewLegos.reverse();
}

/**
 * Build list of earlier LEGOs from current seed (incremental availability)
 * L01 has [], L02 has [L01], L03 has [L01, L02], etc.
 */
function buildCurrentSeedEarlierLegos(seed, currentLegoIndex) {
  const earlierLegos = [];

  for (let i = 0; i < currentLegoIndex; i++) {
    const lego = seed.legos[i];
    if (lego.new) {
      earlierLegos.push({
        id: lego.id,
        known: lego.known,
        target: lego.target,
        type: lego.type
      });
    }
  }

  return earlierLegos;
}

/**
 * Generate scaffold for a single seed
 */
function generateSeedScaffold(seed, legoPairsData, currentSeedIndex) {
  const legos = {};

  // Find index of the LAST NEW LEGO (not just last lego in array)
  let finalNewLegoIndex = -1;
  for (let i = seed.legos.length - 1; i >= 0; i--) {
    if (seed.legos[i].new) {
      finalNewLegoIndex = i;
      break;
    }
  }

  // Build recent context: 10 seed pairs + 30 most recent NEW LEGOs
  const recentSeedPairs = buildRecentSeedPairs(legoPairsData, currentSeedIndex, 10);
  const recentNewLegos = buildRecentNewLegos(legoPairsData, currentSeedIndex, 30);

  // Standard 2-2-2-4 distribution (ALWAYS 10 phrases per LEGO)
  const standardDistribution = {
    short_1_to_2_legos: 2,
    medium_3_legos: 2,
    longer_4_legos: 2,
    longest_5_legos: 4
  };

  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];

    // Only generate baskets for NEW LEGOs
    if (!lego.new) continue;

    const isFinalLego = (i === finalNewLegoIndex);

    // Build list of earlier LEGOs from THIS seed (incremental)
    const currentSeedEarlierLegos = buildCurrentSeedEarlierLegos(seed, i);

    const legoData = {
      lego: [lego.known, lego.target],
      type: lego.type,
      is_final_lego: isFinalLego,
      current_seed_earlier_legos: currentSeedEarlierLegos,
      practice_phrases: [], // AI fills this
      phrase_distribution: standardDistribution,
      target_phrase_count: 10, // ALWAYS 10 phrases
      _metadata: {
        lego_id: lego.id,
        seed_context: {
          known: seed.seed_pair[1],
          target: seed.seed_pair[0]
        }
      }
    };

    // Add components for M-type LEGOs
    if (lego.type === 'M' && lego.components) {
      legoData.components = lego.components;
    }

    legos[lego.id] = legoData;
  }

  return {
    seed_id: seed.seed_id,
    seed_pair: {
      known: seed.seed_pair[1],
      target: seed.seed_pair[0]
    },
    recent_seed_pairs: recentSeedPairs,
    recent_new_legos: recentNewLegos,
    legos: legos
  };
}

async function preparePhase5Scaffolds(courseDir, baseCourseDir = null) {
  console.log(`[Phase 5 Prep] Starting scaffold generation for: ${courseDir}`);

  // For quick tests / segment ranges, read from base course directory
  const sourceDir = baseCourseDir || courseDir;
  const legoPairsPath = path.join(sourceDir, 'lego_pairs.json');

  console.log(`[Phase 5 Prep] Reading lego_pairs.json from: ${sourceDir}`);

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

  console.log(`[Phase 5 Prep] Generating one scaffold per seed for incremental progress tracking`);

  // Create output directory
  const scaffoldsDir = path.join(courseDir, 'phase5_scaffolds');
  await fs.ensureDir(scaffoldsDir);

  // Generate scaffold for each seed individually
  let totalNewLegos = 0;

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex++) {
    const seed = seeds[seedIndex];
    const seedScaffold = generateSeedScaffold(seed, { seeds }, seedIndex);

    // Only create scaffold if seed has new LEGOs
    if (Object.keys(seedScaffold.legos).length === 0) {
      continue;
    }

    const newLegosCount = Object.keys(seedScaffold.legos).length;
    totalNewLegos += newLegosCount;

    console.log(`[Phase 5 Prep] ${seed.seed_id}: ${newLegosCount} LEGOs → ${newLegosCount * 10} phrases (10 recent seeds context)`);

    // Create scaffold
    const scaffold = {
      version: "curated_v7_spanish",
      seed_id: seed.seed_id,
      generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
      seed_pair: seedScaffold.seed_pair,
      recent_seed_pairs: seedScaffold.recent_seed_pairs,
      recent_new_legos: seedScaffold.recent_new_legos,
      legos: seedScaffold.legos,
      _instructions: {
        task: "Fill practice_phrases arrays using Phase 5 Intelligence v7.0",
        methodology: "Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5 OR docs/phase_intelligence/phase_5_lego_baskets.md",
        vocabulary_sources: "10 recent seed pairs + 30 recent NEW LEGOs + current seed's earlier LEGOs + current LEGO",
        distribution: "ALWAYS 2-2-2-4 (10 phrases per LEGO)",
        output: `${courseDir}/phase5_outputs/seed_${seed.seed_id.toLowerCase()}.json`
      },
      _stats: {
        new_legos_in_seed: newLegosCount,
        phrases_to_generate: newLegosCount * 10,
        recent_seed_pairs_count: seedScaffold.recent_seed_pairs.length,
        recent_new_legos_count: seedScaffold.recent_new_legos.length
      }
    };

    // Write scaffold
    const scaffoldPath = path.join(scaffoldsDir, `seed_${seed.seed_id.toLowerCase()}.json`);
    await fs.writeJson(scaffoldPath, scaffold, { spaces: 2 });
  }

  console.log(`[Phase 5 Prep] ✅ Generated ${seeds.length} scaffold files`);
  console.log(`[Phase 5 Prep] Total new LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
  console.log(`[Phase 5 Prep] Output directory: ${scaffoldsDir}`);

  // Create outputs directory
  const outputsDir = path.join(courseDir, 'phase5_outputs');
  await fs.ensureDir(outputsDir);
  console.log(`[Phase 5 Prep] Created outputs directory: ${outputsDir}`);

  return {
    success: true,
    totalSeeds: seeds.length,
    totalNewLegos,
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
      console.log(`   Total seeds: ${result.totalSeeds}`);
      console.log(`   Total LEGOs: ${result.totalNewLegos}`);
      console.log(`   Next step: Process each seed scaffold to generate baskets`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scaffold preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { preparePhase5Scaffolds };

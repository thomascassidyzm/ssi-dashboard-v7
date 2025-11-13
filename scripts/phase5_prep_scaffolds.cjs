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
 * Check overlap level of LEGO with earlier LEGOs in the same seed
 *
 * Returns:
 * - 'complete': ALL words in current LEGO have appeared in earlier LEGOs
 * - 'partial': SOME words overlap, but not all
 * - 'none': No overlap
 */
function checkOverlapLevel(currentLegoTarget, earlierLegosInSeed) {
  const currentWords = currentLegoTarget.toLowerCase().split(/\s+/).filter(Boolean);

  if (currentWords.length === 0) return 'none';

  // Collect all words from earlier LEGOs
  const earlierWords = new Set();
  for (const earlierLego of earlierLegosInSeed) {
    earlierLego.target.toLowerCase().split(/\s+/).filter(Boolean)
      .forEach(word => earlierWords.add(word));
  }

  // Count how many current words appeared earlier
  const overlapCount = currentWords.filter(word => earlierWords.has(word)).length;

  if (overlapCount === 0) return 'none';
  if (overlapCount === currentWords.length) return 'complete';
  return 'partial';
}

/**
 * Generate scaffold for a single seed
 */
function generateSeedScaffold(seed, legoPairsData, cumulativeBeforeSeed) {
  const legos = {};

  // Find index of the LAST NEW LEGO (not just last lego in array)
  let finalNewLegoIndex = -1;
  for (let i = seed.legos.length - 1; i >= 0; i--) {
    if (seed.legos[i].new) {
      finalNewLegoIndex = i;
      break;
    }
  }

  let legoCount = cumulativeBeforeSeed;
  const newLegosInSeed = []; // Track NEW LEGOs for overlap detection

  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];

    // Only generate baskets for NEW LEGOs
    if (!lego.new) continue;

    const isFinalLego = (i === finalNewLegoIndex);
    const availableLegos = legoCount; // LEGOs available BEFORE this one

    // Build whitelist up to this LEGO (not including current LEGO)
    const whitelistPairs = buildWhitelistUpToLegoCount(legoPairsData, availableLegos);

    // Detect overlap with earlier NEW LEGOs in this seed
    const overlapLevel = checkOverlapLevel(lego.target, newLegosInSeed);

    // Determine phrase distribution based on overlap level
    // Note: Bucket names refer to LEGO count, not word count
    let phraseDistribution, targetPhraseCount;
    if (overlapLevel === 'complete') {
      // Minimal set for fully overlapping LEGOs: just 5 longer phrases (3-5 LEGOs)
      phraseDistribution = {
        longer_3_to_5_legos: 5
      };
      targetPhraseCount = 5;
    } else if (overlapLevel === 'partial') {
      // Reduced set for partially overlapping LEGOs
      phraseDistribution = {
        short_1_to_2_legos: 1,
        medium_3_legos: 1,
        longer_4_to_5_legos: 5
      };
      targetPhraseCount = 7;
    } else {
      // Full set for fresh LEGOs: progressive buildup from 1-5 LEGOs
      phraseDistribution = {
        short_1_to_2_legos: 2,
        medium_3_legos: 2,
        longer_4_legos: 2,
        longest_5_legos: 4
      };
      targetPhraseCount = 10;
    }

    legoCount++; // Increment for next LEGO
    newLegosInSeed.push({ id: lego.id, target: lego.target }); // Track for overlap detection

    const legoData = {
      lego: [lego.known, lego.target],
      type: lego.type,
      available_legos: availableLegos,
      is_final_lego: isFinalLego,
      overlap_level: overlapLevel,
      target_phrase_count: targetPhraseCount,
      practice_phrases: [], // AI fills this
      phrase_distribution: phraseDistribution,
      _metadata: {
        lego_id: lego.id,
        seed_context: {
          target: seed.seed_pair[0],
          known: seed.seed_pair[1]
        },
        whitelist_pairs: whitelistPairs,
        available_whitelist_size: whitelistPairs.length
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
  let cumulativeCount = 0;
  let totalNewLegos = 0;

  for (const seed of seeds) {
    const seedScaffold = generateSeedScaffold(seed, { seeds }, cumulativeCount);

    // Only create scaffold if seed has new LEGOs
    if (Object.keys(seedScaffold.legos).length === 0) {
      // Update cumulative count even for seeds with no new LEGOs
      cumulativeCount += seed.legos.filter(l => l.new).length;
      continue;
    }

    const seedNum = parseInt(seed.seed_id.substring(1));
    const newLegosCount = Object.keys(seedScaffold.legos).length;
    totalNewLegos += newLegosCount;

    console.log(`[Phase 5 Prep] ${seed.seed_id}: ${newLegosCount} LEGOs → ${newLegosCount * 10} phrases`);

    // Create scaffold
    const scaffold = {
      version: "curated_v7_spanish",
      seed_id: seed.seed_id,
      generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
      seed_pair: seedScaffold.seed_pair,
      recent_context: seedScaffold.recent_context,
      legos: seedScaffold.legos,
      _instructions: {
        task: "Fill practice_phrases arrays using Phase 5 Ultimate Intelligence v5.0",
        methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md (v5.0)",
        output: `Write to: ${courseDir}/phase5_outputs/seed_${seed.seed_id.toLowerCase()}.json`,
        whitelist_note: "3-category rule applied: A-types, M-types, M-components with literal translations"
      },
      _stats: {
        new_legos_in_seed: newLegosCount,
        phrases_to_generate: newLegosCount * 10,
        cumulative_legos_before: cumulativeCount
      }
    };

    // Write scaffold with whitelist (agent needs it for GATE validation)
    const scaffoldPath = path.join(scaffoldsDir, `seed_${seed.seed_id.toLowerCase()}.json`);
    await fs.writeJson(scaffoldPath, scaffold);

    // Update cumulative count for next seed
    cumulativeCount += seed.legos.filter(l => l.new).length;
  }

  console.log(`[Phase 5 Prep] ✅ Generated ${seeds.length} scaffold files`);
  console.log(`[Phase 5 Prep] Total new LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
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

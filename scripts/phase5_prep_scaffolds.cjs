#!/usr/bin/env node

/**
 * Phase 5 Scaffold Preparation v10.0 - EXPLICIT SLOT CATEGORIES EDITION
 *
 * 🎯 NEW STANDARD: Explicit slot categories with 2-2-2-4+2 structure
 *
 * Key changes from v9:
 * 1. ✅ Practice phrases organized into explicit categories (short/medium/longer/longest/bonus)
 * 2. ✅ Each slot has unique slot_id (short_1, medium_2, longest_4, etc.)
 * 3. ✅ Removed notes field (no agent essays!)
 * 4. ✅ Added lego_id at top level for clarity
 * 5. ✅ phrase wrapped in language-labeled object
 * 6. ✅ lego_count_used field for tracking complexity
 *
 * This script does ALL the mechanical work so AI only does linguistic intelligence:
 * 1. Reads lego_pairs.json (supports v7/v9 formats)
 * 2. Builds recent context (10 most recent seeds with LEGO tiles)
 * 3. Tracks current seed's earlier LEGOs (incremental availability)
 * 4. Generates scaffold files with explicit 2-2-2-4+2 slot structure
 * 5. Marks final LEGOs in each seed
 * 6. ALWAYS uses 2-2-2-4 distribution (10 phrases per LEGO, +2 optional bonus)
 *
 * Usage: node tools/phase-prep/phase5_prep_scaffolds_v10.cjs <courseDir>
 *
 * Reads: <courseDir>/lego_pairs.json
 * Writes: <courseDir>/phase5_scaffolds_v10/seed_sXXXX.json (one per seed)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Detect target language from course directory name
 * Examples: spa_for_eng → spanish, fra_for_eng → french
 */
function detectTargetLanguage(courseDir) {
  const dirName = path.basename(courseDir);
  const match = dirName.match(/^([a-z]{3})_for_([a-z]{3})$/);

  if (!match) {
    throw new Error(`Invalid course directory format: ${dirName}. Expected format: xxx_for_yyy (e.g., spa_for_eng)`);
  }

  const targetCode = match[1];
  const sourceCode = match[2];

  const languageMap = {
    'spa': 'spanish',
    'fra': 'french',
    'deu': 'german',
    'cmn': 'mandarin',
    'ita': 'italian',
    'jpn': 'japanese',
    'kor': 'korean',
    'eng': 'english',
    'por': 'portuguese',
    'rus': 'russian',
    'ara': 'arabic',
    'hin': 'hindi'
  };

  const targetLang = languageMap[targetCode];
  const sourceLang = languageMap[sourceCode];

  if (!targetLang || !sourceLang) {
    throw new Error(`Unknown language code: ${targetCode} or ${sourceCode}`);
  }

  return { targetLang, sourceLang, targetCode, sourceCode };
}

/**
 * Normalize lego_pairs data to v10 format (explicit labels)
 * Handles both v7 (arrays) and v9 (objects) formats
 */
function normalizeLegoData(lego, sourceLang, targetLang) {
  // Handle both array [known, target] and object {english, spanish} formats
  if (Array.isArray(lego.seed_pair)) {
    // v7 format: [English, Spanish] array
    return {
      [sourceLang]: lego.seed_pair[0],
      [targetLang]: lego.seed_pair[1]
    };
  } else if (lego.seed_pair && typeof lego.seed_pair === 'object') {
    // v9 format: {english: "...", spanish: "..."}
    return lego.seed_pair;
  } else {
    // Fallback: labeled fields on lego object
    return {
      [sourceLang]: lego.known || lego[sourceLang],
      [targetLang]: lego.target || lego[targetLang]
    };
  }
}

/**
 * Build recent seed pairs (just the sentences, no LEGOs)
 * Provides 10 most recent complete sentences for context
 */
function buildRecentSeedPairs(legoPairsData, currentSeedIndex, sourceLang, targetLang, maxRecent = 10) {
  const recentSeeds = [];
  const allSeedsArray = legoPairsData.seeds;

  if (currentSeedIndex > 0) {
    const startIndex = Math.max(0, currentSeedIndex - maxRecent);
    for (let i = startIndex; i < currentSeedIndex; i++) {
      const recentSeed = allSeedsArray[i];
      const normalized = normalizeLegoData(recentSeed, sourceLang, targetLang);

      recentSeeds.push({
        seed_id: recentSeed.seed_id,
        [sourceLang]: normalized[sourceLang],
        [targetLang]: normalized[targetLang]
      });
    }
  }

  return recentSeeds;
}

/**
 * Build list of 30 most recent NEW LEGOs (sliding window)
 * This ensures agents focus on recently introduced vocabulary
 */
function buildRecentNewLegos(legoPairsData, currentSeedIndex, sourceLang, targetLang, maxLegos = 30) {
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
        [sourceLang]: lego.known || lego[sourceLang] || '',
        [targetLang]: lego.target || lego[targetLang] || '',
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
function buildCurrentSeedEarlierLegos(seed, currentLegoIndex, sourceLang, targetLang) {
  const earlierLegos = [];

  for (let i = 0; i < currentLegoIndex; i++) {
    const lego = seed.legos[i];
    if (lego.new) {
      earlierLegos.push({
        id: lego.id,
        [sourceLang]: lego.known || lego[sourceLang] || '',
        [targetLang]: lego.target || lego[targetLang] || '',
        type: lego.type
      });
    }
  }

  return earlierLegos;
}

/**
 * Create v10 practice phrase structure with explicit slot categories
 * 2-2-2-4+2 distribution: short(2) + medium(2) + longer(2) + longest(4) + bonus(2)
 */
function createV10PhraseStructure(sourceLang, targetLang) {
  return {
    short_1_to_2_legos: {
      description: "Short phrases using 1-2 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        {
          slot_id: "short_1",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "short_2",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        }
      ]
    },
    medium_3_legos: {
      description: "Medium phrases using exactly 3 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        {
          slot_id: "medium_1",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "medium_2",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        }
      ]
    },
    longer_4_legos: {
      description: "Longer phrases using exactly 4 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        {
          slot_id: "longer_1",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "longer_2",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        }
      ]
    },
    longest_5_legos: {
      description: "Longest phrases using 5+ LEGOs (fill 4 slots)",
      target_count: 4,
      slots: [
        {
          slot_id: "longest_1",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "longest_2",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "longest_3",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "longest_4",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        }
      ]
    },
    bonus_optional: {
      description: "OPTIONAL bonus phrases for extra practice or refinement (0-2 slots)",
      target_count: 0,
      max_count: 2,
      slots: [
        {
          slot_id: "bonus_1",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        },
        {
          slot_id: "bonus_2",
          phrase: {
            [sourceLang]: "",
            [targetLang]: ""
          },
          lego_count_used: null
        }
      ]
    }
  };
}

/**
 * Generate scaffold for a single seed
 */
function generateSeedScaffold(seed, legoPairsData, currentSeedIndex, sourceLang, targetLang) {
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
  const recentSeedPairs = buildRecentSeedPairs(legoPairsData, currentSeedIndex, sourceLang, targetLang, 10);
  const recentNewLegos = buildRecentNewLegos(legoPairsData, currentSeedIndex, sourceLang, targetLang, 30);

  for (let i = 0; i < seed.legos.length; i++) {
    const lego = seed.legos[i];

    // Only generate baskets for NEW LEGOs
    if (!lego.new) continue;

    const isFinalLego = (i === finalNewLegoIndex);

    // Build list of earlier LEGOs from THIS seed (incremental)
    const currentSeedEarlierLegos = buildCurrentSeedEarlierLegos(seed, i, sourceLang, targetLang);

    const legoData = {
      lego_id: lego.id, // ← TOP LEVEL LEGO ID!
      lego: {
        [sourceLang]: lego.known || lego[sourceLang] || '',
        [targetLang]: lego.target || lego[targetLang] || ''
      },
      type: lego.type,
      is_final_lego: isFinalLego,
      current_seed_earlier_legos: currentSeedEarlierLegos,
      practice_phrases: createV10PhraseStructure(sourceLang, targetLang), // v10 structure!
      total_required_phrases: 10,
      total_optional_phrases: 2,
      _metadata: {
        lego_id: lego.id,
        seed_context: normalizeLegoData(seed, sourceLang, targetLang)
      }
    };

    // Add components for M-type LEGOs
    if (lego.type === 'M' && lego.components) {
      // Normalize components to labeled format
      legoData.components = lego.components.map(comp => {
        if (Array.isArray(comp)) {
          return {
            [targetLang]: comp[0],
            [sourceLang]: comp[1]
          };
        }
        return comp; // Already in object format
      });
    }

    legos[lego.id] = legoData;
  }

  const seedPairNormalized = normalizeLegoData(seed, sourceLang, targetLang);

  return {
    seed_id: seed.seed_id,
    seed_pair: seedPairNormalized,
    recent_seed_pairs: recentSeedPairs,
    recent_new_legos: recentNewLegos,
    legos: legos
  };
}

async function preparePhase5Scaffolds(courseDir, options = {}) {
  // Support both old signature (courseDir, baseCourseDir) and new (courseDir, {baseCourseDir, legoIds})
  const baseCourseDir = typeof options === 'string' ? options : options.baseCourseDir;
  const legoIdsFilter = options.legoIds || null;

  // Detect languages from course directory
  const { targetLang, sourceLang, targetCode, sourceCode } = detectTargetLanguage(courseDir);

  console.log(`[Phase 5 Prep v10] Starting scaffold generation for: ${courseDir}`);
  console.log(`[Phase 5 Prep v10] Languages: ${sourceLang} → ${targetLang} (${sourceCode}_for_${targetCode})`);
  console.log(`[Phase 5 Prep v10] Format: Explicit slot categories (2-2-2-4+2 structure)`);

  if (legoIdsFilter) {
    console.log(`[Phase 5 Prep v10] Filtering to ${legoIdsFilter.length} specific LEGO_IDs (regeneration mode)`);
  }

  // For quick tests / segment ranges, read from base course directory
  const sourceDir = baseCourseDir || courseDir;
  const legoPairsPath = path.join(sourceDir, 'lego_pairs.json');

  console.log(`[Phase 5 Prep v10] Reading lego_pairs.json from: ${sourceDir}`);

  // Check if lego_pairs.json exists
  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found at: ${legoPairsPath}`);
  }

  // Load LEGO pairs
  const legoPairs = await fs.readJson(legoPairsPath);

  // Handle both array and object formats
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
      console.log(`[Phase 5 Prep v10] Converted object format to array (${seeds.length} seeds)`);
    } else {
      throw new Error('Invalid lego_pairs.json format: seeds should be an array or object');
    }
  }

  console.log(`[Phase 5 Prep v10] Loaded ${seeds.length} seeds from lego_pairs.json`);
  console.log(`[Phase 5 Prep v10] Generating one scaffold per seed for incremental progress tracking`);

  // Create output directory
  const scaffoldsDir = path.join(courseDir, 'phase5_scaffolds_v10');
  await fs.ensureDir(scaffoldsDir);

  // Generate scaffold for each seed individually
  let totalNewLegos = 0;
  let filteredScaffoldCount = 0;

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex++) {
    const seed = seeds[seedIndex];
    const seedScaffold = generateSeedScaffold(seed, { seeds }, seedIndex, sourceLang, targetLang);

    // Only create scaffold if seed has new LEGOs
    if (Object.keys(seedScaffold.legos).length === 0) {
      continue;
    }

    // If legoIds filter is provided, only include LEGOs that match
    if (legoIdsFilter) {
      const filteredLegos = {};
      Object.keys(seedScaffold.legos).forEach(legoId => {
        if (legoIdsFilter.includes(legoId)) {
          filteredLegos[legoId] = seedScaffold.legos[legoId];
        }
      });

      // Skip this seed if no LEGOs match the filter
      if (Object.keys(filteredLegos).length === 0) {
        continue;
      }

      seedScaffold.legos = filteredLegos;
    }

    const newLegosCount = Object.keys(seedScaffold.legos).length;
    totalNewLegos += newLegosCount;
    filteredScaffoldCount++;

    console.log(`[Phase 5 Prep v10] ${seed.seed_id}: ${newLegosCount} LEGOs → ${newLegosCount * 10} phrases (2-2-2-4+2 structure)`);

    // Create scaffold
    const scaffold = {
      version: "v10.0_explicit_slot_categories",
      seed_id: seed.seed_id,
      generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
      languages: {
        source: sourceLang,
        target: targetLang,
        course: `${targetCode}_for_${sourceCode}`
      },
      seed_pair: seedScaffold.seed_pair,
      recent_seed_pairs: seedScaffold.recent_seed_pairs,
      recent_new_legos: seedScaffold.recent_new_legos,
      legos: seedScaffold.legos,
      _instructions: {
        task: "Fill practice_phrases using Phase 5 Intelligence v10.0",
        methodology: "Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5 OR docs/phase_intelligence/phase_5_lego_baskets.md",
        vocabulary_sources: "10 recent seed pairs + 30 recent NEW LEGOs + current seed's earlier LEGOs + current LEGO",
        distribution: "ALWAYS 2-2-2-4 (10 required phrases) + 0-2 optional bonus phrases",
        slot_categories: {
          short_1_to_2_legos: "2 slots using 1-2 LEGOs each",
          medium_3_legos: "2 slots using exactly 3 LEGOs each",
          longer_4_legos: "2 slots using exactly 4 LEGOs each",
          longest_5_legos: "4 slots using 5+ LEGOs each",
          bonus_optional: "0-2 optional bonus slots (only if exceptional phrases)"
        },
        phrase_format: `phrase: {${sourceLang}: "...", ${targetLang}: "..."}, lego_count_used: N`,
        output_upload: "POST to ngrok endpoint: /phase5/upload-basket",
        output_file: `${courseDir}/phase5_outputs_v10/seed_${seed.seed_id.toLowerCase()}.json`
      },
      _stats: {
        new_legos_in_seed: newLegosCount,
        phrases_to_generate: newLegosCount * 10,
        required_phrases_per_lego: 10,
        optional_phrases_per_lego: 2,
        recent_seed_pairs_count: seedScaffold.recent_seed_pairs.length,
        recent_new_legos_count: seedScaffold.recent_new_legos.length
      }
    };

    // Write scaffold
    const scaffoldPath = path.join(scaffoldsDir, `seed_${seed.seed_id.toLowerCase()}.json`);
    await fs.writeJson(scaffoldPath, scaffold, { spaces: 2 });
  }

  if (legoIdsFilter) {
    console.log(`[Phase 5 Prep v10] ✅ Generated ${filteredScaffoldCount} scaffold files (filtered from ${seeds.length} total seeds)`);
    console.log(`[Phase 5 Prep v10] Filtered LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
  } else {
    console.log(`[Phase 5 Prep v10] ✅ Generated ${filteredScaffoldCount} scaffold files`);
    console.log(`[Phase 5 Prep v10] Total new LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
  }
  console.log(`[Phase 5 Prep v10] Output directory: ${scaffoldsDir}`);

  // Create outputs directory
  const outputsDir = path.join(courseDir, 'phase5_outputs_v10');
  await fs.ensureDir(outputsDir);
  console.log(`[Phase 5 Prep v10] Created outputs directory: ${outputsDir}`);

  return {
    success: true,
    totalSeeds: seeds.length,
    totalNewLegos,
    scaffoldsDir,
    outputsDir,
    languages: { sourceLang, targetLang, targetCode, sourceCode }
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node tools/phase-prep/phase5_prep_scaffolds_v10.cjs <courseDir>');
    console.error('');
    console.error('Examples:');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v10.cjs public/vfs/courses/fra_for_eng');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v10.cjs public/vfs/courses/deu_for_eng');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v10.cjs public/vfs/courses/cmn_for_eng');
    console.error('');
    console.error('Features:');
    console.error('  ✅ Explicit slot categories (short/medium/longer/longest/bonus)');
    console.error('  ✅ 2-2-2-4+2 structure (10 required + 2 optional)');
    console.error('  ✅ Language-agnostic (auto-detects from directory name)');
    console.error('  ✅ No notes field (prevents agent essays)');
    console.error('  ✅ lego_id at top level');
    console.error('  ✅ lego_count_used tracking');
    process.exit(1);
  }

  preparePhase5Scaffolds(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 5 v10 scaffolds ready!`);
      console.log(`   Languages: ${result.languages.sourceLang} → ${result.languages.targetLang}`);
      console.log(`   Total seeds: ${result.totalSeeds}`);
      console.log(`   Total LEGOs: ${result.totalNewLegos}`);
      console.log(`   Format: Explicit slot categories (2-2-2-4+2)`);
      console.log(`   Next step: Process each seed scaffold to generate baskets`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scaffold preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { preparePhase5Scaffolds };

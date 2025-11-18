#!/usr/bin/env node

/**
 * Phase 5 Scaffold Preparation v9.0 - EXPLICIT LABELS EDITION
 *
 * 🎯 NEW STANDARD: Explicit labels prevent position-based confusion
 *
 * Key changes from v7:
 * 1. ✅ Uses language-specific field names (english/spanish, not known/target)
 * 2. ✅ practice_phrases has 12 pre-allocated slots with explicit labels
 * 3. ✅ All arrays converted to labeled objects
 * 4. ✅ Language-agnostic (detects from course directory name)
 *
 * This script does ALL the mechanical work so AI only does linguistic intelligence:
 * 1. Reads lego_pairs.json (supports both v7 and v9 formats)
 * 2. Builds recent context (10 most recent seeds with LEGO tiles)
 * 3. Tracks current seed's earlier LEGOs (incremental availability)
 * 4. Generates scaffold files with 12 empty practice_phrases slots
 * 5. Marks final LEGOs in each seed
 * 6. ALWAYS uses 2-2-2-4 distribution (10 phrases per LEGO)
 *
 * Usage: node tools/phase-prep/phase5_prep_scaffolds_v9.cjs <courseDir>
 *
 * Reads: <courseDir>/lego_pairs.json
 * Writes: <courseDir>/phase5_scaffolds/seed_sXXXX.json (one per seed)
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
 * Normalize lego_pairs data to v9 format (explicit labels)
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
 * Create 12 empty practice phrase slots with explicit labels
 */
function createEmptyPhraseSlots(sourceLang, targetLang) {
  const slots = [];
  for (let i = 0; i < 12; i++) {
    slots.push({
      [sourceLang]: "",
      [targetLang]: "",
      notes: ""
    });
  }
  return slots;
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
    const currentSeedEarlierLegos = buildCurrentSeedEarlierLegos(seed, i, sourceLang, targetLang);

    const legoData = {
      lego: {
        [sourceLang]: lego.known || lego[sourceLang] || '',
        [targetLang]: lego.target || lego[targetLang] || ''
      },
      type: lego.type,
      is_final_lego: isFinalLego,
      current_seed_earlier_legos: currentSeedEarlierLegos,
      practice_phrases: createEmptyPhraseSlots(sourceLang, targetLang), // 12 empty slots
      phrase_distribution: standardDistribution,
      target_phrase_count: 10, // ALWAYS 10 phrases (agent fills first 10 slots)
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

  console.log(`[Phase 5 Prep v9] Starting scaffold generation for: ${courseDir}`);
  console.log(`[Phase 5 Prep v9] Languages: ${sourceLang} → ${targetLang} (${sourceCode}_for_${targetCode})`);
  console.log(`[Phase 5 Prep v9] Format: Explicit labels with 12 pre-allocated phrase slots`);

  if (legoIdsFilter) {
    console.log(`[Phase 5 Prep v9] Filtering to ${legoIdsFilter.length} specific LEGO_IDs (regeneration mode)`);
  }

  // For quick tests / segment ranges, read from base course directory
  const sourceDir = baseCourseDir || courseDir;
  const legoPairsPath = path.join(sourceDir, 'lego_pairs.json');

  console.log(`[Phase 5 Prep v9] Reading lego_pairs.json from: ${sourceDir}`);

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
      console.log(`[Phase 5 Prep v9] Converted object format to array (${seeds.length} seeds)`);
    } else {
      throw new Error('Invalid lego_pairs.json format: seeds should be an array or object');
    }
  }

  console.log(`[Phase 5 Prep v9] Loaded ${seeds.length} seeds from lego_pairs.json`);
  console.log(`[Phase 5 Prep v9] Generating one scaffold per seed for incremental progress tracking`);

  // Create output directory
  const scaffoldsDir = path.join(courseDir, 'phase5_scaffolds_v9');
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

    console.log(`[Phase 5 Prep v9] ${seed.seed_id}: ${newLegosCount} LEGOs → ${newLegosCount * 10} phrases (12 slots each, fill first 10)`);

    // Create scaffold
    const scaffold = {
      version: "v9.0_explicit_labels",
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
        task: "Fill practice_phrases arrays using Phase 5 Intelligence v9.0",
        methodology: "Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5 OR docs/phase_intelligence/phase_5_lego_baskets.md",
        vocabulary_sources: "10 recent seed pairs + 30 recent NEW LEGOs + current seed's earlier LEGOs + current LEGO",
        distribution: "ALWAYS 2-2-2-4 (10 phrases per LEGO)",
        phrase_format: `Each phrase has explicit fields: {${sourceLang}: "...", ${targetLang}: "...", notes: ""}`,
        slots: "12 pre-allocated slots - fill first 10, leave last 2 empty for future expansion",
        output: `${courseDir}/phase5_outputs_v9/seed_${seed.seed_id.toLowerCase()}.json`
      },
      _stats: {
        new_legos_in_seed: newLegosCount,
        phrases_to_generate: newLegosCount * 10,
        phrase_slots_per_lego: 12,
        recent_seed_pairs_count: seedScaffold.recent_seed_pairs.length,
        recent_new_legos_count: seedScaffold.recent_new_legos.length
      }
    };

    // Write scaffold
    const scaffoldPath = path.join(scaffoldsDir, `seed_${seed.seed_id.toLowerCase()}.json`);
    await fs.writeJson(scaffoldPath, scaffold, { spaces: 2 });
  }

  if (legoIdsFilter) {
    console.log(`[Phase 5 Prep v9] ✅ Generated ${filteredScaffoldCount} scaffold files (filtered from ${seeds.length} total seeds)`);
    console.log(`[Phase 5 Prep v9] Filtered LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
  } else {
    console.log(`[Phase 5 Prep v9] ✅ Generated ${filteredScaffoldCount} scaffold files`);
    console.log(`[Phase 5 Prep v9] Total new LEGOs: ${totalNewLegos} (${totalNewLegos * 10} phrases)`);
  }
  console.log(`[Phase 5 Prep v9] Output directory: ${scaffoldsDir}`);

  // Create outputs directory
  const outputsDir = path.join(courseDir, 'phase5_outputs_v9');
  await fs.ensureDir(outputsDir);
  console.log(`[Phase 5 Prep v9] Created outputs directory: ${outputsDir}`);

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
    console.error('Usage: node tools/phase-prep/phase5_prep_scaffolds_v9.cjs <courseDir>');
    console.error('');
    console.error('Examples:');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v9.cjs public/vfs/courses/fra_for_eng');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v9.cjs public/vfs/courses/deu_for_eng');
    console.error('  node tools/phase-prep/phase5_prep_scaffolds_v9.cjs public/vfs/courses/cmn_for_eng');
    console.error('');
    console.error('Features:');
    console.error('  ✅ Explicit labels (no position-based confusion)');
    console.error('  ✅ 12 pre-allocated phrase slots (fill first 10)');
    console.error('  ✅ Language-agnostic (auto-detects from directory name)');
    console.error('  ✅ Prevents swaps by using clear field names');
    process.exit(1);
  }

  preparePhase5Scaffolds(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 5 v9 scaffolds ready!`);
      console.log(`   Languages: ${result.languages.sourceLang} → ${result.languages.targetLang}`);
      console.log(`   Total seeds: ${result.totalSeeds}`);
      console.log(`   Total LEGOs: ${result.totalNewLegos}`);
      console.log(`   Format: Explicit labels with 12 phrase slots each`);
      console.log(`   Next step: Process each seed scaffold to generate baskets`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scaffold preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { preparePhase5Scaffolds };

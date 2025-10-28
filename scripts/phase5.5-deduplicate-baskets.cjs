#!/usr/bin/env node

/**
 * Phase 5.5: Deduplicate LEGO Pairs and Baskets
 *
 * Removes duplicate LEGOs where both target and known text are identical
 * (case-insensitive, trimmed, punctuation preserved). First occurrence wins.
 * Also removes baskets for deduplicated LEGOs.
 *
 * Input:  vfs/courses/{course_code}/lego_pairs.json
 *         vfs/courses/{course_code}/lego_baskets.json
 * Output: vfs/courses/{course_code}/lego_pairs_deduplicated.json
 *         vfs/courses/{course_code}/lego_baskets_deduplicated.json
 *
 * Usage: node scripts/phase5.5-deduplicate-baskets.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/phase5.5-deduplicate-baskets.cjs <course_code>');
  console.error('   Example: node scripts/phase5.5-deduplicate-baskets.cjs spa_for_eng_20seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const basketsPath = path.join(courseDir, 'lego_baskets.json');
const deduplicatedPairsPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const deduplicatedBasketsPath = path.join(courseDir, 'lego_baskets_deduplicated.json');

/**
 * Create deduplication key: trim + lowercase, preserve punctuation
 */
function createDedupeKey(target, known) {
  return `${target.trim().toLowerCase()}|||${known.trim().toLowerCase()}`;
}

async function deduplicateBaskets() {
  console.log(`\n🔄 Phase 5.5: Deduplicate LEGO Pairs and Baskets`);
  console.log(`Course: ${courseCode}\n`);

  // Check if inputs exist
  if (!await fs.pathExists(legoPairsPath)) {
    console.error(`❌ LEGO pairs not found: ${legoPairsPath}`);
    console.error(`   Run Phase 3 first to generate LEGO pairs`);
    process.exit(1);
  }

  if (!await fs.pathExists(basketsPath)) {
    console.error(`❌ LEGO baskets not found: ${basketsPath}`);
    console.error(`   Run Phase 5 first to generate LEGO baskets`);
    process.exit(1);
  }

  // Read inputs
  const legoPairsData = await fs.readJson(legoPairsPath);
  const basketsData = await fs.readJson(basketsPath);

  // Handle both formats: array or object with seeds property
  const seeds = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;

  if (!Array.isArray(seeds)) {
    console.error(`❌ Invalid lego_pairs.json format`);
    process.exit(1);
  }

  // Baskets format: object keyed by lego_id
  if (typeof basketsData !== 'object' || Array.isArray(basketsData)) {
    console.error(`❌ Invalid lego_baskets.json format - expected object`);
    process.exit(1);
  }

  const totalBaskets = Object.keys(basketsData).length;

  console.log(`📊 Input stats:`);
  console.log(`   - Seeds: ${seeds.length}`);

  // Count total LEGOs across all seeds
  let totalLegosOriginal = 0;
  for (const seed of seeds) {
    const [seedId, pair, legos] = seed;
    totalLegosOriginal += legos.length;
  }

  console.log(`   - Total LEGOs: ${totalLegosOriginal}`);
  console.log(`   - Total baskets: ${totalBaskets}\n`);

  // Step 1: Deduplicate LEGO pairs
  console.log(`🔍 Deduplicating LEGO pairs...`);

  const seen = new Map(); // Map from dedupeKey to first legoId
  const keptLegoIds = new Set();
  const duplicateLegoIds = new Set();
  const deduplicatedSeeds = [];

  for (const seed of seeds) {
    const [seedId, pair, legos] = seed;
    const deduplicatedLegos = [];

    for (const lego of legos) {
      const legoId = lego[0];
      const type = lego[1];
      const target = lego[2];
      const known = lego[3];

      const dedupeKey = createDedupeKey(target, known);

      if (!seen.has(dedupeKey)) {
        // First occurrence - keep it
        seen.set(dedupeKey, legoId);
        keptLegoIds.add(legoId);
        deduplicatedLegos.push(lego);
      } else {
        // Duplicate - discard it
        duplicateLegoIds.add(legoId);
        const firstLegoId = seen.get(dedupeKey);
        console.log(`   ⚠️  Duplicate: ${legoId} (target: "${target}", known: "${known}") - keeping ${firstLegoId}`);
      }
    }

    // Only include seed if it has LEGOs left after deduplication
    if (deduplicatedLegos.length > 0) {
      deduplicatedSeeds.push([seedId, pair, deduplicatedLegos]);
    }
  }

  const totalLegosAfter = keptLegoIds.size;
  const duplicatesRemoved = totalLegosOriginal - totalLegosAfter;
  const deduplicationRate = ((duplicatesRemoved / totalLegosOriginal) * 100).toFixed(1);

  console.log(`\n✅ LEGO deduplication complete:`);
  console.log(`   - Original LEGOs: ${totalLegosOriginal}`);
  console.log(`   - Unique LEGOs: ${totalLegosAfter}`);
  console.log(`   - Duplicates removed: ${duplicatesRemoved} (${deduplicationRate}%)\n`);

  // Step 2: Filter baskets
  console.log(`🧺 Filtering baskets...`);

  const deduplicatedBaskets = {};
  let basketsRemoved = 0;

  for (const [legoId, basket] of Object.entries(basketsData)) {
    if (keptLegoIds.has(legoId)) {
      deduplicatedBaskets[legoId] = basket;
    } else {
      console.log(`   ⚠️  Removing basket for duplicate LEGO: ${legoId}`);
      basketsRemoved++;
    }
  }

  console.log(`\n✅ Basket filtering complete:`);
  console.log(`   - Original baskets: ${totalBaskets}`);
  console.log(`   - Kept baskets: ${Object.keys(deduplicatedBaskets).length}`);
  console.log(`   - Baskets removed: ${basketsRemoved}\n`);

  // Step 3: Write outputs
  // Output as array for LEGO pairs, object for baskets (matching input formats)
  const deduplicatedPairsOutput = deduplicatedSeeds;
  const deduplicatedBasketsOutput = deduplicatedBaskets;

  await fs.writeJson(deduplicatedPairsPath, deduplicatedPairsOutput, { spaces: 2 });
  await fs.writeJson(deduplicatedBasketsPath, deduplicatedBasketsOutput, { spaces: 2 });

  console.log(`💾 Outputs written:`);
  console.log(`   - ${deduplicatedPairsPath}`);
  console.log(`   - ${deduplicatedBasketsPath}\n`);

  console.log(`✅ Phase 5.5 complete!\n`);
}

deduplicateBaskets().catch(err => {
  console.error('\n❌ Phase 5.5 failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});

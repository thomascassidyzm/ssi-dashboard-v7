#!/usr/bin/env node

/**
 * Phase 5.5: Basket Deduplication
 *
 * Removes duplicate LEGO baskets, keeping first occurrence only.
 * Processes baskets from BOTH lego_pairs (S0001L01) and feeder_pairs (S0015F01).
 * Creates provenance map for seed reconstruction.
 *
 * Algorithm:
 * - Group baskets by LEGO text (target + known, case-insensitive)
 * - Keep first occurrence (lowest LEGO ID or FEEDER ID)
 * - Delete all duplicates
 * - Create provenance mapping
 *
 * Expected duplicates:
 * - Spanish: ~115 → ~89 (26 feeder duplicates)
 * - Italian: ~115 → ~90 (25 feeder duplicates)
 * - French: ~116 → ~90 (26 feeder duplicates)
 * - Mandarin: ~103 → ~92 (11 feeder duplicates)
 *
 * Usage:
 *   node deduplicate-baskets.cjs <course_dir>
 *   node deduplicate-baskets.cjs spa_for_eng_30seeds
 *   node deduplicate-baskets.cjs --all
 */

const fs = require('fs-extra');
const path = require('path');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract LEGO number from LEGO ID or FEEDER ID
 * Handles both formats:
 * - lego_id:   "S0005L02" → 5002
 * - feeder_id: "S0015F01" → 15001
 * This gives us natural ordering: S0001L01 < S0001L02 < S0002L01 < S0015F01
 */
function legoIdToNumber(legoId) {
  // Try lego_id pattern first: S0005L02
  let match = legoId.match(/S(\d+)L(\d+)/);
  if (match) {
    const seedNum = parseInt(match[1], 10);
    const legoNum = parseInt(match[2], 10);
    return seedNum * 1000 + legoNum; // S0005L02 → 5002
  }

  // Try feeder_id pattern: S0015F01
  match = legoId.match(/S(\d+)F(\d+)/);
  if (match) {
    const seedNum = parseInt(match[1], 10);
    const feederNum = parseInt(match[2], 10);
    return seedNum * 1000 + feederNum; // S0015F01 → 15001
  }

  return 0; // Unknown format
}

/**
 * Create a key for identifying duplicate LEGOs
 * Uses target + known text (case-insensitive, trimmed)
 */
function createLegoKey(basket) {
  const target = basket.lego[0].toLowerCase().trim();
  const known = basket.lego[1].toLowerCase().trim();
  return `${target}|||${known}`;
}

/**
 * Deduplicate baskets for a single course
 */
async function deduplicateCourse(courseDir) {
  const coursePath = path.resolve(courseDir);
  const courseName = path.basename(coursePath);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Phase 5.5: Basket Deduplication`);
  console.log(`Course: ${courseName}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Read baskets
  const basketsPath = path.join(coursePath, 'baskets.json');
  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`baskets.json not found in ${courseName}`);
  }

  const baskets = await fs.readJson(basketsPath);
  const legoIds = Object.keys(baskets).sort((a, b) =>
    legoIdToNumber(a) - legoIdToNumber(b)
  );

  console.log(`Found ${legoIds.length} baskets`);

  // Group by LEGO text
  const legoGroups = new Map(); // key → [legoId1, legoId2, ...]

  for (const legoId of legoIds) {
    const basket = baskets[legoId];
    const key = createLegoKey(basket);

    if (!legoGroups.has(key)) {
      legoGroups.set(key, []);
    }
    legoGroups.get(key).push(legoId);
  }

  // Find duplicates and create deduplicated baskets
  const deduplicatedBaskets = {};
  const provenanceMap = {};
  let duplicatesFound = 0;

  for (const [key, group] of legoGroups.entries()) {
    // First occurrence (already sorted by LEGO ID)
    const firstId = group[0];
    deduplicatedBaskets[firstId] = baskets[firstId];

    // All others are duplicates
    if (group.length > 1) {
      duplicatesFound += (group.length - 1);

      for (let i = 1; i < group.length; i++) {
        const duplicateId = group[i];
        provenanceMap[duplicateId] = firstId;
      }

      // Log duplicate group
      const basket = baskets[firstId];
      console.log(`Duplicate LEGO found: "${basket.lego[0]}" / "${basket.lego[1]}"`);
      console.log(`  KEEP:   ${firstId}`);
      group.slice(1).forEach(id => {
        console.log(`  DELETE: ${id} → maps to ${firstId}`);
      });
      console.log();
    }
  }

  // Save deduplicated baskets
  const outputPath = path.join(coursePath, 'baskets_deduplicated.json');
  await fs.writeJson(outputPath, deduplicatedBaskets, { spaces: 2 });

  // Save provenance map
  const provenancePath = path.join(coursePath, 'lego_provenance_map.json');
  await fs.writeJson(provenancePath, provenanceMap, { spaces: 2 });

  // Summary
  console.log(`${'═'.repeat(70)}`);
  console.log(`✅ DEDUPLICATION COMPLETE`);
  console.log(`${'═'.repeat(70)}\n`);

  console.log(`Original baskets:     ${legoIds.length}`);
  console.log(`Unique baskets:       ${Object.keys(deduplicatedBaskets).length}`);
  console.log(`Duplicates removed:   ${duplicatesFound}`);
  console.log(`Provenance mappings:  ${Object.keys(provenanceMap).length}\n`);

  console.log(`Output files:`);
  console.log(`  ${outputPath}`);
  console.log(`  ${provenancePath}\n`);

  return {
    original: legoIds.length,
    deduplicated: Object.keys(deduplicatedBaskets).length,
    duplicates: duplicatesFound
  };
}

/**
 * Process all courses
 */
async function processAllCourses() {
  const coursesDir = path.resolve(__dirname);
  const entries = await fs.readdir(coursesDir);

  const results = [];

  for (const entry of entries) {
    const entryPath = path.join(coursesDir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory() && entry.includes('_for_')) {
      try {
        const result = await deduplicateCourse(entryPath);
        results.push({ course: entry, ...result });
      } catch (error) {
        console.error(`\n❌ Error processing ${entry}: ${error.message}\n`);
      }
    }
  }

  // Overall summary
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`MULTI-COURSE DEDUPLICATION SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);

  let totalOriginal = 0;
  let totalDeduplicated = 0;
  let totalDuplicates = 0;

  for (const result of results) {
    console.log(`${result.course}:`);
    console.log(`  Original: ${result.original} → Deduplicated: ${result.deduplicated} (removed ${result.duplicates})`);
    totalOriginal += result.original;
    totalDeduplicated += result.deduplicated;
    totalDuplicates += result.duplicates;
  }

  console.log(`\nTOTAL:`);
  console.log(`  Original: ${totalOriginal} → Deduplicated: ${totalDeduplicated} (removed ${totalDuplicates})\n`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node deduplicate-baskets.cjs <course_dir>');
    console.log('  node deduplicate-baskets.cjs spa_for_eng_30seeds');
    console.log('  node deduplicate-baskets.cjs --all\n');
    process.exit(1);
  }

  if (args[0] === '--all') {
    await processAllCourses();
  } else {
    await deduplicateCourse(args[0]);
  }
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
});

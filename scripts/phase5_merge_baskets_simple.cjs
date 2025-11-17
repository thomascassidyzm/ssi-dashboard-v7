#!/usr/bin/env node

/**
 * Phase 5 Simple Basket Merge
 *
 * Takes all seed_S*_baskets.json files from phase5_outputs/
 * and merges them into a single lego_baskets.json
 *
 * Usage: node scripts/phase5_merge_baskets_simple.cjs <courseDir>
 *
 * Example: node scripts/phase5_merge_baskets_simple.cjs public/vfs/courses/cmn_for_eng
 */

const fs = require('fs-extra');
const path = require('path');

async function mergeBaskets(courseDir) {
  console.log(`[Phase 5 Merge] Starting merge for: ${courseDir}`);

  const outputsDir = path.join(courseDir, 'phase5_outputs');

  if (!await fs.pathExists(outputsDir)) {
    throw new Error(`Phase 5 outputs directory not found: ${outputsDir}`);
  }

  // Find all basket files
  const files = await fs.readdir(outputsDir);
  const basketFiles = files
    .filter(f => f.match(/^seed_S\d+_baskets\.json$/))
    .sort();

  if (basketFiles.length === 0) {
    throw new Error(`No basket files found in ${outputsDir}`);
  }

  console.log(`[Phase 5 Merge] Found ${basketFiles.length} basket files`);

  // Merged output object
  const merged = {};

  let totalSeeds = 0;
  let totalLegos = 0;
  let totalPhrases = 0;

  // Read and merge each file
  for (const file of basketFiles) {
    const filePath = path.join(outputsDir, file);
    const data = await fs.readJson(filePath);

    // Extract seed number from filename
    const match = file.match(/seed_S(\d+)_baskets\.json/);
    const seedNum = match[1];
    const seedId = `S${seedNum}`;

    console.log(`[Phase 5 Merge] Processing ${seedId}...`);

    totalSeeds++;

    // Data can be either:
    // Format 1: { "S0001L01": {...}, "S0001L02": {...} }
    // Format 2: { "legos": { "S0001L01": {...}, "S0001L02": {...} } }

    const legos = data.legos || data;

    if (!legos || typeof legos !== 'object') {
      console.warn(`  ⚠️  ${seedId}: No legos found, skipping`);
      continue;
    }

    // Count LEGOs and phrases
    const legoCount = Object.keys(legos).length;
    totalLegos += legoCount;

    let seedPhraseCount = 0;
    for (const [legoId, lego] of Object.entries(legos)) {
      const phrases = lego.practice_phrases || [];
      seedPhraseCount += phrases.length;
      totalPhrases += phrases.length;

      // Copy to merged output
      merged[legoId] = {
        lego: lego.lego,
        type: lego.type,
        practice_phrases: phrases
      };
    }

    console.log(`  ✅ ${seedId}: ${legoCount} LEGOs, ${seedPhraseCount} phrases`);
  }

  console.log(`\n[Phase 5 Merge] === SUMMARY ===`);
  console.log(`Total seeds: ${totalSeeds}`);
  console.log(`Total LEGOs: ${totalLegos}`);
  console.log(`Total phrases: ${totalPhrases}`);
  console.log(`Average phrases per LEGO: ${(totalPhrases / totalLegos).toFixed(1)}`);

  // Write merged file
  const outputPath = path.join(courseDir, 'lego_baskets.json');
  await fs.writeJson(outputPath, merged, { spaces: 2 });

  console.log(`\n[Phase 5 Merge] ✅ Merge complete!`);
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${Math.round(JSON.stringify(merged).length / 1024)}KB`);

  return {
    success: true,
    totalSeeds,
    totalLegos,
    totalPhrases,
    outputPath
  };
}

// Run if called directly
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase5_merge_baskets_simple.cjs <courseDir>');
    console.error('Example: node scripts/phase5_merge_baskets_simple.cjs public/vfs/courses/cmn_for_eng');
    process.exit(1);
  }

  mergeBaskets(courseDir)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { mergeBaskets };

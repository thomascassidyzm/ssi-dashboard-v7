#!/usr/bin/env node

/**
 * Simple Phase 5 Merge
 * Merges phase5_outputs/*.json into lego_baskets.json
 *
 * Based on automation_server.cjs mergePhase5Outputs() function
 */

const fs = require('fs-extra');
const path = require('path');

async function mergePhase5Outputs(baseCourseDir) {
  const phase5Dir = path.join(baseCourseDir, 'phase5_outputs');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  console.log(`\n[Phase 5] 📦 Merging phase5_outputs into lego_baskets.json...`);
  console.log(`[Phase 5] Course dir: ${baseCourseDir}`);

  if (!await fs.pathExists(phase5Dir)) {
    console.log(`[Phase 5] ⚠️  No phase5_outputs directory found`);
    return;
  }

  const files = await fs.readdir(phase5Dir);
  const basketFiles = files.filter(f => f.match(/seed_S\d{4}_baskets\.json$/));

  if (basketFiles.length === 0) {
    console.log(`[Phase 5] ⚠️  No basket files found`);
    return;
  }

  console.log(`[Phase 5] Found ${basketFiles.length} basket files to merge`);

  // Load or create lego_baskets.json
  let legoBaskets = await fs.pathExists(basketsPath)
    ? await fs.readJson(basketsPath)
    : { baskets: {}, metadata: { generated_at: new Date().toISOString() } };

  let totalBaskets = 0;
  let totalPhrases = 0;

  // Merge each file
  for (const file of basketFiles) {
    const filePath = path.join(phase5Dir, file);
    const seedData = await fs.readJson(filePath);

    // Merge baskets
    for (const [basketId, basketData] of Object.entries(seedData.baskets || {})) {
      legoBaskets.baskets[basketId] = basketData;
      totalBaskets++;
      totalPhrases += basketData.practice_phrases?.length || 0;
    }
  }

  // Update metadata
  legoBaskets.metadata = {
    ...legoBaskets.metadata,
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(legoBaskets.baskets).length,
    merged_from_phase5_outputs: basketFiles.length
  };

  // Write merged file
  await fs.writeJson(basketsPath, legoBaskets, { spaces: 2 });

  console.log(`[Phase 5] ✅ Merge complete:`);
  console.log(`[Phase 5]    Added ${totalBaskets} baskets`);
  console.log(`[Phase 5]    Total ${totalPhrases} practice phrases`);
  console.log(`[Phase 5]    Total baskets in file: ${Object.keys(legoBaskets.baskets).length}`);
  console.log(`[Phase 5]    Output: ${basketsPath}`);
}

// Run
const courseDir = process.argv[2];
if (!courseDir) {
  console.error('Usage: node phase5_simple_merge.cjs <courseDir>');
  console.error('Example: node phase5_simple_merge.cjs public/vfs/courses/cmn_for_eng');
  process.exit(1);
}

mergePhase5Outputs(courseDir)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`\n❌ Merge failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

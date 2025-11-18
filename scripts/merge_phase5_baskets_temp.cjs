const fs = require('fs-extra');
const path = require('path');

async function mergePhase5Outputs() {
  const baseCourseDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');
  const phase5Dir = path.join(baseCourseDir, 'phase5_outputs');
  const basketsPath = path.join(baseCourseDir, 'lego_baskets.json');

  console.log('📦 Merging phase5_outputs into lego_baskets.json...');

  if (!await fs.pathExists(phase5Dir)) {
    console.log('⚠️  No phase5_outputs directory found');
    return;
  }

  const files = await fs.readdir(phase5Dir);
  const basketFiles = files.filter(f => f.match(/seed_[Ss]\d{4}_baskets\.json$/));

  console.log(`Found ${basketFiles.length} basket files to merge`);

  if (basketFiles.length === 0) {
    console.log('⚠️  No basket files found');
    return;
  }

  // Load existing lego_baskets.json
  let legoBaskets = { metadata: {}, baskets: {} };
  if (await fs.pathExists(basketsPath)) {
    legoBaskets = await fs.readJson(basketsPath);
  }

  console.log(`Current baskets in lego_baskets.json: ${Object.keys(legoBaskets.baskets || {}).length}`);

  // Merge each basket file - OVERWRITE existing baskets
  let addedCount = 0;
  let overwriteCount = 0;

  for (const file of basketFiles) {
    const filePath = path.join(phase5Dir, file);
    const seedBaskets = await fs.readJson(filePath);

    // Files are flat objects: { "S0001L03": { lego, type, practice_phrases }, ... }
    for (const [legoId, basket] of Object.entries(seedBaskets)) {
      if (legoBaskets.baskets[legoId]) {
        overwriteCount++;
      } else {
        addedCount++;
      }
      legoBaskets.baskets[legoId] = basket;
    }
  }

  console.log(`Added ${addedCount} new baskets`);
  console.log(`Overwrote ${overwriteCount} existing baskets`);
  console.log(`Total baskets after merge: ${Object.keys(legoBaskets.baskets).length}`);

  // Update metadata
  legoBaskets.metadata = {
    ...legoBaskets.metadata,
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(legoBaskets.baskets).length,
    merged_from_phase5_outputs: basketFiles.length
  };

  // Write merged file
  await fs.writeJson(basketsPath, legoBaskets, { spaces: 2 });
  console.log('✅ Merge complete!');
}

mergePhase5Outputs().catch(console.error);

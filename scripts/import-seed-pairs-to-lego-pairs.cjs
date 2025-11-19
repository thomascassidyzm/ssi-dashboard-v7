#!/usr/bin/env node

/**
 * Import seed_pairs.json data into lego_pairs.json
 *
 * Use seed_pairs.json as source of truth for seed_pair data
 */

const fs = require('fs-extra');
const path = require('path');

async function importSeedPairs(courseDir) {
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n📖 Reading seed_pairs.json...`);
  const seedPairs = await fs.readJson(seedPairsPath);

  console.log(`📖 Reading lego_pairs.json...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  let updated = 0;
  let unchanged = 0;

  // Update each seed in lego_pairs with data from seed_pairs
  for (const seed of legoPairs.seeds || []) {
    const seedId = seed.seed_id;
    const seedPairData = seedPairs.translations[seedId];

    if (seedPairData) {
      // Replace seed_pair with data from seed_pairs.json (source of truth)
      seed.seed_pair = {
        known: seedPairData.known,
        target: seedPairData.target
      };
      updated++;
    } else {
      console.warn(`⚠️  No seed_pair data found for ${seedId}`);
      unchanged++;
    }
  }

  // Backup original
  const backupPath = legoPairsPath.replace('.json', '.pre-import-backup.json');
  console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
  await fs.copy(legoPairsPath, backupPath);

  // Write updated version
  console.log(`✍️  Writing updated lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

  console.log(`\n✅ Import complete!`);
  console.log(`   - Updated ${updated} seed_pairs`);
  console.log(`   - Unchanged ${unchanged} seeds`);
  console.log(`   - Backup saved: ${path.basename(backupPath)}`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Importing seed_pairs.json into lego_pairs.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await importSeedPairs(courseDir);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

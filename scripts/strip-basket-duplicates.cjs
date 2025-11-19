#!/usr/bin/env node

/**
 * Remove duplicate metadata from lego_baskets.json
 *
 * Removes fields that duplicate lego_pairs.json data:
 * - type (available in lego_pairs)
 * - available_legos (can be calculated from lego_pairs)
 * - overlap_level (available in lego_pairs)
 *
 * Keeps:
 * - is_final_lego (useful for basket context)
 * - target_phrase_count (the count of practice phrases)
 */

const fs = require('fs-extra');
const path = require('path');

async function stripDuplicates(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let stripped = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    let modified = false;

    if (basket.type !== undefined) {
      delete basket.type;
      modified = true;
    }

    if (basket.available_legos !== undefined) {
      delete basket.available_legos;
      modified = true;
    }

    if (basket.overlap_level !== undefined) {
      delete basket.overlap_level;
      modified = true;
    }

    if (modified) stripped++;
  }

  if (stripped === 0) {
    console.log(`✅ No duplicate fields to remove`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-dedup-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write cleaned version
  console.log(`✍️  Writing cleaned lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Removed duplicate fields from ${stripped} baskets`);
  console.log(`   - Keeping: is_final_lego, target_phrase_count`);
  console.log(`   - Removed: type, available_legos, overlap_level`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Removing duplicate metadata from lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await stripDuplicates(courseDir);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

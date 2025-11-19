#!/usr/bin/env node

/**
 * Rename target_phrase_count to phrase_count in lego_baskets.json
 *
 * Simpler, clearer naming
 */

const fs = require('fs-extra');
const path = require('path');

async function renamePhraseCount(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let renamed = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    if (basket.target_phrase_count !== undefined) {
      basket.phrase_count = basket.target_phrase_count;
      delete basket.target_phrase_count;
      renamed++;
    }
  }

  if (renamed === 0) {
    console.log(`✅ No target_phrase_count fields to rename`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-rename-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write renamed version
  console.log(`✍️  Writing updated lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Rename complete!`);
  console.log(`   - Renamed ${renamed} fields: target_phrase_count → phrase_count`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Renaming target_phrase_count to phrase_count`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await renamePhraseCount(courseDir);
  } catch (error) {
    console.error('❌ Rename failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

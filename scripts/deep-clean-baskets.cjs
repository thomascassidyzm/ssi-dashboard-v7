#!/usr/bin/env node

/**
 * Deep clean lego_baskets.json - remove ALL metadata and duplicates
 *
 * Keeps ONLY:
 * - lego (the LEGO being practiced)
 * - is_final_lego (if present)
 * - phrase_count (if present)
 * - practice_phrases (the actual practice content)
 *
 * Removes everything else (metadata, duplicates, etc.)
 */

const fs = require('fs-extra');
const path = require('path');

async function deepCleanBaskets(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let cleaned = 0;
  const fieldsToKeep = ['lego', 'is_final_lego', 'phrase_count', 'practice_phrases'];

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    const originalKeys = Object.keys(basket);
    const keysToRemove = originalKeys.filter(key => !fieldsToKeep.includes(key));

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => delete basket[key]);
      cleaned++;
    }
  }

  if (cleaned === 0) {
    console.log(`✅ No fields to remove`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-deep-clean-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write cleaned version
  console.log(`✍️  Writing deep-cleaned lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Deep clean complete!`);
  console.log(`   - Cleaned ${cleaned} baskets`);
  console.log(`   - Kept only: ${fieldsToKeep.join(', ')}`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

  console.log(`\n🔄 Deep cleaning lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await deepCleanBaskets(courseDir);
  } catch (error) {
    console.error('❌ Deep clean failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

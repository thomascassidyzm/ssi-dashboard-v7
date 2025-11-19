#!/usr/bin/env node

/**
 * Remove _metadata from lego_baskets.json
 *
 * The metadata is redundant:
 * - lego_id is already the basket key
 * - seed_context can be looked up from seed_pairs.json
 */

const fs = require('fs-extra');
const path = require('path');

async function stripMetadata(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let stripped = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    if (basket._metadata) {
      delete basket._metadata;
      stripped++;
    }
  }

  if (stripped === 0) {
    console.log(`✅ No metadata to remove`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-strip-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write stripped version
  console.log(`✍️  Writing cleaned lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Removed _metadata from ${stripped} baskets`);
  console.log(`   - Much cleaner and easier to read!`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Stripping metadata from lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await stripMetadata(courseDir);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

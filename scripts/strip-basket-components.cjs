#!/usr/bin/env node

/**
 * Remove components from lego_baskets.json
 *
 * Components are for Phase 6 (introductions) to show learners how LEGOs are built.
 * They're already in lego_pairs.json and can be pulled from there when needed.
 * Baskets are purely for practice phrases - components are redundant here.
 */

const fs = require('fs-extra');
const path = require('path');

async function stripComponents(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let stripped = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    if (basket.components !== undefined) {
      delete basket.components;
      stripped++;
    }
  }

  if (stripped === 0) {
    console.log(`✅ No components to remove`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-component-strip-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write cleaned version
  console.log(`✍️  Writing cleaned lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Removed components from ${stripped} baskets`);
  console.log(`   - Components available in lego_pairs.json when needed`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Removing components from lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await stripComponents(courseDir);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

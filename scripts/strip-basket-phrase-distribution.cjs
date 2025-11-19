#!/usr/bin/env node

/**
 * Remove phrase_distribution from lego_baskets.json
 *
 * phrase_distribution is metadata that can be calculated from practice_phrases.
 * The practice_phrases array is right there - no need for redundant counts.
 */

const fs = require('fs-extra');
const path = require('path');

async function stripPhraseDistribution(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let stripped = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    if (basket.phrase_distribution !== undefined) {
      delete basket.phrase_distribution;
      stripped++;
    }
  }

  if (stripped === 0) {
    console.log(`✅ No phrase_distribution to remove`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-phrase-dist-strip-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write cleaned version
  console.log(`✍️  Writing cleaned lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Removed phrase_distribution from ${stripped} baskets`);
  console.log(`   - Can calculate from practice_phrases if needed`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Removing phrase_distribution from lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await stripPhraseDistribution(courseDir);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

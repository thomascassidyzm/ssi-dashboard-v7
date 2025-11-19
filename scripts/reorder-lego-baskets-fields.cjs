#!/usr/bin/env node

/**
 * Reorder fields in lego_baskets.json to be consistent
 *
 * Changes:
 * - seed_context: {target, known} → {known, target}
 * - All objects: known field comes BEFORE target field
 */

const fs = require('fs-extra');
const path = require('path');

function reorderObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // If it has both known and target, ensure known comes first
  if (obj.known !== undefined && obj.target !== undefined) {
    return {
      known: obj.known,
      target: obj.target
    };
  }

  return obj;
}

async function reorderBaskets(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let reordered = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    // Reorder lego field
    if (basket.lego) {
      basket.lego = reorderObject(basket.lego);
    }

    // Reorder practice_phrases
    if (Array.isArray(basket.practice_phrases)) {
      basket.practice_phrases = basket.practice_phrases.map(phrase => reorderObject(phrase));
    }

    // Reorder seed_context in metadata
    if (basket._metadata?.seed_context) {
      const oldOrder = JSON.stringify(basket._metadata.seed_context);
      basket._metadata.seed_context = reorderObject(basket._metadata.seed_context);
      const newOrder = JSON.stringify(basket._metadata.seed_context);
      if (oldOrder !== newOrder) {
        reordered++;
      }
    }
  }

  if (reordered === 0) {
    console.log(`✅ All fields already in correct order`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-reorder-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write reordered version
  console.log(`✍️  Writing reordered lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Reordering complete!`);
  console.log(`   - Reordered ${reordered} seed_context fields`);
  console.log(`   - All objects now have: known FIRST, target SECOND`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Reordering lego_baskets.json fields`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await reorderBaskets(courseDir);
  } catch (error) {
    console.error('❌ Reordering failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

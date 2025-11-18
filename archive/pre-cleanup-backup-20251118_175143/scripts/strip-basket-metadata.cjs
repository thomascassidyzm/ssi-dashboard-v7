#!/usr/bin/env node

/**
 * Strip unnecessary metadata from lego_baskets.json
 *
 * Keeps only essential data:
 * - lego (target/known pair)
 * - type (A/M)
 * - practice_phrases
 * - Basic counts (available_legos, target_phrase_count, etc.)
 *
 * Removes:
 * - _metadata.whitelist_pairs (huge, can look up in lego_pairs.json by ID)
 * - _metadata.available_whitelist_size
 * - Any other bloat
 */

const fs = require('fs-extra');
const path = require('path');

async function stripBasketMetadata(courseDir) {
  console.log('\n[Strip Metadata] Starting metadata cleanup...');
  console.log(`[Strip Metadata] Course: ${courseDir}\n`);

  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found at: ${basketsPath}`);
  }

  // Read baskets
  const data = await fs.readJson(basketsPath);

  // Get original file size
  const originalSize = JSON.stringify(data).length;

  let whitelistEntriesRemoved = 0;
  let totalBaskets = Object.keys(data.baskets).length;

  // Process each basket
  for (const [legoId, basket] of Object.entries(data.baskets)) {
    if (basket._metadata) {
      // Count whitelist entries before removal
      if (basket._metadata.whitelist_pairs) {
        whitelistEntriesRemoved += basket._metadata.whitelist_pairs.length;
      }

      // Keep only essential metadata
      const essentialMetadata = {
        lego_id: basket._metadata.lego_id,
        seed_context: basket._metadata.seed_context
      };

      basket._metadata = essentialMetadata;
    }
  }

  // Write stripped version
  await fs.writeJson(basketsPath, data, { spaces: 2 });

  // Get new file size
  const newSize = JSON.stringify(data).length;
  const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

  console.log(`[Strip Metadata] ✅ Complete!`);
  console.log(`[Strip Metadata]    Baskets processed: ${totalBaskets}`);
  console.log(`[Strip Metadata]    Whitelist entries removed: ${whitelistEntriesRemoved}`);
  console.log(`[Strip Metadata]    Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[Strip Metadata]    New size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[Strip Metadata]    Reduction: ${reduction}%`);
  console.log(`[Strip Metadata]    Output: ${basketsPath}\n`);

  return {
    success: true,
    basketsProcessed: totalBaskets,
    whitelistEntriesRemoved,
    originalSize,
    newSize,
    reductionPercent: reduction
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/strip-basket-metadata.cjs <courseDir>');
    console.error('Example: node scripts/strip-basket-metadata.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  stripBasketMetadata(courseDir)
    .then(result => {
      console.log(`[Strip Metadata] ✅ Removed ${result.whitelistEntriesRemoved} whitelist entries, reduced size by ${result.reductionPercent}%!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Strip Metadata] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { stripBasketMetadata };

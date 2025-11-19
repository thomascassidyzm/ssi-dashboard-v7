#!/usr/bin/env node

/**
 * Add full seed phrase to final LEGO baskets
 *
 * The final LEGO in each seed should include the complete seed phrase
 * in its practice_phrases, since learners now have all LEGOs needed.
 */

const fs = require('fs-extra');
const path = require('path');

async function addSeedToFinalBasket(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  console.log(`\n📖 Reading seed_pairs.json...`);
  const seedPairs = await fs.readJson(seedPairsPath);

  console.log(`📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let added = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    // Only process final LEGOs
    if (!basket.is_final_lego) continue;

    // Extract seed ID from lego ID (S0001L08 → S0001)
    const match = legoId.match(/^(S\d+)L\d+$/);
    if (!match) continue;

    const seedId = match[1];
    const seedPair = seedPairs.translations?.[seedId];

    if (!seedPair) {
      console.log(`  ⚠️  No seed pair found for ${seedId}`);
      continue;
    }

    // Check if seed phrase already exists in practice_phrases
    const hasSeed = basket.practice_phrases?.some(phrase =>
      phrase.known === seedPair.known && phrase.target === seedPair.target
    );

    if (!hasSeed) {
      // Add seed phrase as LAST practice phrase
      if (!basket.practice_phrases) {
        basket.practice_phrases = [];
      }

      basket.practice_phrases.push({
        known: seedPair.known,
        target: seedPair.target
      });

      // Update phrase_count if it exists
      if (basket.phrase_count !== undefined) {
        basket.phrase_count = basket.practice_phrases.length;
      }

      console.log(`  ✅ Added seed to ${legoId}: "${seedPair.known}"`);
      added++;
    }
  }

  if (added === 0) {
    console.log(`✅ All final LEGOs already have their seed phrases`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-seed-add-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write updated version
  console.log(`✍️  Writing updated lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Update complete!`);
  console.log(`   - Added seed phrases to ${added} final LEGOs`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Adding seed phrases to final LEGO baskets`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await addSeedToFinalBasket(courseDir);
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

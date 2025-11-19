#!/usr/bin/env node

/**
 * Remove duplicate practice phrases from lego_baskets.json
 *
 * Keeps first occurrence of each unique phrase (based on both known and target)
 */

const fs = require('fs-extra');
const path = require('path');

async function deduplicatePhrases(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let basketsWithDupes = 0;
  let totalDupesRemoved = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
      continue;
    }

    const originalLength = basket.practice_phrases.length;
    const seen = new Set();
    const deduped = [];

    for (const phrase of basket.practice_phrases) {
      // Create unique key from both known and target (case-insensitive)
      const key = `${phrase.known.toLowerCase()}|||${phrase.target.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(phrase);
      }
    }

    const dupesRemoved = originalLength - deduped.length;

    if (dupesRemoved > 0) {
      basket.practice_phrases = deduped;

      // Update phrase_count if it exists
      if (basket.phrase_count !== undefined) {
        basket.phrase_count = deduped.length;
      }

      basketsWithDupes++;
      totalDupesRemoved += dupesRemoved;

      if (basketsWithDupes <= 10) {
        console.log(`  🔄 ${legoId}: removed ${dupesRemoved} duplicate(s) (${originalLength} → ${deduped.length})`);
      }
    }
  }

  if (totalDupesRemoved === 0) {
    console.log(`✅ No duplicates found`);
    return;
  }

  if (basketsWithDupes > 10) {
    console.log(`  ... and ${basketsWithDupes - 10} more baskets`);
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-dedup-phrases-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write deduplicated version
  console.log(`✍️  Writing deduplicated lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Deduplication complete!`);
  console.log(`   - Found duplicates in ${basketsWithDupes} baskets`);
  console.log(`   - Removed ${totalDupesRemoved} duplicate phrases total`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Deduplicating practice phrases`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await deduplicatePhrases(courseDir);
  } catch (error) {
    console.error('❌ Deduplication failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

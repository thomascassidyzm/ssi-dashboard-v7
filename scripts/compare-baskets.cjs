#!/usr/bin/env node

/**
 * Compare baskets between backup and regenerated version
 * Focus on seeds S0001-S0030
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

async function main() {
  console.log('📊 Comparing baskets for seeds S0001-S0030...\n');

  const oldData = await fs.readJSON(path.join(COURSE_DIR, 'lego_baskets copy.json'));
  const newData = await fs.readJSON(path.join(COURSE_DIR, 'lego_baskets_NEW.json'));

  const oldBaskets = oldData.baskets || {};
  const newBaskets = newData.baskets || {};

  // Get baskets for seeds 1-30
  const targetSeeds = Array.from({ length: 30 }, (_, i) =>
    `S${String(i + 1).padStart(4, '0')}`
  );

  let changedCount = 0;
  let unchangedCount = 0;
  let differences = [];

  for (const seedId of targetSeeds) {
    // Find all baskets for this seed
    const oldSeedBaskets = Object.entries(oldBaskets)
      .filter(([id]) => id.startsWith(seedId));
    const newSeedBaskets = Object.entries(newBaskets)
      .filter(([id]) => id.startsWith(seedId));

    if (oldSeedBaskets.length !== newSeedBaskets.length) {
      console.log(`${seedId}: Different basket count (old: ${oldSeedBaskets.length}, new: ${newSeedBaskets.length})`);
      changedCount++;
      continue;
    }

    // Compare each basket
    let seedChanged = false;
    for (const [basketId, oldBasket] of oldSeedBaskets) {
      const newBasket = newBaskets[basketId];
      if (!newBasket) {
        console.log(`${basketId}: Missing in new data`);
        seedChanged = true;
        continue;
      }

      const oldJson = JSON.stringify(oldBasket, null, 2);
      const newJson = JSON.stringify(newBasket, null, 2);

      if (oldJson !== newJson) {
        seedChanged = true;

        // Count phrase differences
        const oldPhraseCount = oldBasket.practice_phrases?.length || 0;
        const newPhraseCount = newBasket.practice_phrases?.length || 0;

        differences.push({
          basketId,
          oldPhraseCount,
          newPhraseCount,
          diff: newPhraseCount - oldPhraseCount
        });
      }
    }

    if (seedChanged) {
      changedCount++;
    } else {
      unchangedCount++;
    }
  }

  console.log(`\n📈 Summary for seeds S0001-S0030:`);
  console.log(`   Changed: ${changedCount} seeds`);
  console.log(`   Unchanged: ${unchangedCount} seeds`);

  if (differences.length > 0) {
    console.log(`\n🔍 Sample differences (first 10):`);
    differences.slice(0, 10).forEach(d => {
      console.log(`   ${d.basketId}: ${d.oldPhraseCount} → ${d.newPhraseCount} phrases (${d.diff >= 0 ? '+' : ''}${d.diff})`);
    });

    if (differences.length > 10) {
      console.log(`   ... and ${differences.length - 10} more`);
    }
  }

  console.log(`\n📊 Total baskets in dataset:`);
  console.log(`   Old: ${Object.keys(oldBaskets).length}`);
  console.log(`   New: ${Object.keys(newBaskets).length}`);
}

main().catch(console.error);

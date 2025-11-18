#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Post-Phase 3 Deduplication
 * Mark duplicate LEGO pairs as new: false (keep first occurrence as new: true)
 */

const LEGO_PAIRS_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json');

function deduplicateLegoPairs() {
  console.log('🔍 Deduplicating LEGO pairs across all seeds...\n');

  const data = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

  const seenPairs = new Map(); // key: "target|known", value: first lego_id
  let totalLegos = 0;
  let duplicatesFound = 0;
  let duplicatesByType = { A: 0, M: 0 };

  // Process all seeds in order
  for (const seed of data.seeds) {
    for (const lego of seed.legos) {
      totalLegos++;
      const key = `${lego.target}|${lego.known}`;

      if (seenPairs.has(key)) {
        // This is a duplicate - mark as new: false
        if (lego.new !== false) {
          lego.new = false;
          duplicatesFound++;
          duplicatesByType[lego.type]++;
          console.log(`  Duplicate: ${lego.id} "${lego.target}" / "${lego.known}" (first seen: ${seenPairs.get(key)})`);
        }
      } else {
        // First occurrence - mark as new: true
        seenPairs.set(key, lego.id);
        if (lego.new !== true) {
          lego.new = true;
        }
      }
    }
  }

  // Write back
  fs.writeFileSync(LEGO_PAIRS_PATH, JSON.stringify(data, null, 2), 'utf8');

  console.log('\n📊 Deduplication Summary:');
  console.log(`Total LEGOs: ${totalLegos}`);
  console.log(`Unique pairs: ${seenPairs.size}`);
  console.log(`Duplicates marked as new:false: ${duplicatesFound}`);
  console.log(`  A-type duplicates: ${duplicatesByType.A}`);
  console.log(`  M-type duplicates: ${duplicatesByType.M}`);
  console.log(`\n✓ Updated: ${LEGO_PAIRS_PATH}`);
}

deduplicateLegoPairs();

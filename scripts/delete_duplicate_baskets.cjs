#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Delete practice baskets for LEGOs marked as new: false in lego_pairs.json
 * These are duplicates that shouldn't have baskets generated
 */

const LEGO_PAIRS_PATH = path.join(__dirname, '../public/vfs/courses/spa_for_eng/lego_pairs.json');
const PHASE5_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_outputs');

console.log('🗑️  Deleting baskets for duplicate LEGOs (new: false)...\n');

// Step 1: Load lego_pairs.json and find all LEGOs with new: false
const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));
const duplicateLegoIds = new Set();

for (const seed of legoPairs.seeds) {
  for (const lego of seed.legos) {
    if (lego.new === false) {
      duplicateLegoIds.add(lego.id);
    }
  }
}

console.log(`Found ${duplicateLegoIds.size} duplicate LEGOs (new: false) to remove\n`);

// Step 2: Process each phase5_output file and delete baskets for duplicates
const files = fs.readdirSync(PHASE5_DIR)
  .filter(f => f.match(/^seed_s\d{4}\.json$/))
  .sort();

let totalFilesProcessed = 0;
let totalFilesModified = 0;
let totalBasketsDeleted = 0;

for (const file of files) {
  const filePath = path.join(PHASE5_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.legos) {
      totalFilesProcessed++;
      continue;
    }

    let deletedInFile = 0;

    for (const legoId of Object.keys(data.legos)) {
      if (duplicateLegoIds.has(legoId)) {
        delete data.legos[legoId];
        deletedInFile++;
        totalBasketsDeleted++;
      }
    }

    if (deletedInFile > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      totalFilesModified++;
      console.log(`✓ ${file}: deleted ${deletedInFile} duplicate basket(s)`);
    }

    totalFilesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

console.log('\n📊 Summary:');
console.log(`Files processed: ${totalFilesProcessed}`);
console.log(`Files modified: ${totalFilesModified}`);
console.log(`Total baskets deleted: ${totalBasketsDeleted}`);
console.log(`Duplicate LEGOs in lego_pairs.json: ${duplicateLegoIds.size}`);

if (totalBasketsDeleted < duplicateLegoIds.size) {
  console.log(`\n⚠️  Warning: ${duplicateLegoIds.size - totalBasketsDeleted} duplicate LEGOs didn't have baskets (already missing)`);
}

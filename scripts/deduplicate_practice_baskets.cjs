#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Deduplicates practice phrases within each LEGO basket
 * Removes duplicate phrases (same target + known combination) within each basket
 */

const PHASE5_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng/phase5_outputs');

function deduplicateBasket(seedFile) {
  const filePath = path.join(PHASE5_DIR, seedFile);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let totalBefore = 0;
    let totalAfter = 0;
    let duplicatesRemoved = 0;

    // Process each LEGO
    if (data.legos) {
      for (const legoId in data.legos) {
        const lego = data.legos[legoId];

        if (lego.practice_phrases && Array.isArray(lego.practice_phrases)) {
          const before = lego.practice_phrases.length;
          totalBefore += before;

          // Deduplicate based on target + known phrase combination
          const seen = new Set();
          const deduplicated = [];

          for (const phrase of lego.practice_phrases) {
            // Create unique key from target and known (first two elements)
            const key = JSON.stringify([phrase[0], phrase[1]]);

            if (!seen.has(key)) {
              seen.add(key);
              deduplicated.push(phrase);
            }
          }

          lego.practice_phrases = deduplicated;
          const after = deduplicated.length;
          totalAfter += after;
          duplicatesRemoved += (before - after);

          // Update target_phrase_count to match actual count
          if (lego.target_phrase_count) {
            lego.target_phrase_count = after;
          }
        }
      }
    }

    // Write back if changes were made
    if (duplicatesRemoved > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return {
        file: seedFile,
        before: totalBefore,
        after: totalAfter,
        removed: duplicatesRemoved
      };
    }

    return null;
  } catch (error) {
    console.error(`Error processing ${seedFile}:`, error.message);
    return null;
  }
}

// Main execution
console.log('🧹 Deduplicating practice baskets for S0001-S0100...\n');

const files = fs.readdirSync(PHASE5_DIR)
  .filter(f => f.match(/^seed_s\d{4}\.json$/))
  .sort();

let totalFilesProcessed = 0;
let totalFilesChanged = 0;
let totalDuplicatesRemoved = 0;

for (const file of files) {
  const result = deduplicateBasket(file);
  totalFilesProcessed++;

  if (result) {
    totalFilesChanged++;
    totalDuplicatesRemoved += result.removed;
    console.log(`✓ ${result.file}: ${result.before} → ${result.after} phrases (-${result.removed} duplicates)`);
  }
}

console.log('\n📊 Summary:');
console.log(`Files processed: ${totalFilesProcessed}`);
console.log(`Files modified: ${totalFilesChanged}`);
console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);

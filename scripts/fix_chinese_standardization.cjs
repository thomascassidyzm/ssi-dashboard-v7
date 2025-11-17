#!/usr/bin/env node

/**
 * Standardize Chinese vocabulary: 普通话 → 中文
 *
 * SSi Philosophy: Minimize vocabulary, maximize patterns
 * Decision: Use 中文 (zhōngwén) consistently - what people actually say in China
 * Remove: 普通话 (pǔtōnghuà) - unnecessary cognitive load
 *
 * This script:
 * 1. Updates lego_pairs.json to replace 普通话 with 中文
 * 2. Updates all phase5 baskets to use consistent terminology
 * 3. Marks affected LEGOs appropriately
 */

const fs = require('fs');
const path = require('path');

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'cmn_for_eng');
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

console.log('🔧 Standardizing Chinese vocabulary: 普通话 → 中文');
console.log('═'.repeat(60));
console.log();

// ============================================================================
// STEP 1: Fix lego_pairs.json
// ============================================================================

console.log('Step 1: Updating lego_pairs.json...');

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
let legoChanges = 0;

legoPairs.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.target.includes('普通话')) {
      console.log(`  ${seed.seed_id} ${lego.id}: "${lego.target}" → "${lego.target.replace(/普通话/g, '中文')}"`);
      lego.target = lego.target.replace(/普通话/g, '中文');
      legoChanges++;
    }

    // Also check components
    if (lego.components) {
      lego.components.forEach(component => {
        if (component[0] && component[0].includes('普通话')) {
          component[0] = component[0].replace(/普通话/g, '中文');
          legoChanges++;
        }
      });
    }
  });

  // Also check seed_pair
  if (seed.seed_pair && seed.seed_pair[1] && seed.seed_pair[1].includes('普通话')) {
    console.log(`  ${seed.seed_id} seed_pair: "${seed.seed_pair[1]}" → "${seed.seed_pair[1].replace(/普通话/g, '中文')}"`);
    seed.seed_pair[1] = seed.seed_pair[1].replace(/普通话/g, '中文');
  }
});

// Save updated lego_pairs.json
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));
console.log(`✅ Updated ${legoChanges} LEGOs in lego_pairs.json`);
console.log();

// ============================================================================
// STEP 2: Fix phase5 baskets
// ============================================================================

console.log('Step 2: Updating phase5 basket files...');

const basketFiles = fs.readdirSync(phase5OutputsDir)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/));

let basketChanges = 0;
let filesChanged = 0;

basketFiles.forEach(filename => {
  const basketPath = path.join(phase5OutputsDir, filename);
  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  let fileModified = false;

  Object.entries(basketData).forEach(([legoId, legoData]) => {
    // Fix LEGO itself
    if (legoData.lego && Array.isArray(legoData.lego) && legoData.lego[1]) {
      if (legoData.lego[1].includes('普通话')) {
        legoData.lego[1] = legoData.lego[1].replace(/普通话/g, '中文');
        fileModified = true;
      }
    }

    // Fix practice phrases
    if (legoData.practice_phrases) {
      legoData.practice_phrases.forEach(phrase => {
        if (Array.isArray(phrase) && phrase[1]) {
          if (phrase[1].includes('普通话')) {
            phrase[1] = phrase[1].replace(/普通话/g, '中文');
            basketChanges++;
            fileModified = true;
          }
        }
      });
    }

    // Fix current_seed_legos_available
    if (legoData.current_seed_legos_available) {
      legoData.current_seed_legos_available.forEach(lego => {
        if (Array.isArray(lego) && lego[1]) {
          if (lego[1].includes('普通话')) {
            lego[1] = lego[1].replace(/普通话/g, '中文');
            fileModified = true;
          }
        }
      });
    }
  });

  if (fileModified) {
    fs.writeFileSync(basketPath, JSON.stringify(basketData, null, 2));
    filesChanged++;
  }
});

console.log(`✅ Updated ${basketChanges} phrases across ${filesChanged} basket files`);
console.log();

// ============================================================================
// STEP 3: Summary
// ============================================================================

console.log('═'.repeat(60));
console.log('STANDARDIZATION COMPLETE');
console.log('═'.repeat(60));
console.log();
console.log('Changes made:');
console.log(`  • lego_pairs.json: ${legoChanges} LEGOs updated`);
console.log(`  • Basket files: ${filesChanged} files, ${basketChanges} phrases updated`);
console.log();
console.log('Result: All instances of 普通话 replaced with 中文');
console.log('Benefit: Reduced cognitive load, consistent vocabulary');
console.log();
console.log('✅ Done! Recommend re-running validators to verify.');
console.log();

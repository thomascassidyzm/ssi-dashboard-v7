#!/usr/bin/env node

/**
 * Fix infinitive translations in basket whitelists
 *
 * Uses infinitive_component_issues.json to fix whitelist_pairs in lego_baskets.json
 */

const fs = require('fs-extra');
const path = require('path');

async function fixBasketWhitelistInfinitives(courseDir) {
  console.log('\n[Fix Whitelist] Starting whitelist infinitive fix...');
  console.log(`[Fix Whitelist] Course: ${courseDir}\n`);

  const issuesPath = path.join(courseDir, 'infinitive_component_issues.json');
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  if (!await fs.pathExists(issuesPath)) {
    throw new Error(`infinitive_component_issues.json not found at: ${issuesPath}`);
  }
  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found at: ${basketsPath}`);
  }

  // Read files
  const issuesData = await fs.readJson(issuesPath);
  const basketsData = await fs.readJson(basketsPath);

  // Build replacement map from issues
  const replacements = new Map();
  for (const issue of issuesData.issues) {
    const incorrect = issue.comp_known;
    const correct = issue.comp_suggested;
    if (incorrect !== correct) {
      replacements.set(incorrect, correct);
    }
  }

  console.log(`[Fix Whitelist] Unique replacements to apply: ${replacements.size}`);
  console.log(`[Fix Whitelist] Examples:`);
  let exampleCount = 0;
  for (const [incorrect, correct] of replacements) {
    if (exampleCount++ < 5) {
      console.log(`  "${incorrect}" → "${correct}"`);
    }
  }
  console.log();

  let basketsModified = 0;
  let whitelistEntriesFixed = 0;

  // Process each basket
  for (const [legoId, basket] of Object.entries(basketsData.baskets)) {
    const whitelist = basket._metadata?.whitelist_pairs;
    if (!whitelist || !Array.isArray(whitelist)) continue;

    let basketModified = false;

    for (let i = 0; i < whitelist.length; i++) {
      const pair = whitelist[i];
      if (!pair || pair.length < 2) continue;

      const englishTranslation = pair[1];

      // Check if this needs replacement
      if (replacements.has(englishTranslation)) {
        const newTranslation = replacements.get(englishTranslation);
        whitelist[i][1] = newTranslation;
        whitelistEntriesFixed++;
        basketModified = true;

        if (whitelistEntriesFixed <= 10) {
          console.log(`[Fix] ${legoId}: "${pair[0]}" = "${englishTranslation}" → "${newTranslation}"`);
        }
      }
    }

    if (basketModified) {
      basketsModified++;
    }
  }

  // Write updated baskets
  await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

  console.log(`\n[Fix Whitelist] ✅ Complete!`);
  console.log(`[Fix Whitelist]    Baskets modified: ${basketsModified}`);
  console.log(`[Fix Whitelist]    Whitelist entries fixed: ${whitelistEntriesFixed}`);
  console.log(`[Fix Whitelist]    Output: ${basketsPath}\n`);

  return {
    success: true,
    basketsModified,
    whitelistEntriesFixed
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/fix-basket-whitelist-infinitives.cjs <courseDir>');
    console.error('Example: node scripts/fix-basket-whitelist-infinitives.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  fixBasketWhitelistInfinitives(courseDir)
    .then(result => {
      console.log(`[Fix Whitelist] ✅ Fixed ${result.whitelistEntriesFixed} whitelist entries in ${result.basketsModified} baskets!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Fix Whitelist] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fixBasketWhitelistInfinitives };

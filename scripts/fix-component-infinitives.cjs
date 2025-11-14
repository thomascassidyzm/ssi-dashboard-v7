#!/usr/bin/env node

/**
 * Fix infinitive component translations in lego_pairs.json
 *
 * Problem: M-LEGO components have infinitive verbs without "to":
 *   ["decir", "say"] should be ["decir", "to say"]
 *   ["hablar", "speak"] should be ["hablar", "to speak"]
 *
 * This script reads infinitive_component_issues.json and fixes all
 * component translations in lego_pairs.json.
 */

const fs = require('fs-extra');
const path = require('path');

async function fixComponentInfinitives(courseDir) {
  console.log('\n[Fix Components] Starting infinitive component fix...');
  console.log(`[Fix Components] Course: ${courseDir}\n`);

  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const issuesPath = path.join(courseDir, 'infinitive_component_issues.json');

  // Check files exist
  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found at: ${legoPairsPath}`);
  }
  if (!await fs.pathExists(issuesPath)) {
    throw new Error(`infinitive_component_issues.json not found at: ${issuesPath}`);
  }

  // Read files
  const legoPairsData = await fs.readJson(legoPairsPath);
  const issuesData = await fs.readJson(issuesPath);

  console.log(`[Fix Components] Total issues to fix: ${issuesData.total_issues}`);

  // Build a map of fixes: legoId -> component_index -> new translation
  const fixMap = new Map();
  for (const issue of issuesData.issues) {
    const key = `${issue.lego_id}:${issue.component_index}`;
    fixMap.set(key, issue.comp_suggested);
  }

  console.log(`[Fix Components] Unique component fixes: ${fixMap.size}\n`);

  // Apply fixes to lego_pairs.json
  let fixedCount = 0;
  let seedsProcessed = 0;

  for (const seed of legoPairsData.seeds) {
    seedsProcessed++;

    for (const lego of seed.legos) {
      // Only process M-type LEGOs with components
      if ((lego.type === 'M' || lego.type === 'C') && lego.components && Array.isArray(lego.components)) {
        for (let i = 0; i < lego.components.length; i++) {
          const key = `${lego.id}:${i}`;
          const suggestedTranslation = fixMap.get(key);

          if (suggestedTranslation) {
            const oldTranslation = lego.components[i][1];
            lego.components[i][1] = suggestedTranslation;
            fixedCount++;

            if (fixedCount <= 10) {
              console.log(`[Fix] ${lego.id} component ${i}: "${oldTranslation}" → "${suggestedTranslation}"`);
            }
          }
        }
      }
    }
  }

  // Write updated lego_pairs.json
  await fs.writeJson(legoPairsPath, legoPairsData, { spaces: 2 });

  console.log(`\n[Fix Components] ✅ Complete!`);
  console.log(`[Fix Components]    Seeds processed: ${seedsProcessed}`);
  console.log(`[Fix Components]    Components fixed: ${fixedCount}`);
  console.log(`[Fix Components]    Output: ${legoPairsPath}\n`);

  return {
    success: true,
    seedsProcessed,
    componentsFixed: fixedCount
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/fix-component-infinitives.cjs <courseDir>');
    console.error('Example: node scripts/fix-component-infinitives.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  fixComponentInfinitives(courseDir)
    .then(result => {
      console.log(`[Fix Components] ✅ Fixed ${result.componentsFixed} component translations!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Fix Components] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fixComponentInfinitives };

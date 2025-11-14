#!/usr/bin/env node

/**
 * Fix infinitive translations in Phase 5 basket files
 *
 * Uses infinitive_component_issues.json to build a map of incorrect
 * translations and fixes them across all basket JSON files.
 */

const fs = require('fs-extra');
const path = require('path');

async function fixBasketInfinitives(courseDir) {
  console.log('\n[Fix Baskets] Starting basket infinitive fix...');
  console.log(`[Fix Baskets] Course: ${courseDir}\n`);

  const issuesPath = path.join(courseDir, 'infinitive_component_issues.json');
  const basketsDir = path.join(courseDir, 'phase5_outputs');

  // Check paths exist
  if (!await fs.pathExists(issuesPath)) {
    throw new Error(`infinitive_component_issues.json not found at: ${issuesPath}`);
  }
  if (!await fs.pathExists(basketsDir)) {
    throw new Error(`phase5_outputs directory not found at: ${basketsDir}`);
  }

  // Read issues file
  const issuesData = await fs.readJson(issuesPath);

  // Build replacement map from issues
  // Map: incorrect translation → correct translation
  const replacements = new Map();
  for (const issue of issuesData.issues) {
    const incorrect = issue.comp_known;
    const correct = issue.comp_suggested;
    if (incorrect !== correct) {
      replacements.set(incorrect, correct);
    }
  }

  console.log(`[Fix Baskets] Unique replacements to make: ${replacements.size}`);
  console.log(`[Fix Baskets] Examples:`);
  let exampleCount = 0;
  for (const [incorrect, correct] of replacements) {
    if (exampleCount++ < 10) {
      console.log(`  "${incorrect}" → "${correct}"`);
    }
  }
  console.log();

  // Get all basket files
  const basketFiles = (await fs.readdir(basketsDir))
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`[Fix Baskets] Found ${basketFiles.length} basket files to process\n`);

  let filesModified = 0;
  let totalReplacements = 0;

  for (const filename of basketFiles) {
    const filePath = path.join(basketsDir, filename);
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    let fileReplacements = 0;

    // Apply each replacement
    for (const [incorrect, correct] of replacements) {
      // Match the word with word boundaries to avoid partial matches
      // e.g., "speak" shouldn't match "speaking"
      const regex = new RegExp(`\\b${incorrect}\\b`, 'g');
      const matches = (content.match(regex) || []).length;

      if (matches > 0) {
        content = content.replace(regex, correct);
        fileReplacements += matches;
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
      filesModified++;
      totalReplacements += fileReplacements;

      if (filesModified <= 5) {
        console.log(`[Fix] ${filename}: ${fileReplacements} replacements`);
      }
    }
  }

  console.log(`\n[Fix Baskets] ✅ Complete!`);
  console.log(`[Fix Baskets]    Files processed: ${basketFiles.length}`);
  console.log(`[Fix Baskets]    Files modified: ${filesModified}`);
  console.log(`[Fix Baskets]    Total replacements: ${totalReplacements}\n`);

  return {
    success: true,
    filesProcessed: basketFiles.length,
    filesModified,
    totalReplacements
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/fix-basket-infinitives.cjs <courseDir>');
    console.error('Example: node scripts/fix-basket-infinitives.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  fixBasketInfinitives(courseDir)
    .then(result => {
      console.log(`[Fix Baskets] ✅ Fixed ${result.totalReplacements} infinitives across ${result.filesModified} files!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Fix Baskets] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fixBasketInfinitives };

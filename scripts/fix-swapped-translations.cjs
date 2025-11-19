#!/usr/bin/env node

/**
 * Fix swapped translations in seed_pairs.json and lego_pairs.json
 *
 * Detects when known/target are backwards by checking for Chinese characters
 */

const fs = require('fs-extra');
const path = require('path');

function hasChinese(text) {
  // Check for Chinese characters (CJK Unified Ideographs)
  return /[\u4e00-\u9fff]/.test(text);
}

function hasEnglish(text) {
  // Check for English letters (basic heuristic)
  return /[a-zA-Z]/.test(text);
}

async function fixSeedPairs(courseDir) {
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  console.log(`\n📖 Reading seed_pairs.json...`);
  const seedPairs = await fs.readJson(seedPairsPath);

  let fixed = 0;

  for (const [seedId, translation] of Object.entries(seedPairs.translations)) {
    const { known, target } = translation;

    // If known has Chinese and target has English, they're backwards!
    if (hasChinese(known) && hasEnglish(target)) {
      console.log(`  🔄 Fixing ${seedId}: known was Chinese, target was English`);
      seedPairs.translations[seedId] = {
        known: target,
        target: known
      };
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log(`✅ No swapped translations found`);
    return 0;
  }

  // Backup
  const backupPath = seedPairsPath.replace('.json', '.pre-fix-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(seedPairsPath, backupPath);

  // Write fixed version (preserve compact format)
  console.log(`✍️  Writing fixed seed_pairs.json...`);
  let output = '{\n';
  output += `  "version": ${JSON.stringify(seedPairs.version)},\n`;
  output += `  "course": ${JSON.stringify(seedPairs.course)},\n`;
  output += `  "target_language": ${JSON.stringify(seedPairs.target_language)},\n`;
  output += `  "known_language": ${JSON.stringify(seedPairs.known_language)},\n`;
  output += `  "generated": ${JSON.stringify(seedPairs.generated)},\n`;
  output += `  "total_seeds": ${seedPairs.total_seeds},\n`;
  output += '  "translations": {\n';

  const translations = Object.entries(seedPairs.translations);
  translations.forEach(([seedId, translation], index) => {
    const isLast = index === translations.length - 1;
    output += `    "${seedId}": {"known": ${JSON.stringify(translation.known)}, "target": ${JSON.stringify(translation.target)}}${isLast ? '' : ','}\n`;
  });

  output += '  }\n';
  output += '}\n';

  await fs.writeFile(seedPairsPath, output);

  console.log(`✅ Fixed ${fixed} swapped translations in seed_pairs.json`);
  return fixed;
}

async function fixLegoPairs(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n📖 Reading lego_pairs.json...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  let fixedSeeds = 0;

  for (const seed of legoPairs.seeds || []) {
    const { known, target } = seed.seed_pair;

    // If known has Chinese and target has English, they're backwards!
    if (hasChinese(known) && hasEnglish(target)) {
      console.log(`  🔄 Fixing ${seed.seed_id}: seed_pair was backwards`);
      seed.seed_pair = {
        known: target,
        target: known
      };
      fixedSeeds++;
    }
  }

  if (fixedSeeds === 0) {
    console.log(`✅ No swapped seed_pairs found`);
    return 0;
  }

  // Backup
  const backupPath = legoPairsPath.replace('.json', '.pre-fix-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(legoPairsPath, backupPath);

  // Write fixed version
  console.log(`✍️  Writing fixed lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

  console.log(`✅ Fixed ${fixedSeeds} swapped seed_pairs in lego_pairs.json`);
  return fixedSeeds;
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

  console.log(`\n🔄 Fixing swapped translations`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    const seedPairsFixed = await fixSeedPairs(courseDir);
    const legoPairsFixed = await fixLegoPairs(courseDir);

    console.log(`\n✅ Fix complete!`);
    console.log(`   - seed_pairs.json: ${seedPairsFixed} fixed`);
    console.log(`   - lego_pairs.json: ${legoPairsFixed} fixed`);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

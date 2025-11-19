#!/usr/bin/env node

/**
 * Compact seed_pairs.json for better readability
 */

const fs = require('fs-extra');
const path = require('path');

async function compactSeedPairs(courseDir) {
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  console.log(`\n📖 Reading seed_pairs.json...`);
  const seedPairs = await fs.readJson(seedPairsPath);

  // Backup original
  const backupPath = seedPairsPath.replace('.json', '.pre-compact-backup.json');
  if (!await fs.pathExists(backupPath)) {
    console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
    await fs.copy(seedPairsPath, backupPath);
  }

  // Build compact output manually
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

  // Write compacted version
  console.log(`✍️  Writing compacted seed_pairs.json...`);
  await fs.writeFile(seedPairsPath, output);

  console.log(`\n✅ Compaction complete!`);
  console.log(`   - Compacted ${translations.length} translations`);
  console.log(`   - Single-line format for each translation`);
  console.log(`   - Backup saved: ${path.basename(backupPath)}`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Compacting seed_pairs.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await compactSeedPairs(courseDir);
  } catch (error) {
    console.error('❌ Compaction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

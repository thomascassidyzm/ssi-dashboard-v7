#!/usr/bin/env node
/**
 * Consolidate all Chinese (cmn_for_eng) basket files into lego_baskets.json
 * This reduces 356 files down to 1 file for faster git operations and deployments
 */

const fs = require('fs');
const path = require('path');

const BASKETS_DIR = path.join(__dirname, 'public/vfs/courses/cmn_for_eng/phase5_outputs');
const OUTPUT_FILE = path.join(__dirname, 'public/vfs/courses/cmn_for_eng/lego_baskets.json');

console.log('🔄 Consolidating Chinese basket files...\n');

// Get all basket files sorted by seed number
const basketFiles = fs.readdirSync(BASKETS_DIR)
  .filter(f => f.match(/^seed_S\d+_baskets\.json$/i))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

console.log(`Found ${basketFiles.length} basket files`);

// Consolidate all baskets
const allBaskets = {};
let totalBaskets = 0;

for (const file of basketFiles) {
  const filePath = path.join(BASKETS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Merge baskets
  Object.assign(allBaskets, data);
  totalBaskets += Object.keys(data).length;

  console.log(`  ✓ ${file}: ${Object.keys(data).length} baskets`);
}

// Write consolidated file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allBaskets, null, 2), 'utf8');

const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ Consolidated ${totalBaskets} baskets into lego_baskets.json (${fileSize} MB)`);
console.log(`📁 Output: ${OUTPUT_FILE}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Review the consolidated file`);
console.log(`   2. Delete individual basket files: rm public/vfs/courses/cmn_for_eng/phase5_outputs/seed_*_baskets.json`);
console.log(`   3. Update .gitignore to ignore phase5_outputs/`);
console.log(`   4. Commit lego_baskets.json to main branch`);

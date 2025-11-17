#!/usr/bin/env node
/**
 * Recovery script for pasting basket data from Claude Code browser sessions
 *
 * Usage:
 * 1. In browser tab, read the basket file: cat public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0652_baskets.json
 * 2. Copy the JSON output
 * 3. Save to a temporary file: /tmp/seed_S0652_baskets.json
 * 4. Run: node recover_from_browser.cjs /tmp/seed_S0652_baskets.json
 *
 * Or paste multiple files in a directory:
 * node recover_from_browser.cjs /tmp/recovered_baskets/
 */

const fs = require('fs');
const path = require('path');

const LEGO_BASKETS = path.join(__dirname, 'public/vfs/courses/cmn_for_eng/lego_baskets.json');
const PHASE5_OUTPUT = path.join(__dirname, 'public/vfs/courses/cmn_for_eng/phase5_outputs');

// Load existing consolidated baskets
let allBaskets = {};
if (fs.existsSync(LEGO_BASKETS)) {
  allBaskets = JSON.parse(fs.readFileSync(LEGO_BASKETS, 'utf8'));
  console.log(`📦 Loaded existing baskets: ${Object.keys(allBaskets).length} baskets`);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node recover_from_browser.cjs <file-or-directory>');
  process.exit(1);
}

let filesToProcess = [];

if (fs.statSync(inputPath).isDirectory()) {
  // Process all JSON files in directory
  filesToProcess = fs.readdirSync(inputPath)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(inputPath, f));
} else {
  filesToProcess = [inputPath];
}

console.log(`\n🔄 Processing ${filesToProcess.length} files...\n`);

let totalAdded = 0;
let totalUpdated = 0;

for (const file of filesToProcess) {
  const basename = path.basename(file);
  console.log(`Processing: ${basename}`);

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const basketCount = Object.keys(data).length;

    let added = 0;
    let updated = 0;

    // Merge baskets
    for (const [id, basket] of Object.entries(data)) {
      if (allBaskets[id]) {
        updated++;
      } else {
        added++;
      }
      allBaskets[id] = basket;
    }

    console.log(`  ✓ ${basketCount} baskets (${added} new, ${updated} updated)`);

    // Also save to phase5_outputs directory
    const outputFile = path.join(PHASE5_OUTPUT, basename);
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✓ Saved to ${outputFile}`);

    totalAdded += added;
    totalUpdated += updated;

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
  }

  console.log('');
}

// Write updated consolidated file
fs.writeFileSync(LEGO_BASKETS, JSON.stringify(allBaskets, null, 2), 'utf8');

const fileSize = (fs.statSync(LEGO_BASKETS).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ Recovery complete!`);
console.log(`📊 Total baskets: ${Object.keys(allBaskets).length}`);
console.log(`   New: ${totalAdded}, Updated: ${totalUpdated}`);
console.log(`📁 Consolidated file: ${LEGO_BASKETS} (${fileSize} MB)`);
console.log(`\n💡 Next: Review and commit the updated lego_baskets.json`);

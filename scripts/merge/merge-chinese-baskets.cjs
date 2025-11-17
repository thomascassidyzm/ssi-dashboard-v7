#!/usr/bin/env node

/**
 * Merge Chinese basket files into standard lego_baskets.json format
 */

const fs = require('fs');
const path = require('path');

const OUTPUTS_DIR = 'public/vfs/courses/cmn_for_eng/phase5_outputs';
const OUTPUT_FILE = 'public/vfs/courses/cmn_for_eng/lego_baskets.json';

console.log('Merging Chinese basket files...\n');

// Read all basket files
const files = fs.readdirSync(OUTPUTS_DIR)
  .filter(f => f.match(/^seed_S\d+_baskets\.json$/))
  .sort();

console.log(`Found ${files.length} basket files`);

const mergedBaskets = {};
let totalBaskets = 0;

for (const file of files) {
  const filePath = path.join(OUTPUTS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Handle both formats: { legos: {...} } or direct {...}
  const baskets = data.legos || data;

  const basketCount = Object.keys(baskets).length;
  totalBaskets += basketCount;

  console.log(`  ${file}: ${basketCount} baskets`);

  // Merge into main object
  Object.assign(mergedBaskets, baskets);
}

// Create final output in standard format
const output = {
  version: "8.1.1",
  phase: "5",
  methodology: "Phase 5 Intelligence v7.0",
  generated_at: new Date().toISOString(),
  course: {
    code: "cmn_for_eng",
    target: "Chinese",
    known: "English"
  },
  seeds_processed: files.length,
  total_baskets: totalBaskets,
  baskets: mergedBaskets,
  last_modified: new Date().toISOString(),
  modification_reason: "Merged from git branches (clean extraction)"
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log(`\n✅ Merged ${totalBaskets} baskets into ${OUTPUT_FILE}`);
console.log(`   Seeds processed: ${files.length}`);
console.log(`   Format: Standard (baskets key)`);

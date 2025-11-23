#!/usr/bin/env node

/**
 * Fix Component Format in lego_pairs.json
 *
 * Converts string array components to object format with known/target pairs
 * Note: This can only work if we can infer the known side from context
 */

const fs = require('fs-extra');
const path = require('path');

const courseDir = process.argv[2];

if (!courseDir) {
  console.error('Usage: node fix-component-format.cjs <course_dir>');
  console.error('Example: node fix-component-format.cjs public/vfs/courses/fra_for_eng');
  process.exit(1);
}

const legoFile = path.join(courseDir, 'lego_pairs.json');

if (!fs.existsSync(legoFile)) {
  console.error(`Error: ${legoFile} not found`);
  process.exit(1);
}

console.log(`🔧 Fixing component format in ${legoFile}\n`);

// Load data
const data = fs.readJSONSync(legoFile);

// Create backup
const backupFile = legoFile.replace('.json', `.backup-${Date.now()}.json`);
fs.writeJSONSync(backupFile, data, { spaces: 2 });
console.log(`✅ Backup created: ${backupFile}\n`);

let fixedCount = 0;
let errorCount = 0;

// Process each seed
data.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    // Check if components exist and are in wrong format (array of strings)
    if (lego.components && Array.isArray(lego.components) &&
        lego.components.length > 0 && typeof lego.components[0] === 'string') {

      console.log(`❌ ${lego.id}: Invalid component format (string array)`);
      console.log(`   Components: [${lego.components.join(', ')}]`);
      console.log(`   ⚠️  Cannot auto-convert - known side is missing!`);
      console.log(`   This LEGO needs manual review and resubmission.\n`);

      // Mark as needing manual fix
      lego.components_invalid = true;
      lego.components_raw = lego.components;
      delete lego.components; // Remove invalid data

      errorCount++;
    }
  });
});

// Save fixed data
fs.writeJSONSync(legoFile, data, { spaces: 2 });

console.log(`\n📊 Summary:`);
console.log(`   Seeds with invalid components: ${errorCount}`);
console.log(`   ⚠️  Manual review required for ${errorCount} LEGOs`);
console.log(`\n💡 To fix properly:`);
console.log(`   1. Identify which agent submitted S0021, S0026, S0028`);
console.log(`   2. Check the agent prompt - it should output {known, target} objects`);
console.log(`   3. Re-run those seeds through Phase 3 with correct format`);
console.log(`   4. Use Phase 3 merge endpoint to update`);

if (errorCount > 0) {
  process.exit(1);
}

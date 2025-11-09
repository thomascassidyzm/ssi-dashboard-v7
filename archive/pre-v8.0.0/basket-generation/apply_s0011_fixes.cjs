#!/usr/bin/env node

/**
 * Apply S0011 basket fixes to lego_baskets.json
 */

const fs = require('fs').promises;
const path = require('path');

const BASKETS_PATH = path.join(__dirname, 'vfs/courses/spa_for_eng_20seeds/lego_baskets.json');
const FIXES_PATH = path.join(__dirname, 's0011_baskets_v2_corrected.json');
const BACKUP_PATH = path.join(__dirname, 'vfs/courses/spa_for_eng_20seeds/lego_baskets_v1_backup.json');

async function main() {
  console.log('Applying S0011 Basket Fixes...\n');

  // Load files
  const baskets = JSON.parse(await fs.readFile(BASKETS_PATH, 'utf8'));
  const fixes = JSON.parse(await fs.readFile(FIXES_PATH, 'utf8'));

  // Backup original
  await fs.writeFile(BACKUP_PATH, JSON.stringify(baskets, null, 2), 'utf8');
  console.log(`✓ Backed up original to: ${BACKUP_PATH}`);

  // Apply fixes
  for (const legoId of ['S0011L01', 'S0011L02', 'S0011L03', 'S0011L04']) {
    baskets[legoId] = fixes[legoId];
    console.log(`✓ Updated ${legoId}`);
  }

  // Write updated baskets
  await fs.writeFile(BASKETS_PATH, JSON.stringify(baskets, null, 2), 'utf8');
  console.log(`\n✓ Wrote updated baskets to: ${BASKETS_PATH}`);

  console.log('\n✅ Fixes applied! Run validator again to verify:');
  console.log('   node validate_s0011_baskets.cjs\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

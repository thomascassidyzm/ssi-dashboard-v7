#!/usr/bin/env node

/**
 * Compare JSON content (ignoring formatting)
 */

const fs = require('fs-extra');

async function main() {
  console.log('📊 Comparing basket content (normalized)...\n');

  const backup = await fs.readJSON('public/vfs/courses/cmn_for_eng/lego_baskets copy.json');
  const newFile = await fs.readJSON('public/vfs/courses/cmn_for_eng/lego_baskets_NEW.json');

  const backupStr = JSON.stringify(backup.baskets, null, 0);
  const newStr = JSON.stringify(newFile.baskets, null, 0);

  if (backupStr === newStr) {
    console.log('✅ IDENTICAL - Content is byte-for-byte the same (only formatting changed)');
  } else {
    console.log('🔄 DIFFERENT - Content actually changed');

    // Find first difference
    const backupKeys = Object.keys(backup.baskets).sort();
    const newKeys = Object.keys(newFile.baskets).sort();

    console.log(`\nBasket counts:`);
    console.log(`  Backup: ${backupKeys.length}`);
    console.log(`  New:    ${newKeys.length}`);

    // Check first seed
    const s0001Backup = JSON.stringify(backup.baskets['S0001L01']);
    const s0001New = JSON.stringify(newFile.baskets['S0001L01']);

    console.log(`\nS0001L01 comparison:`);
    console.log(`  Match: ${s0001Backup === s0001New}`);
  }
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Derive is_final_lego from basket IDs
 *
 * is_final_lego is true for the highest L-number within each seed.
 * Example: S0024 has L01-L06, so S0024L06 gets is_final_lego: true
 */

const fs = require('fs-extra');
const path = require('path');

async function deriveIsFinalLego(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  // Group baskets by seed
  const seedGroups = {};
  for (const legoId of Object.keys(baskets.baskets || {})) {
    const match = legoId.match(/^(S\d+)L(\d+)$/);
    if (match) {
      const seedId = match[1];
      const legoNum = parseInt(match[2], 10);

      if (!seedGroups[seedId]) {
        seedGroups[seedId] = [];
      }
      seedGroups[seedId].push({ legoId, legoNum });
    }
  }

  // Find highest L-number for each seed
  const finalLegos = new Set();
  for (const [seedId, legos] of Object.entries(seedGroups)) {
    const maxLegoNum = Math.max(...legos.map(l => l.legoNum));
    const finalLego = legos.find(l => l.legoNum === maxLegoNum);
    if (finalLego) {
      finalLegos.add(finalLego.legoId);
    }
  }

  // Set is_final_lego for all baskets
  let updated = 0;
  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    const isFinal = finalLegos.has(legoId);

    if (basket.is_final_lego !== isFinal) {
      basket.is_final_lego = isFinal;
      updated++;
    }
  }

  if (updated === 0) {
    console.log(`✅ All is_final_lego values already correct`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-derive-final-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write updated version
  console.log(`✍️  Writing updated lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Derivation complete!`);
  console.log(`   - Updated ${updated} baskets`);
  console.log(`   - Found ${finalLegos.size} final LEGOs across ${Object.keys(seedGroups).length} seeds`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Deriving is_final_lego from basket IDs`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await deriveIsFinalLego(courseDir);
  } catch (error) {
    console.error('❌ Derivation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

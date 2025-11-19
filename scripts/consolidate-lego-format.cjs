#!/usr/bin/env node

/**
 * Consolidate lego format to use consistent labeled objects
 *
 * Change from:
 * {
 *   "id": "S0003L01",
 *   "type": "M",
 *   "target": "cómo hablar",
 *   "known": "how to speak",
 *   "new": true
 * }
 *
 * To:
 * {
 *   "id": "S0003L01",
 *   "type": "M",
 *   "lego": {
 *     "known": "how to speak",
 *     "target": "cómo hablar"
 *   },
 *   "new": true
 * }
 */

const fs = require('fs-extra');
const path = require('path');

async function consolidateLegoPairs(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n📖 Reading lego_pairs.json...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  let converted = 0;

  // Process each seed
  for (const seed of legoPairs.seeds || []) {
    // Convert each lego
    for (const lego of seed.legos || []) {
      if (lego.known && lego.target) {
        // Create lego object with consistent format
        lego.lego = {
          known: lego.known,
          target: lego.target
        };

        // Remove old separate properties
        delete lego.known;
        delete lego.target;

        converted++;
      }
    }
  }

  // Backup original
  const backupPath = legoPairsPath.replace('.json', '.pre-consolidate-backup.json');
  console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
  await fs.copy(legoPairsPath, backupPath);

  // Write consolidated version
  console.log(`✍️  Writing consolidated lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

  console.log(`\n✅ Consolidation complete!`);
  console.log(`   - Converted ${converted} LEGOs to consistent format`);
  console.log(`   - All data now uses: { "known": "English", "target": "Spanish" }`);
  console.log(`   - Backup saved: ${path.basename(backupPath)}`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Consolidating lego format to consistent labeled objects`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await consolidateLegoPairs(courseDir);
  } catch (error) {
    console.error('❌ Consolidation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

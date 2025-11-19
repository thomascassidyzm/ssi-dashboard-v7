#!/usr/bin/env node

/**
 * Convert lego_pairs.json to consistent labeled object format
 *
 * Changes:
 * 1. seed_pair: ["Spanish", "English"] → { "known": "English", "target": "Spanish" }
 * 2. components: [["Spanish", "English"], ...] → [{ "known": "English", "target": "Spanish" }, ...]
 * 3. Keep lego.known and lego.target as-is (already labeled)
 *
 * Format: known language first (learner's input), target language second (learner's output)
 */

const fs = require('fs-extra');
const path = require('path');

async function convertLegoPairs(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`📖 Reading ${legoPairsPath}...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  let convertedSeeds = 0;
  let convertedComponents = 0;

  // Process each seed
  for (const seed of legoPairs.seeds || []) {
    // Convert seed_pair from array to labeled object
    if (seed.seed_pair && Array.isArray(seed.seed_pair)) {
      const [target, known] = seed.seed_pair; // Currently: [Spanish, English]
      seed.seed_pair = {
        known: known,   // English first (input language)
        target: target  // Spanish second (output language)
      };
      convertedSeeds++;
    }

    // Convert components in each LEGO
    for (const lego of seed.legos || []) {
      if (lego.components && Array.isArray(lego.components)) {
        lego.components = lego.components.map(component => {
          if (Array.isArray(component)) {
            const [target, known] = component; // Currently: [Spanish, English]
            convertedComponents++;
            return {
              known: known,   // English first
              target: target  // Spanish second
            };
          }
          return component; // Already converted
        });
      }

      // lego.known and lego.target are already labeled - leave them as-is
    }
  }

  // Backup original
  const backupPath = legoPairsPath.replace('.json', '.backup.json');
  console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
  await fs.copy(legoPairsPath, backupPath);

  // Write converted version
  console.log(`✍️  Writing converted lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

  console.log(`\n✅ Conversion complete!`);
  console.log(`   - Converted ${convertedSeeds} seed_pairs`);
  console.log(`   - Converted ${convertedComponents} LEGO components`);
  console.log(`   - Backup saved: ${path.basename(backupPath)}`);

  return { convertedSeeds, convertedComponents };
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  try {
    await convertLegoPairs(courseDir);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node

/**
 * Convert seed_pairs.json and lego_pairs.json to consistent labeled object format
 *
 * Original formats:
 * - seed_pairs: [English, Spanish] (known, target)
 * - lego_pairs seed_pair: [English, Spanish] (known, target)
 * - lego_pairs components: [Spanish, English] (target, known)
 *
 * Target format (consistent everywhere):
 * - { "known": "English", "target": "Spanish" }
 */

const fs = require('fs-extra');
const path = require('path');

async function convertSeedPairs(courseDir) {
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

  console.log(`\n📖 Reading ${seedPairsPath}...`);
  const seedPairs = await fs.readJson(seedPairsPath);

  let converted = 0;

  // Convert each translation from array to labeled object
  for (const [seedId, translation] of Object.entries(seedPairs.translations || {})) {
    if (Array.isArray(translation) && translation.length === 2) {
      const [known, target] = translation; // [English, Spanish]
      seedPairs.translations[seedId] = {
        known: known,   // English first
        target: target  // Spanish second
      };
      converted++;
    }
  }

  // Backup original
  const backupPath = seedPairsPath.replace('.json', '.backup.json');
  if (!await fs.pathExists(backupPath)) {
    console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
    await fs.copy(seedPairsPath, backupPath);
  } else {
    console.log(`⏭️  Backup already exists, skipping...`);
  }

  // Write converted version
  console.log(`✍️  Writing converted seed_pairs.json...`);
  await fs.writeJson(seedPairsPath, seedPairs, { spaces: 2 });

  console.log(`✅ seed_pairs.json: Converted ${converted} translations`);
  return converted;
}

async function convertLegoPairs(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n📖 Reading ${legoPairsPath}...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  let convertedSeeds = 0;
  let convertedComponents = 0;

  // Process each seed
  for (const seed of legoPairs.seeds || []) {
    // Convert seed_pair from array to labeled object
    if (seed.seed_pair && Array.isArray(seed.seed_pair)) {
      const [known, target] = seed.seed_pair; // [English, Spanish]
      seed.seed_pair = {
        known: known,   // English first
        target: target  // Spanish second
      };
      convertedSeeds++;
    } else if (seed.seed_pair && typeof seed.seed_pair === 'object' && !Array.isArray(seed.seed_pair)) {
      // Already converted but might have wrong labels - check and fix
      const { known, target } = seed.seed_pair;
      // Heuristic: if known starts with capital letter and has mostly English words, it's probably backwards
      // Better heuristic: check against individual lego.known values which we know are correct
      const firstLego = seed.legos?.[0];
      if (firstLego && firstLego.known && firstLego.target) {
        // firstLego.known is English, firstLego.target is Spanish
        // If seed_pair.known contains Spanish characters (ñ, á, etc.) it's backwards
        if (/[ñáéíóúü]/i.test(known)) {
          // Backwards! Swap them
          seed.seed_pair = {
            known: target,  // Was backwards, now correct
            target: known   // Was backwards, now correct
          };
          convertedSeeds++;
          console.log(`  🔄 Fixed backwards seed_pair for ${seed.seed_id}`);
        }
      }
    }

    // Convert components in each LEGO
    for (const lego of seed.legos || []) {
      if (lego.components && Array.isArray(lego.components)) {
        lego.components = lego.components.map(component => {
          if (Array.isArray(component)) {
            const [target, known] = component; // [Spanish, English] - different order!
            convertedComponents++;
            return {
              known: known,   // English first
              target: target  // Spanish second
            };
          }
          return component; // Already converted
        });
      }

      // lego.known and lego.target are already labeled correctly - leave as-is
    }
  }

  // Backup original
  const backupPath = legoPairsPath.replace('.json', '.backup.json');
  if (!await fs.pathExists(backupPath)) {
    console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
    await fs.copy(legoPairsPath, backupPath);
  } else {
    console.log(`⏭️  Backup already exists, skipping...`);
  }

  // Write converted version
  console.log(`✍️  Writing converted lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

  console.log(`✅ lego_pairs.json: Converted ${convertedSeeds} seed_pairs, ${convertedComponents} components`);
  return { convertedSeeds, convertedComponents };
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Converting to labeled format: ${courseDir}\n`);
  console.log(`Target format everywhere: { "known": "English", "target": "Spanish" }\n`);

  try {
    const seedCount = await convertSeedPairs(courseDir);
    const { convertedSeeds, convertedComponents } = await convertLegoPairs(courseDir);

    console.log(`\n✅ Conversion complete!`);
    console.log(`   - seed_pairs.json: ${seedCount} translations`);
    console.log(`   - lego_pairs.json: ${convertedSeeds} seed_pairs, ${convertedComponents} components`);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

#!/usr/bin/env node

/**
 * Convert lego_baskets.json to labeled object format
 *
 * Changes:
 * - lego: ["English", "Target"] → {"known": "English", "target": "Target"}
 * - practice_phrases: [["English", "Target", null, 1], ...] → [{"known": "English", "target": "Target"}, ...]
 */

const fs = require('fs-extra');
const path = require('path');

async function convertBaskets(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let convertedLegos = 0;
  let convertedPhrases = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    // Convert lego field
    if (Array.isArray(basket.lego) && basket.lego.length === 2) {
      const [known, target] = basket.lego;
      basket.lego = {
        known: known,
        target: target
      };
      convertedLegos++;
    }

    // Convert practice_phrases
    if (Array.isArray(basket.practice_phrases)) {
      basket.practice_phrases = basket.practice_phrases.map(phrase => {
        if (Array.isArray(phrase)) {
          // Old format: ["English", "Target", null, 1]
          const [known, target] = phrase;
          convertedPhrases++;
          return {
            known: known,
            target: target
          };
        }
        return phrase; // Already converted
      });
    }
  }

  if (convertedLegos === 0 && convertedPhrases === 0) {
    console.log(`✅ Already in correct format`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-format-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write converted version
  console.log(`✍️  Writing converted lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Conversion complete!`);
  console.log(`   - Converted ${convertedLegos} lego fields`);
  console.log(`   - Converted ${convertedPhrases} practice phrases`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

  console.log(`\n🔄 Converting lego_baskets.json to labeled format`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await convertBaskets(courseDir);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

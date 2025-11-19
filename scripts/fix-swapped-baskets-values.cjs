#!/usr/bin/env node

/**
 * Fix swapped values in lego_baskets.json seed_context
 *
 * Detects when known/target VALUES are backwards by checking for Chinese characters
 * (same logic as fix-swapped-translations.cjs but for lego_baskets)
 */

const fs = require('fs-extra');
const path = require('path');

function hasChinese(text) {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

function hasEnglish(text) {
  if (!text) return false;
  return /[a-zA-Z]/.test(text);
}

async function fixBasketValues(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  let fixedContexts = 0;
  let fixedLegos = 0;
  let fixedPhrases = 0;

  for (const [legoId, basket] of Object.entries(baskets.baskets || {})) {
    // Fix seed_context in metadata
    if (basket._metadata?.seed_context) {
      const { known, target } = basket._metadata.seed_context;

      // If known has Chinese and target has English, they're backwards!
      if (hasChinese(known) && hasEnglish(target)) {
        console.log(`  🔄 Fixing ${legoId} seed_context: known was Chinese, target was English`);
        basket._metadata.seed_context = {
          known: target,
          target: known
        };
        fixedContexts++;
      }
    }

    // Fix lego field
    if (basket.lego) {
      const { known, target } = basket.lego;

      if (hasChinese(known) && hasEnglish(target)) {
        console.log(`  🔄 Fixing ${legoId} lego: known was Chinese, target was English`);
        basket.lego = {
          known: target,
          target: known
        };
        fixedLegos++;
      }
    }

    // Fix practice_phrases
    if (Array.isArray(basket.practice_phrases)) {
      basket.practice_phrases = basket.practice_phrases.map((phrase, idx) => {
        if (phrase.known && phrase.target && hasChinese(phrase.known) && hasEnglish(phrase.target)) {
          if (fixedPhrases === 0) {
            console.log(`  🔄 Fixing ${legoId} practice_phrases...`);
          }
          fixedPhrases++;
          return {
            known: phrase.target,
            target: phrase.known
          };
        }
        return phrase;
      });
    }
  }

  if (fixedContexts === 0 && fixedLegos === 0 && fixedPhrases === 0) {
    console.log(`✅ No swapped values found`);
    return;
  }

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-value-fix-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Write fixed version
  console.log(`✍️  Writing fixed lego_baskets.json...`);
  await fs.writeJson(basketsPath, baskets, { spaces: 2 });

  console.log(`\n✅ Fix complete!`);
  console.log(`   - Fixed ${fixedContexts} seed_context fields`);
  console.log(`   - Fixed ${fixedLegos} lego fields`);
  console.log(`   - Fixed ${fixedPhrases} practice phrases`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

  console.log(`\n🔄 Fixing swapped values in lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await fixBasketValues(courseDir);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

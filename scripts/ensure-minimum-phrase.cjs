#!/usr/bin/env node

/**
 * Ensure Minimum Phrase in All Baskets
 *
 * Pre-validator that adds the LEGO itself as the first phrase in its basket.
 * Then de-duplicates to remove any duplicates.
 *
 * Purpose:
 * - Prevent empty baskets (causes Phase 6/7 issues)
 * - Safe fallback after GATE cleaning removes phrases
 * - Pedagogically sound (learner sees LEGO at least once)
 *
 * Usage:
 *   node scripts/ensure-minimum-phrase.cjs <course_code>
 *   node scripts/ensure-minimum-phrase.cjs spa_for_eng
 *
 * Process:
 * 1. For each basket, prepend LEGO itself as first phrase
 * 2. De-duplicate practice_phrases array
 * 3. Result: Every basket has at least the LEGO itself
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node ensure-minimum-phrase.cjs <course_code>');
  console.error('Example: node ensure-minimum-phrase.cjs spa_for_eng');
  process.exit(1);
}

const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);
const basketsPath = path.join(courseDir, 'lego_baskets.json');

console.log('🛡️  Ensuring Minimum Phrase in All Baskets');
console.log(`Course: ${courseCode}\n`);

async function ensureMinimumPhrase() {
  if (!await fs.pathExists(basketsPath)) {
    console.error(`❌ Error: lego_baskets.json not found: ${basketsPath}`);
    process.exit(1);
  }

  const basketsData = await fs.readJson(basketsPath);
  const baskets = basketsData.baskets || {};

  let totalBaskets = 0;
  let emptyBaskets = 0;
  let prependedLego = 0;
  let deduplicated = 0;

  console.log(`📊 Total baskets: ${Object.keys(baskets).length}\n`);
  console.log('Processing baskets...\n');

  for (const [legoId, basket] of Object.entries(baskets)) {
    totalBaskets++;

    if (!basket.lego) {
      console.error(`⚠️  ${legoId}: Missing lego data, skipping`);
      continue;
    }

    const wasEmpty = !basket.practice_phrases || basket.practice_phrases.length === 0;

    if (wasEmpty) {
      emptyBaskets++;
    }

    // Ensure practice_phrases array exists
    if (!basket.practice_phrases) {
      basket.practice_phrases = [];
    }

    // Create LEGO phrase
    const legoPhrase = {
      known: basket.lego.known,
      target: basket.lego.target
    };

    // Prepend LEGO itself as first phrase
    basket.practice_phrases.unshift(legoPhrase);
    prependedLego++;

    // De-duplicate
    const originalLength = basket.practice_phrases.length;
    basket.practice_phrases = deduplicatePhrases(basket.practice_phrases);
    const newLength = basket.practice_phrases.length;

    if (originalLength !== newLength) {
      deduplicated++;
      if (wasEmpty) {
        console.log(`   ${legoId}: was empty, added LEGO (no duplicates found)`);
      } else {
        console.log(`   ${legoId}: removed ${originalLength - newLength} duplicate(s)`);
      }
    } else if (wasEmpty) {
      console.log(`   ${legoId}: was empty, added LEGO`);
    }
  }

  // Write back
  await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total baskets:           ${totalBaskets}`);
  console.log(`Baskets that were empty: ${emptyBaskets}`);
  console.log(`LEGOs prepended:         ${prependedLego}`);
  console.log(`Baskets de-duplicated:   ${deduplicated}`);
  console.log('\n✅ All baskets now have at least 1 phrase (the LEGO itself)');
  console.log(`📄 Updated: ${basketsPath}\n`);
}

/**
 * De-duplicate practice phrases
 * Compares known + target text
 */
function deduplicatePhrases(phrases) {
  const seen = new Set();
  const unique = [];

  for (const phrase of phrases) {
    // Handle both object and array formats
    let key;
    if (Array.isArray(phrase)) {
      // Array format: [known, target, null, level]
      key = `${phrase[0]}|${phrase[1]}`;
    } else if (phrase.known && phrase.target) {
      // Object format: { known: "...", target: "..." }
      key = `${phrase.known}|${phrase.target}`;
    } else {
      // Unknown format, keep it
      unique.push(phrase);
      continue;
    }

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(phrase);
    }
  }

  return unique;
}

ensureMinimumPhrase().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

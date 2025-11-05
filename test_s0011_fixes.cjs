#!/usr/bin/env node

/**
 * Test S0011 corrected baskets before applying
 */

const fs = require('fs').promises;
const path = require('path');

// Reuse validation logic
const COURSE_DIR = path.join(__dirname, 'vfs/courses/spa_for_eng_20seeds');
const LEGO_PAIRS_PATH = path.join(COURSE_DIR, 'lego_pairs.json');
const CORRECTED_PATH = path.join(__dirname, 's0011_baskets_v2_corrected.json');

function buildLegoRegistry(legoPairs) {
  const registry = [];
  for (const [seedId, seedPair, legos] of legoPairs) {
    for (const lego of legos) {
      const [legoId, type, target, known, breakdown] = lego;
      registry.push({ id: legoId, type, target, known, breakdown: breakdown || null, seedId });
    }
  }
  return registry;
}

function checkTiling(phrase, availableLegos) {
  const sorted = [...availableLegos].sort((a, b) => b.target.length - a.target.length);
  let remaining = phrase;
  const usedLegos = [];

  for (const lego of sorted) {
    while (remaining.includes(lego.target)) {
      usedLegos.push(lego.id);
      remaining = remaining.replace(lego.target, '').trim();
    }
  }

  return { tiles: remaining.length === 0, usedLegos, remainder: remaining };
}

function validateBasket(basketId, basket, legoRegistry) {
  const errors = [];
  const basketLego = legoRegistry.find(l => l.id === basketId);
  if (!basketLego) {
    return { errors: [{ message: `LEGO ${basketId} not found` }] };
  }

  const availableIndex = legoRegistry.findIndex(l => l.id === basketId);
  const availableLegos = legoRegistry.slice(0, availableIndex);
  const availableWithSelf = [...availableLegos, basketLego];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${basketId}: "${basketLego.target}" / "${basketLego.known}"`);
  console.log(`Available: ${availableLegos.length} LEGOs`);
  console.log(`${'='.repeat(60)}`);

  // E-phrases
  console.log(`\n📝 E-PHRASES (${basket.e.length}):`);
  for (let i = 0; i < basket.e.length; i++) {
    const [targetPhrase, knownPhrase] = basket.e[i];
    console.log(`  ${i + 1}. "${targetPhrase}"`);

    if (!targetPhrase.includes(basketLego.target)) {
      errors.push({ type: 'missing_basket_lego', index: i, phrase: targetPhrase });
      console.log(`     ❌ Missing basket LEGO`);
    }

    const tiling = checkTiling(targetPhrase, availableWithSelf);
    if (!tiling.tiles) {
      errors.push({ type: 'poor_tiling', index: i, phrase: targetPhrase, remainder: tiling.remainder });
      console.log(`     ❌ Poor tiling: "${tiling.remainder}"`);
    } else {
      console.log(`     ✓ Tiles: ${tiling.usedLegos.join(' + ')}`);
    }
  }

  // D-phrases
  for (const [windowSize, phrases] of Object.entries(basket.d)) {
    console.log(`\n📦 D-PHRASES (window ${windowSize}): ${phrases.length} phrases`);
    for (let i = 0; i < phrases.length; i++) {
      const [targetPhrase, knownPhrase] = phrases[i];
      console.log(`  ${i + 1}. "${targetPhrase}"`);

      if (!targetPhrase.includes(basketLego.target)) {
        errors.push({ type: 'missing_basket_lego', windowSize, index: i, phrase: targetPhrase });
        console.log(`     ❌ Missing basket LEGO`);
      }

      const tiling = checkTiling(targetPhrase, availableWithSelf);
      if (!tiling.tiles) {
        errors.push({ type: 'poor_tiling', windowSize, index: i, phrase: targetPhrase, remainder: tiling.remainder });
        console.log(`     ❌ Poor tiling: "${tiling.remainder}"`);
      } else {
        console.log(`     ✓ Tiles: ${tiling.usedLegos.join(' + ')}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ERRORS: ${errors.length}`);
  console.log(`STATUS: ${errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`${'='.repeat(60)}`);

  return { errors };
}

async function main() {
  console.log('TESTING S0011 CORRECTED BASKETS');
  console.log('================================\n');

  const legoPairs = JSON.parse(await fs.readFile(LEGO_PAIRS_PATH, 'utf8'));
  const correctedBaskets = JSON.parse(await fs.readFile(CORRECTED_PATH, 'utf8'));
  const legoRegistry = buildLegoRegistry(legoPairs);

  let totalErrors = 0;

  for (const legoId of ['S0011L01', 'S0011L02', 'S0011L03', 'S0011L04']) {
    const basket = correctedBaskets[legoId];
    const result = validateBasket(legoId, basket, legoRegistry);
    totalErrors += result.errors.length;
  }

  console.log(`\n\n${'█'.repeat(60)}`);
  console.log(`FINAL RESULT: ${totalErrors === 0 ? '✅ ALL PASS' : `❌ ${totalErrors} ERRORS`}`);
  console.log(`${'█'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

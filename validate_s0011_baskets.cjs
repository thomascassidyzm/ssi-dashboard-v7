#!/usr/bin/env node

/**
 * S0011 Basket Validator and Whitelist Builder
 *
 * Tasks:
 * 1. Build cumulative vocabulary whitelists for each S0011 LEGO
 * 2. Validate existing S0011 baskets against v2.0 rules
 * 3. Report violations and suggest improvements
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Paths
const COURSE_DIR = path.join(__dirname, 'vfs/courses/spa_for_eng_20seeds');
const LEGO_PAIRS_PATH = path.join(COURSE_DIR, 'lego_pairs.json');
const BASKETS_PATH = path.join(COURSE_DIR, 'lego_baskets.json');

/**
 * Build LEGO registry from lego_pairs.json
 */
function buildLegoRegistry(legoPairs) {
  const registry = [];

  for (const [seedId, seedPair, legos] of legoPairs) {
    for (const lego of legos) {
      const [legoId, type, target, known, breakdown] = lego;
      registry.push({
        id: legoId,
        type,
        target,
        known,
        breakdown: breakdown || null,
        seedId
      });
    }
  }

  return registry;
}

/**
 * Build cumulative vocabulary whitelist up to (but not including) a given LEGO
 */
function buildWhitelist(legoRegistry, upToLegoId) {
  const whitelist = {
    words: new Set(),
    phrases: new Set(),
    legos: []
  };

  for (const lego of legoRegistry) {
    // Stop when we reach the target LEGO
    if (lego.id === upToLegoId) break;

    whitelist.legos.push(lego);
    whitelist.phrases.add(lego.target);

    // If compound LEGO, add individual words
    if (lego.breakdown && Array.isArray(lego.breakdown)) {
      for (const [word, translation] of lego.breakdown) {
        whitelist.words.add(word);
      }
    } else {
      // Simple LEGO - add the whole thing as a word
      whitelist.words.add(lego.target);
    }
  }

  return {
    words: Array.from(whitelist.words).sort(),
    phrases: Array.from(whitelist.phrases).sort(),
    legos: whitelist.legos,
    count: whitelist.legos.length
  };
}

/**
 * Check if a phrase tiles perfectly from available LEGOs
 */
function checkTiling(phrase, availableLegos) {
  // Sort by length (longest first) to match greedily
  const sorted = [...availableLegos].sort((a, b) => b.target.length - a.target.length);

  let remaining = phrase;
  const usedLegos = [];

  for (const lego of sorted) {
    if (remaining.includes(lego.target)) {
      usedLegos.push(lego.id);
      remaining = remaining.replace(lego.target, '').trim();
    }
  }

  return {
    tiles: remaining.length === 0,
    usedLegos,
    remainder: remaining
  };
}

/**
 * Validate a single basket against v2.0 rules
 */
function validateBasket(basketId, basket, legoRegistry) {
  const errors = [];
  const warnings = [];

  // Find basket LEGO in registry
  const basketLego = legoRegistry.find(l => l.id === basketId);
  if (!basketLego) {
    return { errors: [{ type: 'missing_lego', message: `LEGO ${basketId} not found in registry` }] };
  }

  // Build available vocabulary (all LEGOs before this one)
  const availableIndex = legoRegistry.findIndex(l => l.id === basketId);
  const availableLegos = legoRegistry.slice(0, availableIndex);
  const availableIds = new Set(availableLegos.map(l => l.id));

  // Add current LEGO to available (can use in d-phrases for context)
  const availableWithSelf = [...availableLegos, basketLego];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Validating ${basketId}: "${basketLego.target}" / "${basketLego.known}"`);
  console.log(`Available vocabulary: ${availableLegos.length} LEGOs`);
  console.log(`${'='.repeat(80)}`);

  // RULE 1: Basket LEGO must appear in every phrase
  // RULE 3: No future vocabulary (UID > basketId)
  // RULE 2: Must tile perfectly from available LEGOs

  // Validate E-phrases
  console.log(`\n📝 E-PHRASES (${basket.e.length}):`);
  for (let i = 0; i < basket.e.length; i++) {
    const [targetPhrase, knownPhrase] = basket.e[i];
    console.log(`  ${i + 1}. "${targetPhrase}" / "${knownPhrase}"`);

    // Rule 1: Must contain basket LEGO
    if (!targetPhrase.includes(basketLego.target)) {
      errors.push({
        type: 'missing_basket_lego',
        basket: basketId,
        phraseType: 'e-phrase',
        index: i,
        phrase: targetPhrase,
        message: `E-phrase does not contain basket LEGO "${basketLego.target}"`
      });
      console.log(`     ❌ ERROR: Missing basket LEGO "${basketLego.target}"`);
    }

    // Rule 2: Check tiling
    const tiling = checkTiling(targetPhrase, availableWithSelf);
    if (!tiling.tiles) {
      errors.push({
        type: 'poor_tiling',
        basket: basketId,
        phraseType: 'e-phrase',
        index: i,
        phrase: targetPhrase,
        remainder: tiling.remainder,
        message: `E-phrase has untiled remainder: "${tiling.remainder}"`
      });
      console.log(`     ❌ ERROR: Poor tiling, remainder: "${tiling.remainder}"`);
    } else {
      console.log(`     ✓ Tiles from: ${tiling.usedLegos.join(' + ')}`);
    }

    // Rule 4: Word count (7-10 words ideal)
    const wordCount = targetPhrase.split(/\s+/).length;
    if (wordCount < 7) {
      warnings.push({
        type: 'short_e_phrase',
        basket: basketId,
        phraseType: 'e-phrase',
        index: i,
        phrase: targetPhrase,
        wordCount,
        message: `E-phrase only has ${wordCount} words (ideal: 7-10)`
      });
      console.log(`     ⚠️  WARNING: Only ${wordCount} words (ideal: 7-10)`);
    }
  }

  // Validate D-phrases
  for (const [windowSize, phrases] of Object.entries(basket.d)) {
    console.log(`\n📦 D-PHRASES (window ${windowSize}): ${phrases.length} phrases`);
    for (let i = 0; i < phrases.length; i++) {
      const [targetPhrase, knownPhrase] = phrases[i];
      console.log(`  ${i + 1}. "${targetPhrase}" / "${knownPhrase}"`);

      // Rule 1: Must contain basket LEGO
      if (!targetPhrase.includes(basketLego.target)) {
        errors.push({
          type: 'missing_basket_lego',
          basket: basketId,
          phraseType: `d-phrase-${windowSize}`,
          index: i,
          phrase: targetPhrase,
          message: `D-phrase does not contain basket LEGO "${basketLego.target}"`
        });
        console.log(`     ❌ ERROR: Missing basket LEGO "${basketLego.target}"`);
      }

      // Rule 2: Check tiling
      const tiling = checkTiling(targetPhrase, availableWithSelf);
      if (!tiling.tiles) {
        errors.push({
          type: 'poor_tiling',
          basket: basketId,
          phraseType: `d-phrase-${windowSize}`,
          index: i,
          phrase: targetPhrase,
          remainder: tiling.remainder,
          message: `D-phrase has untiled remainder: "${tiling.remainder}"`
        });
        console.log(`     ❌ ERROR: Poor tiling, remainder: "${tiling.remainder}"`);
      } else {
        console.log(`     ✓ Tiles from: ${tiling.usedLegos.join(' + ')}`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Main execution
 */
async function main() {
  console.log('S0011 BASKET VALIDATOR & WHITELIST BUILDER');
  console.log('==========================================\n');

  // Load data
  const legoPairs = JSON.parse(await fs.readFile(LEGO_PAIRS_PATH, 'utf8'));
  const baskets = JSON.parse(await fs.readFile(BASKETS_PATH, 'utf8'));
  const legoRegistry = buildLegoRegistry(legoPairs);

  console.log(`Loaded ${legoRegistry.length} LEGOs from lego_pairs.json`);

  // S0011 LEGOs
  const s0011Legos = ['S0011L01', 'S0011L02', 'S0011L03', 'S0011L04'];

  const results = {};

  for (const legoId of s0011Legos) {
    // Build whitelist
    const whitelist = buildWhitelist(legoRegistry, legoId);

    console.log(`\n${'█'.repeat(80)}`);
    console.log(`\n🔍 ${legoId} WHITELIST`);
    console.log(`   Available vocabulary: ${whitelist.count} LEGOs`);
    console.log(`   Unique words: ${whitelist.words.length}`);
    console.log(`\n   First 30 words:`);
    console.log(`   ${whitelist.words.slice(0, 30).join(', ')}`);
    if (whitelist.words.length > 30) {
      console.log(`   ... +${whitelist.words.length - 30} more`);
    }

    // Validate basket
    const basket = baskets[legoId];
    if (!basket) {
      console.log(`\n❌ Basket not found for ${legoId}`);
      continue;
    }

    const validation = validateBasket(legoId, basket, legoRegistry);

    results[legoId] = {
      whitelist,
      validation,
      basket
    };

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`SUMMARY for ${legoId}:`);
    console.log(`  Errors: ${validation.errors.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    if (validation.errors.length === 0) {
      console.log(`  ✅ PASSES v2.0 validation`);
    } else {
      console.log(`  ❌ FAILS v2.0 validation`);
    }
    console.log(`${'='.repeat(80)}`);
  }

  // Overall summary
  console.log(`\n\n${'█'.repeat(80)}`);
  console.log(`OVERALL SUMMARY - S0011 BASKET VALIDATION`);
  console.log(`${'█'.repeat(80)}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const legoId of s0011Legos) {
    const result = results[legoId];
    if (result) {
      totalErrors += result.validation.errors.length;
      totalWarnings += result.validation.warnings.length;

      const status = result.validation.errors.length === 0 ? '✅' : '❌';
      console.log(`${status} ${legoId}: ${result.validation.errors.length} errors, ${result.validation.warnings.length} warnings`);
    }
  }

  console.log(`\nTotal: ${totalErrors} errors, ${totalWarnings} warnings`);

  if (totalErrors === 0) {
    console.log(`\n🎉 All S0011 baskets PASS v2.0 validation!`);
  } else {
    console.log(`\n⚠️  Some baskets need fixes to pass v2.0 validation`);
  }

  // Save detailed results
  const outputPath = path.join(__dirname, 's0011_validation_results.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📄 Detailed results saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

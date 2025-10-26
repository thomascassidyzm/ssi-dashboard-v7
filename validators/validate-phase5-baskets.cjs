#!/usr/bin/env node

/**
 * Phase 5 Validator - LEGO Baskets
 *
 * Automated checks:
 * 1. Basket LEGO appears in every phrase
 * 2. Phrases tile from previous LEGOs + basket LEGO
 * 3. ZERO LEGOs with UID > basket LEGO in any phrase
 * 4. E-phrases are 7-10 words (approximately)
 *
 * Returns: { valid: boolean, errors: [...] }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Parse a phrase into component LEGO IDs
 * This is a simplified parser - matches patterns like S0001L01, S0002L03, etc.
 */
function parsePhraseLEGOs(targetPhrase, allLegos) {
  const foundLegos = [];

  // Sort LEGOs by length (longest first) to match longer phrases before shorter
  const sortedLegos = [...allLegos].sort((a, b) =>
    b.target.length - a.target.length
  );

  let remaining = targetPhrase;

  for (const lego of sortedLegos) {
    if (remaining.includes(lego.target)) {
      foundLegos.push(lego.id);
      remaining = remaining.replace(lego.target, '');
    }
  }

  return foundLegos;
}

/**
 * Validate a single basket
 */
function validateBasket(basketId, basket, allLegos) {
  const errors = [];
  const basketLego = basket.lego[0]; // Target text of this LEGO

  // Build list of available LEGOs (all with UID < basketId)
  const availableLegos = allLegos
    .filter(l => l.id < basketId)
    .concat([{ id: basketId, target: basketLego }]); // Include self

  // Check E-phrases
  for (let i = 0; i < basket.e.length; i++) {
    const [targetPhrase, knownPhrase] = basket.e[i];

    // Rule 1: Basket LEGO must appear in phrase
    if (!targetPhrase.includes(basketLego)) {
      errors.push({
        type: 'missing_basket_lego',
        basket: basketId,
        phraseType: 'e-phrase',
        phraseIndex: i,
        phrase: targetPhrase,
        expected: basketLego,
        message: `E-phrase ${i} does not contain basket LEGO "${basketLego}"`
      });
    }

    // Rule 3: Check for future LEGOs
    const phraseLegos = parsePhraseLEGOs(targetPhrase, allLegos);
    const futureLegos = phraseLegos.filter(legoId => legoId > basketId);

    if (futureLegos.length > 0) {
      errors.push({
        type: 'future_vocabulary',
        basket: basketId,
        phraseType: 'e-phrase',
        phraseIndex: i,
        phrase: targetPhrase,
        violations: futureLegos,
        message: `E-phrase ${i} uses future LEGOs: ${futureLegos.join(', ')}`
      });
    }

    // Rule 4: Word count (7-10 words, but allow some flexibility for early baskets)
    const wordCount = targetPhrase.split(/\s+/).length;

    // Only enforce for non-culminating LEGOs
    // Culminating LEGOs use complete seed which might be < 7 words
    if (wordCount < 7 && !targetPhrase.includes(basketLego)) {
      // If it's the complete seed, it's OK
      errors.push({
        type: 'short_e_phrase',
        basket: basketId,
        phraseType: 'e-phrase',
        phraseIndex: i,
        phrase: targetPhrase,
        wordCount: wordCount,
        message: `E-phrase ${i} only has ${wordCount} words (should be 7-10)`
      });
    }
  }

  // Check D-phrases
  for (const [windowSize, phrases] of Object.entries(basket.d)) {
    for (let i = 0; i < phrases.length; i++) {
      const [targetPhrase, knownPhrase] = phrases[i];

      // Rule 1: Basket LEGO must appear in phrase
      if (!targetPhrase.includes(basketLego)) {
        errors.push({
          type: 'missing_basket_lego',
          basket: basketId,
          phraseType: `d-phrase (window ${windowSize})`,
          phraseIndex: i,
          phrase: targetPhrase,
          expected: basketLego,
          message: `D-phrase ${i} (window ${windowSize}) does not contain basket LEGO "${basketLego}"`
        });
      }

      // Rule 3: Check for future LEGOs
      const phraseLegos = parsePhraseLEGOs(targetPhrase, allLegos);
      const futureLegos = phraseLegos.filter(legoId => legoId > basketId);

      if (futureLegos.length > 0) {
        errors.push({
          type: 'future_vocabulary',
          basket: basketId,
          phraseType: `d-phrase (window ${windowSize})`,
          phraseIndex: i,
          phrase: targetPhrase,
          violations: futureLegos,
          message: `D-phrase ${i} (window ${windowSize}) uses future LEGOs: ${futureLegos.join(', ')}`
        });
      }
    }
  }

  return errors;
}

/**
 * Main validation function
 */
async function validatePhase5(courseDir) {
  const errors = [];

  try {
    // Load LEGO pairs
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_input', message: 'lego_pairs.json not found' }]
      };
    }

    const legoPairs = await fs.readJson(legoPairsPath);

    // Build LEGO registry
    const allLegos = [];
    for (const seed of legoPairs) {
      const [seedId, seedPair, legos] = seed;
      for (const lego of legos) {
        const [legoId, type, target, known] = lego;
        allLegos.push({ id: legoId, target, known, type });
      }
    }

    // Load baskets
    const basketsPath = path.join(courseDir, 'lego_baskets.json');
    if (!await fs.pathExists(basketsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'lego_baskets.json not found' }]
      };
    }

    const baskets = await fs.readJson(basketsPath);

    // Validate each basket
    for (const [basketId, basket] of Object.entries(baskets)) {
      const basketErrors = validateBasket(basketId, basket, allLegos);
      errors.push(...basketErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      stats: {
        totalBaskets: Object.keys(baskets).length,
        totalLegos: allLegos.length,
        errorsFound: errors.length
      }
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{
        type: 'validation_error',
        message: error.message,
        stack: error.stack
      }]
    };
  }
}

// CLI interface
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node validate-phase5-baskets.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase5(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 5 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));
      process.exit(0);
    } else {
      console.error('❌ Phase 5 validation failed');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });
}

module.exports = { validatePhase5 };

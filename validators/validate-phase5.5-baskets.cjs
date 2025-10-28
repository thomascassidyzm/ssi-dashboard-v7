#!/usr/bin/env node

/**
 * Phase 5.5 Validator - Basket Vocabulary Constraint Validation
 *
 * Validates LEGO_BASKETS from Phase 5 according to v2.1 methodology:
 *
 * CHECK PRIORITY (IN ORDER):
 * 1. VOCABULARY CONSTRAINT (ABSOLUTE GATE)
 *    - Each basket ONLY uses prior LEGOs (LEGOs #1 to #N-1)
 *    - NO future vocabulary allowed
 *    - This is THE defining constraint of the pedagogy
 *
 * 2. E-PHRASE TILING
 *    - E-phrases must tile perfectly from available LEGOs
 *    - Every word maps to a LEGO
 *    - No extra/missing words
 *
 * 3. D-PHRASE OPERATIVE LEGO
 *    - D-phrases must contain the operative LEGO (LEGO #N being taught)
 *    - Windows expand AROUND operative LEGO
 *
 * 4. CULMINATING LEGO
 *    - E-phrase #1 is complete seed for culminating LEGOs
 *
 * 5. GRAMMAR PERFECTION
 *    - Target language grammar perfect
 *    - Known language grammar perfect
 *
 * Returns: { valid: boolean, errors: [...], failedLegos: [...], stats: {...} }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Build LEGO sequence map from lego_pairs.json
 * Maps LEGO ID to its position and text
 */
function buildLegoSequence(legoPairs) {
  const sequence = new Map(); // legoId -> { position, target, known, seedId, isCulminating }
  let position = 0;

  for (const seed of legoPairs) {
    const [seedId, seedPair, legos] = seed;
    const [targetSeed, knownSeed] = seedPair;

    for (let i = 0; i < legos.length; i++) {
      const lego = legos[i];
      const [legoId, type, target, known] = lego;

      // Skip if type is not B or C (shouldn't happen but be safe)
      if (type !== 'B' && type !== 'C') continue;

      const isCulminating = (i === legos.length - 1); // Last LEGO in seed

      sequence.set(legoId, {
        position: position++,
        target: target,
        known: known,
        seedId: seedId,
        seedPair: seedPair,
        isCulminating: isCulminating
      });
    }
  }

  return sequence;
}

/**
 * CHECK 1: VOCABULARY CONSTRAINT (ABSOLUTE GATE)
 *
 * Parse phrase into words and check ALL words come from LEGOs #1 to #N-1
 */
function validateVocabularyConstraint(basketId, basket, legoSequence, legoPairs) {
  const errors = [];

  const basketInfo = legoSequence.get(basketId);
  if (!basketInfo) {
    errors.push({
      type: 'basket_not_found',
      legoId: basketId,
      message: `Basket ${basketId} not found in LEGO sequence`
    });
    return errors;
  }

  const basketPosition = basketInfo.position;

  // Get all LEGOs available BEFORE this basket
  const availableLegos = new Map(); // target word -> legoId
  for (const [legoId, info] of legoSequence.entries()) {
    if (info.position < basketPosition) {
      // This LEGO is available
      // Store all words from this LEGO
      const words = info.target.toLowerCase().split(/\s+/);
      for (const word of words) {
        availableLegos.set(word, legoId);
      }
    }
  }

  // Check all E-phrases
  if (basket.e && Array.isArray(basket.e)) {
    for (let i = 0; i < basket.e.length; i++) {
      const phrase = basket.e[i];
      if (!phrase || !Array.isArray(phrase)) continue;

      const [targetPhrase, knownPhrase] = phrase;
      const targetWords = targetPhrase.toLowerCase()
        .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0);

      // Check each word
      for (const word of targetWords) {
        if (!availableLegos.has(word)) {
          // Word not in available vocabulary
          // Try to find which LEGO it comes from
          let violatingLego = null;
          for (const [legoId, info] of legoSequence.entries()) {
            if (info.position >= basketPosition) {
              const legoWords = info.target.toLowerCase().split(/\s+/);
              if (legoWords.includes(word)) {
                violatingLego = legoId;
                break;
              }
            }
          }

          errors.push({
            type: 'vocabulary_constraint_violation',
            legoId: basketId,
            basketPosition: basketPosition,
            phraseType: 'e-phrase',
            phraseIndex: i,
            phrase: [targetPhrase, knownPhrase],
            violatingWord: word,
            violatingLego: violatingLego,
            message: violatingLego
              ? `Basket ${basketId} (position ${basketPosition}) uses '${word}' from ${violatingLego} (future vocabulary)`
              : `Basket ${basketId} uses '${word}' which is not in any available LEGO`
          });
        }
      }
    }
  }

  // Check all D-phrases
  if (basket.d && typeof basket.d === 'object') {
    for (const [windowSize, phrases] of Object.entries(basket.d)) {
      if (!Array.isArray(phrases)) continue;

      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        if (!phrase || !Array.isArray(phrase)) continue;

        const [targetPhrase, knownPhrase] = phrase;
        const targetWords = targetPhrase.toLowerCase()
          .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 0);

        // Check each word
        for (const word of targetWords) {
          if (!availableLegos.has(word)) {
            let violatingLego = null;
            for (const [legoId, info] of legoSequence.entries()) {
              if (info.position >= basketPosition) {
                const legoWords = info.target.toLowerCase().split(/\s+/);
                if (legoWords.includes(word)) {
                  violatingLego = legoId;
                  break;
                }
              }
            }

            errors.push({
              type: 'vocabulary_constraint_violation',
              legoId: basketId,
              basketPosition: basketPosition,
              phraseType: `d-phrase (${windowSize}-LEGO)`,
              phraseIndex: i,
              phrase: [targetPhrase, knownPhrase],
              violatingWord: word,
              violatingLego: violatingLego,
              message: violatingLego
                ? `Basket ${basketId} uses '${word}' from ${violatingLego} (future vocabulary) in ${windowSize}-LEGO d-phrase`
                : `Basket ${basketId} uses '${word}' which is not in any available LEGO in ${windowSize}-LEGO d-phrase`
            });
          }
        }
      }
    }
  }

  return errors;
}

/**
 * CHECK 2: E-PHRASE TILING
 *
 * E-phrases must tile perfectly from LEGOs (no extra/missing words)
 */
function validateEPhraseTiling(basketId, basket, legoSequence) {
  const warnings = [];

  // This is hard to validate automatically without knowing exact LEGO decomposition
  // For now, just warn if e-phrase seems too long or contains unknown patterns

  if (basket.e && Array.isArray(basket.e)) {
    for (let i = 0; i < basket.e.length; i++) {
      const phrase = basket.e[i];
      if (!phrase || !Array.isArray(phrase)) continue;

      const [targetPhrase, knownPhrase] = phrase;
      const wordCount = targetPhrase.split(/\s+/).length;

      // Warn if e-phrase is very long (may not tile cleanly)
      if (wordCount > 15) {
        warnings.push({
          type: 'long_e_phrase',
          legoId: basketId,
          phraseIndex: i,
          phrase: [targetPhrase, knownPhrase],
          wordCount: wordCount,
          message: `E-phrase ${i} is very long (${wordCount} words) - verify it tiles cleanly from LEGOs`
        });
      }
    }
  }

  return warnings;
}

/**
 * CHECK 3: D-PHRASE OPERATIVE LEGO
 *
 * D-phrases must contain the operative LEGO (the LEGO being taught)
 */
function validateDPhraseOperativeLego(basketId, basket, legoSequence) {
  const errors = [];

  const basketInfo = legoSequence.get(basketId);
  if (!basketInfo) return errors;

  const operativeTarget = basketInfo.target.toLowerCase();

  if (basket.d && typeof basket.d === 'object') {
    for (const [windowSize, phrases] of Object.entries(basket.d)) {
      if (!Array.isArray(phrases)) continue;

      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        if (!phrase || !Array.isArray(phrase)) continue;

        const [targetPhrase, knownPhrase] = phrase;
        const targetLower = targetPhrase.toLowerCase();

        // Check if operative LEGO is present
        if (!targetLower.includes(operativeTarget)) {
          errors.push({
            type: 'missing_operative_lego',
            legoId: basketId,
            operativeLego: basketInfo.target,
            phraseType: `d-phrase (${windowSize}-LEGO)`,
            phraseIndex: i,
            phrase: [targetPhrase, knownPhrase],
            message: `D-phrase doesn't contain operative LEGO '${basketInfo.target}'`
          });
        }
      }
    }
  }

  return errors;
}

/**
 * CHECK 4: CULMINATING LEGO
 *
 * E-phrase #1 should be complete seed for culminating LEGOs
 */
function validateCulminatingLego(basketId, basket, legoSequence) {
  const errors = [];

  const basketInfo = legoSequence.get(basketId);
  if (!basketInfo) return errors;

  if (!basketInfo.isCulminating) return errors; // Not a culminating LEGO

  // Check if E-phrase #1 matches seed
  if (!basket.e || !Array.isArray(basket.e) || basket.e.length === 0) {
    errors.push({
      type: 'missing_seed_e_phrase',
      legoId: basketId,
      seedPair: basketInfo.seedPair,
      message: `Culminating LEGO ${basketId} must have E-phrase #1 as complete seed`
    });
    return errors;
  }

  const firstEPhrase = basket.e[0];
  if (!firstEPhrase || !Array.isArray(firstEPhrase)) {
    errors.push({
      type: 'invalid_first_e_phrase',
      legoId: basketId,
      message: `First E-phrase is not a valid array`
    });
    return errors;
  }

  const [targetPhrase, knownPhrase] = firstEPhrase;
  const [expectedTarget, expectedKnown] = basketInfo.seedPair;

  // Normalize whitespace and compare
  const normalizedPhrase = targetPhrase.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedSeed = expectedTarget.replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalizedPhrase !== normalizedSeed) {
    errors.push({
      type: 'seed_e_phrase_mismatch',
      legoId: basketId,
      expectedSeed: expectedTarget,
      actualEPhrase: targetPhrase,
      message: `Culminating LEGO ${basketId} E-phrase #1 should be complete seed, but got different phrase`
    });
  }

  return errors;
}

/**
 * CHECK 5: GRAMMAR PERFECTION
 *
 * Check for known grammar errors in phrases
 */
function validateGrammar(basketId, basket) {
  const errors = [];

  // Known grammar patterns (similar to Phase 1.5)
  const grammarRules = [
    {
      pattern: /un poco\s+[^\s]/i,
      shouldBe: /un poco de/i,
      message: 'Spanish: "un poco" requires "de" before noun'
    },
    {
      pattern: /cercando\s+[a-z]/i,
      shouldNotBe: /cercando di/i,
      message: 'Italian: "cercando" + infinitive requires "di"'
    }
  ];

  // Check E-phrases
  if (basket.e && Array.isArray(basket.e)) {
    for (let i = 0; i < basket.e.length; i++) {
      const phrase = basket.e[i];
      if (!phrase || !Array.isArray(phrase)) continue;

      const [targetPhrase, knownPhrase] = phrase;

      for (const rule of grammarRules) {
        if (rule.pattern.test(targetPhrase)) {
          if (rule.shouldBe && !rule.shouldBe.test(targetPhrase)) {
            errors.push({
              type: 'grammar_error',
              legoId: basketId,
              phraseType: 'e-phrase',
              phraseIndex: i,
              phrase: [targetPhrase, knownPhrase],
              rule: rule.message
            });
          }
        }
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
  const warnings = [];
  const failedLegos = [];

  try {
    // Load LEGO pairs (needed for sequence)
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_input', message: 'lego_pairs.json not found' }],
        failedLegos: [],
        warnings: []
      };
    }

    const legoPairs = await fs.readJson(legoPairsPath);

    // Load LEGO baskets
    const basketsPath = path.join(courseDir, 'lego_baskets.json');
    if (!await fs.pathExists(basketsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'lego_baskets.json not found' }],
        failedLegos: [],
        warnings: []
      };
    }

    const baskets = await fs.readJson(basketsPath);

    // Build LEGO sequence
    const legoSequence = buildLegoSequence(legoPairs);

    // Validate each basket
    for (const [basketId, basket] of Object.entries(baskets)) {
      // CHECK 1: Vocabulary constraint (ABSOLUTE GATE)
      const vocabErrors = validateVocabularyConstraint(basketId, basket, legoSequence, legoPairs);
      errors.push(...vocabErrors);

      // CHECK 2: E-phrase tiling (warnings)
      const tilingWarnings = validateEPhraseTiling(basketId, basket, legoSequence);
      warnings.push(...tilingWarnings);

      // CHECK 3: D-phrase operative LEGO
      const operativeErrors = validateDPhraseOperativeLego(basketId, basket, legoSequence);
      errors.push(...operativeErrors);

      // CHECK 4: Culminating LEGO
      const culminatingErrors = validateCulminatingLego(basketId, basket, legoSequence);
      errors.push(...culminatingErrors);

      // CHECK 5: Grammar perfection
      const grammarErrors = validateGrammar(basketId, basket);
      errors.push(...grammarErrors);

      // Mark basket as failed if any errors
      if (vocabErrors.length > 0 || operativeErrors.length > 0 ||
          culminatingErrors.length > 0 || grammarErrors.length > 0) {
        if (!failedLegos.includes(basketId)) {
          failedLegos.push(basketId);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      failedLegos: failedLegos,
      warnings: warnings,
      stats: {
        totalBaskets: Object.keys(baskets).length,
        passedBaskets: Object.keys(baskets).length - failedLegos.length,
        failedBaskets: failedLegos.length,
        errorsFound: errors.length,
        warningsFound: warnings.length
      }
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{
        type: 'validation_error',
        message: error.message,
        stack: error.stack
      }],
      failedLegos: [],
      warnings: []
    };
  }
}

// CLI interface
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node validate-phase5.5-baskets.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase5(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 5.5 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings (non-blocking):');
        for (const warning of result.warnings) {
          console.log(`  - ${warning.message}`);
        }
      }

      process.exit(0);
    } else {
      console.error('❌ Phase 5.5 validation failed');
      console.error(`\nFailed baskets: ${result.failedLegos.join(', ')}`);
      console.error('\nErrors:');
      console.error(JSON.stringify(result.errors, null, 2));

      if (result.warnings.length > 0) {
        console.error('\nWarnings:');
        console.error(JSON.stringify(result.warnings, null, 2));
      }

      process.exit(1);
    }
  });
}

module.exports = { validatePhase5 };

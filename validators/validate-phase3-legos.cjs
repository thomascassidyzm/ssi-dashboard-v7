#!/usr/bin/env node

/**
 * Phase 3 Validator - LEGO Pairs
 *
 * Automated checks:
 * 1. LEGO_PAIRS tile to reconstruct SEED_PAIR
 * 2. COMPOSITE pairs have component arrays
 * 3. Feeders inside composites are defined as separate LEGOs
 * 4. Known problematic fragments (over-granularization):
 *    - "Estoy", "Me", "No", "va" as standalone BASE LEGOs
 * 5. Gender-marked articles ("una", "la", "el") bonded with nouns
 *
 * Returns: { valid: boolean, errors: [...] }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Check if LEGO pairs tile to reconstruct seed
 */
function validateTiling(seedPair, legos) {
  const [target, known] = seedPair;
  const targetPieces = legos.map(l => l[2]); // Target text of each LEGO

  // Simple check: all pieces appear in seed
  const combined = targetPieces.join(' ');
  const errors = [];

  // Check if we can reconstruct the seed from LEGOs
  // This is simplified - just check all LEGO text appears in seed
  for (const lego of legos) {
    const [id, type, targetText, knownText] = lego;
    if (!target.includes(targetText)) {
      errors.push({
        type: 'tiling_error',
        lego: id,
        legoText: targetText,
        seed: target,
        message: `LEGO text "${targetText}" does not appear in seed "${target}"`
      });
    }
  }

  return errors;
}

/**
 * Check for known over-granularization patterns
 */
function validateMinimumUnit(lego, allLegos) {
  const [id, type, target, known] = lego;
  const errors = [];

  // Only check BASE LEGOs
  if (type !== 'B') return errors;

  // Known problematic fragments (Spanish/Italian/similar languages)
  const problematicFragments = [
    { pattern: /^Estoy$/i, message: 'Auxiliary "Estoy" should be part of composite with gerund' },
    { pattern: /^Me$/i, message: 'Pronoun "Me" should be part of composite with verb' },
    { pattern: /^No$/i, message: 'Negation "No" should be part of composite expression' },
    { pattern: /^va$/i, message: 'Verb "va" should be part of "va a" composite' },
    { pattern: /^voy$/i, message: 'Verb "voy" alone is questionable, likely part of "voy a"' },
    { pattern: /^estoy$/i, message: 'Verb "estoy" alone is questionable' }
  ];

  for (const { pattern, message } of problematicFragments) {
    if (pattern.test(target)) {
      errors.push({
        type: 'over_granularization',
        lego: id,
        legoText: target,
        message: message,
        suggestion: 'Consider making this part of a COMPOSITE LEGO'
      });
    }
  }

  // Check for gender-marked articles without nouns
  const genderArticles = {
    'una': { message: 'Gender-marked article "una" should be bonded with noun', gender: 'feminine' },
    'la': { message: 'Gender-marked article "la" should be bonded with noun (unless "la" is object pronoun)', gender: 'feminine' },
    'el': { message: 'Gender-marked article "el" should be bonded with noun', gender: 'masculine' },
    'un': { message: 'Gender-marked article "un" should be bonded with noun', gender: 'masculine' }
  };

  if (genderArticles[target.toLowerCase()]) {
    errors.push({
      type: 'unbonded_article',
      lego: id,
      legoText: target,
      message: genderArticles[target.toLowerCase()].message,
      suggestion: 'Bond article with following noun'
    });
  }

  return errors;
}

/**
 * Validate composite structure
 */
function validateComposite(lego, allLegoIds) {
  const [id, type, target, known, components] = lego;
  const errors = [];

  if (type !== 'C') return errors;

  // Rule 2: Composites must have component arrays
  if (!components || components.length === 0) {
    errors.push({
      type: 'missing_components',
      lego: id,
      message: `Composite LEGO ${id} has no component array`
    });
    return errors;
  }

  // Rule 3: Check feeders are defined
  for (const component of components) {
    const [compTarget, compKnown, feederId] = component;

    // If component has feeder ID (third element), verify it exists
    if (feederId && feederId !== null) {
      if (!allLegoIds.has(feederId)) {
        errors.push({
          type: 'missing_feeder',
          lego: id,
          component: compTarget,
          feederId: feederId,
          message: `Feeder ${feederId} referenced in ${id} but not defined as separate LEGO`
        });
      }
    }
  }

  return errors;
}

/**
 * Main validation function
 */
async function validatePhase3(courseDir) {
  const errors = [];

  try {
    // Load seed pairs
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    if (!await fs.pathExists(seedPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_input', message: 'seed_pairs.json not found' }]
      };
    }

    const seedPairs = await fs.readJson(seedPairsPath);

    // Load LEGO pairs
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'lego_pairs.json not found' }]
      };
    }

    const legoPairs = await fs.readJson(legoPairsPath);

    // Build LEGO ID registry
    const allLegoIds = new Set();
    for (const seed of legoPairs) {
      const [seedId, seedPair, legos] = seed;
      for (const lego of legos) {
        allLegoIds.add(lego[0]); // LEGO ID
      }
    }

    // Validate each seed
    for (const seed of legoPairs) {
      const [seedId, seedPair, legos] = seed;

      // Check tiling
      const tilingErrors = validateTiling(seedPair, legos);
      errors.push(...tilingErrors);

      // Check each LEGO
      for (const lego of legos) {
        // Check for over-granularization
        const unitErrors = validateMinimumUnit(lego, legoPairs);
        errors.push(...unitErrors);

        // Check composites
        const compositeErrors = validateComposite(lego, allLegoIds);
        errors.push(...compositeErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      stats: {
        totalSeeds: legoPairs.length,
        totalLegos: allLegoIds.size,
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
    console.error('Usage: node validate-phase3-legos.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase3(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 3 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));
      process.exit(0);
    } else {
      console.error('❌ Phase 3 validation failed');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });
}

module.exports = { validatePhase3 };

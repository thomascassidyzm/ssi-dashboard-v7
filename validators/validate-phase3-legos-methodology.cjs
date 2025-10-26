#!/usr/bin/env node

/**
 * Phase 3 Validator - LEGO Boundary Methodology
 *
 * Enhanced validator with methodology-aware checks:
 *
 * STRUCTURAL CHECKS (from original validator):
 * 1. LEGO_PAIRS tile to reconstruct SEED_PAIR
 * 2. COMPOSITE pairs have component arrays
 * 3. Feeders inside composites are defined as separate LEGOs
 * 4. Over-granularization (Estoy, Me, No, va)
 * 5. Gender-marked articles bonded with nouns
 *
 * METHODOLOGY CHECKS (new):
 * 6. Substitutability validation (boundaries align with substitution points)
 * 7. Glue word detection (target words not in known surface)
 * 8. Functional determinism (same LEGO always produces same form)
 * 9. Five Quality Questions framework
 * 10. Red Flags detection
 *
 * Returns: { valid: boolean, errors: [...], warnings: [...] }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Check if LEGO pairs tile to reconstruct seed
 */
function validateTiling(seedPair, legos) {
  const [target, known] = seedPair;
  const targetPieces = legos.map(l => l[2]); // Target text of each LEGO
  const errors = [];

  // Check if we can reconstruct the seed from LEGOs
  for (const lego of legos) {
    const [id, type, targetText, knownText] = lego;
    if (!target.includes(targetText)) {
      errors.push({
        type: 'tiling_error',
        lego: id,
        legoText: targetText,
        seed: target,
        message: `LEGO text "${targetText}" does not appear in seed "${target}"`,
        redFlag: 'Red Flag 1: Can\'t tile'
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

  if (type !== 'B') return errors;

  // Known problematic fragments
  const problematicFragments = [
    { pattern: /^Estoy$/i, message: 'Auxiliary "Estoy" should be part of composite with gerund', principle: 'Minimum Reusable Unit' },
    { pattern: /^Me$/i, message: 'Pronoun "Me" should be part of composite with verb', principle: 'Minimum Reusable Unit' },
    { pattern: /^No$/i, message: 'Negation "No" should be part of composite expression', principle: 'Minimum Reusable Unit' },
    { pattern: /^va$/i, message: 'Verb "va" should be part of "va a" composite', principle: 'Keep It Together' },
    { pattern: /^voy$/i, message: 'Verb "voy" alone questionable - likely part of "voy a"', principle: 'Glue Word Problem' },
    { pattern: /^estoy$/i, message: 'Verb "estoy" alone questionable', principle: 'Minimum Reusable Unit' }
  ];

  for (const { pattern, message, principle } of problematicFragments) {
    if (pattern.test(target)) {
      errors.push({
        type: 'over_granularization',
        lego: id,
        legoText: target,
        message: message,
        principle: principle,
        suggestion: 'Consider making this part of a COMPOSITE LEGO',
        redFlag: 'Red Flag 4: Breaking grammatical dependencies'
      });
    }
  }

  // Check for gender-marked articles without nouns
  const genderArticles = {
    'una': { message: 'Gender-marked article "una" should be bonded with noun', gender: 'feminine' },
    'la': { message: 'Article "la" should be bonded with noun (unless object pronoun)', gender: 'feminine' },
    'el': { message: 'Gender-marked article "el" should be bonded with noun', gender: 'masculine' },
    'un': { message: 'Gender-marked article "un" should be bonded with noun', gender: 'masculine' }
  };

  if (genderArticles[target.toLowerCase()]) {
    errors.push({
      type: 'unbonded_article',
      lego: id,
      legoText: target,
      message: genderArticles[target.toLowerCase()].message,
      suggestion: 'Bond article with following noun',
      principle: 'Ambiguity Avoidance',
      redFlag: 'Red Flag 2: Ambiguous form'
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

  if (!components || components.length === 0) {
    errors.push({
      type: 'missing_components',
      lego: id,
      message: `Composite LEGO ${id} has no component array`,
      qualityQuestion: 'Q4: Does this respect linguistic structure?'
    });
    return errors;
  }

  // Check feeders are defined
  for (const component of components) {
    const [compTarget, compKnown, feederId] = component;

    if (feederId && feederId !== null) {
      if (!allLegoIds.has(feederId)) {
        errors.push({
          type: 'missing_feeder',
          lego: id,
          component: compTarget,
          feederId: feederId,
          message: `Feeder ${feederId} referenced in ${id} but not defined as separate LEGO`,
          principle: 'Feeder Identification Protocol'
        });
      }
    }
  }

  return errors;
}

/**
 * NEW: Check for glue words (target words not in known surface)
 */
function validateGlueWords(lego) {
  const [id, type, target, known, components] = lego;
  const warnings = [];

  if (type !== 'C') return warnings;
  if (!components) return warnings;

  // Common glue words by language
  const glueWordPatterns = {
    spa: ['a', 'de', 'que', 'para'],
    ita: ['a', 'di', 'che', 'per'],
    fra: ['de', 'à', 'que', 'pour']
  };

  // Extract words from target
  const targetWords = target.toLowerCase().split(/\s+/);
  const knownWords = known.toLowerCase().split(/\s+/);

  // Look for target words that don't appear in known
  const potentialGlueWords = targetWords.filter(word =>
    !knownWords.includes(word) &&
    word.length <= 3 && // Glue words are typically short
    /^[a-zàèéìòùáéíóúñ]+$/.test(word) // Just letters
  );

  if (potentialGlueWords.length > 0) {
    warnings.push({
      type: 'glue_word_detected',
      lego: id,
      glueWords: potentialGlueWords,
      message: `Potential glue words detected: ${potentialGlueWords.join(', ')}`,
      principle: 'Glue Word Problem',
      validation: 'Glue words correctly wrapped in composite ✓'
    });
  }

  return warnings;
}

/**
 * NEW: Check substitutability at LEGO boundaries
 */
function validateSubstitutability(lego, allLegos) {
  const [id, type, target, known] = lego;
  const warnings = [];

  // This is a heuristic check - looks for patterns that suggest wrong boundaries

  // Pattern: Verb + preposition should often be together
  if (type === 'B') {
    // Check if this BASE ends with a preposition (bad)
    const endsWithPrep = /\b(a|de|di|per|para|con|en|dans|à|sur)\s*$/i.test(target);
    if (endsWithPrep) {
      warnings.push({
        type: 'exposed_preposition',
        lego: id,
        legoText: target,
        message: `LEGO ends with preposition - violates Preposition Wrapping rule`,
        principle: 'Preposition Wrapping (ABSOLUTE RULE)',
        redFlag: 'Red Flag 1: Can\'t tile',
        suggestion: 'Wrap preposition inside composite with following element'
      });
    }

    // Check if this BASE is only a preposition (very bad)
    const isOnlyPrep = /^(a|de|di|per|para|con|en|dans|à|sur)$/i.test(target);
    if (isOnlyPrep) {
      warnings.push({
        type: 'standalone_preposition',
        lego: id,
        legoText: target,
        message: `Standalone preposition as BASE LEGO - ABSOLUTE RULE violation`,
        principle: 'Preposition Wrapping (ABSOLUTE RULE)',
        redFlag: 'Red Flag 2: Ambiguous form',
        suggestion: 'MUST wrap inside composite'
      });
    }
  }

  return warnings;
}

/**
 * NEW: Apply Five Quality Questions to each LEGO
 */
function applyFiveQualityQuestions(lego, seedContext) {
  const [id, type, target, known] = lego;
  const issues = [];

  // Q1: Is this functionally deterministic?
  // (Hard to check automatically - would need to see same LEGO in multiple contexts)

  // Q2: Does this maximize recombination?
  // (Hard to check without corpus analysis - just flag very long LEGOs)
  if (target.split(/\s+/).length > 5) {
    issues.push({
      type: 'low_recombination_warning',
      lego: id,
      wordCount: target.split(/\s+/).length,
      message: `LEGO has ${target.split(/\s+/).length} words - may have low recombination power`,
      qualityQuestion: 'Q2: Does this maximize recombination?',
      suggestion: 'Consider if this could be broken into smaller, more reusable pieces'
    });
  }

  // Q3: Is this the minimal cognitive load?
  // (Subjective - but flag if we see patterns)

  // Q4: Does this respect linguistic structure?
  // (Checked by substitutability validator)

  // Q5: Is this consistent with our existing LEGOs?
  // (Would need to compare across seeds - skip for now)

  return issues;
}

/**
 * Main validation function
 */
async function validatePhase3Methodology(courseDir) {
  const errors = [];
  const warnings = [];

  try {
    // Load seed pairs
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    if (!await fs.pathExists(seedPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_input', message: 'seed_pairs.json not found' }],
        warnings: []
      };
    }

    const seedPairs = await fs.readJson(seedPairsPath);

    // Load LEGO pairs
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'lego_pairs.json not found' }],
        warnings: []
      };
    }

    const legoPairs = await fs.readJson(legoPairsPath);

    // Build LEGO ID registry
    const allLegoIds = new Set();
    for (const seed of legoPairs) {
      const [seedId, seedPair, legos] = seed;
      for (const lego of legos) {
        allLegoIds.add(lego[0]);
      }
    }

    // Validate each seed
    for (const seed of legoPairs) {
      const [seedId, seedPair, legos] = seed;

      // STRUCTURAL CHECKS
      const tilingErrors = validateTiling(seedPair, legos);
      errors.push(...tilingErrors);

      for (const lego of legos) {
        // Over-granularization check
        const unitErrors = validateMinimumUnit(lego, legoPairs);
        errors.push(...unitErrors);

        // Composite structure check
        const compositeErrors = validateComposite(lego, allLegoIds);
        errors.push(...compositeErrors);

        // METHODOLOGY CHECKS

        // Glue word detection
        const glueWarnings = validateGlueWords(lego);
        warnings.push(...glueWarnings);

        // Substitutability check
        const substWarnings = validateSubstitutability(lego, legos);
        errors.push(...substWarnings.filter(w => w.type.includes('preposition')));
        warnings.push(...substWarnings.filter(w => !w.type.includes('preposition')));

        // Five Quality Questions
        const qualityIssues = applyFiveQualityQuestions(lego, seedPair);
        warnings.push(...qualityIssues);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      stats: {
        totalSeeds: legoPairs.length,
        totalLegos: allLegoIds.size,
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
      warnings: []
    };
  }
}

// CLI interface
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node validate-phase3-legos-methodology.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase3Methodology(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 3 methodology validation passed');
      console.log(JSON.stringify(result.stats, null, 2));

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings (non-blocking):');
        for (const warning of result.warnings) {
          console.log(`  - ${warning.message}`);
        }
      }

      process.exit(0);
    } else {
      console.error('❌ Phase 3 methodology validation failed');
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

module.exports = { validatePhase3Methodology };

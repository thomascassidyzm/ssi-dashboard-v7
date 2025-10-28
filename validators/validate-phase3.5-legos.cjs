#!/usr/bin/env node

/**
 * Phase 3.5 Validator - LEGO Decomposition Validation
 *
 * Validates LEGO_PAIRS from Phase 3 according to v3.3 methodology:
 *
 * CHECK PRIORITY (IN ORDER):
 * 1. TILING CHECK (FIRST AND MOST IMPORTANT)
 *    - Do LEGOs tile to reconstruct seed exactly?
 *    - Nothing missing, nothing extra
 *
 * 2. HARD RULES (Non-negotiable patterns)
 *    - Gender-marked articles MUST bond with nouns
 *    - Auxiliary verbs MUST join main verbs
 *    - Negation markers MUST join expressions
 *    - Object pronouns MUST join verbs (when verb-attached)
 *    - Multi-word verb constructions stay together
 *
 * 3. FD COMPLIANCE (Functional Determinism)
 *    - Each LEGO must map to exactly ONE target form in its context
 *    - Ambiguous forms should be chunked larger
 *
 * 4. COMPONENT VALIDATION
 *    - COMPOSITE LEGOs have component arrays
 *    - Component translations are LITERAL (not functional)
 *    - Feeder references point to existing LEGOs
 *
 * Returns: { valid: boolean, errors: [...], failedSeeds: [...], stats: {...} }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * CHECK 1: TILING VALIDATION (FIRST AND MOST IMPORTANT)
 *
 * LEGOs must tile to reconstruct seed exactly - nothing missing, nothing extra
 */
function validateTiling(seedId, seedPair, legos) {
  const [targetSeed, knownSeed] = seedPair;
  const errors = [];

  // Extract all BASE and COMPOSITE LEGOs (but not components inside composites)
  const targetLegos = legos
    .filter(l => l[1] === 'B' || l[1] === 'C')
    .map(l => l[2]); // Get target text

  // Join LEGOs with spaces and compare to seed
  const reconstructed = targetLegos.join(' ');

  // Normalize whitespace for comparison
  const normalizedSeed = targetSeed.replace(/\s+/g, ' ').trim();
  const normalizedReconstructed = reconstructed.replace(/\s+/g, ' ').trim();

  if (normalizedSeed !== normalizedReconstructed) {
    // Find what's missing or extra
    const seedWords = normalizedSeed.split(' ');
    const legoWords = normalizedReconstructed.split(' ');
    const missing = seedWords.filter(w => !legoWords.includes(w));
    const extra = legoWords.filter(w => !seedWords.includes(w));

    errors.push({
      type: 'tiling_failure',
      seedId: seedId,
      seed: targetSeed,
      legosTile: reconstructed,
      missing: missing,
      extra: extra,
      message: `LEGOs don't tile to reconstruct seed - missing: [${missing.join(', ')}], extra: [${extra.join(', ')}]`
    });
  }

  return errors;
}

/**
 * CHECK 2: HARD RULES (Non-negotiable)
 */
function validateHardRules(seedId, legos) {
  const errors = [];

  // Common gender-marked articles (Spanish/Italian/French)
  const genderArticles = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', // Spanish
    'il', 'lo', 'la', 'i', 'gli', 'le', 'uno', 'una', // Italian
    'le', 'la', 'les', 'un', 'une', 'des' // French
  ]);

  // Common auxiliaries that shouldn't stand alone
  const auxiliaries = new Set([
    'estoy', 'estás', 'está', 'estamos', 'están', // Spanish estar
    'he', 'has', 'ha', 'hemos', 'han', // Spanish haber
    'voy', 'vas', 'va', 'vamos', 'van', // Spanish ir (often auxiliary)
    'sto', 'stai', 'sta', 'stiamo', 'stanno', // Italian stare
    'sono', 'sei', 'è', 'siamo', 'siete', // Italian essere
    'je suis', 'tu es', 'il est', 'nous sommes', 'vous êtes', 'ils sont' // French être
  ]);

  // Common negations that shouldn't stand alone
  const negations = new Set([
    'no', 'non', 'ne', 'pas', 'jamais', 'rien', 'personne'
  ]);

  // Common object/reflexive pronouns that shouldn't stand alone when verb-attached
  const pronouns = new Set([
    'me', 'te', 'se', 'lo', 'la', 'le', 'les', 'nos', 'os',
    'mi', 'ti', 'si', 'ci', 'vi', 'gli'
  ]);

  for (const lego of legos) {
    const [legoId, type, target, known] = lego;

    // Only check BASE LEGOs (COMPOSITE LEGOs are allowed to wrap these)
    if (type !== 'B') continue;

    const targetLower = target.toLowerCase().trim();
    const targetWords = target.split(/\s+/);

    // HARD RULE 1: Gender-marked articles MUST bond with nouns
    if (genderArticles.has(targetLower)) {
      errors.push({
        type: 'unbonded_article',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Gender-marked article '${target}' must bond with noun`
      });
    }

    // HARD RULE 2: Auxiliaries MUST join main verbs
    if (auxiliaries.has(targetLower)) {
      errors.push({
        type: 'standalone_auxiliary',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Auxiliary '${target}' must join with main verb`
      });
    }

    // HARD RULE 3: Negations MUST join expressions
    if (negations.has(targetLower)) {
      errors.push({
        type: 'standalone_negation',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Negation '${target}' must join with expression`
      });
    }

    // HARD RULE 4: Object pronouns MUST join verbs (when verb-attached)
    // (This is heuristic - only flag single-word pronouns, not "con" etc.)
    if (pronouns.has(targetLower) && targetWords.length === 1) {
      errors.push({
        type: 'standalone_pronoun',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Object pronoun '${target}' must join with verb`
      });
    }

    // HARD RULE 5: Multi-word verb constructions stay together
    // Examples: "va a", "voy a", "sto per"
    // (Hard to check without context - skip for now or add known patterns)
  }

  return errors;
}

/**
 * CHECK 3: FD COMPLIANCE (Functional Determinism)
 *
 * This is harder to validate automatically without seeing multiple contexts.
 * For now, flag potentially problematic patterns.
 */
function validateFDCompliance(seedId, legos) {
  const warnings = [];

  // Patterns that often fail FD:
  // - Single prepositions (unless high-frequency and deterministic like "con" = "with")
  // - Single conjunctions like "que" (ambiguous: that/what/than)
  // - Single articles (but these are caught by hard rules)

  const ambiguousWords = new Set([
    'que', 'qui', 'di', 'de', 'a', 'en', 'dans', 'sur', 'sous'
  ]);

  for (const lego of legos) {
    const [legoId, type, target, known] = lego;

    if (type !== 'B') continue;

    const targetLower = target.toLowerCase().trim();
    const targetWords = target.split(/\s+/);

    // Flag single-word ambiguous forms
    if (targetWords.length === 1 && ambiguousWords.has(targetLower)) {
      warnings.push({
        type: 'fd_concern',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Word '${target}' may fail FD test (ambiguous form) - consider wrapping in composite`
      });
    }
  }

  return warnings;
}

/**
 * CHECK 4: COMPONENT VALIDATION
 */
function validateComponents(seedId, lego, allLegoIds) {
  const [legoId, type, target, known, components] = lego;
  const errors = [];

  if (type !== 'C') return errors;

  // COMPOSITE must have component array
  if (!components || components.length === 0) {
    errors.push({
      type: 'missing_components',
      seedId: seedId,
      legoId: legoId,
      message: `COMPOSITE LEGO ${legoId} missing component array`
    });
    return errors;
  }

  // Check component translations are LITERAL
  // (Hard to validate automatically - would need semantic analysis)
  // Skip for now

  // Check feeder references exist
  for (const component of components) {
    const [compTarget, compKnown, feederId] = component;

    if (feederId && feederId !== null) {
      if (!allLegoIds.has(feederId)) {
        errors.push({
          type: 'missing_feeder',
          seedId: seedId,
          legoId: legoId,
          component: compTarget,
          feederId: feederId,
          message: `Feeder ${feederId} referenced in ${legoId} but not defined as separate LEGO`
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
  const warnings = [];
  const failedSeeds = [];

  try {
    // Load LEGO pairs
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    if (!await fs.pathExists(legoPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'lego_pairs.json not found' }],
        failedSeeds: [],
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
      let seedHasErrors = false;

      // CHECK 1: TILING (FIRST AND MOST IMPORTANT)
      const tilingErrors = validateTiling(seedId, seedPair, legos);
      if (tilingErrors.length > 0) {
        errors.push(...tilingErrors);
        failedSeeds.push(seedId);
        seedHasErrors = true;
        continue; // Skip other checks if tiling fails
      }

      // CHECK 2: HARD RULES
      const hardRuleErrors = validateHardRules(seedId, legos);
      errors.push(...hardRuleErrors);

      // CHECK 3: FD COMPLIANCE (warnings only)
      const fdWarnings = validateFDCompliance(seedId, legos);
      warnings.push(...fdWarnings);

      // CHECK 4: COMPONENT VALIDATION
      for (const lego of legos) {
        const componentErrors = validateComponents(seedId, lego, allLegoIds);
        errors.push(...componentErrors);
      }

      // Mark seed as failed if any errors (not warnings)
      if (hardRuleErrors.length > 0) {
        if (!failedSeeds.includes(seedId)) {
          failedSeeds.push(seedId);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      failedSeeds: failedSeeds,
      warnings: warnings,
      stats: {
        totalSeeds: legoPairs.length,
        totalLegos: allLegoIds.size,
        passedSeeds: legoPairs.length - failedSeeds.length,
        failedSeeds: failedSeeds.length,
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
      failedSeeds: [],
      warnings: []
    };
  }
}

// CLI interface
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node validate-phase3.5-legos.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase3(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 3.5 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings (non-blocking):');
        for (const warning of result.warnings) {
          console.log(`  - ${warning.message}`);
        }
      }

      process.exit(0);
    } else {
      console.error('❌ Phase 3.5 validation failed');
      console.error(`\nFailed seeds: ${result.failedSeeds.join(', ')}`);
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

module.exports = { validatePhase3 };

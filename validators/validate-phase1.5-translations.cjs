#!/usr/bin/env node

/**
 * Phase 1.5 Validator - Translation Quality Validation
 *
 * Validates SEED_PAIRS from Phase 1 according to v2.2 methodology:
 *
 * CHECK PRIORITY (IN ORDER):
 * 1. ZERO-VARIATION COMPLIANCE
 *    - One concept = one translation (seeds 1-100)
 *    - Build vocabulary registry and check consistency
 *
 * 2. COGNATE PREFERENCE
 *    - Seeds 1-100 should prefer cognates over non-cognates
 *    - Cognates build semantic networks
 *
 * 3. GRAMMATICAL SIMPLICITY
 *    - Seeds 1-50: Avoid subjunctive
 *    - Prefer simpler structures
 *
 * 4. SEMANTIC ACCURACY
 *    - Frequency vs quantity vs intensity
 *    - No semantic drift
 *
 * 5. GRAMMAR PERFECTION
 *    - Target language grammar correct
 *    - Known language grammar correct
 *
 * Returns: { valid: boolean, errors: [...], failedSeeds: [...], stats: {...} }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Build vocabulary registry from seed pairs
 * Tracks first occurrence of each concept
 */
function buildVocabularyRegistry(seedPairs) {
  const registry = new Map(); // concept -> { seedId, target, known }

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    const [target, known] = pair;

    // Extract potential concepts from known language
    // (Simple word extraction - could be enhanced with lemmatization)
    const knownWords = known.toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Skip short words like "to", "a"

    const targetWords = target.toLowerCase()
      .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Register concept mappings
    for (let i = 0; i < knownWords.length; i++) {
      const concept = knownWords[i];
      const targetWord = targetWords[i] || targetWords[0]; // Rough alignment

      if (!registry.has(concept)) {
        registry.set(concept, {
          seedId: seedId,
          target: targetWord,
          known: concept
        });
      }
    }
  }

  return registry;
}

/**
 * CHECK 1: ZERO-VARIATION COMPLIANCE
 *
 * One concept should map to one translation in seeds 1-100
 */
function validateZeroVariation(seedPairs) {
  const errors = [];
  const registry = buildVocabularyRegistry(seedPairs);

  // Check for variation in first 100 seeds
  const variationMap = new Map(); // concept -> Set of target words

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    const seedNum = parseInt(seedId.substring(1));
    if (seedNum > 100) continue; // Only check seeds 1-100

    const [target, known] = pair;

    // Extract words
    const knownWords = known.toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const targetWords = target.toLowerCase()
      .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Check each concept
    for (let i = 0; i < knownWords.length; i++) {
      const concept = knownWords[i];
      const targetWord = targetWords[i] || targetWords[0];

      if (!variationMap.has(concept)) {
        variationMap.set(concept, new Set());
      }

      variationMap.get(concept).add(targetWord);

      // Check against registry
      const registered = registry.get(concept);
      if (registered && registered.target !== targetWord) {
        errors.push({
          type: 'zero_variation_violation',
          seedId: seedId,
          concept: concept,
          expected: registered.target,
          actual: targetWord,
          establishedIn: registered.seedId,
          message: `Concept '${concept}' established as '${registered.target}' in ${registered.seedId}, but ${seedId} uses '${targetWord}'`
        });
      }
    }
  }

  return errors;
}

/**
 * CHECK 2: COGNATE PREFERENCE (Seeds 1-100)
 *
 * This is harder to validate automatically without a cognate database.
 * For now, flag known non-cognate patterns.
 */
function validateCognatePreference(seedPairs) {
  const warnings = [];

  // Known non-cognate patterns (Spanish examples)
  const nonCognates = {
    'a menudo': { cognate: 'frecuentemente', concept: 'often/frequently' },
    'tratar': { cognate: 'intentar', concept: 'to try' },
    'usar': { cognate: 'utilizar', concept: 'to use' },
    'seguir': { cognate: 'continuar', concept: 'to continue' }
  };

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    const seedNum = parseInt(seedId.substring(1));
    if (seedNum > 100) continue; // Only check seeds 1-100

    const [target, known] = pair;
    const targetLower = target.toLowerCase();

    // Check for known non-cognates
    for (const [nonCog, info] of Object.entries(nonCognates)) {
      if (targetLower.includes(nonCog)) {
        warnings.push({
          type: 'non_cognate_used',
          seedId: seedId,
          nonCognate: nonCog,
          suggestedCognate: info.cognate,
          concept: info.concept,
          message: `Seed ${seedId} uses non-cognate '${nonCog}' - consider cognate '${info.cognate}' for concept '${info.concept}'`
        });
      }
    }
  }

  return warnings;
}

/**
 * CHECK 3: GRAMMATICAL SIMPLICITY (Seeds 1-50)
 *
 * Avoid subjunctive and complex constructions in early seeds
 */
function validateGrammaticalSimplicity(seedPairs) {
  const errors = [];

  // Subjunctive markers (Spanish/Italian/French)
  const subjunctivePatterns = [
    /\b(sea|seas|seamos|seáis|sean)\b/i, // Spanish: ser subjunctive
    /\b(haya|hayas|hayamos|hayáis|hayan)\b/i, // Spanish: haber subjunctive
    /\b(vaya|vayas|vayamos|vayáis|vayan)\b/i, // Spanish: ir subjunctive
    /\b(sia|siano|fosse|fossero)\b/i, // Italian: essere subjunctive
    /\b(abbia|abbiano|avesse|avessero)\b/i, // Italian: avere subjunctive
    /\b(que.*pueda|que.*puedan)\b/i, // Spanish: poder subjunctive
    /\b(comme|bien que|afin que|pour que)\b/i // French subjunctive triggers
  ];

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    const seedNum = parseInt(seedId.substring(1));
    if (seedNum > 50) continue; // Only check seeds 1-50

    const [target, known] = pair;
    const targetLower = target.toLowerCase();

    // Check for subjunctive
    for (const pattern of subjunctivePatterns) {
      if (pattern.test(targetLower)) {
        errors.push({
          type: 'subjunctive_in_early_seed',
          seedId: seedId,
          seed: target,
          message: `Seed ${seedId} (early seed) contains subjunctive - should use simpler structure`,
          suggestion: 'Avoid subjunctive in seeds 1-50 for grammatical simplicity'
        });
        break;
      }
    }
  }

  return errors;
}

/**
 * CHECK 4: SEMANTIC ACCURACY
 *
 * Check for common semantic drift patterns
 */
function validateSemanticAccuracy(seedPairs, canonicalSeeds) {
  const errors = [];

  // Common semantic confusions
  const semanticChecks = [
    {
      canonical: /\boften\b/i,
      category: 'frequency',
      wrongPatterns: [/\bmuch\b/i, /\bmany\b/i, /\blot\b/i],
      message: 'Canonical uses "often" (frequency), but translation uses quantity words'
    },
    {
      canonical: /\bhard\b/i,
      category: 'intensity',
      wrongPatterns: [/\bmuch\b/i, /\bmany\b/i],
      message: 'Canonical uses "hard" (intensity/effort), but translation uses quantity words'
    },
    {
      canonical: /\bfrequent/i,
      category: 'frequency',
      wrongPatterns: [/\bmuch\b/i, /\bquant/i],
      message: 'Canonical uses "frequent" (frequency), but translation uses quantity words'
    }
  ];

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    if (!canonicalSeeds || !canonicalSeeds[seedId]) continue;

    const [target, known] = pair;
    const canonical = canonicalSeeds[seedId];

    // Check each semantic pattern
    for (const check of semanticChecks) {
      if (check.canonical.test(canonical)) {
        // Canonical has this concept
        for (const wrongPattern of check.wrongPatterns) {
          if (wrongPattern.test(known)) {
            errors.push({
              type: 'semantic_drift',
              seedId: seedId,
              canonical: canonical,
              translation: known,
              category: check.category,
              message: check.message
            });
          }
        }
      }
    }
  }

  return errors;
}

/**
 * CHECK 5: GRAMMAR PERFECTION
 *
 * Check for known grammar errors
 */
function validateGrammar(seedPairs) {
  const errors = [];

  // Known grammar patterns (language-specific)
  const grammarRules = [
    {
      lang: 'spa',
      pattern: /un poco\s+[^\s]/i,
      shouldBe: /un poco de/i,
      message: 'Spanish: "un poco" requires "de" before noun',
      fix: 'Change to "un poco de"'
    },
    {
      lang: 'ita',
      pattern: /cercando\s+[a-z]/i,
      shouldNotBe: /cercando di/i,
      message: 'Italian: "cercando" + infinitive requires "di"',
      fix: 'Change to "cercando di parlare"'
    },
    {
      lang: 'ita',
      pattern: /provando\s+[a-z]/i,
      shouldNotBe: /provando a/i,
      message: 'Italian: "provando" + infinitive requires "a"',
      fix: 'Change to "provando a dire"'
    }
  ];

  for (const [seedId, pair] of Object.entries(seedPairs)) {
    const [target, known] = pair;

    // Check grammar rules
    for (const rule of grammarRules) {
      if (rule.pattern.test(target)) {
        if (rule.shouldBe && !rule.shouldBe.test(target)) {
          errors.push({
            type: 'grammar_error',
            seedId: seedId,
            seed: target,
            rule: rule.message,
            fix: rule.fix
          });
        }

        if (rule.shouldNotBe && rule.shouldNotBe.test(target)) {
          // This is OK - rule is checking for absence
        } else if (rule.shouldNotBe) {
          errors.push({
            type: 'grammar_error',
            seedId: seedId,
            seed: target,
            rule: rule.message,
            fix: rule.fix
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Main validation function
 */
async function validatePhase1(courseDir, canonicalSeedsPath = null) {
  const errors = [];
  const warnings = [];
  const failedSeeds = [];

  try {
    // Load seed pairs
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    if (!await fs.pathExists(seedPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'seed_pairs.json not found' }],
        failedSeeds: [],
        warnings: []
      };
    }

    const seedPairs = await fs.readJson(seedPairsPath);

    // Load canonical seeds if provided (for semantic accuracy check)
    let canonicalSeeds = null;
    if (canonicalSeedsPath && await fs.pathExists(canonicalSeedsPath)) {
      canonicalSeeds = await fs.readJson(canonicalSeedsPath);
    }

    // CHECK 1: Zero-variation compliance
    const variationErrors = validateZeroVariation(seedPairs);
    errors.push(...variationErrors);

    // CHECK 2: Cognate preference (warnings only)
    const cognateWarnings = validateCognatePreference(seedPairs);
    warnings.push(...cognateWarnings);

    // CHECK 3: Grammatical simplicity
    const simplicityErrors = validateGrammaticalSimplicity(seedPairs);
    errors.push(...simplicityErrors);

    // CHECK 4: Semantic accuracy
    const semanticErrors = validateSemanticAccuracy(seedPairs, canonicalSeeds);
    errors.push(...semanticErrors);

    // CHECK 5: Grammar perfection
    const grammarErrors = validateGrammar(seedPairs);
    errors.push(...grammarErrors);

    // Build failed seeds list
    const failedSeedsSet = new Set();
    for (const error of errors) {
      if (error.seedId) {
        failedSeedsSet.add(error.seedId);
      }
    }
    failedSeeds.push(...Array.from(failedSeedsSet));

    return {
      valid: errors.length === 0,
      errors: errors,
      failedSeeds: failedSeeds,
      warnings: warnings,
      stats: {
        totalSeeds: Object.keys(seedPairs).length,
        passedSeeds: Object.keys(seedPairs).length - failedSeeds.length,
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
  const canonicalSeedsPath = process.argv[3]; // Optional

  if (!courseDir) {
    console.error('Usage: node validate-phase1.5-translations.cjs <course_directory> [canonical_seeds_path]');
    process.exit(1);
  }

  validatePhase1(courseDir, canonicalSeedsPath).then(result => {
    if (result.valid) {
      console.log('✅ Phase 1.5 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings (non-blocking):');
        for (const warning of result.warnings) {
          console.log(`  - ${warning.message}`);
        }
      }

      process.exit(0);
    } else {
      console.error('❌ Phase 1.5 validation failed');
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

module.exports = { validatePhase1 };

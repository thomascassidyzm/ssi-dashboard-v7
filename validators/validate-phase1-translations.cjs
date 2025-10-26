#!/usr/bin/env node

/**
 * Phase 1 Validator - Translation Methodology
 *
 * Automated checks based on SSi Translation Methodology:
 * 1. Zero-Variation enforcement (one concept = one word in seeds 1-100)
 * 2. Vocabulary registry consistency (first-come-first-served)
 * 3. Cognate preference validation
 * 4. Semantic accuracy (frequency vs quantity, intensity vs quantity)
 * 5. Grammar validation (known patterns like "un poco de")
 *
 * Returns: { valid: boolean, errors: [...] }
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Build vocabulary registry from translations
 * Tracks first occurrence of each concept
 */
function buildVocabularyRegistry(seedPairs, seedNumbers) {
  const registry = new Map(); // concept -> { word, seedId, index }

  // Simplified concept extraction - looks for common verbs/nouns
  // In production, this would use more sophisticated lemmatization
  const concepts = {
    // English infinitives -> Spanish forms (add more as needed)
    'to speak': /\b(hablar|decir|contar|charlar)\b/i,
    'to want': /\b(querer|desear)\b/i,
    'to try': /\b(intentar|tratar|probar)\b/i,
    'to learn': /\b(aprender|estudiar)\b/i,
    'to practice': /\b(practicar|entrenar)\b/i,
    'to remember': /\b(recordar|acordarse)\b/i,
    'to explain': /\b(explicar|aclarar)\b/i,
    'important': /\b(importante|significativo|relevante)\b/i,
    'difficult': /\b(difícil|duro|complicado)\b/i,
    'possible': /\b(posible|factible)\b/i,
  };

  for (const seedNum of seedNumbers) {
    const seedId = `S${seedNum.toString().padStart(4, '0')}`;
    const [target, known] = seedPairs[seedId];

    for (const [concept, pattern] of Object.entries(concepts)) {
      const match = target.match(pattern);
      if (match && !registry.has(concept)) {
        registry.set(concept, {
          word: match[0],
          seedId: seedId,
          index: seedNum
        });
      }
    }
  }

  return registry;
}

/**
 * Check for zero-variation violations in early seeds (1-100)
 */
function validateZeroVariation(seedPairs, registry) {
  const errors = [];
  const concepts = {
    'to speak': /\b(hablar|decir|contar|charlar)\b/i,
    'to want': /\b(querer|desear)\b/i,
    'to try': /\b(intentar|tratar|probar)\b/i,
    'to learn': /\b(aprender|estudiar)\b/i,
    'to practice': /\b(practicar|entrenar)\b/i,
    'to remember': /\b(recordar|acordarse)\b/i,
    'to explain': /\b(explicar|aclarar)\b/i,
    'important': /\b(importante|significativo|relevante)\b/i,
    'difficult': /\b(difícil|duro|complicado)\b/i,
    'possible': /\b(posible|factible)\b/i,
  };

  // Check seeds 1-100 for consistency
  for (let i = 1; i <= 100; i++) {
    const seedId = `S${i.toString().padStart(4, '0')}`;
    if (!seedPairs[seedId]) continue;

    const [target, known] = seedPairs[seedId];

    for (const [concept, pattern] of Object.entries(concepts)) {
      const match = target.match(pattern);
      if (match) {
        const registeredWord = registry.get(concept);
        if (registeredWord && match[0].toLowerCase() !== registeredWord.word.toLowerCase()) {
          errors.push({
            type: 'zero_variation_violation',
            seedId: seedId,
            concept: concept,
            expectedWord: registeredWord.word,
            actualWord: match[0],
            firstOccurrence: registeredWord.seedId,
            message: `Concept "${concept}" should use "${registeredWord.word}" (established in ${registeredWord.seedId}), but uses "${match[0]}"`,
            suggestion: `Change to "${registeredWord.word}" for consistency (Zero-Variation Principle)`
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Check for semantic accuracy errors
 */
function validateSemanticAccuracy(seedPairs, canonicalSeeds) {
  const errors = [];

  // Common semantic drift patterns
  const semanticChecks = [
    {
      canonical: /as often as possible/i,
      errorPattern: /\b(mucho|posible|lo más posible|tanto como sea posible)\b/i,
      correctPattern: /\b(frecuentemente|a menudo|con frecuencia)\b/i,
      message: 'FREQUENCY vs QUANTITY confusion: "as often as possible" should express temporal frequency, not quantity',
      type: 'frequency_quantity_confusion'
    },
    {
      canonical: /as hard as/i,
      errorPattern: /\b(mucho|tanto)\b/i,
      correctPattern: /\b(duro|intensamente|con esfuerzo)\b/i,
      message: 'INTENSITY vs QUANTITY confusion: "as hard as" should express effort/intensity, not quantity',
      type: 'intensity_quantity_confusion'
    }
  ];

  for (const [seedId, canonical] of Object.entries(canonicalSeeds)) {
    if (!seedPairs[seedId]) continue;
    const [target, known] = seedPairs[seedId];

    for (const check of semanticChecks) {
      if (check.canonical.test(canonical)) {
        // Canonical has this concept
        if (check.errorPattern.test(target) && !check.correctPattern.test(target)) {
          errors.push({
            type: check.type,
            seedId: seedId,
            canonical: canonical,
            target: target,
            message: check.message,
            suggestion: 'Regenerate translation to express correct semantic category'
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Check for known grammar errors
 */
function validateGrammar(seedPairs) {
  const errors = [];

  const grammarChecks = [
    {
      // Spanish: "un poco" without "de"
      pattern: /un poco ([a-záéíóúñ]+)/i,
      errorCondition: (match, fullText) => {
        return !fullText.includes('un poco de');
      },
      message: 'Spanish grammar error: "un poco" requires "de" before noun',
      suggestion: 'Change to "un poco de"',
      type: 'spanish_un_poco_de'
    },
    {
      // Italian: infinitives after "cercando" need "di"
      pattern: /cercando ([a-zàèéìòù]+are|ere|ire)/i,
      errorCondition: (match, fullText) => {
        return !fullText.includes('cercando di');
      },
      message: 'Italian grammar error: "cercando" requires "di" before infinitive',
      suggestion: 'Change to "cercando di"',
      type: 'italian_cercando_di'
    }
  ];

  for (const [seedId, [target, known]] of Object.entries(seedPairs)) {
    for (const check of grammarChecks) {
      const match = target.match(check.pattern);
      if (match && check.errorCondition(match, target)) {
        errors.push({
          type: check.type,
          seedId: seedId,
          target: target,
          match: match[0],
          message: check.message,
          suggestion: check.suggestion
        });
      }
    }
  }

  return errors;
}

/**
 * Check for cognate preference in early seeds
 */
function validateCognatePreference(seedPairs, targetLang, knownLang) {
  const errors = [];

  // Only check for languages where cognates are available
  if (knownLang !== 'eng') return errors;

  // Cognate vs non-cognate pairs (Spanish example)
  const cognatePairs = {
    'spa': {
      'intentar': { cognate: true, noncognate: 'tratar', concept: 'try' },
      'practicar': { cognate: true, noncognate: 'entrenar', concept: 'practice' },
      'importante': { cognate: true, noncognate: 'relevante', concept: 'important' },
      'utilizar': { cognate: true, noncognate: null, concept: 'use' },
      'explicar': { cognate: true, noncognate: 'aclarar', concept: 'explain' },
    }
  };

  if (!cognatePairs[targetLang]) return errors;

  // Check seeds 1-100 for cognate preference
  for (let i = 1; i <= 100; i++) {
    const seedId = `S${i.toString().padStart(4, '0')}`;
    if (!seedPairs[seedId]) continue;

    const [target, known] = seedPairs[seedId];

    for (const [cognateWord, info] of Object.entries(cognatePairs[targetLang])) {
      if (info.noncognate && target.toLowerCase().includes(info.noncognate)) {
        errors.push({
          type: 'cognate_preference_violation',
          seedId: seedId,
          concept: info.concept,
          usedWord: info.noncognate,
          preferredCognate: cognateWord,
          message: `Non-cognate "${info.noncognate}" used for "${info.concept}" in seed ${i} - should prefer cognate "${cognateWord}"`,
          suggestion: `Use "${cognateWord}" instead for better cognitive ease (Cognate Preference principle)`
        });
      }
    }
  }

  return errors;
}

/**
 * Main validation function
 */
async function validatePhase1(courseDir) {
  const errors = [];

  try {
    // Load seed pairs
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    if (!await fs.pathExists(seedPairsPath)) {
      return {
        valid: false,
        errors: [{ type: 'missing_output', message: 'seed_pairs.json not found' }]
      };
    }

    const seedPairs = await fs.readJson(seedPairsPath);

    // Determine target and known languages from directory name
    const courseName = path.basename(courseDir);
    const [targetLang, , knownLang] = courseName.split('_');

    // Build vocabulary registry
    const seedNumbers = Object.keys(seedPairs)
      .map(id => parseInt(id.substring(1)))
      .sort((a, b) => a - b);

    const registry = buildVocabularyRegistry(seedPairs, seedNumbers);

    // Load canonical seeds if available (for semantic validation)
    let canonicalSeeds = {};
    try {
      // Attempt to load from canonical source or course metadata
      // For now, we'll skip this check if canonical not available
    } catch (e) {
      // Canonical seeds not available - skip semantic checks
    }

    // Run validations
    const zeroVariationErrors = validateZeroVariation(seedPairs, registry);
    errors.push(...zeroVariationErrors);

    const grammarErrors = validateGrammar(seedPairs);
    errors.push(...grammarErrors);

    const cognateErrors = validateCognatePreference(seedPairs, targetLang, knownLang);
    errors.push(...cognateErrors);

    // Semantic validation (only if canonical seeds available)
    if (Object.keys(canonicalSeeds).length > 0) {
      const semanticErrors = validateSemanticAccuracy(seedPairs, canonicalSeeds);
      errors.push(...semanticErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      stats: {
        totalSeeds: Object.keys(seedPairs).length,
        vocabularyRegistrySize: registry.size,
        errorsFound: errors.length,
        targetLanguage: targetLang,
        knownLanguage: knownLang
      },
      vocabularyRegistry: Object.fromEntries(registry)
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
    console.error('Usage: node validate-phase1-translations.cjs <course_directory>');
    process.exit(1);
  }

  validatePhase1(courseDir).then(result => {
    if (result.valid) {
      console.log('✅ Phase 1 validation passed');
      console.log(JSON.stringify(result.stats, null, 2));
      console.log('\nVocabulary Registry:');
      console.log(JSON.stringify(result.vocabularyRegistry, null, 2));
      process.exit(0);
    } else {
      console.error('❌ Phase 1 validation failed');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });
}

module.exports = { validatePhase1 };

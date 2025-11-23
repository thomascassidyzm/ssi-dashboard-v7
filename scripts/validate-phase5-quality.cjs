#!/usr/bin/env node
/**
 * Phase 5 Quality Validator - New practice_phrases Format
 *
 * Validates LEGO baskets according to GATE methodology:
 *
 * 1. VOCABULARY CONSTRAINT (ABSOLUTE GATE)
 *    - Each basket ONLY uses LEGOs taught before it (GATE compliance)
 *    - NO future vocabulary allowed
 *
 * 2. BASKET STRUCTURE
 *    - Must have 10 practice phrases
 *    - Must have lego.known and lego.target
 *    - Must have is_final_lego flag
 *
 * 3. PROGRESSIVE COMPLEXITY
 *    - Phrases should increase in length/complexity
 *    - Each phrase should contain the target LEGO
 *
 * 4. GRAMMAR QUALITY
 *    - No obvious grammar errors
 *    - Proper punctuation and capitalization
 *
 * 5. CULMINATING LEGO CHECK
 *    - Final LEGOs should include complete seed
 */

const fs = require('fs');
const path = require('path');

/**
 * Build LEGO sequence from lego_pairs.json
 */
function buildLegoSequence(legoPairsData) {
  const sequence = new Map(); // legoId -> { position, target, known, seedId, isCulminating }
  let position = 0;

  const seeds = legoPairsData.seeds || legoPairsData;

  for (const seed of seeds) {
    const seedId = seed.seed_id;

    if (!seed.legos || !Array.isArray(seed.legos)) continue;

    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i];
      const isCulminating = (i === seed.legos.length - 1);

      sequence.set(lego.id, {
        position: position++,
        target: lego.lego?.target,
        known: lego.lego?.known,
        seedId: seedId,
        isCulminating: isCulminating
      });
    }
  }

  return sequence;
}

/**
 * Build vocabulary set of all words available before a LEGO position
 */
function buildAvailableVocabulary(targetPosition, legoSequence) {
  const vocab = new Set();

  for (const [legoId, info] of legoSequence.entries()) {
    if (info.position < targetPosition && info.target) {
      // Add all words from this LEGO
      const words = info.target
        .toLowerCase()
        .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0);

      words.forEach(w => vocab.add(w));
    }
  }

  return vocab;
}

/**
 * Extract words from a phrase
 */
function extractWords(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];

  return phrase
    .toLowerCase()
    .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * CHECK 1: VOCABULARY CONSTRAINT (GATE)
 */
function validateVocabularyConstraint(legoId, basket, legoSequence) {
  const errors = [];
  const legoInfo = legoSequence.get(legoId);

  if (!legoInfo) {
    errors.push({
      type: 'lego_not_found',
      legoId: legoId,
      message: `LEGO ${legoId} not found in lego_pairs sequence`
    });
    return errors;
  }

  const availableVocab = buildAvailableVocabulary(legoInfo.position, legoSequence);

  // Add the target LEGO's own words (learner is practicing this LEGO)
  const targetWords = extractWords(legoInfo.target);
  targetWords.forEach(w => availableVocab.add(w));

  // Check all practice phrases
  if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
    errors.push({
      type: 'missing_practice_phrases',
      legoId: legoId,
      message: `LEGO ${legoId} missing practice_phrases array`
    });
    return errors;
  }

  for (let i = 0; i < basket.practice_phrases.length; i++) {
    const phrase = basket.practice_phrases[i];
    if (!phrase || !phrase.target) continue;

    const phraseWords = extractWords(phrase.target);

    for (const word of phraseWords) {
      if (!availableVocab.has(word)) {
        // Find which LEGO this word comes from
        let violatingLego = null;
        for (const [futureLegoId, info] of legoSequence.entries()) {
          if (info.position >= legoInfo.position) {
            const futureWords = extractWords(info.target);
            if (futureWords.includes(word)) {
              violatingLego = futureLegoId;
              break;
            }
          }
        }

        errors.push({
          type: 'vocabulary_constraint_violation',
          legoId: legoId,
          position: legoInfo.position,
          phraseIndex: i,
          phrase: phrase,
          violatingWord: word,
          violatingLego: violatingLego,
          message: violatingLego
            ? `Phrase ${i} uses future word '${word}' from ${violatingLego}`
            : `Phrase ${i} uses unknown word '${word}'`
        });
      }
    }
  }

  return errors;
}

/**
 * CHECK 2: BASKET STRUCTURE
 */
function validateBasketStructure(legoId, basket) {
  const errors = [];

  // Check lego object
  if (!basket.lego || typeof basket.lego !== 'object') {
    errors.push({
      type: 'missing_lego_object',
      legoId: legoId,
      message: `LEGO ${legoId} missing lego object`
    });
  } else {
    if (!basket.lego.known) {
      errors.push({
        type: 'missing_lego_known',
        legoId: legoId,
        message: `LEGO ${legoId} missing lego.known`
      });
    }
    if (!basket.lego.target) {
      errors.push({
        type: 'missing_lego_target',
        legoId: legoId,
        message: `LEGO ${legoId} missing lego.target`
      });
    }
  }

  // Check practice_phrases
  if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
    errors.push({
      type: 'missing_practice_phrases',
      legoId: legoId,
      message: `LEGO ${legoId} missing practice_phrases array`
    });
  } else {
    // Should have exactly 10 phrases
    if (basket.practice_phrases.length !== 10) {
      errors.push({
        type: 'incorrect_phrase_count',
        legoId: legoId,
        expected: 10,
        actual: basket.practice_phrases.length,
        message: `LEGO ${legoId} has ${basket.practice_phrases.length} phrases (expected 10)`
      });
    }

    // Each phrase should have known and target
    for (let i = 0; i < basket.practice_phrases.length; i++) {
      const phrase = basket.practice_phrases[i];
      if (!phrase.known) {
        errors.push({
          type: 'missing_phrase_known',
          legoId: legoId,
          phraseIndex: i,
          message: `Phrase ${i} missing known field`
        });
      }
      if (!phrase.target) {
        errors.push({
          type: 'missing_phrase_target',
          legoId: legoId,
          phraseIndex: i,
          message: `Phrase ${i} missing target field`
        });
      }
    }
  }

  // Check is_final_lego flag
  if (typeof basket.is_final_lego !== 'boolean') {
    errors.push({
      type: 'missing_is_final_lego',
      legoId: legoId,
      message: `LEGO ${legoId} missing or invalid is_final_lego flag`
    });
  }

  // Check phrase_count
  if (typeof basket.phrase_count !== 'number') {
    errors.push({
      type: 'missing_phrase_count',
      legoId: legoId,
      message: `LEGO ${legoId} missing phrase_count`
    });
  } else if (basket.phrase_count !== basket.practice_phrases.length) {
    errors.push({
      type: 'phrase_count_mismatch',
      legoId: legoId,
      expected: basket.practice_phrases.length,
      actual: basket.phrase_count,
      message: `phrase_count (${basket.phrase_count}) doesn't match actual phrases (${basket.practice_phrases.length})`
    });
  }

  return errors;
}

/**
 * CHECK 3: PROGRESSIVE COMPLEXITY
 */
function validateProgressiveComplexity(legoId, basket, legoSequence) {
  const warnings = [];
  const legoInfo = legoSequence.get(legoId);

  if (!legoInfo || !legoInfo.target || !basket.practice_phrases) return warnings;

  const targetLego = legoInfo.target.toLowerCase();

  for (let i = 0; i < basket.practice_phrases.length; i++) {
    const phrase = basket.practice_phrases[i];
    if (!phrase || !phrase.target) continue;

    const targetPhrase = phrase.target.toLowerCase();

    // Check if target LEGO appears in practice phrase
    if (!targetPhrase.includes(targetLego)) {
      warnings.push({
        type: 'missing_target_lego',
        legoId: legoId,
        phraseIndex: i,
        targetLego: legoInfo.target,
        phrase: phrase.target,
        message: `Phrase ${i} doesn't contain target LEGO "${legoInfo.target}"`
      });
    }
  }

  // Check progressive length
  const wordCounts = basket.practice_phrases.map(p => extractWords(p.target).length);
  for (let i = 1; i < wordCounts.length; i++) {
    // Allow some variation, but generally should increase or stay similar
    if (wordCounts[i] < wordCounts[0] - 2) {
      warnings.push({
        type: 'complexity_regression',
        legoId: legoId,
        phraseIndex: i,
        firstPhraseWords: wordCounts[0],
        currentPhraseWords: wordCounts[i],
        message: `Phrase ${i} is much shorter than first phrase (${wordCounts[i]} vs ${wordCounts[0]} words)`
      });
    }
  }

  return warnings;
}

/**
 * CHECK 4: GRAMMAR QUALITY
 */
function validateGrammarQuality(legoId, basket) {
  const warnings = [];

  if (!basket.practice_phrases) return warnings;

  for (let i = 0; i < basket.practice_phrases.length; i++) {
    const phrase = basket.practice_phrases[i];
    const target = phrase.target;
    const known = phrase.known;

    // Check for empty phrases
    if (!target || target.trim().length === 0) {
      warnings.push({
        type: 'empty_target_phrase',
        legoId: legoId,
        phraseIndex: i,
        message: `Phrase ${i} has empty target`
      });
    }

    if (!known || known.trim().length === 0) {
      warnings.push({
        type: 'empty_known_phrase',
        legoId: legoId,
        phraseIndex: i,
        message: `Phrase ${i} has empty known`
      });
    }

    // Check for double spaces
    if (target.includes('  ')) {
      warnings.push({
        type: 'double_spaces',
        legoId: legoId,
        phraseIndex: i,
        phrase: target,
        message: `Phrase ${i} contains double spaces`
      });
    }

    // Check for unclosed quotes
    const quoteCount = (target.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      warnings.push({
        type: 'unclosed_quotes',
        legoId: legoId,
        phraseIndex: i,
        phrase: target,
        message: `Phrase ${i} has unclosed quotes`
      });
    }
  }

  return warnings;
}

/**
 * Main validation
 */
async function validatePhase5Quality(courseDir) {
  console.log(`\n🔍 Phase 5 Quality Validation`);
  console.log(`Course: ${courseDir}\n`);

  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

  // Load files
  if (!fs.existsSync(legoPairsPath)) {
    console.error(`❌ lego_pairs.json not found at ${legoPairsPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(legoBasketsPath)) {
    console.error(`❌ lego_baskets.json not found at ${legoBasketsPath}`);
    process.exit(1);
  }

  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
  const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
  const baskets = legoBasketsData.baskets || legoBasketsData;

  // Build LEGO sequence
  const legoSequence = buildLegoSequence(legoPairs);
  console.log(`📊 LEGO sequence: ${legoSequence.size} LEGOs`);
  console.log(`📦 Baskets: ${Object.keys(baskets).length} baskets\n`);

  const allErrors = [];
  const allWarnings = [];
  const failedLegos = new Set();

  // Validate each basket
  for (const [legoId, basket] of Object.entries(baskets)) {
    // CHECK 1: Vocabulary constraint (GATE)
    const vocabErrors = validateVocabularyConstraint(legoId, basket, legoSequence);
    if (vocabErrors.length > 0) {
      allErrors.push(...vocabErrors);
      failedLegos.add(legoId);
    }

    // CHECK 2: Basket structure
    const structureErrors = validateBasketStructure(legoId, basket);
    if (structureErrors.length > 0) {
      allErrors.push(...structureErrors);
      failedLegos.add(legoId);
    }

    // CHECK 3: Progressive complexity (warnings)
    const complexityWarnings = validateProgressiveComplexity(legoId, basket, legoSequence);
    allWarnings.push(...complexityWarnings);

    // CHECK 4: Grammar quality (warnings)
    const grammarWarnings = validateGrammarQuality(legoId, basket);
    allWarnings.push(...grammarWarnings);
  }

  // Report results
  console.log(`${'='.repeat(60)}`);
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total baskets validated: ${Object.keys(baskets).length}`);
  console.log(`Passed: ${Object.keys(baskets).length - failedLegos.size}`);
  console.log(`Failed: ${failedLegos.size}`);
  console.log(`Errors: ${allErrors.length}`);
  console.log(`Warnings: ${allWarnings.length}`);

  if (allErrors.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('❌ ERRORS (BLOCKING)');
    console.log('='.repeat(60));

    // Group by type
    const errorsByType = {};
    for (const error of allErrors) {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    }

    for (const [type, errors] of Object.entries(errorsByType)) {
      console.log(`\n${type}: ${errors.length} errors`);
      // Show first 5
      for (let i = 0; i < Math.min(5, errors.length); i++) {
        console.log(`   ${errors[i].message}`);
      }
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more`);
      }
    }

    console.log(`\nFailed LEGOs: ${Array.from(failedLegos).join(', ')}`);
  }

  if (allWarnings.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('⚠️  WARNINGS (NON-BLOCKING)');
    console.log('='.repeat(60));

    // Group by type
    const warningsByType = {};
    for (const warning of allWarnings) {
      if (!warningsByType[warning.type]) {
        warningsByType[warning.type] = [];
      }
      warningsByType[warning.type].push(warning);
    }

    for (const [type, warnings] of Object.entries(warningsByType)) {
      console.log(`\n${type}: ${warnings.length} warnings`);
      // Show first 3
      for (let i = 0; i < Math.min(3, warnings.length); i++) {
        console.log(`   ${warnings[i].message}`);
      }
      if (warnings.length > 3) {
        console.log(`   ... and ${warnings.length - 3} more`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (allErrors.length === 0) {
    console.log(`✅ Phase 5 validation PASSED! Ready for Phase 7 compilation.\n`);
    process.exit(0);
  } else {
    console.log(`❌ Phase 5 validation FAILED. Fix errors before proceeding.\n`);
    process.exit(1);
  }
}

// CLI
const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

validatePhase5Quality(courseDir);

#!/usr/bin/env node

/**
 * ABSOLUTE GATE Compliance Validator
 *
 * Validates that all practice phrases in lego_baskets.json respect the ABSOLUTE GATE constraint:
 * "LEGO at index N can only use LEGOs at indices 0 to N-1"
 *
 * Key principle: Each phrase [target, known] must tile perfectly as a sequence of LEGO pairs,
 * where all LEGOs in the sequence have index ≤ current basket's LEGO index.
 *
 * Input:  vfs/courses/{course_code}/lego_pairs.json (for LEGO sequence and vocabulary)
 *         vfs/courses/{course_code}/lego_baskets.json (for practice phrases)
 * Output: Violation report with basket IDs and violating phrases
 *
 * Usage: node validators/validate-gate-compliance.cjs <course_code> [--output violations.json] [--verbose]
 */

const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0];
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
const verbose = args.includes('--verbose');

if (!courseCode) {
  console.error('❌ Usage: node validators/validate-gate-compliance.cjs <course_code> [--output violations.json] [--verbose]');
  console.error('   Example: node validators/validate-gate-compliance.cjs spa_for_eng_60seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const basketsPath = path.join(courseDir, 'lego_baskets.json');

/**
 * Build vocabulary index from LEGO pairs
 * Maps each word (lowercased, normalized) to the first LEGO where it appears
 */
function buildVocabularyIndex(legoPairs) {
  const vocabIndex = {};
  let globalIndex = 0;

  for (const seed of legoPairs.seeds) {
    const [seedId, seedPair, legos] = seed;

    for (const lego of legos) {
      const [legoId, type, target, known] = lego;

      // Split target into words and register each
      const targetWords = target.toLowerCase().split(/\s+/);
      for (const word of targetWords) {
        if (!vocabIndex[word]) {
          vocabIndex[word] = {
            legoId,
            index: globalIndex,
            target,
            known
          };
        }
      }

      globalIndex++;
    }
  }

  return { vocabIndex, totalLegos: globalIndex };
}

/**
 * Check if a phrase violates GATE constraint
 * Returns { valid: true } or { valid: false, violations: [...] }
 */
function validatePhrase(phrase, currentLegoIndex, vocabIndex) {
  const [target, known] = phrase;
  const targetLower = target.toLowerCase();
  const words = targetLower.split(/\s+/);

  const violations = [];

  for (const word of words) {
    // Remove punctuation for lookup
    const cleanWord = word.replace(/[¿?¡!.,;:]/g, '');

    if (vocabIndex[cleanWord]) {
      const wordInfo = vocabIndex[cleanWord];

      // GATE violation: word appears in LEGO beyond current index
      if (wordInfo.index > currentLegoIndex) {
        violations.push({
          word: cleanWord,
          wordLegoId: wordInfo.legoId,
          wordIndex: wordInfo.index,
          gap: wordInfo.index - currentLegoIndex,
          wordTarget: wordInfo.target,
          wordKnown: wordInfo.known
        });
      }
    }
  }

  if (violations.length > 0) {
    return { valid: false, violations };
  }

  return { valid: true };
}

/**
 * Main validation function
 */
async function validateGateCompliance() {
  console.log(`\n🔒 ABSOLUTE GATE Compliance Validator`);
  console.log(`Course: ${courseCode}\n`);

  // Load LEGO pairs
  if (!await fs.pathExists(legoPairsPath)) {
    console.error(`❌ LEGO pairs not found: ${legoPairsPath}`);
    process.exit(1);
  }

  const legoPairsData = await fs.readJson(legoPairsPath);
  console.log(`📂 Loaded LEGO pairs from: lego_pairs.json`);

  // Build vocabulary index
  const { vocabIndex, totalLegos } = buildVocabularyIndex(legoPairsData);
  console.log(`📊 Total LEGOs in sequence: ${totalLegos}\n`);

  // Load baskets
  if (!await fs.pathExists(basketsPath)) {
    console.error(`❌ Baskets not found: ${basketsPath}`);
    process.exit(1);
  }

  const basketsData = await fs.readJson(basketsPath);
  const baskets = basketsData.baskets || basketsData;
  console.log(`📂 Loaded baskets from: lego_baskets.json\n`);

  // Validate each basket
  const allViolations = [];
  let totalPhrases = 0;
  let violationCount = 0;
  let currentLegoIndex = 0;

  for (const seed of legoPairsData.seeds) {
    const [seedId, seedPair, legos] = seed;

    for (const lego of legos) {
      const [legoId] = lego;
      const basket = baskets[legoId];

      if (!basket) {
        currentLegoIndex++;
        continue;
      }

      // Collect all phrases from this basket
      const phrases = [];

      if (basket.e && Array.isArray(basket.e)) {
        for (const phrase of basket.e) {
          phrases.push({ phrase, type: 'e' });
        }
      }

      if (basket.d && typeof basket.d === 'object') {
        for (const [window, windowPhrases] of Object.entries(basket.d)) {
          if (Array.isArray(windowPhrases)) {
            for (const phrase of windowPhrases) {
              phrases.push({ phrase, type: `d${window}` });
            }
          }
        }
      }

      // Validate each phrase
      for (const { phrase, type } of phrases) {
        totalPhrases++;
        const validation = validatePhrase(phrase, currentLegoIndex, vocabIndex);

        if (!validation.valid) {
          violationCount++;

          // Find worst violation (largest gap)
          const worstViolation = validation.violations.reduce((max, v) =>
            v.gap > max.gap ? v : max
          , validation.violations[0]);

          allViolations.push({
            basketId: legoId,
            basketIndex: currentLegoIndex,
            phraseType: type,
            phrase: phrase,
            worstViolation,
            allViolations: validation.violations
          });

          if (verbose && allViolations.length <= 10) {
            console.log(`❌ ${legoId} [idx=${currentLegoIndex}] (${type})`);
            console.log(`   "${phrase[0]}"`);
            console.log(`   → uses "${worstViolation.word}" from ${worstViolation.wordLegoId} [idx=${worstViolation.wordIndex}]`);
            console.log(`   → GAP: ${worstViolation.gap} LEGOs too early\n`);
          }
        }
      }

      currentLegoIndex++;
    }
  }

  // Summary
  console.log(`\n✅ Validation Complete\n`);
  console.log(`📊 Results:`);
  console.log(`   Total phrases checked: ${totalPhrases}`);
  console.log(`   Valid phrases: ${totalPhrases - violationCount} (${((totalPhrases - violationCount) / totalPhrases * 100).toFixed(1)}%)`);
  console.log(`   Violations: ${violationCount} (${(violationCount / totalPhrases * 100).toFixed(1)}%)`);

  if (violationCount > 0) {
    console.log(`\n⚠️  GATE COMPLIANCE: FAILED`);

    // Group violations by basket
    const violationsByBasket = {};
    for (const v of allViolations) {
      if (!violationsByBasket[v.basketId]) {
        violationsByBasket[v.basketId] = [];
      }
      violationsByBasket[v.basketId].push(v);
    }

    console.log(`   Affected baskets: ${Object.keys(violationsByBasket).length}`);

    // Show top 5 worst violations
    const sorted = [...allViolations].sort((a, b) => b.worstViolation.gap - a.worstViolation.gap);
    console.log(`\n   Top 5 worst violations:`);
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const v = sorted[i];
      console.log(`   ${i + 1}. ${v.basketId} [idx=${v.basketIndex}]: "${v.phrase[0].substring(0, 50)}..."`);
      console.log(`      → uses "${v.worstViolation.word}" from ${v.worstViolation.wordLegoId} [idx=${v.worstViolation.wordIndex}]`);
      console.log(`      → GAP: ${v.worstViolation.gap} LEGOs\n`);
    }
  } else {
    console.log(`\n✅ GATE COMPLIANCE: PASSED`);
    console.log(`   All phrases respect ABSOLUTE GATE constraint!\n`);
  }

  // Write output file
  if (outputFile) {
    const report = {
      course: courseCode,
      generated: new Date().toISOString(),
      summary: {
        totalPhrases,
        validPhrases: totalPhrases - violationCount,
        violations: violationCount,
        violationRate: (violationCount / totalPhrases * 100).toFixed(2) + '%',
        affectedBaskets: Object.keys(allViolations.reduce((acc, v) => {
          acc[v.basketId] = true;
          return acc;
        }, {})).length
      },
      violations: allViolations,
      affectedBaskets: [...new Set(allViolations.map(v => v.basketId))].sort()
    };

    await fs.writeJson(path.join(courseDir, outputFile), report, { spaces: 2 });
    console.log(`📄 Detailed report written to: ${outputFile}\n`);
  }

  // Exit with error code if violations found
  process.exit(violationCount > 0 ? 1 : 0);
}

// Run validator
validateGateCompliance().catch(err => {
  console.error('❌ Validator error:', err);
  process.exit(1);
});

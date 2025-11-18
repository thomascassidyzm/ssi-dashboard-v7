#!/usr/bin/env node

/**
 * FD (Forward Determinism) Validator for Feeders
 *
 * Tests whether feeders can function as standalone teaching units.
 * A feeder MUST pass the FD test: known → target must be unambiguous.
 *
 * Usage: node scripts/validate-fd-feeders.cjs <course_code>
 * Example: node scripts/validate-fd-feeders.cjs ita_for_eng_10seeds
 */

const fs = require('fs-extra');
const path = require('path');

// FD violation patterns (language-agnostic where possible)
const FD_VIOLATION_PATTERNS = {
  // Italian-specific
  italian: {
    // Gender-marked articles (cannot pass FD standalone)
    articles: {
      pattern: /^(un|una|uno|il|lo|la|l'|i|gli|le)$/i,
      knownPatterns: [/^(a|an|the)$/i],
      reason: 'Gender-marked article without noun - ambiguous in English'
    },
    // Gender-marked adjectives without noun
    genderAdjectives: {
      pattern: /^(tutto|tutta|tutti|tutte|piccolo|piccola|nuovo|nuova)$/i,
      reason: 'Gender-marked adjective without noun - cannot determine form from English'
    },
    // Standalone fragments that need context
    fragments: {
      pattern: /^(po'|più)$/i,
      reason: 'Fragment that requires context (e.g., "un po\'", "il più")'
    }
  },

  // Spanish-specific
  spanish: {
    articles: {
      pattern: /^(un|una|unos|unas|el|la|los|las)$/i,
      knownPatterns: [/^(a|an|the)$/i],
      reason: 'Gender-marked article without noun - ambiguous in English'
    },
    genderAdjectives: {
      pattern: /^(todo|toda|todos|todas|pequeño|pequeña|nuevo|nueva)$/i,
      reason: 'Gender-marked adjective without noun'
    }
  },

  // French-specific
  french: {
    articles: {
      pattern: /^(un|une|le|la|l'|les|des)$/i,
      knownPatterns: [/^(a|an|the|some)$/i],
      reason: 'Gender-marked article without noun - ambiguous in English'
    },
    genderAdjectives: {
      pattern: /^(tout|toute|tous|toutes|petit|petite|nouveau|nouvelle)$/i,
      reason: 'Gender-marked adjective without noun'
    }
  }
};

/**
 * Detect language from course code
 */
function detectLanguage(courseCode) {
  if (courseCode.startsWith('ita_')) return 'italian';
  if (courseCode.startsWith('spa_')) return 'spanish';
  if (courseCode.startsWith('fra_')) return 'french';
  return 'unknown';
}

/**
 * Test if a feeder passes FD (Forward Determinism)
 *
 * FD test: Can a learner who knows the "known_chunk" reliably produce the "target_chunk"?
 * - If yes → FD PASSES → valid standalone LEGO
 * - If no → FD FAILS → should be componentization only, not a feeder
 */
function testFeederFD(feeder, language, seedContext) {
  const violations = [];
  const targetChunk = feeder[2]; // In compact format: [id, type, target, known, ...]
  const knownChunk = feeder[3];

  const langPatterns = FD_VIOLATION_PATTERNS[language];
  if (!langPatterns) {
    // Unknown language - can't apply specific patterns
    return { passes: true, violations: [] };
  }

  // Test against each pattern category
  for (const [category, config] of Object.entries(langPatterns)) {
    // Test target pattern
    if (config.pattern && config.pattern.test(targetChunk)) {
      // If there's a known pattern, check it matches
      if (config.knownPatterns) {
        const knownMatches = config.knownPatterns.some(p => p.test(knownChunk));
        if (knownMatches) {
          violations.push({
            category,
            reason: config.reason,
            example: `"${knownChunk}" → "${targetChunk}" (but could also be other forms)`
          });
        }
      } else {
        violations.push({
          category,
          reason: config.reason,
          example: `"${knownChunk}" → "${targetChunk}"`
        });
      }
    }
  }

  return {
    passes: violations.length === 0,
    violations
  };
}

/**
 * Validate all feeders in a course
 */
async function validateCourse(courseCode) {
  const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n🔍 Validating FD for feeders in: ${courseCode}`);
  console.log(`📁 Reading: ${legoPairsPath}\n`);

  if (!await fs.pathExists(legoPairsPath)) {
    console.error(`❌ File not found: ${legoPairsPath}`);
    process.exit(1);
  }

  const data = await fs.readJson(legoPairsPath);
  const language = detectLanguage(courseCode);

  console.log(`🌍 Detected language: ${language}\n`);

  const results = {
    totalFeeders: 0,
    violations: [],
    passes: []
  };

  // Scan all seeds
  for (const seed of data.seeds) {
    const seedId = seed[0];
    const seedPair = seed[1]; // [target, known]
    const legos = seed[2];

    // Extract feeders from each LEGO
    for (const lego of legos) {
      const legoId = lego[0];
      const legoType = lego[1];
      const feeders = lego[4]; // Feeders array (only exists for type "C")

      if (legoType === 'C' && feeders && feeders.length > 0) {
        for (const feeder of feeders) {
          results.totalFeeders++;

          const feederId = feeder[0];
          const feederType = feeder[1]; // Should be "F"
          const targetChunk = feeder[2];
          const knownChunk = feeder[3];

          const fdTest = testFeederFD(feeder, language, {
            seedId,
            seedPair,
            parentLego: legoId
          });

          if (fdTest.passes) {
            results.passes.push({
              feederId,
              targetChunk,
              knownChunk,
              seedId
            });
          } else {
            results.violations.push({
              feederId,
              targetChunk,
              knownChunk,
              seedId,
              parentLego: legoId,
              seedContext: `${seedPair[0]} / ${seedPair[1]}`,
              violations: fdTest.violations
            });
          }
        }
      }
    }
  }

  // Report results
  console.log(`\n${'='.repeat(80)}`);
  console.log('VALIDATION RESULTS');
  console.log(`${'='.repeat(80)}\n`);

  const passRate = results.totalFeeders > 0
    ? ((results.passes.length / results.totalFeeders) * 100).toFixed(1)
    : 0;

  console.log(`📊 Total feeders: ${results.totalFeeders}`);
  console.log(`✅ FD passes: ${results.passes.length}`);
  console.log(`❌ FD violations: ${results.violations.length}`);
  console.log(`📈 Pass rate: ${passRate}%\n`);

  if (results.violations.length > 0) {
    console.log(`${'='.repeat(80)}`);
    console.log('FD VIOLATIONS (Feeders that CANNOT work as standalone LEGOs)');
    console.log(`${'='.repeat(80)}\n`);

    for (const v of results.violations) {
      console.log(`❌ ${v.feederId}: "${v.targetChunk}" / "${v.knownChunk}"`);
      console.log(`   Seed: ${v.seedId} - ${v.seedContext}`);
      console.log(`   Parent LEGO: ${v.parentLego}`);

      for (const violation of v.violations) {
        console.log(`   ⚠️  ${violation.category}: ${violation.reason}`);
        console.log(`       ${violation.example}`);
      }
      console.log();
    }

    console.log(`${'='.repeat(80)}`);
    console.log('RECOMMENDED FIXES');
    console.log(`${'='.repeat(80)}\n`);

    console.log('These feeders should NOT be standalone LEGOs because learners cannot');
    console.log('reliably produce the target language from the known language.');
    console.log();
    console.log('OPTIONS:');
    console.log('1. Remove these feeders entirely (keep parent COMPOSITE as BASE)');
    console.log('2. Keep for COMPONENTIZATION explanation only (not teaching units)');
    console.log('3. CHUNK UP to include context (e.g., "un po\'" not "un" alone)');
    console.log();
  }

  if (results.passes.length > 0 && results.violations.length === 0) {
    console.log(`✅ ALL FEEDERS PASS FD TEST - Course is FD-compliant!\n`);
  }

  return {
    valid: results.violations.length === 0,
    passRate: parseFloat(passRate),
    violations: results.violations
  };
}

// Run if called directly
if (require.main === module) {
  const courseCode = process.argv[2];

  if (!courseCode) {
    console.error('Usage: node scripts/validate-fd-feeders.cjs <course_code>');
    console.error('Example: node scripts/validate-fd-feeders.cjs ita_for_eng_10seeds');
    process.exit(1);
  }

  validateCourse(courseCode)
    .then(results => {
      process.exit(results.valid ? 0 : 1);
    })
    .catch(err => {
      console.error('Validation error:', err);
      process.exit(1);
    });
}

module.exports = { validateCourse, testFeederFD };

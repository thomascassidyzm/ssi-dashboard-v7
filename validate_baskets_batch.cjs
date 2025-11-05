#!/usr/bin/env node
/**
 * Batch LEGO Basket Validator
 *
 * Validates all LEGOs across multiple seeds in parallel.
 * Generates a summary report of all GATE violations and issues.
 *
 * Usage:
 *   node validate_baskets_batch.cjs S0001-S0020        # Range
 *   node validate_baskets_batch.cjs S0001 S0005 S0010  # Specific seeds
 *   node validate_baskets_batch.cjs --all              # All seeds
 */

const fs = require('fs');
const path = require('path');

// Load extraction map for GATE checking
const EXTRACTION_MAP_PATH = path.join(__dirname, 'claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json');
const BASKETS_DIR = path.join(__dirname, 'public/baskets');
const extractionMap = JSON.parse(fs.readFileSync(EXTRACTION_MAP_PATH, 'utf8'));

/**
 * Build vocabulary available at a specific LEGO
 */
function getAvailableVocabulary(legoId) {
  const vocab = new Set();
  let found = false;

  for (const seedKey of Object.keys(extractionMap).filter(k => k.startsWith('S')).sort()) {
    const seed = extractionMap[seedKey];
    const legos = seed.legos || [];

    for (const lego of legos) {
      if (lego.id === legoId) {
        found = true;
        break;
      }

      const words = lego.lego[1].toLowerCase()
        .replace(/[¿?¡!.,]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0);
      words.forEach(w => vocab.add(w));
    }

    if (found) break;
  }

  return vocab;
}

/**
 * Common Spanish verb conjugations we allow if root is taught
 */
const ALLOWED_CONJUGATIONS = {
  'quiero': ['quieres', 'quiere', 'queremos', 'quieren'],
  'hablo': ['hablas', 'habla', 'hablamos', 'hablan'],
  'estoy': ['estás', 'está', 'estamos', 'están'],
  'voy': ['vas', 'va', 'vamos', 'van'],
  'puedo': ['puedes', 'puede', 'podemos', 'pueden', 'poder'],
  'intento': ['intentas', 'intenta', 'intentamos', 'intentan', 'intentando'],
  'aprendo': ['aprendes', 'aprende', 'aprendemos', 'aprenden', 'aprender'],
  'recuerdo': ['recuerdas', 'recuerda', 'recordamos', 'recuerdan', 'recordar'],
  'explico': ['explicas', 'explica', 'explicamos', 'explican', 'explicar'],
  'seguro': ['segura', 'seguros', 'seguras'],
  'tengo': ['tienes', 'tiene', 'tenemos', 'tienen', 'tener'],
  'hago': ['haces', 'hace', 'hacemos', 'hacen', 'hacer'],
  'digo': ['dices', 'dice', 'decimos', 'dicen', 'decir']
};

/**
 * Check if a word is an allowed conjugation of a taught verb
 */
function isAllowedConjugation(word, vocab) {
  for (const [root, conjugations] of Object.entries(ALLOWED_CONJUGATIONS)) {
    if (conjugations.includes(word)) {
      if (vocab.has(root) || vocab.has(root + 'r')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validate a phrase for GATE compliance
 */
function validatePhrase(phrase, vocab, currentLego) {
  const [known, target, pattern, legoCount] = phrase;

  // Add current LEGO to vocabulary
  const currentWords = currentLego.toLowerCase()
    .replace(/[¿?¡!.,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
  const fullVocab = new Set([...vocab, ...currentWords]);

  // Extract words from target phrase
  const targetWords = target.toLowerCase()
    .replace(/[¿?¡!.,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];

  for (const word of targetWords) {
    if (fullVocab.has(word)) {
      continue;
    }

    if (isAllowedConjugation(word, fullVocab)) {
      continue;
    }

    // Common contractions and articles
    if (['al', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'a', 'en', 'con', 'por', 'para', 'y', 'o', 'pero'].includes(word)) {
      continue;
    }

    violations.push(word);
  }

  return {
    pass: violations.length === 0,
    violations
  };
}

/**
 * Detect potential grammatical issues
 */
function detectGrammaticalIssues(phrase) {
  const [known, target] = phrase;
  const issues = [];

  // Check for double gerund (intentando aprendiendo)
  if (target.match(/ando\s+\w*iendo|iendo\s+\w*ando/)) {
    issues.push('Double gerund');
  }

  // Check for awkward English
  if (known.includes('ing ing') || known.match(/to\s+to/)) {
    issues.push('Awkward English');
  }

  // Check for very long phrases (might be too complex)
  if (target.split(/\s+/).length > 15) {
    issues.push('Very long phrase (>15 words)');
  }

  return issues;
}

/**
 * Validate a single LEGO
 */
function validateLego(seedId, legoId, basket) {
  const legoData = basket[legoId];
  if (!legoData) {
    return null;
  }

  const phrases = legoData.practice_phrases || [];
  const currentLego = legoData.lego[1]; // Target language
  const vocab = getAvailableVocabulary(legoId);

  const results = {
    legoId,
    seedId,
    totalPhrases: phrases.length,
    passedPhrases: 0,
    failedPhrases: 0,
    violations: [],
    grammarIssues: []
  };

  for (const phrase of phrases) {
    const gateResult = validatePhrase(phrase, vocab, currentLego);
    const grammarIssues = detectGrammaticalIssues(phrase);

    const pass = gateResult.pass && grammarIssues.length === 0;

    if (pass) {
      results.passedPhrases++;
    } else {
      results.failedPhrases++;

      if (!gateResult.pass) {
        results.violations.push({
          phrase: phrase[0],
          target: phrase[1],
          words: gateResult.violations
        });
      }

      if (grammarIssues.length > 0) {
        results.grammarIssues.push({
          phrase: phrase[0],
          issues: grammarIssues
        });
      }
    }
  }

  return results;
}

/**
 * Validate an entire seed
 */
function validateSeed(seedId) {
  const basketPath = path.join(BASKETS_DIR, `lego_baskets_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(basketPath)) {
    return { error: `Basket not found: ${seedId}` };
  }

  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seed = extractionMap[seedId];

  if (!seed) {
    return { error: `Seed not found in extraction map: ${seedId}` };
  }

  const results = {
    seedId,
    legos: [],
    totalPhrases: 0,
    passedPhrases: 0,
    failedPhrases: 0
  };

  for (const lego of seed.legos) {
    const legoResult = validateLego(seedId, lego.id, basket);
    if (legoResult) {
      results.legos.push(legoResult);
      results.totalPhrases += legoResult.totalPhrases;
      results.passedPhrases += legoResult.passedPhrases;
      results.failedPhrases += legoResult.failedPhrases;
    }
  }

  return results;
}

/**
 * Parse seed IDs from command line arguments
 */
function parseSeedIds(args) {
  if (args.includes('--all')) {
    // Get all seeds from extraction map
    return Object.keys(extractionMap).filter(k => k.startsWith('S')).sort();
  }

  const seedIds = [];

  for (const arg of args) {
    if (arg.includes('-')) {
      // Range: S0001-S0020
      const [start, end] = arg.split('-');
      const startNum = parseInt(start.replace('S', ''));
      const endNum = parseInt(end.replace('S', ''));

      for (let i = startNum; i <= endNum; i++) {
        seedIds.push(`S${String(i).padStart(4, '0')}`);
      }
    } else {
      // Single seed
      seedIds.push(arg);
    }
  }

  return seedIds;
}

/**
 * Print summary report
 */
function printSummary(allResults) {
  console.log('\n' + '='.repeat(70));
  console.log('BATCH VALIDATION SUMMARY');
  console.log('='.repeat(70));

  let totalSeeds = allResults.length;
  let totalLegos = 0;
  let totalPhrases = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let seedsWithIssues = 0;

  const allViolations = new Map(); // word -> count
  const problemSeeds = [];

  for (const result of allResults) {
    if (result.error) continue;

    totalLegos += result.legos.length;
    totalPhrases += result.totalPhrases;
    totalPassed += result.passedPhrases;
    totalFailed += result.failedPhrases;

    if (result.failedPhrases > 0) {
      seedsWithIssues++;
      problemSeeds.push(result);

      // Collect violations
      for (const lego of result.legos) {
        for (const violation of lego.violations) {
          for (const word of violation.words) {
            allViolations.set(word, (allViolations.get(word) || 0) + 1);
          }
        }
      }
    }
  }

  console.log(`\nTotal seeds validated: ${totalSeeds}`);
  console.log(`Total LEGOs validated: ${totalLegos}`);
  console.log(`Total phrases checked: ${totalPhrases}`);
  console.log(`\n✓ Passed: ${totalPassed} (${Math.round(totalPassed / totalPhrases * 100)}%)`);
  console.log(`❌ Failed: ${totalFailed} (${Math.round(totalFailed / totalPhrases * 100)}%)`);
  console.log(`\nSeeds with issues: ${seedsWithIssues}/${totalSeeds}`);

  if (totalFailed === 0) {
    console.log('\n🎉 All phrases passed validation! No GATE violations or grammar issues.');
    return;
  }

  // Show most common violations
  console.log('\n' + '='.repeat(70));
  console.log('MOST COMMON GATE VIOLATIONS');
  console.log('='.repeat(70));

  const sortedViolations = Array.from(allViolations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [word, count] of sortedViolations) {
    console.log(`  ${word}: ${count} occurrence(s)`);
  }

  // Show problem seeds
  console.log('\n' + '='.repeat(70));
  console.log('SEEDS WITH ISSUES');
  console.log('='.repeat(70));

  for (const result of problemSeeds) {
    console.log(`\n${result.seedId}: ${result.failedPhrases}/${result.totalPhrases} phrases failed`);

    for (const lego of result.legos) {
      if (lego.violations.length > 0 || lego.grammarIssues.length > 0) {
        console.log(`  ${lego.legoId}:`);

        for (const violation of lego.violations) {
          console.log(`    ❌ "${violation.phrase}"`);
          console.log(`       GATE violations: ${violation.words.join(', ')}`);
        }

        for (const issue of lego.grammarIssues) {
          console.log(`    ⚠️  "${issue.phrase}"`);
          console.log(`       Grammar issues: ${issue.issues.join(', ')}`);
        }
      }
    }
  }
}

/**
 * Print brief status
 */
function printBriefStatus(allResults) {
  console.log('\nValidation Status:');
  for (const result of allResults) {
    if (result.error) {
      console.log(`  ${result.seedId || '???'}: ❌ ${result.error}`);
    } else {
      const status = result.failedPhrases === 0 ? '✓' : '❌';
      console.log(`  ${result.seedId}: ${status} ${result.passedPhrases}/${result.totalPhrases} passed`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Batch LEGO Basket Validator');
    console.log('Validates all LEGOs across multiple seeds in parallel\n');
    console.log('Usage:');
    console.log('  node validate_baskets_batch.cjs S0001-S0020        # Range');
    console.log('  node validate_baskets_batch.cjs S0001 S0005 S0010  # Specific seeds');
    console.log('  node validate_baskets_batch.cjs --all              # All seeds');
    console.log('\nOptions:');
    console.log('  --brief    Show brief status only (no detailed violations)');
    process.exit(1);
  }

  const brief = args.includes('--brief');
  const seedArgs = args.filter(a => a !== '--brief');
  const seedIds = parseSeedIds(seedArgs);

  console.log(`Validating ${seedIds.length} seeds: ${seedIds.join(', ')}`);
  console.log('Processing in parallel...\n');

  // Validate all seeds in parallel
  const results = await Promise.all(
    seedIds.map(seedId => Promise.resolve(validateSeed(seedId)))
  );

  // Print results
  if (brief) {
    printBriefStatus(results);
  } else {
    printSummary(results);
  }

  // Exit code based on results
  const hasFailures = results.some(r => !r.error && r.failedPhrases > 0);
  process.exit(hasFailures ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { validateSeed, validateLego };

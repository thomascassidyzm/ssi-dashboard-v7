#!/usr/bin/env node
/**
 * LEGO Basket Phrase Validator
 *
 * For the over-booking strategy: Hand-craft 13-15 high-quality phrases,
 * then validate them to find GATE violations and awkward constructions.
 *
 * This tool helps you filter down to the best 10 phrases.
 */

const fs = require('fs');
const path = require('path');

// Load extraction map for GATE checking
const EXTRACTION_MAP_PATH = path.join(__dirname, 'claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json');
const extractionMap = JSON.parse(fs.readFileSync(EXTRACTION_MAP_PATH, 'utf8'));

/**
 * Build vocabulary available at a specific LEGO
 */
function getAvailableVocabulary(legoId) {
  const vocab = new Set();
  let found = false;

  // Iterate through seeds in order
  for (const seedKey of Object.keys(extractionMap).filter(k => k.startsWith('S')).sort()) {
    const seed = extractionMap[seedKey];
    const legos = seed.legos || [];

    for (const lego of legos) {
      // Stop when we reach the target LEGO
      if (lego.id === legoId) {
        found = true;
        break;
      }

      // Add words from this LEGO
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
  'seguro': ['segura', 'seguros', 'seguras']
};

/**
 * Check if a word is an allowed conjugation of a taught verb
 */
function isAllowedConjugation(word, vocab) {
  for (const [root, conjugations] of Object.entries(ALLOWED_CONJUGATIONS)) {
    if (conjugations.includes(word)) {
      // Check if root form is in vocabulary
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
    // Check if word is in vocabulary
    if (fullVocab.has(word)) {
      continue;
    }

    // Check if it's an allowed conjugation
    if (isAllowedConjugation(word, fullVocab)) {
      continue;
    }

    // Check for common contractions (al, del, etc)
    if (['al', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'a', 'en', 'con', 'por', 'para'].includes(word)) {
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
    issues.push('Double gerund detected');
  }

  // Check for missing articles before nouns (heuristic)
  if (target.match(/quiero\s+oración|necesito\s+tiempo/)) {
    issues.push('Possible missing article');
  }

  // Check for awkward English
  if (known.includes('ing ing') || known.match(/to\s+to/)) {
    issues.push('Awkward English construction');
  }

  // Check for very long phrases (might be too complex)
  if (target.split(/\s+/).length > 12) {
    issues.push('Very long phrase (>12 words) - consider simplifying');
  }

  return issues;
}

/**
 * Validate all phrases in a basket
 */
function validateBasket(basketPath, legoId) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Validating basket: ${path.basename(basketPath)}`);
  console.log(`LEGO: ${legoId}`);
  console.log('='.repeat(70));

  // Load basket
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const legoData = basket[legoId];

  if (!legoData) {
    console.error(`❌ LEGO ${legoId} not found in basket`);
    return;
  }

  const phrases = legoData.practice_phrases || [];
  const currentLego = legoData.lego[1]; // Target language

  console.log(`\nCurrent LEGO: "${legoData.lego[0]}" → "${legoData.lego[1]}"`);
  console.log(`Available LEGOs: ${legoData.available_legos}`);
  console.log(`Total phrases: ${phrases.length}\n`);

  // Get vocabulary
  const vocab = getAvailableVocabulary(legoId);
  console.log(`Vocabulary size: ${vocab.size} words\n`);

  // Validate each phrase
  const results = [];
  let passCount = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const gateResult = validatePhrase(phrase, vocab, currentLego);
    const grammarIssues = detectGrammaticalIssues(phrase);

    const status = gateResult.pass && grammarIssues.length === 0 ? '✓' : '❌';
    const pass = gateResult.pass && grammarIssues.length === 0;

    if (pass) passCount++;

    console.log(`\n[${i + 1}] ${status} "${phrase[0]}" → "${phrase[1]}"`);

    if (!gateResult.pass) {
      console.log(`    ❌ GATE VIOLATIONS: ${gateResult.violations.join(', ')}`);
    }

    if (grammarIssues.length > 0) {
      console.log(`    ⚠️  GRAMMAR: ${grammarIssues.join(', ')}`);
    }

    if (pass) {
      console.log(`    ✓ PASS - Keep this phrase`);
    }

    results.push({
      phrase,
      pass,
      gateViolations: gateResult.violations,
      grammarIssues
    });
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VALIDATION SUMMARY`);
  console.log('='.repeat(70));
  console.log(`Total phrases: ${phrases.length}`);
  console.log(`✓ Passed: ${passCount}`);
  console.log(`❌ Failed: ${phrases.length - passCount}`);
  console.log(`\nRecommendation: ${passCount >= 10 ? '✓ Good to go!' : '⚠️  Need more valid phrases'}`);

  return results;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('LEGO Basket Phrase Validator');
    console.log('For over-booking strategy: Validate 13-15 phrases, keep best 10');
    console.log('');
    console.log('Usage: node validate_basket_phrases.cjs <basket_file> <lego_id>');
    console.log('');
    console.log('Examples:');
    console.log('  node validate_basket_phrases.cjs public/baskets/lego_baskets_s0010.json S0010L05');
    console.log('  node validate_basket_phrases.cjs public/baskets/lego_baskets_s0015.json S0015L03');
    process.exit(1);
  }

  const [basketPath, legoId] = args;

  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const results = validateBasket(basketPath, legoId);

  // Show which phrases to keep
  console.log(`\n${'='.repeat(70)}`);
  console.log('PHRASES TO KEEP (for final basket):');
  console.log('='.repeat(70));

  const passing = results.filter(r => r.pass);
  passing.forEach((r, i) => {
    const phrase = r.phrase;
    console.log(`${i + 1}. "${phrase[0]}" → "${phrase[1]}" [${phrase[2] || 'null'}]`);
  });

  if (passing.length > 10) {
    console.log(`\n⚠️  You have ${passing.length} valid phrases. Consider selecting the best 10 for variety.`);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateBasket, validatePhrase };

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 5: GATE Validator - Vocabulary Compliance Checker
 *
 * Validates that ALL Spanish words in practice phrases are available from:
 * 1. Recent seed pairs vocabulary (all words from Spanish sentences)
 * 2. Current seed LEGOs available (LEGOs taught earlier in this seed)
 * 3. Current LEGO being taught
 *
 * Usage: node phase5_gate_validator.cjs <course_path>
 * Example: node phase5_gate_validator.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase5_gate_validator.cjs <course_path>');
  console.error('Example: node phase5_gate_validator.cjs public/vfs/courses/spa_for_eng_s0001-0100');
  process.exit(1);
}

// Resolve paths
const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const outputDir = path.join(fullCoursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(fullCoursePath)) {
  console.error(`❌ Error: Course directory not found: ${fullCoursePath}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  console.error(`❌ Error: phase5_outputs directory not found: ${outputDir}`);
  process.exit(1);
}

console.log('🚪 GATE Validator: Vocabulary Compliance Checker');
console.log(`📁 Course: ${coursePath}\n`);

/**
 * Extract all vocabulary from a basket
 *
 * With sliding window v6.0: If a word appears in ANY of the recent_seed_pairs,
 * it's available. Plus current seed LEGOs and current LEGO.
 */
function extractAvailableVocabulary(basket, legoId) {
  const availableWords = new Set();

  // 1. Extract ALL words from recent_seed_pairs (sliding window)
  //    If "ahora" appears in S0001, it's available for all subsequent seeds in the window
  if (basket.recent_seed_pairs) {
    Object.values(basket.recent_seed_pairs).forEach(([spanish, english]) => {
      // Split and normalize Spanish words
      spanish.split(/\s+/).forEach(word => {
        // Remove punctuation and normalize
        const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
        if (normalized) availableWords.add(normalized);
      });
    });
  }

  // 2. Extract words from current_seed_legos_available (within this seed)
  const currentLego = basket.legos[legoId];
  if (currentLego.current_seed_legos_available) {
    currentLego.current_seed_legos_available.forEach(([english, spanish]) => {
      spanish.split(/\s+/).forEach(word => {
        const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
        if (normalized) availableWords.add(normalized);
      });
    });
  }

  // 3. Add current LEGO words
  const [english, spanish] = currentLego.lego;
  spanish.split(/\s+/).forEach(word => {
    const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
    if (normalized) availableWords.add(normalized);
  });

  return availableWords;
}

/**
 * Validate a single basket
 */
function validateBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;

  console.log(`\n📦 Validating ${seedId}...`);

  let totalViolations = 0;
  let totalPhrases = 0;
  let violationsPerLego = {};

  for (const [legoId, legoData] of Object.entries(basket.legos)) {
    const availableWords = extractAvailableVocabulary(basket, legoId);
    const violations = [];

    legoData.practice_phrases.forEach((phrase, idx) => {
      totalPhrases++;
      const [english, spanish] = phrase;

      // Normalize Spanish words the same way we normalized available words
      const spanishWords = spanish
        .split(/\s+/)
        .map(w => w.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, ''))
        .filter(Boolean);

      const unavailableWords = spanishWords.filter(word => !availableWords.has(word));

      if (unavailableWords.length > 0) {
        violations.push({
          phrase: spanish,
          english,
          unavailable: unavailableWords,
        });
        totalViolations++;
      }
    });

    if (violations.length > 0) {
      violationsPerLego[legoId] = violations;
      console.log(`   ❌ ${legoId}: ${violations.length} violation(s)`);
      violations.forEach(v => {
        console.log(`      "${v.english}" / "${v.phrase}"`);
        console.log(`      → Unavailable: ${v.unavailable.join(', ')}`);
      });
    } else {
      console.log(`   ✅ ${legoId}: All phrases valid`);
    }
  }

  console.log(`\n   📊 ${seedId} Summary:`);
  console.log(`      Total phrases: ${totalPhrases}`);
  console.log(`      Violations: ${totalViolations}`);
  console.log(`      Compliance: ${Math.round(((totalPhrases - totalViolations) / totalPhrases) * 100)}%`);

  return {
    seedId,
    totalPhrases,
    violations: totalViolations,
    violationsPerLego,
  };
}

/**
 * Main function
 */
function main() {
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .map(f => path.join(outputDir, f));

  console.log(`Found ${basketFiles.length} baskets to validate\n`);

  const results = [];

  for (const basketPath of basketFiles) {
    try {
      const result = validateBasket(basketPath);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error validating ${basketPath}: ${error.message}`);
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY\n');
  console.log('='.repeat(60));

  const totals = results.reduce((acc, r) => ({
    phrases: acc.phrases + r.totalPhrases,
    violations: acc.violations + r.violations,
  }), { phrases: 0, violations: 0 });

  console.log(`Total phrases validated: ${totals.phrases}`);
  console.log(`Total violations:        ${totals.violations}`);
  console.log(`Overall compliance:      ${Math.round(((totals.phrases - totals.violations) / totals.phrases) * 100)}%`);

  if (totals.violations === 0) {
    console.log('\n✅ 100% GATE COMPLIANCE - All phrases use only available vocabulary!');
  } else {
    console.log(`\n⚠️  ${totals.violations} phrases use unavailable vocabulary`);

    const violatedSeeds = results.filter(r => r.violations > 0);
    console.log(`\nSeeds with violations:`);
    violatedSeeds.forEach(r => {
      console.log(`   ${r.seedId}: ${r.violations} violation(s)`);
    });
  }

  console.log('\n🚪 GATE validation complete!');
}

main();

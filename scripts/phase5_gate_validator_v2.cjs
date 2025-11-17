#!/usr/bin/env node

/**
 * Phase 5 GATE Validator v2 - Simple & Language-Agnostic
 *
 * Core Question: For every practice phrase, have all its tokens been taught?
 *
 * Tokenization:
 * - Chinese (CJK): Individual characters
 * - Other languages: Whitespace-separated words
 *
 * Usage: node scripts/phase5_gate_validator_v2.cjs <course_code>
 * Example: node scripts/phase5_gate_validator_v2.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Usage: node phase5_gate_validator_v2.cjs <course_code>');
  console.error('Example: node scripts/phase5_gate_validator_v2.cjs cmn_for_eng');
  process.exit(1);
}

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

if (!fs.existsSync(phase5OutputsDir)) {
  console.error(`❌ phase5_outputs directory not found: ${phase5OutputsDir}`);
  process.exit(1);
}

console.log('🚪 GATE Validator v2 - Simple & Language-Agnostic');
console.log(`📁 Course: ${courseCode}\n`);

// ============================================================================
// TOKENIZATION
// ============================================================================

function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function tokenize(text) {
  if (!text) return [];

  if (isChinese(text)) {
    // Chinese: Extract individual CJK characters
    return text.split('').filter(char => /[\u4e00-\u9fff]/.test(char));
  } else {
    // Space-separated: Extract words, normalize, remove punctuation
    return text.toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[.,!?¿¡;:'"()]/g, ''))
      .filter(word => word.length > 0);
  }
}

// ============================================================================
// BUILD VOCABULARY REGISTRY (What has been taught by each seed?)
// ============================================================================

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const targetLanguage = legoPairs.seeds.length > 0 && legoPairs.seeds[0].seed_pair
  ? (isChinese(legoPairs.seeds[0].seed_pair[1]) ? 'Chinese (character-based)' : 'Space-separated (word-based)')
  : 'Unknown';

console.log(`📝 Target language: ${targetLanguage}`);
console.log();

// vocabularyBySeed[seedNum] = Set of all tokens available up to and including that seed
const vocabularyBySeed = {};

legoPairs.seeds.forEach(seed => {
  const seedNum = parseInt(seed.seed_id.substring(1));

  // Start with vocabulary from all previous seeds
  const availableTokens = new Set();
  for (let i = 1; i < seedNum; i++) {
    if (vocabularyBySeed[i]) {
      vocabularyBySeed[i].forEach(token => availableTokens.add(token));
    }
  }

  // Add tokens from this seed's sentence
  const targetSentence = seed.seed_pair[1]; // [known, target]
  const sentenceTokens = tokenize(targetSentence);
  sentenceTokens.forEach(token => availableTokens.add(token));

  // Add tokens from this seed's LEGOs
  seed.legos.forEach(lego => {
    const legoTokens = tokenize(lego.target);
    legoTokens.forEach(token => availableTokens.add(token));

    // Also add component tokens if present
    if (lego.components) {
      lego.components.forEach(([target, known]) => {
        if (target) {
          const componentTokens = tokenize(target);
          componentTokens.forEach(token => availableTokens.add(token));
        }
      });
    }
  });

  vocabularyBySeed[seedNum] = availableTokens;
});

console.log(`✅ Built vocabulary registry for ${Object.keys(vocabularyBySeed).length} seeds`);
console.log();

// ============================================================================
// VALIDATE BASKETS
// ============================================================================

const basketFiles = fs.readdirSync(phase5OutputsDir)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
  .sort();

console.log(`📦 Found ${basketFiles.length} basket files to validate\n`);

let totalPhrases = 0;
let totalViolations = 0;
const violationsBySeed = {};

basketFiles.forEach(filename => {
  const seedMatch = filename.match(/seed_S(\d{4})_baskets\.json/);
  if (!seedMatch) return;

  const seedNum = parseInt(seedMatch[1]);
  const basketPath = path.join(phase5OutputsDir, filename);

  try {
    const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
    const availableVocab = vocabularyBySeed[seedNum];

    if (!availableVocab) {
      console.log(`⚠️  S${String(seedNum).padStart(4, '0')}: No vocabulary registry found, skipping`);
      return;
    }

    const seedViolations = [];

    // Check each LEGO's practice phrases
    Object.entries(basketData).forEach(([legoId, legoData]) => {
      if (!legoData.practice_phrases) return;

      legoData.practice_phrases.forEach((phrase, idx) => {
        totalPhrases++;

        // Phrase format: [known, target, metadata, complexity]
        const targetPhrase = Array.isArray(phrase) ? phrase[1] : phrase;
        if (!targetPhrase) return;

        const phraseTokens = tokenize(targetPhrase);
        const unavailableTokens = [];

        phraseTokens.forEach(token => {
          if (!availableVocab.has(token)) {
            unavailableTokens.push(token);
          }
        });

        if (unavailableTokens.length > 0) {
          totalViolations++;
          seedViolations.push({
            lego: legoId,
            phrase_index: idx + 1,
            phrase: targetPhrase,
            unavailable: [...new Set(unavailableTokens)]
          });
        }
      });
    });

    if (seedViolations.length > 0) {
      violationsBySeed[seedNum] = seedViolations;
      console.log(`❌ S${String(seedNum).padStart(4, '0')}: ${seedViolations.length} violations`);
    } else {
      console.log(`✅ S${String(seedNum).padStart(4, '0')}: All phrases valid`);
    }

  } catch (error) {
    console.log(`❌ S${String(seedNum).padStart(4, '0')}: Error - ${error.message}`);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log();
console.log('═'.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('═'.repeat(60));
console.log();
console.log(`Total phrases validated:  ${totalPhrases}`);
console.log(`Total violations found:   ${totalViolations}`);
console.log(`Compliance rate:          ${((totalPhrases - totalViolations) / totalPhrases * 100).toFixed(1)}%`);
console.log();

if (totalViolations > 0) {
  console.log('Seeds with violations:');
  Object.entries(violationsBySeed).forEach(([seedNum, violations]) => {
    console.log(`\n  S${String(seedNum).padStart(4, '0')} - ${violations.length} violations:`);
    violations.slice(0, 3).forEach(v => {
      console.log(`    ${v.lego} phrase ${v.phrase_index}: "${v.phrase}"`);
      console.log(`      Unavailable: ${v.unavailable.join(', ')}`);
    });
    if (violations.length > 3) {
      console.log(`    ... and ${violations.length - 3} more`);
    }
  });
  console.log();

  // Save violations report
  const reportPath = path.join(coursePath, 'phase5_gate_violations.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    course: courseCode,
    timestamp: new Date().toISOString(),
    total_phrases: totalPhrases,
    total_violations: totalViolations,
    compliance_rate: ((totalPhrases - totalViolations) / totalPhrases * 100).toFixed(1) + '%',
    violations_by_seed: violationsBySeed
  }, null, 2));

  console.log(`📄 Detailed report saved: ${reportPath}`);
  console.log();
  process.exit(1);
} else {
  console.log('✅ 100% GATE COMPLIANCE - All phrases use only previously taught vocabulary!');
  console.log();
  process.exit(0);
}

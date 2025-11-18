#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Manual GATE Review for First 100 Seeds
 *
 * Performs detailed, high-quality GATE validation checking:
 * 1. All Spanish words must be from recent_context OR current seed LEGOs OR M-LEGO components
 * 2. Words from M-LEGO components ARE available (this is the key fix)
 * 3. Generate detailed, actionable report
 */

const COURSE_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng');
const LEGO_PAIRS_PATH = path.join(COURSE_DIR, 'lego_pairs.json');
const PHASE5_DIR = path.join(COURSE_DIR, 'phase5_outputs');

console.log('🔍 Manual GATE Review: First 100 Seeds (HIGH QUALITY)\n');

// Load lego_pairs to understand component structure
const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

// Build comprehensive vocabulary map for each seed
function buildVocabularyForSeed(seedNum, seedData) {
  const vocab = new Set();

  // 1. Add words from recent_context (previous seeds)
  if (seedData.recent_context) {
    for (const [contextSeedId, contextData] of Object.entries(seedData.recent_context)) {
      if (Array.isArray(contextData) && contextData.length >= 1) {
        // Format: [spanish "word | phrase | word", english "word | phrase | word"]
        const spanishPhrases = contextData[0]; // Spanish is FIRST element
        if (spanishPhrases) {
          // Split by pipe to get individual phrases/words
          const phrases = spanishPhrases.split('|').map(p => p.trim()).filter(p => p);
          // Extract all words from all phrases
          for (const phrase of phrases) {
            const words = phrase.split(/\s+/).filter(w => w.trim());
            words.forEach(w => vocab.add(w.toLowerCase()));
          }
        }
      }
    }
  }

  // 2. Add words from current seed's LEGOs (from lego_pairs.json)
  const seedInfo = legoPairs.seeds.find(s => s.seed_id === `S${String(seedNum).padStart(4, '0')}`);

  if (seedInfo) {
    for (const lego of seedInfo.legos) {
      // Add the LEGO's target word(s)
      const words = lego.target.split(/\s+/).filter(w => w.trim());
      words.forEach(w => vocab.add(w.toLowerCase()));

      // CRITICAL: Add M-LEGO component words
      if (lego.components && Array.isArray(lego.components)) {
        for (const [spanishComponent, englishComponent] of lego.components) {
          const componentWords = spanishComponent.split(/\s+/).filter(w => w.trim());
          componentWords.forEach(w => vocab.add(w.toLowerCase()));
        }
      }
    }
  }

  return vocab;
}

// Extract Spanish words from a phrase
function extractSpanishWords(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];

  // Remove punctuation and split
  const cleaned = phrase.replace(/[.,!?¿¡]/g, '');
  return cleaned.split(/\s+/).filter(w => w.trim()).map(w => w.toLowerCase());
}

// Main validation
const report = {
  timestamp: new Date().toISOString(),
  range: 'S0001-S0100',
  total_seeds_reviewed: 0,
  seeds_with_violations: 0,
  total_violations: 0,
  violation_details: []
};

for (let seedNum = 1; seedNum <= 100; seedNum++) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const filePath = path.join(PHASE5_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⊘ ${seedId}: No basket (skipping)`);
    continue;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    report.total_seeds_reviewed++;

    // Build comprehensive vocabulary for this seed
    const availableVocab = buildVocabularyForSeed(seedNum, data);

    const seedViolations = [];

    if (data.legos) {
      for (const [legoId, lego] of Object.entries(data.legos)) {
        if (!lego.practice_phrases || !Array.isArray(lego.practice_phrases)) continue;

        // Add words from this LEGO itself to available vocab
        const legoWords = extractSpanishWords(lego.lego ? lego.lego[1] : '');
        legoWords.forEach(w => availableVocab.add(w));

        // Check each phrase
        for (let i = 0; i < lego.practice_phrases.length; i++) {
          const [english, spanish] = lego.practice_phrases[i];

          if (!spanish) continue;

          const phraseWords = extractSpanishWords(spanish);
          const unavailable = [];

          for (const word of phraseWords) {
            if (!availableVocab.has(word)) {
              unavailable.push(word);
            }
          }

          if (unavailable.length > 0) {
            seedViolations.push({
              lego_id: legoId,
              phrase_index: i,
              english,
              spanish,
              unavailable_words: unavailable,
              available_vocab_count: availableVocab.size
            });
            report.total_violations++;
          }
        }
      }
    }

    if (seedViolations.length > 0) {
      report.seeds_with_violations++;
      report.violation_details.push({
        seed_id: seedId,
        violation_count: seedViolations.length,
        violations: seedViolations
      });

      console.log(`❌ ${seedId}: ${seedViolations.length} violation(s)`);
    } else {
      console.log(`✅ ${seedId}: Clean`);
    }

  } catch (error) {
    console.error(`✗ Error processing ${seedId}:`, error.message);
  }
}

// Calculate statistics
report.compliance_percentage = report.total_seeds_reviewed > 0
  ? Math.round(((report.total_seeds_reviewed - report.seeds_with_violations) / report.total_seeds_reviewed) * 100)
  : 0;

// Output summary
console.log(`\n📊 Manual GATE Review Summary:`);
console.log(`   Seeds reviewed: ${report.total_seeds_reviewed}/100`);
console.log(`   Seeds with violations: ${report.seeds_with_violations}`);
console.log(`   Total violations: ${report.total_violations}`);
console.log(`   Compliance: ${report.compliance_percentage}%`);

// Save detailed report
const reportPath = path.join(COURSE_DIR, 'gate_review_first100_detailed.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n📄 Detailed report saved to: ${reportPath}`);

// Exit with error if violations found
if (report.total_violations > 0) {
  console.log(`\n⚠️  GATE violations found - first 100 seeds need fixing!`);
  process.exit(1);
} else {
  console.log(`\n✨ All clear! First 100 seeds are GATE compliant!`);
  process.exit(0);
}

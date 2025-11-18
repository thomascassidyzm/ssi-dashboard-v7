#!/usr/bin/env node

/**
 * Phase 5 Window Coverage Validator
 *
 * Validates that each LEGO basket uses at least 70% vocabulary from the sliding window
 * (recent_seed_pairs). This enforces proper spaced repetition and course coverage.
 */

const fs = require('fs');
const path = require('path');

function validateWindowCoverage(courseDir, minPercentage = 70) {
  console.log('🔍 Phase 5 Window Coverage Validator');
  console.log(`📁 Course: ${courseDir}`);
  console.log(`📊 Minimum required: ${minPercentage}% from sliding window\n`);

  // Read lego_pairs to build vocabulary registry
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  // Build vocabulary registry: word -> set of seeds where it appears IN SEED_PAIR
  // This represents what words appear in the complete sentences learners practice
  const vocabRegistry = {};

  legoPairs.seeds.forEach(seed => {
    // Use the complete seed_pair sentence (target language)
    const completeSentence = seed.seed_pair[0].toLowerCase();
    const spanishWords = completeSentence.split(/\s+/);

    spanishWords.forEach(word => {
      word = word.replace(/[.,!?¿¡]/g, '');
      if (!word) return;
      if (!vocabRegistry[word]) {
        vocabRegistry[word] = new Set();
      }
      vocabRegistry[word].add(seed.seed_id);
    });
  });

  // Validate each seed's phrase basket
  const outputDir = path.join(courseDir, 'phase5_outputs');
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .sort();

  let totalBaskets = 0;
  let passedBaskets = 0;
  let failedBaskets = 0;
  const failures = [];

  basketFiles.forEach(basketFile => {
    const basketPath = path.join(outputDir, basketFile);
    const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

    const seedId = basket.seed_id;
    const seedNum = parseInt(seedId.substring(1));

    // Determine expected sliding window (last 10 seeds)
    const windowStart = Math.max(1, seedNum - 10);
    const windowEnd = seedNum - 1;
    const expectedWindow = [];
    for (let i = windowStart; i <= windowEnd; i++) {
      expectedWindow.push(`S${String(i).padStart(4, '0')}`);
    }

    // Build set of NEW vocabulary introduced in this seed's LEGOs
    const newVocab = new Set();
    Object.values(basket.legos).forEach(lego => {
      // Add target words from LEGO
      const targetWords = lego.lego[1].toLowerCase().split(/\s+/);
      targetWords.forEach(word => {
        word = word.replace(/[.,!?¿¡]/g, '');
        if (word) newVocab.add(word);
      });

      // Add component words if M-type
      if (lego.components) {
        lego.components.forEach(([target, _known]) => {
          if (!target) return; // Skip null components
          const compWords = target.toLowerCase().split(/\s+/);
          compWords.forEach(word => {
            word = word.replace(/[.,!?¿¡]/g, '');
            if (word) newVocab.add(word);
          });
        });
      }
    });

    // Count vocabulary sources for all phrases (EXCLUDING new vocab from current seed)
    let totalWords = 0;
    let windowWords = 0;

    // Iterate through all LEGOs and their practice phrases
    Object.values(basket.legos).forEach(lego => {
      if (lego.practice_phrases) {
        lego.practice_phrases.forEach(phrase => {
          const spanish = phrase[1].toLowerCase();
          const words = spanish.split(/\s+/);

          words.forEach(word => {
            word = word.replace(/[.,!?¿¡]/g, '');
            if (!word) return;

            // SKIP words that are new vocabulary introduced in this seed's LEGOs
            if (newVocab.has(word)) return;

            totalWords++;
            const seedsWithWord = vocabRegistry[word];

            // Check if word appears in ANY seed within the expected window
            if (seedsWithWord) {
              const appearsInWindow = Array.from(seedsWithWord).some(seed =>
                expectedWindow.includes(seed)
              );
              if (appearsInWindow) {
                windowWords++;
              }
            }
          });
        });
      }
    });

    const windowPercentage = totalWords > 0 ? ((windowWords / totalWords) * 100).toFixed(1) : 0;
    const passed = parseFloat(windowPercentage) >= minPercentage;

    totalBaskets++;
    if (passed) {
      passedBaskets++;
      console.log(`✅ ${seedId}: ${windowPercentage}% from window (${windowWords}/${totalWords} words)`);
    } else {
      failedBaskets++;
      console.log(`❌ ${seedId}: ${windowPercentage}% from window (${windowWords}/${totalWords} words) - BELOW ${minPercentage}%`);
      failures.push({
        seedId,
        windowPercentage: parseFloat(windowPercentage),
        windowWords,
        totalWords,
        expectedWindow
      });
    }
  });

  // Summary
  console.log('\n📊 VALIDATION SUMMARY\n');
  console.log('============================================================');
  console.log(`Total baskets validated: ${totalBaskets}`);
  console.log(`Passed (≥${minPercentage}%): ${passedBaskets}`);
  console.log(`Failed (<${minPercentage}%): ${failedBaskets}`);
  console.log(`Success rate: ${((passedBaskets / totalBaskets) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n⚠️  FAILED BASKETS (require regeneration):\n');
    failures.forEach(f => {
      console.log(`   ${f.seedId}:`);
      console.log(`      Coverage: ${f.windowPercentage}% (need ${minPercentage}%)`);
      console.log(`      Words: ${f.windowWords}/${f.totalWords} from window`);
      console.log(`      Expected window: ${f.expectedWindow.join(', ')}`);
      console.log('');
    });

    console.log('❌ Validation FAILED - Some baskets need regeneration\n');
    process.exit(1);
  } else {
    console.log('\n✅ All baskets meet the sliding window coverage requirement!\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const courseDir = process.argv[2];
  const minPercentage = process.argv[3] ? parseInt(process.argv[3]) : 70;

  if (!courseDir) {
    console.error('Usage: node phase5_validate_window_coverage.cjs <course_directory> [min_percentage]');
    console.error('Example: node phase5_validate_window_coverage.cjs public/vfs/courses/spa_for_eng_test_s0001-0050 70');
    process.exit(1);
  }

  validateWindowCoverage(courseDir, minPercentage);
}

module.exports = { validateWindowCoverage };

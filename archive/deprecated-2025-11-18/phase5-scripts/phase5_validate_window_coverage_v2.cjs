#!/usr/bin/env node

/**
 * Phase 5 Window Coverage Validator V2
 *
 * REVERSED LOGIC: Checks what percentage of vocabulary INTRODUCED in the sliding window
 * (recent 10 seeds) is actually being practiced in the new seed's phrases.
 *
 * This ensures we're actively reinforcing recently-learned vocabulary, not just
 * reusing common words that happen to appear in many seeds.
 */

const fs = require('fs');
const path = require('path');

function validateWindowCoverageV2(courseDir, minPercentage = 70) {
  console.log('🔍 Phase 5 Window Coverage Validator V2 (Reverse Logic)');
  console.log(`📁 Course: ${courseDir}`);
  console.log(`📊 Minimum required: ${minPercentage}% of window vocab practiced\n`);

  // Read lego_pairs to find where vocabulary was FIRST INTRODUCED
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  // Build registry: word -> seed_id where it was FIRST introduced
  const vocabFirstAppearance = {};

  legoPairs.seeds.forEach(seed => {
    const completeSentence = seed.seed_pair[0].toLowerCase();
    const spanishWords = completeSentence.split(/\s+/);

    spanishWords.forEach(word => {
      word = word.replace(/[.,!?¿¡]/g, '');
      if (!word) return;

      // Only record FIRST appearance
      if (!vocabFirstAppearance[word]) {
        vocabFirstAppearance[word] = seed.seed_id;
      }
    });

    // Also track LEGO introductions
    if (seed.legos) {
      seed.legos.forEach(lego => {
        if (lego.lego && lego.lego[1]) {
          const targetWords = lego.lego[1].toLowerCase().split(/\s+/);
          targetWords.forEach(word => {
            word = word.replace(/[.,!?¿¡]/g, '');
            if (!word) return;
            if (!vocabFirstAppearance[word]) {
              vocabFirstAppearance[word] = seed.seed_id;
            }
          });
        }
      });
    }
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

    // Determine sliding window (last 10 seeds before this one)
    const windowStart = Math.max(1, seedNum - 10);
    const windowEnd = seedNum - 1;
    const expectedWindow = [];
    for (let i = windowStart; i <= windowEnd; i++) {
      expectedWindow.push(`S${String(i).padStart(4, '0')}`);
    }

    if (expectedWindow.length === 0) {
      // First seed has no window
      console.log(`⏭️  ${seedId}: No window (first seed)`);
      return;
    }

    // Build set of vocabulary INTRODUCED in the window
    const windowVocab = new Set();
    Object.keys(vocabFirstAppearance).forEach(word => {
      if (expectedWindow.includes(vocabFirstAppearance[word])) {
        windowVocab.add(word);
      }
    });

    // Collect all vocabulary used in current seed's practice phrases
    const usedVocab = new Set();
    Object.values(basket.legos).forEach(lego => {
      if (lego.practice_phrases) {
        lego.practice_phrases.forEach(phrase => {
          const spanish = phrase[1].toLowerCase();
          const words = spanish.split(/\s+/);

          words.forEach(word => {
            word = word.replace(/[.,!?¿¡]/g, '');
            if (word) usedVocab.add(word);
          });
        });
      }
    });

    // Calculate coverage: what % of window vocab is being practiced?
    const windowVocabPracticed = Array.from(windowVocab).filter(word =>
      usedVocab.has(word)
    );

    const totalWindowVocab = windowVocab.size;
    const practicedCount = windowVocabPracticed.length;
    const coveragePercentage = totalWindowVocab > 0
      ? ((practicedCount / totalWindowVocab) * 100).toFixed(1)
      : 0;
    const passed = parseFloat(coveragePercentage) >= minPercentage;

    totalBaskets++;
    if (passed) {
      passedBaskets++;
      console.log(`✅ ${seedId}: ${coveragePercentage}% of window vocab practiced (${practicedCount}/${totalWindowVocab} words)`);
    } else {
      failedBaskets++;
      console.log(`❌ ${seedId}: ${coveragePercentage}% of window vocab practiced (${practicedCount}/${totalWindowVocab} words) - BELOW ${minPercentage}%`);

      // Show some unpracticed words
      const unpracticed = Array.from(windowVocab).filter(w => !usedVocab.has(w));
      const sampleUnpracticed = unpracticed.slice(0, 10).join(', ');

      failures.push({
        seedId,
        coveragePercentage: parseFloat(coveragePercentage),
        practicedCount,
        totalWindowVocab,
        expectedWindow,
        sampleUnpracticed
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
    console.log('\n⚠️  FAILED BASKETS:\n');
    failures.forEach(f => {
      console.log(`   ${f.seedId}:`);
      console.log(`      Coverage: ${f.coveragePercentage}% (need ${minPercentage}%)`);
      console.log(`      Practiced: ${f.practicedCount}/${f.totalWindowVocab} window words`);
      console.log(`      Expected window: ${f.expectedWindow.join(', ')}`);
      console.log(`      Sample unpracticed: ${f.sampleUnpracticed}`);
      console.log('');
    });

    console.log('❌ Validation FAILED - Some baskets need better window coverage\n');
    process.exit(1);
  } else {
    console.log('\n✅ All baskets meet the window coverage requirement!\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const courseDir = process.argv[2];
  const minPercentage = process.argv[3] ? parseInt(process.argv[3]) : 70;

  if (!courseDir) {
    console.error('Usage: node phase5_validate_window_coverage_v2.cjs <course_directory> [min_percentage]');
    console.error('Example: node phase5_validate_window_coverage_v2.cjs public/vfs/courses/spa_for_eng_test_s0001-0050 70');
    process.exit(1);
  }

  validateWindowCoverageV2(courseDir, minPercentage);
}

module.exports = { validateWindowCoverageV2 };

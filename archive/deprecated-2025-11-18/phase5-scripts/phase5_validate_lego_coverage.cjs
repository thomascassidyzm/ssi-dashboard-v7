#!/usr/bin/env node

/**
 * Phase 5 LEGO Coverage Validator
 *
 * Validates that practice phrases actively use recently-introduced LEGOs.
 * Checks what percentage of LEGOs from the sliding window (last 30 LEGOs)
 * are being practiced in each seed's phrase basket.
 *
 * This ensures proper spaced repetition of recent LEGO constructions.
 */

const fs = require('fs');
const path = require('path');

function validateLegoCoverage(courseDir, windowSize = 30, minPercentage = 60) {
  console.log('🔍 Phase 5 LEGO Coverage Validator');
  console.log(`📁 Course: ${courseDir}`);
  console.log(`📊 Window size: Last ${windowSize} LEGOs`);
  console.log(`📊 Minimum required: ${minPercentage}% of window LEGOs practiced\n`);

  // Read lego_pairs to build LEGO registry
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  // Build sequential list of all LEGOs with their target vocabulary
  const allLegos = [];
  legoPairs.seeds.forEach(seed => {
    if (seed.legos) {
      seed.legos.forEach(lego => {
        allLegos.push({
          id: lego.id,
          target: lego.target.toLowerCase(),
          seed_id: seed.seed_id,
          type: lego.type
        });
      });
    }
  });

  console.log(`📚 Total LEGOs in registry: ${allLegos.length}\n`);

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

    // Find the index of the first LEGO in this seed
    const firstLegoIndex = allLegos.findIndex(l => l.seed_id === seedId);

    if (firstLegoIndex === -1) {
      console.log(`⚠️  ${seedId}: No LEGOs found in registry`);
      return;
    }

    // Determine sliding window: last N LEGOs before this seed's first LEGO
    const windowStart = Math.max(0, firstLegoIndex - windowSize);
    const windowEnd = firstLegoIndex - 1;

    if (windowEnd < 0) {
      console.log(`⏭️  ${seedId}: No window (first seed)`);
      return;
    }

    const windowLegos = allLegos.slice(windowStart, windowEnd + 1);

    if (windowLegos.length === 0) {
      console.log(`⏭️  ${seedId}: No window LEGOs available`);
      return;
    }

    // Collect all Spanish text from current seed's practice phrases
    let allPhraseText = '';
    Object.values(basket.legos).forEach(lego => {
      if (lego.practice_phrases) {
        lego.practice_phrases.forEach(phrase => {
          allPhraseText += ' ' + phrase[1].toLowerCase();
        });
      }
    });

    // Check which window LEGOs appear in the practice phrases
    const windowLegosPracticed = windowLegos.filter(lego => {
      // Check if LEGO target appears in any practice phrase
      const target = lego.target.toLowerCase();
      return allPhraseText.includes(target);
    });

    const totalWindowLegos = windowLegos.length;
    const practicedCount = windowLegosPracticed.length;
    const coveragePercentage = ((practicedCount / totalWindowLegos) * 100).toFixed(1);
    const passed = parseFloat(coveragePercentage) >= minPercentage;

    // Get window range info
    const windowSeedIds = [...new Set(windowLegos.map(l => l.seed_id))];
    const windowLegoIds = windowLegos.map(l => l.id);
    const firstWindowLegoId = windowLegoIds[0];
    const lastWindowLegoId = windowLegoIds[windowLegoIds.length - 1];

    totalBaskets++;
    if (passed) {
      passedBaskets++;
      console.log(`✅ ${seedId}: ${coveragePercentage}% of window LEGOs practiced (${practicedCount}/${totalWindowLegos})`);
      console.log(`   Window: ${firstWindowLegoId} → ${lastWindowLegoId} (${windowSeedIds.length} seeds)`);
    } else {
      failedBaskets++;
      console.log(`❌ ${seedId}: ${coveragePercentage}% of window LEGOs practiced (${practicedCount}/${totalWindowLegos}) - BELOW ${minPercentage}%`);
      console.log(`   Window: ${firstWindowLegoId} → ${lastWindowLegoId} (${windowSeedIds.length} seeds)`);

      // Show unpracticed LEGOs
      const unpracticed = windowLegos.filter(lego => !windowLegosPracticed.includes(lego));
      const sampleUnpracticed = unpracticed.slice(0, 10).map(l => `${l.id}(${l.target})`).join(', ');

      failures.push({
        seedId,
        coveragePercentage: parseFloat(coveragePercentage),
        practicedCount,
        totalWindowLegos,
        windowRange: `${firstWindowLegoId} → ${lastWindowLegoId}`,
        windowSeedCount: windowSeedIds.length,
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
      console.log(`      Practiced: ${f.practicedCount}/${f.totalWindowLegos} LEGOs`);
      console.log(`      Window: ${f.windowRange} (${f.windowSeedCount} seeds)`);
      console.log(`      Sample unpracticed: ${f.sampleUnpracticed}`);
      console.log('');
    });

    console.log('❌ Validation FAILED - Some baskets need better LEGO coverage\n');
    process.exit(1);
  } else {
    console.log('\n✅ All baskets meet the LEGO coverage requirement!\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const courseDir = process.argv[2];
  const windowSize = process.argv[3] ? parseInt(process.argv[3]) : 30;
  const minPercentage = process.argv[4] ? parseInt(process.argv[4]) : 60;

  if (!courseDir) {
    console.error('Usage: node phase5_validate_lego_coverage.cjs <course_directory> [window_size] [min_percentage]');
    console.error('Example: node phase5_validate_lego_coverage.cjs public/vfs/courses/spa_for_eng_test_s0001-0050 30 60');
    process.exit(1);
  }

  validateLegoCoverage(courseDir, windowSize, minPercentage);
}

module.exports = { validateLegoCoverage };

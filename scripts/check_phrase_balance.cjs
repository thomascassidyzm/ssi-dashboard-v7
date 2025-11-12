#!/usr/bin/env node

/**
 * Check Phrase Balance - Verify sliding window vocabulary usage
 *
 * For each seed, analyzes which seeds contributed vocabulary to practice phrases
 * Expected: Most vocabulary should come from the 10-seed sliding window
 */

const fs = require('fs');
const path = require('path');

function checkPhraseBalance(courseDir) {
  console.log('🔍 Checking Phrase Balance - Sliding Window Vocabulary Usage');
  console.log(`📁 Course: ${courseDir}\n`);

  // Read lego_pairs to build vocabulary registry
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  // Build vocabulary registry: word -> seed where it was first introduced
  const vocabRegistry = {};

  legoPairs.seeds.forEach(seed => {
    seed.legos.forEach(lego => {
      if (lego.new) {
        // Split Spanish phrase into words and register each
        const spanishWords = lego.target.toLowerCase().split(/\s+/);
        spanishWords.forEach(word => {
          // Clean punctuation
          word = word.replace(/[.,!?¿¡]/g, '');
          if (!word) return;
          if (!vocabRegistry[word]) {
            vocabRegistry[word] = seed.seed_id;
          }
        });
      }
    });
  });

  // Analyze each seed's phrase basket
  const outputDir = path.join(courseDir, 'phase5_outputs');
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .sort();

  const results = [];

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

    // Count vocabulary sources for all phrases
    const vocabSources = {};
    let totalWords = 0;
    let windowWords = 0;
    let outsideWindowWords = 0;

    // Iterate through all LEGOs and their practice phrases
    Object.values(basket.legos).forEach(lego => {
      if (lego.practice_phrases) {
        lego.practice_phrases.forEach(phrase => {
          const spanish = phrase[1].toLowerCase();
          const words = spanish.split(/\s+/);

          words.forEach(word => {
            // Clean punctuation
            word = word.replace(/[.,!?¿¡]/g, '');
            if (!word) return;

            totalWords++;
            const sourceSeed = vocabRegistry[word];

            if (sourceSeed) {
              vocabSources[sourceSeed] = (vocabSources[sourceSeed] || 0) + 1;

              if (expectedWindow.includes(sourceSeed)) {
                windowWords++;
              } else {
                outsideWindowWords++;
              }
            }
          });
        });
      }
    });

    const windowPercentage = totalWords > 0 ? ((windowWords / totalWords) * 100).toFixed(1) : 0;

    results.push({
      seedId,
      seedNum,
      expectedWindow,
      totalWords,
      windowWords,
      outsideWindowWords,
      windowPercentage,
      vocabSources
    });

    console.log(`📝 ${seedId}: ${basket.seed_pair.known}`);
    console.log(`   🎯 Expected window: ${expectedWindow.join(', ') || 'none (first seed)'}`);
    console.log(`   📊 Total words: ${totalWords}`);
    console.log(`   ✅ From window: ${windowWords} (${windowPercentage}%)`);
    console.log(`   ⚠️  Outside window: ${outsideWindowWords}`);

    // Show top 5 vocabulary sources
    const topSources = Object.entries(vocabSources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log(`   📚 Top vocabulary sources:`);
    topSources.forEach(([source, count]) => {
      const inWindow = expectedWindow.includes(source) ? '✓' : '✗';
      console.log(`      ${inWindow} ${source}: ${count} words`);
    });
    console.log('');
  });

  // Overall summary
  console.log('\n📊 OVERALL SUMMARY\n');
  console.log('============================================================');

  const totalWordsAll = results.reduce((sum, r) => sum + r.totalWords, 0);
  const totalWindowWords = results.reduce((sum, r) => sum + r.windowWords, 0);
  const totalOutsideWords = results.reduce((sum, r) => sum + r.outsideWindowWords, 0);
  const overallPercentage = ((totalWindowWords / totalWordsAll) * 100).toFixed(1);

  console.log(`Total words analyzed: ${totalWordsAll}`);
  console.log(`Words from sliding window: ${totalWindowWords} (${overallPercentage}%)`);
  console.log(`Words outside window: ${totalOutsideWords}`);

  // Show seeds with lowest window usage
  const lowWindowSeeds = results
    .filter(r => r.seedNum > 10) // Only check seeds 11+ (they have full window)
    .sort((a, b) => parseFloat(a.windowPercentage) - parseFloat(b.windowPercentage))
    .slice(0, 5);

  if (lowWindowSeeds.length > 0) {
    console.log('\n⚠️  Seeds with lowest window vocabulary usage:');
    lowWindowSeeds.forEach(r => {
      console.log(`   ${r.seedId}: ${r.windowPercentage}% from window`);
    });
  }

  console.log('\n✅ Phrase balance check complete!');
}

// Run if called directly
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node check_phrase_balance.cjs <course_directory>');
    process.exit(1);
  }

  checkPhraseBalance(courseDir);
}

module.exports = { checkPhraseBalance };

#!/usr/bin/env node

/**
 * Phase 5: Pattern Analysis - Compare seed_pairs vs basket phrases
 *
 * Extracts common grammatical patterns from seed_pairs and checks if
 * basket phrases are using similar structures naturally.
 *
 * Usage: node phase5_pattern_analysis.cjs <course_path>
 */

const fs = require('fs');
const path = require('path');

const coursePath = process.argv[2];

if (!coursePath) {
  console.error('Usage: node phase5_pattern_analysis.cjs <course_path>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const outputDir = path.join(fullCoursePath, 'phase5_outputs');
const legoPairsPath = path.join(fullCoursePath, 'lego_pairs.json');

console.log('🔍 Phase 5 Pattern Analysis');
console.log(`📁 Course: ${coursePath}\n`);

// Read lego_pairs
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

/**
 * Extract simple patterns from a Spanish sentence
 * Returns array of pattern signatures
 */
function extractPatterns(spanish) {
  const patterns = [];
  const words = spanish.toLowerCase().split(/\s+/);

  // Common verb patterns
  if (words.includes('quiero')) {
    const idx = words.indexOf('quiero');
    if (idx < words.length - 1) {
      patterns.push('quiero + infinitive');
    }
  }

  if (words.includes('quieres')) patterns.push('quieres + X');
  if (words.includes('él') && words.includes('quiere')) patterns.push('él quiere + X');
  if (words.includes('ella') && words.includes('quiere')) patterns.push('ella quiere + X');
  if (words.includes('queremos')) patterns.push('queremos + X');

  // Going to patterns
  if (words.includes('voy') && words.includes('a')) patterns.push('voy a + infinitive');
  if (words.includes('vas') && words.includes('a')) patterns.push('vas a + infinitive');

  // Estoy/estás patterns
  if (words.includes('estoy')) patterns.push('estoy + gerund/infinitive');
  if (words.includes('estás')) patterns.push('estás + gerund/infinitive');

  // Me gusta patterns
  if (words.includes('me') && words.includes('gusta')) patterns.push('me gusta + X');
  if (words.includes('me') && words.includes('gustaría')) patterns.push('me gustaría + X');
  if (words.includes('no') && words.includes('me') && words.includes('gusta')) patterns.push('no me gusta + X');

  // Question patterns
  if (words[0] === '¿por' && words[1] === 'qué') patterns.push('¿Por qué...?');
  if (words[0]?.startsWith('¿')) patterns.push('Question form');

  // Poder patterns
  if (words.includes('puedo')) patterns.push('puedo + infinitive');
  if (words.includes('puedes')) patterns.push('puedes + infinitive');
  if (words.includes('puede')) patterns.push('puede + infinitive');

  // Relative clause patterns
  if (words.includes('que')) {
    const idx = words.indexOf('que');
    if (idx > 0 && idx < words.length - 1) {
      patterns.push('... que ...');
    }
  }

  // Porque pattern
  if (words.includes('porque')) patterns.push('porque + clause');

  // Si pattern
  if (words.includes('si')) patterns.push('si + clause');

  // Compound structures
  if (words.includes('comenzar') && words.includes('a')) patterns.push('comenzar a + infinitive');
  if (words.includes('parar') && words.includes('de')) patterns.push('parar de + infinitive');

  return patterns;
}

/**
 * Analyze patterns in seed_pairs
 */
function analyzeSeedPatterns(seeds) {
  const patternCounts = {};
  const patternExamples = {};

  seeds.forEach(seed => {
    const spanish = seed.seed_pair[0]; // Target language
    const patterns = extractPatterns(spanish);

    patterns.forEach(pattern => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      if (!patternExamples[pattern]) {
        patternExamples[pattern] = [];
      }
      if (patternExamples[pattern].length < 3) {
        patternExamples[pattern].push({
          seed: seed.seed_id,
          sentence: spanish
        });
      }
    });
  });

  return { patternCounts, patternExamples };
}

/**
 * Analyze patterns in basket phrases
 */
function analyzeBasketPatterns(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const patternCounts = {};
  let totalPhrases = 0;

  Object.values(basket.legos).forEach(lego => {
    if (lego.practice_phrases) {
      lego.practice_phrases.forEach(phrase => {
        totalPhrases++;
        const spanish = phrase[1];
        const patterns = extractPatterns(spanish);

        patterns.forEach(pattern => {
          patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
        });
      });
    }
  });

  return { patternCounts, totalPhrases };
}

// Analyze first 30 seeds
const seedsToAnalyze = legoPairs.seeds.slice(0, 30);

console.log('📊 Analyzing patterns in seed_pairs (first 30 seeds)...\n');
const seedAnalysis = analyzeSeedPatterns(seedsToAnalyze);

console.log('🔹 SEED_PAIRS PATTERNS:\n');
const sortedSeedPatterns = Object.entries(seedAnalysis.patternCounts)
  .sort((a, b) => b[1] - a[1]);

sortedSeedPatterns.forEach(([pattern, count]) => {
  console.log(`   ${pattern.padEnd(30)} : ${count} occurrences`);
  if (seedAnalysis.patternExamples[pattern]) {
    seedAnalysis.patternExamples[pattern].forEach(ex => {
      console.log(`      ${ex.seed}: "${ex.sentence}"`);
    });
  }
  console.log();
});

console.log('\n📊 Analyzing patterns in baskets (first 30 seeds)...\n');

// Aggregate basket patterns
const aggregateBasketPatterns = {};
let totalBasketPhrases = 0;

for (let i = 1; i <= 30; i++) {
  const seedId = `s${String(i).padStart(4, '0')}`;
  const basketPath = path.join(outputDir, `seed_${seedId}.json`);

  if (!fs.existsSync(basketPath)) continue;

  const basketAnalysis = analyzeBasketPatterns(basketPath);
  totalBasketPhrases += basketAnalysis.totalPhrases;

  Object.entries(basketAnalysis.patternCounts).forEach(([pattern, count]) => {
    aggregateBasketPatterns[pattern] = (aggregateBasketPatterns[pattern] || 0) + count;
  });
}

console.log('🔹 BASKET PATTERNS:\n');
const sortedBasketPatterns = Object.entries(aggregateBasketPatterns)
  .sort((a, b) => b[1] - a[1]);

sortedBasketPatterns.forEach(([pattern, count]) => {
  const percentage = ((count / totalBasketPhrases) * 100).toFixed(1);
  console.log(`   ${pattern.padEnd(30)} : ${count} occurrences (${percentage}% of phrases)`);
});

console.log('\n\n📊 PATTERN COMPARISON:\n');

// Find patterns in seeds but not in baskets
const seedPatternSet = new Set(Object.keys(seedAnalysis.patternCounts));
const basketPatternSet = new Set(Object.keys(aggregateBasketPatterns));

const inSeedsNotBaskets = [...seedPatternSet].filter(p => !basketPatternSet.has(p));
const inBasketsNotSeeds = [...basketPatternSet].filter(p => !seedPatternSet.has(p));

if (inSeedsNotBaskets.length > 0) {
  console.log('⚠️  Patterns in SEED_PAIRS but NOT in baskets:');
  inSeedsNotBaskets.forEach(p => {
    console.log(`   - ${p} (${seedAnalysis.patternCounts[p]} occurrences in seeds)`);
  });
  console.log();
}

if (inBasketsNotSeeds.length > 0) {
  console.log('✨ Patterns in BASKETS but NOT in seed_pairs (novel patterns):');
  inBasketsNotSeeds.forEach(p => {
    console.log(`   - ${p} (${aggregateBasketPatterns[p]} occurrences in baskets)`);
  });
  console.log();
}

// Calculate pattern overlap
const overlap = [...seedPatternSet].filter(p => basketPatternSet.has(p));
const overlapPercentage = ((overlap.length / seedPatternSet.size) * 100).toFixed(1);

console.log(`✅ Pattern Overlap: ${overlap.length}/${seedPatternSet.size} patterns (${overlapPercentage}%)`);
console.log(`   Seeds analyzed: 30`);
console.log(`   Total basket phrases: ${totalBasketPhrases}`);
console.log(`   Unique patterns in seeds: ${seedPatternSet.size}`);
console.log(`   Unique patterns in baskets: ${basketPatternSet.size}`);

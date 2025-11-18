#!/usr/bin/env node

/**
 * Phase 5 LEGO Recombination Validator
 *
 * Validates that practice baskets provide rich exposure by:
 * 1. Reusing recent LEGOs (last 10 seeds ≈ 30 new LEGOs)
 * 2. Showing diverse LEGO combinations
 * 3. Varying phrase complexity (1-LEGO to 4+ LEGO phrases)
 *
 * Goal: Ensure by seed 668, learners have seen huge variety with minimal vocab.
 *
 * Usage: node phase5_validate_lego_recombination.cjs <course_path>
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase5_validate_lego_recombination.cjs <course_path>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const legoPairsPath = path.join(fullCoursePath, 'lego_pairs.json');
const outputDir = path.join(fullCoursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}
if (!fs.existsSync(outputDir)) {
  console.error(`❌ Error: phase5_outputs not found: ${outputDir}`);
  process.exit(1);
}

console.log('🔄 LEGO Recombination Coverage Validator');
console.log(`📁 Course: ${coursePath}\n`);

// Load lego_pairs to build LEGO registry
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Build map: seedId -> array of new LEGO ids
const newLegosBySeed = {};
legoPairs.seeds.forEach(seed => {
  const newLegos = seed.legos
    .filter(lego => lego.new)
    .map(lego => lego.id || lego.lego_id); // Support both field names
  newLegosBySeed[seed.seed_id] = newLegos;
});

/**
 * Extract LEGO IDs mentioned in a Spanish phrase
 * by checking if LEGO target text appears in the phrase
 */
function extractLegosInPhrase(spanishPhrase, allLegos) {
  const phraseLower = spanishPhrase.toLowerCase();
  const foundLegos = [];

  for (const lego of allLegos) {
    const legoText = lego.target.toLowerCase();
    if (phraseLower.includes(legoText)) {
      foundLegos.push(lego.lego_id);
    }
  }

  return foundLegos;
}

/**
 * Validate a single basket
 */
function validateBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;
  const seedNum = parseInt(seedId.substring(1));

  console.log(`\n📦 ${seedId}`);

  // Determine recent 10 seeds window
  const windowStart = Math.max(1, seedNum - 10);
  const windowEnd = seedNum - 1;
  const windowSeeds = [];
  for (let i = windowStart; i <= windowEnd; i++) {
    windowSeeds.push(`S${String(i).padStart(4, '0')}`);
  }

  // Collect all new LEGOs from window
  const recentNewLegos = new Set();
  windowSeeds.forEach(sid => {
    if (newLegosBySeed[sid]) {
      newLegosBySeed[sid].forEach(legoId => recentNewLegos.add(legoId));
    }
  });

  console.log(`   Window: ${windowSeeds[0]} - ${windowSeeds[windowSeeds.length - 1]} (${windowSeeds.length} seeds)`);
  console.log(`   Recent new LEGOs available: ${recentNewLegos.size}`);

  // Find all LEGOs up to current seed (for LEGO detection in phrases)
  const allLegosUpToNow = [];
  legoPairs.seeds.forEach(seed => {
    const snum = parseInt(seed.seed_id.substring(1));
    if (snum < seedNum) {
      seed.legos.forEach(lego => {
        allLegosUpToNow.push({
          lego_id: lego.id || lego.lego_id, // Support both field names
          target: lego.target,
          known: lego.known
        });
      });
    }
  });

  // Track metrics
  const usedRecentLegos = new Set();
  const legoComboCount = {};
  const phraseLengthDist = { 1: 0, 2: 0, 3: 0, '4+': 0 };
  let totalPhrases = 0;

  // Analyze all practice phrases in this basket
  Object.values(basket.legos).forEach(legoData => {
    if (!legoData.practice_phrases) return;

    legoData.practice_phrases.forEach(phrase => {
      totalPhrases++;
      const [english, spanish] = phrase;

      // Find which LEGOs are used in this phrase
      const legosInPhrase = extractLegosInPhrase(spanish, allLegosUpToNow);

      // Track recent LEGO usage
      legosInPhrase.forEach(legoId => {
        if (recentNewLegos.has(legoId)) {
          usedRecentLegos.add(legoId);
        }
      });

      // Track LEGO combinations (sorted pair for consistency)
      if (legosInPhrase.length >= 2) {
        const combo = legosInPhrase.slice(0, 2).sort().join(' + ');
        legoComboCount[combo] = (legoComboCount[combo] || 0) + 1;
      }

      // Track phrase length (by LEGO count)
      const legoCount = legosInPhrase.length;
      if (legoCount === 1) phraseLengthDist[1]++;
      else if (legoCount === 2) phraseLengthDist[2]++;
      else if (legoCount === 3) phraseLengthDist[3]++;
      else if (legoCount >= 4) phraseLengthDist['4+']++;
    });
  });

  // Calculate metrics
  const recentLegoUsagePercent = recentNewLegos.size > 0
    ? ((usedRecentLegos.size / recentNewLegos.size) * 100).toFixed(1)
    : 0;

  const uniqueCombos = Object.keys(legoComboCount).length;

  console.log(`\n   📊 Metrics:`);
  console.log(`      Recent LEGO usage: ${usedRecentLegos.size}/${recentNewLegos.size} (${recentLegoUsagePercent}%)`);
  console.log(`      Unique LEGO combinations: ${uniqueCombos}`);
  console.log(`      Phrase complexity distribution:`);
  console.log(`         1-LEGO phrases: ${phraseLengthDist[1]}`);
  console.log(`         2-LEGO phrases: ${phraseLengthDist[2]}`);
  console.log(`         3-LEGO phrases: ${phraseLengthDist[3]}`);
  console.log(`         4+ LEGO phrases: ${phraseLengthDist['4+']}`);

  // Assessment
  const passed = parseFloat(recentLegoUsagePercent) >= 60 && uniqueCombos >= 5;
  if (passed) {
    console.log(`   ✅ GOOD recombination coverage`);
  } else {
    console.log(`   ⚠️  LOW recombination coverage (target: ≥60% recent LEGOs, ≥5 unique combos)`);
  }

  return {
    seedId,
    recentNewLegos: recentNewLegos.size,
    usedRecentLegos: usedRecentLegos.size,
    recentLegoUsagePercent: parseFloat(recentLegoUsagePercent),
    uniqueCombos,
    phraseLengthDist,
    totalPhrases,
    passed
  };
}

/**
 * Main
 */
function main() {
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .sort();

  console.log(`Found ${basketFiles.length} baskets to validate\n`);

  const results = [];
  for (const basketFile of basketFiles) {
    const basketPath = path.join(outputDir, basketFile);
    try {
      const result = validateBasket(basketPath);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error validating ${basketFile}: ${error.message}`);
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY');
  console.log('='.repeat(60));

  const avgRecentUsage = results.reduce((sum, r) => sum + r.recentLegoUsagePercent, 0) / results.length;
  const avgUniqueCombos = results.reduce((sum, r) => sum + r.uniqueCombos, 0) / results.length;
  const passedCount = results.filter(r => r.passed).length;

  console.log(`Baskets validated: ${results.length}`);
  console.log(`Passed: ${passedCount}/${results.length} (${((passedCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`\nAverage recent LEGO usage: ${avgRecentUsage.toFixed(1)}%`);
  console.log(`Average unique combinations: ${avgUniqueCombos.toFixed(1)}`);

  // Total phrase complexity across all baskets
  const totalDist = results.reduce((acc, r) => ({
    1: acc[1] + r.phraseLengthDist[1],
    2: acc[2] + r.phraseLengthDist[2],
    3: acc[3] + r.phraseLengthDist[3],
    '4+': acc['4+'] + r.phraseLengthDist['4+']
  }), { 1: 0, 2: 0, 3: 0, '4+': 0 });

  console.log(`\nOverall phrase complexity:`);
  console.log(`   1-LEGO: ${totalDist[1]}`);
  console.log(`   2-LEGO: ${totalDist[2]}`);
  console.log(`   3-LEGO: ${totalDist[3]}`);
  console.log(`   4+ LEGO: ${totalDist['4+']}`);

  if (passedCount === results.length) {
    console.log('\n✅ All baskets show good LEGO recombination!');
  } else {
    console.log(`\n⚠️  ${results.length - passedCount} basket(s) need more diverse LEGO usage`);
  }

  console.log('\n🔄 Validation complete!');
}

main();

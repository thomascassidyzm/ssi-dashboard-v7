#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 5: Remove GATE Violations from Baskets
 *
 * Automatically removes practice phrases that use unavailable vocabulary.
 * Updates phrase_distribution counts after removal.
 *
 * Usage: node phase5_remove_gate_violations.cjs <course_path>
 * Example: node phase5_remove_gate_violations.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase5_remove_gate_violations.cjs <course_path>');
  console.error('Example: node phase5_remove_gate_violations.cjs public/vfs/courses/spa_for_eng_s0001-0100');
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

console.log('🚪 Removing GATE Violations');
console.log(`📁 Course: ${coursePath}\n`);

/**
 * Extract all vocabulary from a basket
 */
function extractAvailableVocabulary(basket, legoId) {
  const availableWords = new Set();

  // 1. Extract ALL words from recent_seed_pairs (sliding window)
  if (basket.recent_seed_pairs) {
    Object.values(basket.recent_seed_pairs).forEach(seedPairData => {
      // Handle both old format [spanish, english] and new format [[known, target], legos]
      let targetSentence;
      if (Array.isArray(seedPairData[0])) {
        // New format: [[known, target], legos]
        targetSentence = seedPairData[0][1]; // target is second element
      } else {
        // Old format: [spanish, english]
        targetSentence = seedPairData[0];
      }

      targetSentence.split(/\s+/).forEach(word => {
        const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
        if (normalized) availableWords.add(normalized);
      });
    });
  }

  // 2. Extract words from current_seed_legos_available
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
 * Remove violating phrases from a basket
 */
function removeViolationsFromBasket(basketPath) {
  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const seedId = basket.seed_id;

  console.log(`\n📦 Processing ${seedId}...`);

  let totalOriginal = 0;
  let totalRemoved = 0;
  let modified = false;

  for (const [legoId, legoData] of Object.entries(basket.legos)) {
    const availableWords = extractAvailableVocabulary(basket, legoId);
    const originalCount = legoData.practice_phrases.length;
    totalOriginal += originalCount;

    // Filter out phrases with unavailable words
    const validPhrases = legoData.practice_phrases.filter(phrase => {
      const [english, spanish] = phrase;
      const spanishWords = spanish
        .split(/\s+/)
        .map(w => w.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, ''))
        .filter(Boolean);

      const unavailableWords = spanishWords.filter(word => !availableWords.has(word));

      if (unavailableWords.length > 0) {
        console.log(`   ❌ Removing: "${english}" / "${spanish}"`);
        console.log(`      → Unavailable: ${unavailableWords.join(', ')}`);
        return false;
      }
      return true;
    });

    const removedCount = originalCount - validPhrases.length;
    if (removedCount > 0) {
      modified = true;
      totalRemoved += removedCount;

      // Update practice_phrases
      legoData.practice_phrases = validPhrases;

      // Recalculate distribution
      const distribution = {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0,
      };

      validPhrases.forEach(p => {
        const count = p[3];
        if (count <= 2) distribution.really_short_1_2++;
        else if (count === 3) distribution.quite_short_3++;
        else if (count <= 5) distribution.longer_4_5++;
        else distribution.long_6_plus++;
      });

      legoData.phrase_distribution = distribution;

      console.log(`   ✅ ${legoId}: ${originalCount} → ${validPhrases.length} phrases (removed ${removedCount})`);
    }
  }

  // Write updated basket if modified
  if (modified) {
    // Update generation stage
    basket.generation_stage = 'GATE_VIOLATIONS_REMOVED';

    fs.writeFileSync(basketPath, JSON.stringify(basket, null, 2));
    console.log(`\n   📊 ${seedId} Summary:`);
    console.log(`      Original: ${totalOriginal} phrases`);
    console.log(`      Removed: ${totalRemoved} phrases`);
    console.log(`      Remaining: ${totalOriginal - totalRemoved} phrases`);
  } else {
    console.log(`   ✅ No violations found`);
  }

  return {
    seedId,
    original: totalOriginal,
    removed: totalRemoved,
    modified,
  };
}

/**
 * Main function
 */
function main() {
  const basketFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
    .map(f => path.join(outputDir, f));

  console.log(`Found ${basketFiles.length} baskets to process\n`);

  const results = [];

  for (const basketPath of basketFiles) {
    try {
      const result = removeViolationsFromBasket(basketPath);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error processing ${basketPath}: ${error.message}`);
    }
  }

  // Overall summary
  console.log('\n\n📊 OVERALL SUMMARY\n');
  console.log('='.repeat(60));

  const totals = results.reduce((acc, r) => ({
    original: acc.original + r.original,
    removed: acc.removed + r.removed,
  }), { original: 0, removed: 0 });

  const modifiedSeeds = results.filter(r => r.modified);

  console.log(`Total phrases original: ${totals.original}`);
  console.log(`Total phrases removed:  ${totals.removed}`);
  console.log(`Total phrases kept:     ${totals.original - totals.removed}`);
  console.log(`Removal rate:           ${Math.round((totals.removed / totals.original) * 100)}%`);
  console.log(`\nSeeds modified: ${modifiedSeeds.length}`);

  if (modifiedSeeds.length > 0) {
    console.log('\nModified seeds:');
    modifiedSeeds.forEach(r => {
      console.log(`   ${r.seedId}: removed ${r.removed} phrase(s)`);
    });
  }

  console.log('\n✅ GATE violation removal complete!');
}

main();

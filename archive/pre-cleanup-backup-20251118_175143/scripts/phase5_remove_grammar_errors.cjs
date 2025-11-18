#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Phase 5: Remove Grammar Errors
 *
 * Removes practice phrases with grammatical errors identified by grammar review agents
 */

const courseDir = process.argv[2];

if (!courseDir) {
  console.error('❌ Usage: node phase5_remove_grammar_errors.cjs <course_directory>');
  process.exit(1);
}

const phase5Dir = path.join(courseDir, 'phase5_outputs');
const errorReports = [
  path.join(courseDir, 'grammar_errors_s0011-s0016.json'),
  path.join(courseDir, 'grammar_errors_s0017-s0022.json'),
  path.join(courseDir, 'grammar_errors_s0023-s0028.json'),
  path.join(courseDir, 'grammar_errors_s0029-s0034.json'),
  path.join(courseDir, 'grammar_errors_s0035-s0040.json')
];

console.log('🔧 Removing Grammar Errors from Phase 5 Outputs');
console.log(`📁 Course: ${courseDir}\n`);

// Load all error reports
const allErrors = new Map(); // seed_id -> lego_id -> Set of phrase indices

errorReports.forEach(reportPath => {
  if (!fs.existsSync(reportPath)) {
    console.log(`⚠️  Error report not found: ${reportPath}`);
    return;
  }

  const errors = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  errors.forEach(errorEntry => {
    const { seed_id, lego_id, errors: errorList } = errorEntry;

    if (!allErrors.has(seed_id)) {
      allErrors.set(seed_id, new Map());
    }

    if (!allErrors.get(seed_id).has(lego_id)) {
      allErrors.get(seed_id).set(lego_id, new Set());
    }

    errorList.forEach(err => {
      allErrors.get(seed_id).get(lego_id).add(err.phrase_index);
    });
  });
});

console.log(`Found error data for ${allErrors.size} seeds\n`);

// Process each seed file
let totalPhrasesRemoved = 0;
let totalPhrasesRemaining = 0;
let seedsProcessed = 0;

allErrors.forEach((legoErrors, seedId) => {
  const seedFile = path.join(phase5Dir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(seedFile)) {
    console.log(`⚠️  Seed file not found: ${seedFile}`);
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

  console.log(`📦 Processing ${seedId}...`);

  let seedRemovalCount = 0;

  legoErrors.forEach((phraseIndices, legoId) => {
    if (!seedData.legos[legoId]) {
      console.log(`   ⚠️  LEGO ${legoId} not found in seed file`);
      return;
    }

    const lego = seedData.legos[legoId];
    const originalCount = lego.practice_phrases.length;

    // Remove phrases at specified indices (sort descending to remove from end first)
    const indicesToRemove = Array.from(phraseIndices).sort((a, b) => b - a);

    indicesToRemove.forEach(idx => {
      if (idx < lego.practice_phrases.length) {
        const [eng, spa] = lego.practice_phrases[idx];
        console.log(`   ❌ Removing [${idx}]: "${eng}" / "${spa}"`);
        lego.practice_phrases.splice(idx, 1);
      }
    });

    const newCount = lego.practice_phrases.length;
    const removed = originalCount - newCount;

    if (removed > 0) {
      console.log(`   ✅ ${legoId}: ${originalCount} → ${newCount} phrases (removed ${removed})`);
      seedRemovalCount += removed;

      // Recalculate phrase_distribution
      const distribution = {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0
      };

      lego.practice_phrases.forEach(([_eng, _spa, _null, wordCount]) => {
        if (wordCount <= 2) distribution.really_short_1_2++;
        else if (wordCount === 3) distribution.quite_short_3++;
        else if (wordCount <= 5) distribution.longer_4_5++;
        else distribution.long_6_plus++;
      });

      lego.phrase_distribution = distribution;
    }
  });

  // Update generation stage
  seedData.generation_stage = 'GRAMMAR_REVIEWED';

  // Save updated file
  fs.writeFileSync(seedFile, JSON.stringify(seedData, null, 2) + '\n');

  console.log(`   📊 ${seedId} Summary:`);
  console.log(`      Removed: ${seedRemovalCount} phrases`);
  console.log(`      Remaining: ${Object.values(seedData.legos).reduce((sum, lego) => sum + lego.practice_phrases.length, 0)} phrases\n`);

  totalPhrasesRemoved += seedRemovalCount;
  totalPhrasesRemaining += Object.values(seedData.legos).reduce((sum, lego) => sum + lego.practice_phrases.length, 0);
  seedsProcessed++;
});

console.log('✅ Grammar Error Removal Complete\n');
console.log('📊 Final Summary:');
console.log(`   Seeds processed: ${seedsProcessed}`);
console.log(`   Total phrases removed: ${totalPhrasesRemoved}`);
console.log(`   Total phrases remaining: ${totalPhrasesRemaining}`);
console.log(`   Success rate: ${((totalPhrasesRemaining / (totalPhrasesRemaining + totalPhrasesRemoved)) * 100).toFixed(1)}% clean`);

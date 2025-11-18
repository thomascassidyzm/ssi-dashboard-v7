#!/usr/bin/env node

/**
 * Phase 5 Bad Phrase Deletion - Clean Up Grammar Violations
 *
 * Philosophy (from Phase 1 principles):
 * - First 100 seeds: PARAMOUNT for reducing learner uncertainty
 * - GATE violations: Less critical (vocabulary builds progressively)
 * - Grammar: Should NEVER be WRONG - always understandable to native speakers
 * - Natural patterns in target language = learner confidence in being understood
 * - "Speaking without thinking" in new language (early phase goal)
 *
 * This script DELETES entire practice phrases that have grammar violations.
 * Better to have 8 good phrases than 10 with 2 bad ones.
 *
 * Usage:
 *   Delete mode:  node scripts/phase5_delete_bad_phrases.cjs <course_code> delete <seed_id> <lego_id> <phrase_indices>
 *   Review mode:  node scripts/phase5_delete_bad_phrases.cjs <course_code> review <seed_id>
 *
 * Examples:
 *   node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0023 S0023L01 1,3,5
 *   node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng review S0023
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];
const mode = process.argv[3];
const seedId = process.argv[4];
const legoId = process.argv[5];
const phraseIndices = process.argv[6];

if (!courseCode || !mode) {
  console.error('Usage:');
  console.error('  Delete: node phase5_delete_bad_phrases.cjs <course_code> delete <seed_id> <lego_id> <phrase_indices>');
  console.error('  Review: node phase5_delete_bad_phrases.cjs <course_code> review <seed_id>');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0023 S0023L01 1,3,5');
  console.error('  node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng review S0023');
  process.exit(1);
}

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

// ============================================================================
// REVIEW MODE - Show all phrases for a seed
// ============================================================================

if (mode === 'review') {
  if (!seedId) {
    console.error('❌ Review mode requires seed_id');
    process.exit(1);
  }

  const seedNum = seedId.substring(1);
  const basketPath = path.join(phase5OutputsDir, `seed_S${seedNum}_baskets.json`);

  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

  console.log(`📋 Review Mode: ${seedId}`);
  console.log('═'.repeat(60));
  console.log();

  Object.entries(basketData).forEach(([lId, legoData]) => {
    console.log(`${lId}:`);
    if (legoData.practice_phrases) {
      legoData.practice_phrases.forEach((phrase, idx) => {
        console.log(`  ${idx + 1}. EN: "${phrase[0]}"`);
        console.log(`     中文: "${phrase[1]}"`);
        console.log(`     Complexity: ${phrase[3] || 1} LEGOs`);
        console.log();
      });
    }
    console.log();
  });

  process.exit(0);
}

// ============================================================================
// DELETE MODE - Remove specific phrases
// ============================================================================

if (mode === 'delete') {
  if (!seedId || !legoId || !phraseIndices) {
    console.error('❌ Delete mode requires: <seed_id> <lego_id> <phrase_indices>');
    console.error('Example: node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0023 S0023L01 1,3,5');
    process.exit(1);
  }

  const seedNum = seedId.substring(1);
  const basketPath = path.join(phase5OutputsDir, `seed_S${seedNum}_baskets.json`);

  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

  if (!basketData[legoId]) {
    console.error(`❌ LEGO ${legoId} not found in basket`);
    process.exit(1);
  }

  if (!basketData[legoId].practice_phrases) {
    console.error(`❌ No practice_phrases found for ${legoId}`);
    process.exit(1);
  }

  // Parse indices (1-based from user, convert to 0-based)
  const indicesToDelete = phraseIndices.split(',').map(i => parseInt(i.trim()) - 1);
  const originalCount = basketData[legoId].practice_phrases.length;

  console.log(`🗑️  Delete Mode: ${seedId} ${legoId}`);
  console.log('═'.repeat(60));
  console.log();
  console.log('Phrases to delete:');
  console.log();

  indicesToDelete.forEach(idx => {
    if (idx >= 0 && idx < originalCount) {
      const phrase = basketData[legoId].practice_phrases[idx];
      console.log(`  ${idx + 1}. EN: "${phrase[0]}"`);
      console.log(`     中文: "${phrase[1]}"`);
      console.log();
    }
  });

  // Filter out deleted phrases (keep ones NOT in delete list)
  const newPhrases = basketData[legoId].practice_phrases.filter((phrase, idx) => {
    return !indicesToDelete.includes(idx);
  });

  basketData[legoId].practice_phrases = newPhrases;

  console.log(`Original: ${originalCount} phrases`);
  console.log(`Deleted: ${indicesToDelete.length} phrases`);
  console.log(`Remaining: ${newPhrases.length} phrases`);
  console.log();

  // Save updated basket
  fs.writeFileSync(basketPath, JSON.stringify(basketData, null, 2));

  console.log('✅ Basket updated successfully');
  console.log();
  console.log('💡 Philosophy: Better to have fewer GOOD phrases than mix of good + bad');
  console.log('   Learners need confidence they\'re speaking understandable language');
  console.log();

  process.exit(0);
}

console.error(`❌ Unknown mode: ${mode}`);
console.error('Use "review" or "delete"');
process.exit(1);

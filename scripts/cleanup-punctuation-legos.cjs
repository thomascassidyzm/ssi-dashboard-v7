/**
 * Cleanup Punctuation-Only LEGOs
 *
 * Finds and removes LEGOs where target_text is only punctuation
 * (no actual words) from the zho_for_eng course.
 *
 * Punctuation patterns:
 * - Chinese: 。？！，、；：…—–「」『』（）【】
 * - Western: . ? ! , ; : - ( ) [ ] { }
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'zho_for_eng';

// Regex to match text that is ONLY punctuation (no actual characters/words)
const PUNCT_ONLY_REGEX = /^[.,;:!?\u3002\u3001\uff1f\uff01\uff1b\uff1a\u2026\u2014\u2013\-()[\]{}「」『』（）【】\uff08\uff09\s]+$/;

function isPunctOnly(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed === '') return false;
  return PUNCT_ONLY_REGEX.test(trimmed);
}

// Compute lego_id from seed_number and lego_index
function computeLegoId(seedNumber, legoIndex) {
  return `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`;
}

async function findPunctuationLegos() {
  console.log('\n=== Finding Punctuation-Only LEGOs ===\n');

  // Fetch all LEGOs for the course
  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', COURSE_CODE);

  if (error) {
    console.error('Error fetching LEGOs:', error);
    throw error;
  }

  console.log(`Total LEGOs in ${COURSE_CODE}: ${legos.length}`);

  // Filter for punctuation-only LEGOs
  const punctLegos = legos.filter(lego => isPunctOnly(lego.target_text));

  console.log(`\nFound ${punctLegos.length} punctuation-only LEGOs:\n`);

  for (const lego of punctLegos) {
    const legoId = computeLegoId(lego.seed_number, lego.lego_index);
    console.log(`  Seed ${lego.seed_number}: "${lego.known_text}" -> "${lego.target_text}" (${legoId}, db_id: ${lego.id})`);
  }

  return punctLegos;
}

async function deletePracticePhrases(seedNumber, legoIndex) {
  const legoId = computeLegoId(seedNumber, legoIndex);

  // First count how many phrases will be deleted
  const { count, error: countError } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex);

  if (countError) {
    console.error(`Error counting phrases for ${legoId}:`, countError);
    return 0;
  }

  if (count === 0) {
    return 0;
  }

  // Delete the phrases
  const { error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', COURSE_CODE)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex);

  if (error) {
    console.error(`Error deleting phrases for ${legoId}:`, error);
    throw error;
  }

  return count;
}

async function deleteLego(dbId) {
  const { error } = await supabase
    .from('course_legos')
    .delete()
    .eq('id', dbId);

  if (error) {
    console.error(`Error deleting lego ${dbId}:`, error);
    throw error;
  }
}

async function findOrphanedPunctPhrases() {
  console.log('\n=== Finding Orphaned Punctuation-Only Phrases ===\n');

  // Fetch all practice phrases for the course
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (error) {
    console.error('Error fetching phrases:', error);
    throw error;
  }

  console.log(`Total practice phrases in ${COURSE_CODE}: ${phrases.length}`);

  // Find phrases where either known_text or target_text is punctuation-only
  const punctPhrases = phrases.filter(phrase =>
    isPunctOnly(phrase.known_text) || isPunctOnly(phrase.target_text)
  );

  console.log(`\nFound ${punctPhrases.length} punctuation-only phrases:\n`);

  for (const phrase of punctPhrases) {
    const legoId = computeLegoId(phrase.seed_number, phrase.lego_index);
    console.log(`  ${legoId}: "${phrase.known_text}" -> "${phrase.target_text}" (id: ${phrase.id})`);
  }

  return punctPhrases;
}

async function deleteOrphanedPhrases(phraseIds) {
  if (phraseIds.length === 0) return 0;

  const { error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', phraseIds);

  if (error) {
    console.error('Error deleting orphaned phrases:', error);
    throw error;
  }

  return phraseIds.length;
}

async function main() {
  console.log('========================================');
  console.log('  Punctuation LEGO Cleanup Script');
  console.log(`  Course: ${COURSE_CODE}`);
  console.log('========================================');

  let totalPhrasesDeleted = 0;
  let totalLegosDeleted = 0;
  let totalOrphanedPhrasesDeleted = 0;

  try {
    // Step 1: Find punctuation-only LEGOs
    const punctLegos = await findPunctuationLegos();

    if (punctLegos.length === 0) {
      console.log('\nNo punctuation-only LEGOs found. Nothing to delete.');
    } else {
      // Step 2: Delete practice phrases and LEGOs
      console.log('\n=== Deleting LEGOs and Their Practice Phrases ===\n');

      for (const lego of punctLegos) {
        const legoId = computeLegoId(lego.seed_number, lego.lego_index);

        // Delete phrases first (due to foreign key constraints)
        const phrasesDeleted = await deletePracticePhrases(lego.seed_number, lego.lego_index);
        totalPhrasesDeleted += phrasesDeleted;

        // Then delete the LEGO
        await deleteLego(lego.id);
        totalLegosDeleted++;

        console.log(`  DELETED: Seed ${lego.seed_number} - "${lego.target_text}" (${legoId}) - ${phrasesDeleted} phrases removed`);
      }
    }

    // Step 3: Find and delete any orphaned punctuation-only phrases
    const orphanedPhrases = await findOrphanedPunctPhrases();

    if (orphanedPhrases.length > 0) {
      console.log('\n=== Deleting Orphaned Punctuation Phrases ===\n');

      const phraseIds = orphanedPhrases.map(p => p.id);
      totalOrphanedPhrasesDeleted = await deleteOrphanedPhrases(phraseIds);

      console.log(`  Deleted ${totalOrphanedPhrasesDeleted} orphaned punctuation-only phrases`);
    }

    // Summary
    console.log('\n========================================');
    console.log('  CLEANUP SUMMARY');
    console.log('========================================');
    console.log(`  LEGOs deleted: ${totalLegosDeleted}`);
    console.log(`  Practice phrases deleted (from LEGOs): ${totalPhrasesDeleted}`);
    console.log(`  Orphaned phrases deleted: ${totalOrphanedPhrasesDeleted}`);
    console.log(`  Total deletions: ${totalLegosDeleted + totalPhrasesDeleted + totalOrphanedPhrasesDeleted}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }
}

main();

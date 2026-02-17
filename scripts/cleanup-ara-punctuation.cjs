/**
 * Cleanup Punctuation-Only LEGOs and Phrases for ara_for_eng
 *
 * This script identifies and removes LEGOs and practice phrases where
 * either the known_text or target_text is ONLY punctuation characters.
 *
 * Punctuation includes:
 * - Arabic: ؟ ، ؛
 * - Western: . ? ! , ; : - () [] {}
 * - Chinese/Japanese: 。 、 ？ ！ ； ： … — – 「」『』（）【】
 * - Hebrew: ־
 * - Empty strings
 *
 * IMPORTANT: Arabic has valid single-character words like:
 * - ب (with), ل (to), و (and), ف (so), ك (like)
 * These are NOT punctuation and must be preserved.
 *
 * Schema reference (from course-builder-api.cjs):
 * - course_legos: id (UUID PK), course_code, seed_number, lego_index, known_text, target_text, ...
 * - course_practice_phrases: id (UUID PK), course_code, seed_number, lego_index, position, known_text, target_text, ...
 *
 * @requires dotenv
 * @requires @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'ara_for_eng';

// Punctuation pattern - comprehensive list of punctuation marks
// Explicitly NOT including Arabic letters
const PUNCT_PATTERN = /^[.,;:!?\-()[\]{}。、？！；：…—–「」『』（）【】؟،؛־\s'"«»‹›""''‚„]+$/;

/**
 * Check if text is punctuation-only (or empty)
 * @param {string} text - Text to check
 * @returns {boolean} - True if text is only punctuation
 */
function isPunctOnly(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return PUNCT_PATTERN.test(trimmed);
}

/**
 * Format text for logging (show Unicode code points for non-ASCII)
 * @param {string} text - Text to format
 * @returns {string} - Formatted text with code points
 */
function formatText(text) {
  if (!text) return '(empty)';
  const trimmed = text.trim();
  if (!trimmed) return '(whitespace only)';

  // Show the text and its code points
  const codePoints = [...trimmed].map(c => {
    const cp = c.codePointAt(0);
    if (cp > 127) {
      return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    }
    return c;
  }).join(' ');

  return `"${trimmed}" [${codePoints}]`;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Punctuation-Only Cleanup for ara_for_eng');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Fetch all LEGOs for ara_for_eng
  console.log('Fetching LEGOs...');
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (legosError) {
    console.error('Error fetching LEGOs:', legosError);
    process.exit(1);
  }

  console.log(`Found ${legos.length} LEGOs total`);

  // Step 2: Find punctuation-only LEGOs
  const punctLegos = legos.filter(l => isPunctOnly(l.known_text) || isPunctOnly(l.target_text));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`PUNCTUATION-ONLY LEGOs: ${punctLegos.length} found`);
  console.log('='.repeat(70));

  if (punctLegos.length > 0) {
    for (const lego of punctLegos) {
      console.log(`\n  LEGO: seed ${lego.seed_number}, index ${lego.lego_index} (id: ${lego.id})`);
      console.log(`    Known: ${formatText(lego.known_text)}`);
      console.log(`    Target: ${formatText(lego.target_text)}`);
      console.log(`    Reason: ${isPunctOnly(lego.known_text) ? 'known is punct-only' : ''} ${isPunctOnly(lego.target_text) ? 'target is punct-only' : ''}`);
    }
  }

  // Step 3: Fetch all practice phrases for ara_for_eng
  console.log('\n\nFetching practice phrases...');
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (phrasesError) {
    console.error('Error fetching phrases:', phrasesError);
    process.exit(1);
  }

  console.log(`Found ${phrases.length} practice phrases total`);

  // Step 4: Find punctuation-only phrases
  const punctPhrases = phrases.filter(p => isPunctOnly(p.known_text) || isPunctOnly(p.target_text));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`PUNCTUATION-ONLY PHRASES: ${punctPhrases.length} found`);
  console.log('='.repeat(70));

  if (punctPhrases.length > 0) {
    for (const phrase of punctPhrases) {
      console.log(`\n  Phrase ID: ${phrase.id}`);
      console.log(`    Seed: ${phrase.seed_number}, LEGO index: ${phrase.lego_index}`);
      console.log(`    Known: ${formatText(phrase.known_text)}`);
      console.log(`    Target: ${formatText(phrase.target_text)}`);
      console.log(`    Reason: ${isPunctOnly(phrase.known_text) ? 'known is punct-only' : ''} ${isPunctOnly(phrase.target_text) ? 'target is punct-only' : ''}`);
    }
  }

  // Step 5: Summary before deletion
  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total LEGOs in ${COURSE_CODE}: ${legos.length}`);
  console.log(`Punctuation-only LEGOs to delete: ${punctLegos.length}`);
  console.log(`Total phrases in ${COURSE_CODE}: ${phrases.length}`);
  console.log(`Punctuation-only phrases to delete: ${punctPhrases.length}`);

  // If nothing to delete, exit
  if (punctLegos.length === 0 && punctPhrases.length === 0) {
    console.log('\nNo punctuation-only records found. Nothing to clean up.');
    process.exit(0);
  }

  // Step 6: Find phrases that belong to punctuation-only LEGOs
  // LEGOs are identified by (seed_number, lego_index) pair, not by id in phrases table
  const punctLegoKeys = new Set(punctLegos.map(l => `${l.seed_number}:${l.lego_index}`));
  const phrasesForPunctLegos = phrases.filter(p => punctLegoKeys.has(`${p.seed_number}:${p.lego_index}`));

  console.log(`\nPhrases belonging to punctuation-only LEGOs: ${phrasesForPunctLegos.length}`);

  // Combine: all punctuation-only phrases + all phrases for punctuation-only LEGOs
  const allPhrasesToDelete = new Set([
    ...punctPhrases.map(p => p.id),
    ...phrasesForPunctLegos.map(p => p.id)
  ]);

  console.log(`Total unique phrases to delete: ${allPhrasesToDelete.size}`);

  // Check for --execute flag
  const shouldExecute = process.argv.includes('--execute');

  if (!shouldExecute) {
    console.log('\n' + '='.repeat(70));
    console.log('DRY RUN - No changes made');
    console.log('Run with --execute to actually delete these records');
    console.log('='.repeat(70));
    process.exit(0);
  }

  // Step 7: Execute deletions
  console.log('\n' + '='.repeat(70));
  console.log('EXECUTING DELETIONS');
  console.log('='.repeat(70));

  // Delete phrases first (they reference LEGOs)
  if (allPhrasesToDelete.size > 0) {
    const phraseIds = [...allPhrasesToDelete];
    console.log(`\nDeleting ${phraseIds.length} phrases...`);

    // Delete in batches of 100 to avoid request size limits
    const batchSize = 100;
    let deletedPhrases = 0;

    for (let i = 0; i < phraseIds.length; i += batchSize) {
      const batch = phraseIds.slice(i, i + batchSize);
      const { error } = await supabase
        .from('course_practice_phrases')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Error deleting phrase batch ${i / batchSize + 1}:`, error);
      } else {
        deletedPhrases += batch.length;
        console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} phrases`);
      }
    }

    console.log(`Total phrases deleted: ${deletedPhrases}`);
  }

  // Delete LEGOs
  if (punctLegos.length > 0) {
    const legoIds = punctLegos.map(l => l.id);
    console.log(`\nDeleting ${legoIds.length} LEGOs...`);

    const { error } = await supabase
      .from('course_legos')
      .delete()
      .in('id', legoIds);

    if (error) {
      console.error('Error deleting LEGOs:', error);
    } else {
      console.log(`Successfully deleted ${legoIds.length} LEGOs`);
    }
  }

  // Step 8: Verify deletion
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION');
  console.log('='.repeat(70));

  // Re-check LEGOs
  const { data: remainingLegos, error: verifyLegosError } = await supabase
    .from('course_legos')
    .select('id, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (verifyLegosError) {
    console.error('Error verifying LEGOs:', verifyLegosError);
  } else {
    const stillPunct = remainingLegos.filter(l => isPunctOnly(l.known_text) || isPunctOnly(l.target_text));
    console.log(`Remaining LEGOs: ${remainingLegos.length}`);
    console.log(`Remaining punctuation-only LEGOs: ${stillPunct.length}`);
  }

  // Re-check phrases
  const { data: remainingPhrases, error: verifyPhrasesError } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (verifyPhrasesError) {
    console.error('Error verifying phrases:', verifyPhrasesError);
  } else {
    const stillPunct = remainingPhrases.filter(p => isPunctOnly(p.known_text) || isPunctOnly(p.target_text));
    console.log(`Remaining phrases: ${remainingPhrases.length}`);
    console.log(`Remaining punctuation-only phrases: ${stillPunct.length}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Cleanup Punctuation-Only LEGOs and Phrases for jpn_for_eng
 *
 * Finds and removes:
 * - LEGOs where known_text or target_text is only punctuation
 * - Practice phrases where known_text or target_text is only punctuation
 * - Empty strings
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE_CODE = 'jpn_for_eng';

/**
 * Check if text is punctuation-only (or empty)
 */
function isPunctOnly(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  // Matches text that is ONLY punctuation characters (including whitespace)
  return /^[.,;:!?。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־\s]+$/.test(trimmed);
}

async function main() {
  console.log('='.repeat(60));
  console.log('PUNCTUATION CLEANUP: jpn_for_eng');
  console.log('='.repeat(60));
  console.log('');

  // =========================================================================
  // STEP 1: Find punctuation-only LEGOs
  // =========================================================================
  console.log('STEP 1: Finding punctuation-only LEGOs...');

  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('id, lego_id, lego_index, seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError);
    process.exit(1);
  }

  const punctLegos = legos.filter(l => isPunctOnly(l.known_text) || isPunctOnly(l.target_text));

  console.log(`Total LEGOs: ${legos.length}`);
  console.log(`Punctuation-only LEGOs: ${punctLegos.length}`);
  console.log('');

  if (punctLegos.length > 0) {
    console.log('Punctuation-only LEGOs found:');
    for (const lego of punctLegos) {
      console.log(`  - Seed ${lego.seed_number}, Index ${lego.lego_index}, LEGO ${lego.lego_id}: "${lego.known_text}" / "${lego.target_text}"`);
    }
    console.log('');
  }

  // =========================================================================
  // STEP 2: Find punctuation-only phrases
  // =========================================================================
  console.log('STEP 2: Finding punctuation-only practice phrases...');

  const { data: phrases, error: phraseError } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (phraseError) {
    console.error('Error fetching phrases:', phraseError);
    process.exit(1);
  }

  const punctPhrases = phrases.filter(p => isPunctOnly(p.known_text) || isPunctOnly(p.target_text));

  console.log(`Total phrases: ${phrases.length}`);
  console.log(`Punctuation-only phrases: ${punctPhrases.length}`);
  console.log('');

  if (punctPhrases.length > 0) {
    console.log('Punctuation-only phrases found:');
    for (const phrase of punctPhrases) {
      console.log(`  - Seed ${phrase.seed_number}, LEGO index ${phrase.lego_index}, ID ${phrase.id}: "${phrase.known_text}" / "${phrase.target_text}"`);
    }
    console.log('');
  }

  // =========================================================================
  // STEP 3: Delete phrases belonging to punctuation LEGOs
  // =========================================================================
  let phrasesDeletedFromLegos = 0;

  if (punctLegos.length > 0) {
    console.log('STEP 3: Deleting phrases belonging to punctuation-only LEGOs...');

    // Build a set of (seed_number, lego_index) pairs for punctuation LEGOs
    const punctLegoKeys = new Set(punctLegos.map(l => `${l.seed_number}-${l.lego_index}`));

    // Find phrases that belong to punctuation LEGOs
    const legoPhrasesToDelete = phrases.filter(p => punctLegoKeys.has(`${p.seed_number}-${p.lego_index}`));

    console.log(`Phrases to delete (from punctuation LEGOs): ${legoPhrasesToDelete.length}`);

    if (legoPhrasesToDelete.length > 0) {
      for (const phrase of legoPhrasesToDelete) {
        console.log(`  - Deleting phrase ID ${phrase.id} (Seed ${phrase.seed_number}, LEGO ${phrase.lego_index}): "${phrase.known_text}" / "${phrase.target_text}"`);
      }

      const phraseIds = legoPhrasesToDelete.map(p => p.id);

      // Delete in batches if needed
      const { error: deleteError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .in('id', phraseIds);

      if (deleteError) {
        console.error('Error deleting phrases:', deleteError);
      } else {
        phrasesDeletedFromLegos = legoPhrasesToDelete.length;
        console.log(`Deleted ${legoPhrasesToDelete.length} phrases from punctuation LEGOs.`);
      }
    }
    console.log('');
  }

  // =========================================================================
  // STEP 4: Delete punctuation-only LEGOs
  // =========================================================================
  let legosDeleted = 0;

  if (punctLegos.length > 0) {
    console.log('STEP 4: Deleting punctuation-only LEGOs...');

    const legoIds = punctLegos.map(l => l.id);

    for (const lego of punctLegos) {
      console.log(`  - Deleting LEGO ${lego.lego_id} (Seed ${lego.seed_number}): "${lego.known_text}" / "${lego.target_text}"`);
    }

    const { error: deleteLegoError } = await supabase
      .from('course_legos')
      .delete()
      .in('id', legoIds);

    if (deleteLegoError) {
      console.error('Error deleting LEGOs:', deleteLegoError);
    } else {
      legosDeleted = punctLegos.length;
      console.log(`Deleted ${punctLegos.length} punctuation-only LEGOs.`);
    }
    console.log('');
  }

  // =========================================================================
  // STEP 5: Delete remaining punctuation-only phrases (not tied to punct LEGOs)
  // =========================================================================
  let orphanPhrasesDeleted = 0;

  // Find phrases that are punctuation-only but were NOT deleted in Step 3
  if (punctLegos.length > 0) {
    const punctLegoKeys = new Set(punctLegos.map(l => `${l.seed_number}-${l.lego_index}`));
    var orphanPunctPhrases = punctPhrases.filter(p => !punctLegoKeys.has(`${p.seed_number}-${p.lego_index}`));
  } else {
    var orphanPunctPhrases = punctPhrases;
  }

  if (orphanPunctPhrases.length > 0) {
    console.log('STEP 5: Deleting remaining punctuation-only phrases...');

    const phraseIds = orphanPunctPhrases.map(p => p.id);

    for (const phrase of orphanPunctPhrases) {
      console.log(`  - Deleting phrase ID ${phrase.id} (Seed ${phrase.seed_number}, LEGO ${phrase.lego_index}): "${phrase.known_text}" / "${phrase.target_text}"`);
    }

    const { error: deletePhraseError } = await supabase
      .from('course_practice_phrases')
      .delete()
      .in('id', phraseIds);

    if (deletePhraseError) {
      console.error('Error deleting orphan phrases:', deletePhraseError);
    } else {
      orphanPhrasesDeleted = orphanPunctPhrases.length;
      console.log(`Deleted ${orphanPunctPhrases.length} orphan punctuation-only phrases.`);
    }
    console.log('');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Punctuation-only LEGOs found: ${punctLegos.length}`);
  console.log(`Punctuation-only phrases found: ${punctPhrases.length}`);
  console.log('');
  console.log(`LEGOs deleted: ${legosDeleted}`);
  console.log(`Phrases deleted from punctuation LEGOs: ${phrasesDeletedFromLegos}`);
  console.log(`Orphan punctuation phrases deleted: ${orphanPhrasesDeleted}`);
  console.log(`Total phrases deleted: ${phrasesDeletedFromLegos + orphanPhrasesDeleted}`);
  console.log('');
  console.log('Cleanup complete!');
}

main().catch(console.error);

/**
 * Cleanup Punctuation-Only LEGOs and Practice Phrases
 *
 * Finds and removes punctuation-only entries from the eng_for_zho course.
 *
 * What counts as punctuation-only:
 * - Any punctuation: . ? ! , ; : etc.
 * - Empty strings
 * - Text that is ONLY punctuation characters (no actual words)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'eng_for_zho';

/**
 * Check if text is punctuation-only or empty
 */
function isPunctOnly(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  // Match strings that contain ONLY punctuation characters
  return /^[.,;:!?。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־'"'""\s]+$/.test(trimmed);
}

async function findPunctuationOnlyLegos() {
  console.log('\n=== Finding Punctuation-Only LEGOs ===\n');

  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (error) {
    console.error('Error fetching LEGOs:', error);
    return [];
  }

  console.log(`Total LEGOs in ${COURSE_CODE}: ${legos.length}`);

  const punctLegos = legos.filter(l => isPunctOnly(l.known_text) || isPunctOnly(l.target_text));

  console.log(`Punctuation-only LEGOs found: ${punctLegos.length}`);

  if (punctLegos.length > 0) {
    console.log('\nPunctuation-only LEGOs:');
    punctLegos.forEach(l => {
      console.log(`  - lego_id: ${l.lego_id}, seed: ${l.seed_number}`);
      console.log(`    known: "${l.known_text || '(empty)'}"`);
      console.log(`    target: "${l.target_text || '(empty)'}"`);
    });
  }

  return punctLegos;
}

async function findPunctuationOnlyPhrases() {
  console.log('\n=== Finding Punctuation-Only Practice Phrases ===\n');

  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  if (error) {
    console.error('Error fetching phrases:', error);
    return [];
  }

  console.log(`Total practice phrases in ${COURSE_CODE}: ${phrases.length}`);

  const punctPhrases = phrases.filter(p => isPunctOnly(p.known_text) || isPunctOnly(p.target_text));

  console.log(`Punctuation-only phrases found: ${punctPhrases.length}`);

  if (punctPhrases.length > 0) {
    console.log('\nPunctuation-only phrases (first 20):');
    punctPhrases.slice(0, 20).forEach(p => {
      console.log(`  - id: ${p.id}, seed: ${p.seed_number}, lego_index: ${p.lego_index}`);
      console.log(`    known: "${p.known_text || '(empty)'}"`);
      console.log(`    target: "${p.target_text || '(empty)'}"`);
    });
    if (punctPhrases.length > 20) {
      console.log(`  ... and ${punctPhrases.length - 20} more`);
    }
  }

  return punctPhrases;
}

async function deletePhrasesByLegoIds(legoIds) {
  if (legoIds.length === 0) return 0;

  console.log(`\nFinding phrases for ${legoIds.length} punctuation-only LEGOs...`);

  // Note: course_practice_phrases uses (seed_number, lego_index) to identify LEGOs
  // lego_id format is like "S0001L01" where S0001 is seed_number 1 and L01 is lego_index 1
  // We need to parse the lego_id to get seed_number and lego_index

  let totalDeleted = 0;

  for (const legoId of legoIds) {
    // Parse SXXXXLXX format
    const match = legoId.match(/S(\d+)L(\d+)/);
    if (!match) {
      console.log(`  Skipping invalid lego_id: ${legoId}`);
      continue;
    }

    const seedNumber = parseInt(match[1], 10);
    const legoIndex = parseInt(match[2], 10);

    const { data, error } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNumber)
      .eq('lego_index', legoIndex)
      .select();

    if (error) {
      console.error(`Error deleting phrases for ${legoId}:`, error);
      continue;
    }

    if (data && data.length > 0) {
      console.log(`  Deleted ${data.length} phrases for ${legoId}`);
      totalDeleted += data.length;
    }
  }

  console.log(`Total phrases deleted from punctuation-only LEGOs: ${totalDeleted}`);
  return totalDeleted;
}

async function deleteLegos(legos) {
  if (legos.length === 0) return 0;

  const legoIds = legos.map(l => l.lego_id);
  console.log(`\nDeleting ${legoIds.length} punctuation-only LEGOs...`);

  const { data, error } = await supabase
    .from('course_legos')
    .delete()
    .eq('course_code', COURSE_CODE)
    .in('lego_id', legoIds)
    .select();

  if (error) {
    console.error('Error deleting LEGOs:', error);
    return 0;
  }

  console.log(`Deleted ${data?.length || 0} punctuation-only LEGOs`);
  data?.forEach(l => {
    console.log(`  - Deleted LEGO: ${l.lego_id} (seed ${l.seed_number}): "${l.known_text}" / "${l.target_text}"`);
  });

  return data?.length || 0;
}

async function deleteOrphanedPhrases(phrases) {
  if (phrases.length === 0) return 0;

  const phraseIds = phrases.map(p => p.id);
  console.log(`\nDeleting ${phraseIds.length} punctuation-only orphan phrases...`);

  // Delete in batches of 100 to avoid query limits
  let totalDeleted = 0;
  const batchSize = 100;

  for (let i = 0; i < phraseIds.length; i += batchSize) {
    const batch = phraseIds.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('course_practice_phrases')
      .delete()
      .in('id', batch)
      .select();

    if (error) {
      console.error(`Error deleting phrases batch ${i / batchSize + 1}:`, error);
      continue;
    }

    totalDeleted += data?.length || 0;
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: Deleted ${data?.length || 0} phrases`);
  }

  console.log(`Total orphan punctuation-only phrases deleted: ${totalDeleted}`);
  return totalDeleted;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Punctuation-Only Cleanup for eng_for_zho');
  console.log('='.repeat(60));

  // Step 1: Find punctuation-only LEGOs
  const punctLegos = await findPunctuationOnlyLegos();

  // Step 2: Find all punctuation-only phrases
  const punctPhrases = await findPunctuationOnlyPhrases();

  // Extract LEGO IDs from punctuation-only LEGOs for phrase deletion
  const punctLegoIds = punctLegos.map(l => l.lego_id);

  // Build a set of (seed_number, lego_index) pairs from punctuation LEGOs for filtering
  const punctLegoSet = new Set(punctLegos.map(l => {
    const match = l.lego_id.match(/S(\d+)L(\d+)/);
    if (match) {
      return `${parseInt(match[1], 10)}_${parseInt(match[2], 10)}`;
    }
    return null;
  }).filter(Boolean));

  // Find orphaned punctuation phrases (not tied to punct-only LEGOs)
  const orphanPunctPhrases = punctPhrases.filter(p => {
    const key = `${p.seed_number}_${p.lego_index}`;
    return !punctLegoSet.has(key);
  });

  console.log('\n=== Summary ===');
  console.log(`Punctuation-only LEGOs to delete: ${punctLegos.length}`);
  console.log(`Phrases associated with punct LEGOs: will be deleted`);
  console.log(`Orphan punctuation-only phrases to delete: ${orphanPunctPhrases.length}`);

  if (punctLegos.length === 0 && orphanPunctPhrases.length === 0) {
    console.log('\nNo punctuation-only records found. Database is clean!');
    return;
  }

  console.log('\n=== Executing Deletions ===');

  // Step 3: Delete phrases associated with punctuation-only LEGOs first
  const phrasesDeletedFromLegos = await deletePhrasesByLegoIds(punctLegoIds);

  // Step 4: Delete the punctuation-only LEGOs
  const legosDeleted = await deleteLegos(punctLegos);

  // Step 5: Delete orphaned punctuation-only phrases
  const orphanPhrasesDeleted = await deleteOrphanedPhrases(orphanPunctPhrases);

  console.log('\n=== Final Results ===');
  console.log(`LEGOs deleted: ${legosDeleted}`);
  console.log(`Phrases deleted from punct LEGOs: ${phrasesDeletedFromLegos}`);
  console.log(`Orphan punctuation phrases deleted: ${orphanPhrasesDeleted}`);
  console.log(`Total records removed: ${legosDeleted + phrasesDeletedFromLegos + orphanPhrasesDeleted}`);
  console.log('\nCleanup complete!');
}

main().catch(console.error);

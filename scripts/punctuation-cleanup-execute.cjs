/**
 * Execute: Punctuation cleanup for Japanese course
 *
 * ONLY trailing punctuation - strips from end of text, not middle
 *
 * 1. LEGO target_text - strip trailing punctuation
 * 2. LEGO components - remove punctuation-only entries
 * 3. Practice phrases - delete punctuation-only, strip trailing from others
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Trailing punctuation to strip (CJK and Western sentence-ending)
const TRAILING_PUNCT_REGEX = /[。？！、，.!?,]+$/;
const PUNCT_ONLY_REGEX = /^[。？！、，.!?,;:()（）「」『』\[\]]+$/;

async function execute() {
  const courseCode = 'jpn_for_eng';

  console.log('=== EXECUTING: Punctuation Cleanup for', courseCode, '===\n');

  // 1. LEGOs - strip trailing punctuation from target_text
  console.log('--- Step 1: LEGO target_text ---');
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, known_text, target_text, components')
    .eq('course_code', courseCode)
    .lte('seed_number', 260);

  if (legosError) {
    console.error('Error fetching LEGOs:', legosError);
    return;
  }

  let legoUpdates = 0;
  let componentUpdates = 0;

  for (const lego of legos) {
    const oldTarget = lego.target_text || '';
    const newTarget = oldTarget.replace(TRAILING_PUNCT_REGEX, '');

    // Check if components need cleaning
    let newComponents = lego.components;
    let componentsChanged = false;

    if (lego.components && Array.isArray(lego.components)) {
      const filtered = lego.components.filter(c =>
        !PUNCT_ONLY_REGEX.test((c.target || '').trim())
      );
      if (filtered.length !== lego.components.length) {
        newComponents = filtered;
        componentsChanged = true;
      }
    }

    // Update if either changed
    if (oldTarget !== newTarget || componentsChanged) {
      const updateData = {};
      if (oldTarget !== newTarget) {
        updateData.target_text = newTarget;
      }
      if (componentsChanged) {
        updateData.components = newComponents;
      }

      const { error: updateError } = await supabase
        .from('course_legos')
        .update(updateData)
        .eq('lego_id', lego.lego_id)
        .eq('course_code', courseCode);

      if (updateError) {
        console.error(`Error updating ${lego.lego_id}:`, updateError);
      } else {
        if (oldTarget !== newTarget) legoUpdates++;
        if (componentsChanged) componentUpdates++;
      }
    }
  }

  console.log(`Updated ${legoUpdates} LEGO target_text fields`);
  console.log(`Updated ${componentUpdates} LEGO components arrays`);

  // 2. Practice phrases - delete punctuation-only, strip trailing from others
  console.log('\n--- Step 2: Practice phrases ---');
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .lte('seed_number', 260);

  if (phrasesError) {
    console.error('Error fetching phrases:', phrasesError);
    return;
  }

  let phrasesDeleted = 0;
  let phrasesUpdated = 0;

  for (const phrase of phrases) {
    // Check if punctuation-only (should delete)
    if (PUNCT_ONLY_REGEX.test((phrase.target_text || '').trim())) {
      const { error: deleteError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('id', phrase.id);

      if (deleteError) {
        console.error(`Error deleting phrase ${phrase.id}:`, deleteError);
      } else {
        phrasesDeleted++;
      }
      continue;
    }

    // Check if has trailing punctuation (should strip)
    const oldTarget = phrase.target_text || '';
    const newTarget = oldTarget.replace(TRAILING_PUNCT_REGEX, '');

    if (oldTarget !== newTarget) {
      const { error: updateError } = await supabase
        .from('course_practice_phrases')
        .update({ target_text: newTarget })
        .eq('id', phrase.id);

      if (updateError) {
        console.error(`Error updating phrase ${phrase.id}:`, updateError);
      } else {
        phrasesUpdated++;
      }
    }
  }

  console.log(`Deleted ${phrasesDeleted} punctuation-only phrases`);
  console.log(`Updated ${phrasesUpdated} phrase target_text fields`);

  // Summary
  console.log('\n========================================');
  console.log('=== COMPLETE ===');
  console.log('========================================');
  console.log('LEGO target_text stripped:', legoUpdates);
  console.log('LEGO components cleaned:', componentUpdates);
  console.log('Phrases deleted:', phrasesDeleted);
  console.log('Phrases stripped:', phrasesUpdated);
  console.log('\nTotal changes:', legoUpdates + componentUpdates + phrasesDeleted + phrasesUpdated);
}

execute().catch(console.error);

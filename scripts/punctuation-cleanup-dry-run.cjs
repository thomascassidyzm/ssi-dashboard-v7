/**
 * Dry run: Punctuation cleanup for Japanese course
 *
 * This script analyzes what would be changed:
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

// Punctuation to strip (CJK and Western sentence-ending)
const PUNCT_REGEX = /[。？！、，.!?,]+$/;
const PUNCT_ONLY_REGEX = /^[。？！、，.!?,;:()（）「」『』\[\]]+$/;

async function dryRun() {
  const courseCode = 'jpn_for_eng';

  console.log('=== DRY RUN: Punctuation Cleanup for', courseCode, '===\n');

  // 1. LEGOs - find those with trailing punctuation
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, known_text, target_text, components')
    .eq('course_code', courseCode)
    .lte('seed_number', 260);

  if (legosError) {
    console.error('Error fetching LEGOs:', legosError);
    return;
  }

  const legoChanges = [];
  const componentChanges = [];

  for (const lego of legos) {
    const oldTarget = lego.target_text || '';
    const newTarget = oldTarget.replace(PUNCT_REGEX, '');

    if (oldTarget !== newTarget) {
      legoChanges.push({
        lego_id: lego.lego_id,
        old: oldTarget,
        new: newTarget
      });
    }

    // Check components for punctuation entries
    if (lego.components && Array.isArray(lego.components)) {
      const punctComponents = lego.components.filter(c =>
        PUNCT_ONLY_REGEX.test((c.target || '').trim())
      );
      if (punctComponents.length > 0) {
        componentChanges.push({
          lego_id: lego.lego_id,
          punctComponents: punctComponents,
          totalComponents: lego.components.length,
          newComponentCount: lego.components.length - punctComponents.length
        });
      }
    }
  }

  console.log('--- LEGO TARGET TEXT CHANGES ---');
  console.log('LEGOs to update:', legoChanges.length);
  console.log('\nSample changes:');
  legoChanges.slice(0, 15).forEach(c => {
    console.log(`  ${c.lego_id}: "${c.old}" → "${c.new}"`);
  });
  if (legoChanges.length > 15) {
    console.log(`  ... and ${legoChanges.length - 15} more`);
  }

  console.log('\n--- LEGO COMPONENT CHANGES ---');
  console.log('LEGOs with punctuation components:', componentChanges.length);
  console.log('\nAll punctuation components to remove:');
  componentChanges.forEach(c => {
    console.log(`  ${c.lego_id}: removing ${c.punctComponents.map(p => `"${p.known}"→"${p.target}"`).join(', ')}`);
  });

  // 2. Practice phrases - find those with trailing punctuation
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .lte('seed_number', 260);

  if (phrasesError) {
    console.error('Error fetching phrases:', phrasesError);
    return;
  }

  const phraseChanges = [];
  const phrasesToDelete = [];

  for (const phrase of phrases) {
    // Check if punctuation-only (should delete)
    if (PUNCT_ONLY_REGEX.test((phrase.target_text || '').trim())) {
      phrasesToDelete.push({
        id: phrase.id,
        seed_number: phrase.seed_number,
        known: phrase.known_text,
        target: phrase.target_text
      });
      continue;
    }

    // Check if has trailing punctuation (should strip)
    const oldTarget = phrase.target_text || '';
    const newTarget = oldTarget.replace(PUNCT_REGEX, '');

    if (oldTarget !== newTarget) {
      phraseChanges.push({
        id: phrase.id,
        seed_number: phrase.seed_number,
        old: oldTarget,
        new: newTarget
      });
    }
  }

  console.log('\n--- PRACTICE PHRASES TO DELETE (punctuation-only) ---');
  console.log('Phrases to delete:', phrasesToDelete.length);
  phrasesToDelete.forEach(p => {
    console.log(`  S${p.seed_number}: "${p.known}" → "${p.target}"`);
  });

  console.log('\n--- PRACTICE PHRASE TARGET TEXT CHANGES ---');
  console.log('Phrases to update:', phraseChanges.length);
  console.log('\nSample changes:');
  phraseChanges.slice(0, 15).forEach(c => {
    console.log(`  S${c.seed_number}: "${c.old}" → "${c.new}"`);
  });
  if (phraseChanges.length > 15) {
    console.log(`  ... and ${phraseChanges.length - 15} more`);
  }

  // Summary
  console.log('\n========================================');
  console.log('=== SUMMARY ===');
  console.log('========================================');
  console.log('LEGO target_text updates:', legoChanges.length);
  console.log('LEGO component cleanups:', componentChanges.length);
  console.log('Practice phrases to DELETE:', phrasesToDelete.length);
  console.log('Practice phrase target_text updates:', phraseChanges.length);
  console.log('\nTotal database operations:',
    legoChanges.length + componentChanges.length + phrasesToDelete.length + phraseChanges.length);
}

dryRun().catch(console.error);

#!/usr/bin/env node
/**
 * Sync eng_for_fra course seeds from canonical translations
 * - known_text = French translation with {target} → "anglais"
 * - target_text = English canonical with {target} → "English"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncCourse() {
  console.log('Fetching canonical French translations...');

  // Get all French canonical translations
  const { data: fraTranslations, error: fraError } = await supabase
    .from('canonical_seed_translations')
    .select('seed_number, translated_text')
    .eq('language_code', 'fra');

  if (fraError) {
    console.error('Error fetching French translations:', fraError);
    process.exit(1);
  }

  // Build map: seed_number → French text (with {target} → anglais)
  const frenchMap = {};
  fraTranslations.forEach(t => {
    let french = t.translated_text || '';
    // Replace {target} with "anglais"
    french = french.replace(/\{target\}/g, 'anglais');
    // Fix article: "le anglais" → "l'anglais"
    french = french.replace(/le anglais/gi, "l'anglais");
    french = french.replace(/de anglais/gi, "d'anglais");
    frenchMap[t.seed_number] = french;
  });

  console.log(`Built French map with ${Object.keys(frenchMap).length} entries`);

  // Get English canonical seeds
  const { data: canonical, error: canError } = await supabase
    .from('canonical_seeds')
    .select('seed_number, source_text');

  if (canError) {
    console.error('Error fetching canonical seeds:', canError);
    process.exit(1);
  }

  // Build map: seed_number → English text (with {target} → English)
  const englishMap = {};
  canonical.forEach(c => {
    let english = c.source_text || '';
    english = english.replace(/\{target\}/g, 'English');
    englishMap[c.seed_number] = english;
  });

  console.log(`Built English map with ${Object.keys(englishMap).length} entries`);

  // Get all eng_for_fra course seeds
  const { data: courseSeeds, error: courseError } = await supabase
    .from('course_seeds')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_fra');

  if (courseError) {
    console.error('Error fetching course seeds:', courseError);
    process.exit(1);
  }

  console.log(`Found ${courseSeeds.length} course seeds to update`);

  let updated = 0;
  let skipped = 0;

  for (const seed of courseSeeds) {
    const french = frenchMap[seed.seed_number];
    const english = englishMap[seed.seed_number];

    if (!french) {
      skipped++;
      continue;
    }

    const updates = {};
    let needsUpdate = false;

    // Update known_text if different
    if (seed.known_text !== french) {
      updates.known_text = french;
      needsUpdate = true;
    }

    // Update target_text if different
    if (english && seed.target_text !== english) {
      updates.target_text = english;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('course_seeds')
        .update(updates)
        .eq('id', seed.id);

      if (updateError) {
        console.error(`Error updating S${seed.seed_number}:`, updateError);
      } else {
        updated++;
        if (updated <= 5 || updated % 100 === 0) {
          console.log(`S${String(seed.seed_number).padStart(4, '0')}: Updated`);
        }
      }
    }
  }

  console.log(`\nUpdated ${updated} seeds, skipped ${skipped} (no French)`);

  // Verify a few samples
  console.log('\nVerifying samples:');
  const { data: samples } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_fra')
    .in('seed_number', [1, 283, 400, 668]);

  samples.forEach(s => {
    console.log(`S${String(s.seed_number).padStart(4, '0')}:`);
    console.log(`  known: ${s.known_text}`);
    console.log(`  target: ${s.target_text}`);
  });
}

syncCourse().catch(console.error);

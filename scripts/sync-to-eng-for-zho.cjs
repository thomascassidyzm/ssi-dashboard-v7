#!/usr/bin/env node
/**
 * Sync Chinese translations from zho_for_eng.target_text to eng_for_zho.known_text
 * This ensures both courses share the same Chinese translations.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncTranslations() {
  console.log('Syncing Chinese translations from zho_for_eng to eng_for_zho...\n');

  // Get all zho_for_eng seeds with target_text
  const { data: zhoSeeds, error: zhoError } = await supabase
    .from('course_seeds')
    .select('seed_number, target_text')
    .eq('course_code', 'zho_for_eng')
    .neq('target_text', '')
    .order('seed_number');

  if (zhoError) {
    console.error('Error fetching zho_for_eng seeds:', zhoError);
    return;
  }

  console.log(`Found ${zhoSeeds.length} seeds with Chinese translations in zho_for_eng`);

  // Get eng_for_zho seeds to check which need updating
  const { data: engSeeds, error: engError } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', 'eng_for_zho')
    .order('seed_number');

  if (engError) {
    console.error('Error fetching eng_for_zho seeds:', engError);
    return;
  }

  // Create a map for quick lookup
  const engSeedMap = new Map(engSeeds.map(s => [s.seed_number, s.known_text]));

  // Find seeds that need updating (empty known_text in eng_for_zho)
  const toUpdate = zhoSeeds.filter(s => {
    const existingKnown = engSeedMap.get(s.seed_number);
    return !existingKnown || existingKnown === '';
  });

  console.log(`${toUpdate.length} seeds need updating in eng_for_zho\n`);

  if (toUpdate.length === 0) {
    console.log('All seeds already synced!');
    return;
  }

  // Update in batches
  const batchSize = 50;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);

    for (const seed of batch) {
      const { error } = await supabase
        .from('course_seeds')
        .update({ known_text: seed.target_text })
        .eq('course_code', 'eng_for_zho')
        .eq('seed_number', seed.seed_number);

      if (error) {
        console.error(`Error updating seed ${seed.seed_number}:`, error);
      } else {
        updated++;
      }
    }

    console.log(`Updated ${Math.min(i + batchSize, toUpdate.length)}/${toUpdate.length} seeds...`);
  }

  console.log(`\nSync complete! Updated ${updated} seeds in eng_for_zho`);
}

syncTranslations().catch(console.error);

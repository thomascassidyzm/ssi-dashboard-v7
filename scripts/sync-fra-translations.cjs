#!/usr/bin/env node
/**
 * Sync French translations from fra_for_eng to eng_for_fra
 * fra_for_eng: known_text=English, target_text=French
 * eng_for_fra: known_text=French, target_text=English
 *
 * Copy fra_for_eng.target_text → eng_for_fra.known_text
 * Also fix {target} placeholder: "français" → "anglais"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncTranslations() {
  // Get fra_for_eng seeds (source of French)
  console.log('Fetching fra_for_eng seeds...');
  const { data: fraSeeds, error: fraError } = await supabase
    .from('course_seeds')
    .select('seed_number, target_text')
    .eq('course_code', 'fra_for_eng');

  if (fraError) {
    console.error('Error fetching fra_for_eng:', fraError);
    process.exit(1);
  }

  // Build map of seed_number → French text
  const frenchMap = {};
  fraSeeds.forEach(s => {
    // Fix language name: français → anglais
    let french = s.target_text || '';
    french = french.replace(/français/gi, 'anglais');
    french = french.replace(/le anglais/gi, "l'anglais");
    frenchMap[s.seed_number] = french;
  });

  console.log(`Found ${Object.keys(frenchMap).length} French translations`);

  // Get eng_for_fra seeds that need known_text
  const { data: engSeeds, error: engError } = await supabase
    .from('course_seeds')
    .select('id, seed_number, known_text')
    .eq('course_code', 'eng_for_fra')
    .or('known_text.is.null,known_text.eq.');

  if (engError) {
    console.error('Error fetching eng_for_fra:', engError);
    process.exit(1);
  }

  console.log(`Found ${engSeeds.length} eng_for_fra seeds needing French`);

  let updated = 0;
  let missing = 0;

  for (const seed of engSeeds) {
    const french = frenchMap[seed.seed_number];
    if (!french) {
      missing++;
      console.log(`S${String(seed.seed_number).padStart(4, '0')}: No French translation available`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('course_seeds')
      .update({ known_text: french })
      .eq('id', seed.id);

    if (updateError) {
      console.error(`Error updating S${seed.seed_number}:`, updateError);
    } else {
      updated++;
      if (updated <= 5 || updated % 50 === 0) {
        console.log(`S${String(seed.seed_number).padStart(4, '0')}: ${french.substring(0, 50)}...`);
      }
    }
  }

  console.log(`\nUpdated ${updated} seeds, ${missing} missing French translations`);
}

syncTranslations().catch(console.error);

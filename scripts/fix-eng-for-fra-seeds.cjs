#!/usr/bin/env node
/**
 * Fix eng_for_fra seeds:
 * - target_text: "eng" → "English"
 * - known_text: "français" → "anglais"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSeeds() {
  console.log('Fetching eng_for_fra seeds...');

  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_fra');

  if (error) {
    console.error('Error fetching seeds:', error);
    process.exit(1);
  }

  console.log(`Found ${seeds.length} seeds`);

  let fixedCount = 0;

  for (const seed of seeds) {
    let needsUpdate = false;
    const updates = {};

    // Fix target_text: replace " eng " or " eng" or "eng " with "English"
    if (seed.target_text && (
      seed.target_text.includes(' eng ') ||
      seed.target_text.includes(' eng.') ||
      seed.target_text.match(/\beng\b/)
    )) {
      updates.target_text = seed.target_text
        .replace(/\beng\b/g, 'English');
      needsUpdate = true;
    }

    // Fix known_text: replace "français" with "anglais"
    if (seed.known_text && seed.known_text.includes('français')) {
      updates.known_text = seed.known_text
        .replace(/français/gi, 'anglais')
        .replace(/le anglais/gi, "l'anglais");  // Fix article
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('course_seeds')
        .update(updates)
        .eq('id', seed.id);

      if (updateError) {
        console.error(`Error updating seed ${seed.seed_number}:`, updateError);
      } else {
        fixedCount++;
        console.log(`S${String(seed.seed_number).padStart(4, '0')}: ${JSON.stringify(updates)}`);
      }
    }
  }

  console.log(`\nFixed ${fixedCount} seeds`);
}

fixSeeds().catch(console.error);

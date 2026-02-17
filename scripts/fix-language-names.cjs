#!/usr/bin/env node
/**
 * Fix language name placeholders in eng_for_zho course:
 * - Replace "eng" with "English" in target_text
 * - Replace "中文" with "英语" in known_text
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixLanguageNames() {
  console.log('Fixing language names in eng_for_zho...\n');

  // Get all eng_for_zho seeds
  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_zho')
    .order('seed_number');

  if (error) {
    console.error('Error fetching seeds:', error);
    return;
  }

  let fixedTarget = 0;
  let fixedKnown = 0;

  for (const seed of seeds) {
    const updates = {};

    // Fix target_text: "eng" -> "English"
    if (seed.target_text && /\beng\b/i.test(seed.target_text)) {
      updates.target_text = seed.target_text.replace(/\beng\b/gi, 'English');
      fixedTarget++;
    }

    // Fix known_text: "中文" -> "英语"
    if (seed.known_text && seed.known_text.includes('中文')) {
      updates.known_text = seed.known_text.replace(/中文/g, '英语');
      fixedKnown++;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('course_seeds')
        .update(updates)
        .eq('course_code', 'eng_for_zho')
        .eq('seed_number', seed.seed_number);

      if (updateError) {
        console.error(`Error updating seed ${seed.seed_number}:`, updateError);
      } else {
        console.log(`Fixed seed ${seed.seed_number}:`, updates);
      }
    }
  }

  console.log(`\nFixed ${fixedTarget} target_text entries (eng -> English)`);
  console.log(`Fixed ${fixedKnown} known_text entries (中文 -> 英语)`);
}

fixLanguageNames().catch(console.error);

#!/usr/bin/env node
/**
 * Fix canonical French translations:
 * Replace hardcoded "français" with {target} placeholder
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTranslations() {
  console.log('Fetching French canonical translations...');

  const { data: translations, error } = await supabase
    .from('canonical_seed_translations')
    .select('id, seed_number, translated_text')
    .eq('language_code', 'fra');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Found ${translations.length} French translations`);

  let fixed = 0;
  for (const t of translations) {
    if (t.translated_text && t.translated_text.includes('français')) {
      // Replace français/Français with {target}
      let newText = t.translated_text
        .replace(/le français/gi, '{target}')
        .replace(/en français/gi, 'en {target}')
        .replace(/français/gi, '{target}');

      // Clean up "le {target}" → "{target}" where article is wrong
      // But keep "en {target}" as is

      const { error: updateError } = await supabase
        .from('canonical_seed_translations')
        .update({ translated_text: newText })
        .eq('id', t.id);

      if (updateError) {
        console.error(`Error updating S${t.seed_number}:`, updateError);
      } else {
        fixed++;
        console.log(`S${String(t.seed_number).padStart(4, '0')}: "${t.translated_text}" → "${newText}"`);
      }
    }
  }

  console.log(`\nFixed ${fixed} translations`);
}

fixTranslations().catch(console.error);

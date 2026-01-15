#!/usr/bin/env node
/**
 * Apply seed translations from seed-translations-final.json to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function applyTranslations() {
  // Load translations
  const jsonPath = path.join(__dirname, 'seed-translations-final.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('APPLYING SEED TRANSLATIONS\n');
  console.log('Course:', COURSE_CODE);
  console.log('Translations to apply:', data.translations.length);
  console.log('');

  let updated = 0;
  let errors = 0;

  for (const t of data.translations) {
    // Update the seed
    const { error } = await supabase
      .from('course_seeds')
      .update({ target_text: t.target_text })
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', t.seed);

    if (error) {
      console.log(`❌ S${String(t.seed).padStart(4, '0')}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ S${String(t.seed).padStart(4, '0')}: "${t.english}" → "${t.target_text}"`);
      updated++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);

  return { updated, errors };
}

applyTranslations().catch(console.error);

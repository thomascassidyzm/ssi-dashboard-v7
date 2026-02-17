#!/usr/bin/env node
/**
 * Load French translations into canonical_seed_translations table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function loadTranslations() {
  // Load all batch files
  const batches = [
    'scripts/fra-translations-batch1.json',
    'scripts/fra-translations-batch2.json',
    'scripts/fra-translations-batch3.json',
    'scripts/fra-translations-batch4.json'
  ];

  let allTranslations = [];
  for (const file of batches) {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    allTranslations = allTranslations.concat(data);
  }

  console.log(`Loaded ${allTranslations.length} translations from batch files`);

  // Prepare records for insertion
  const records = allTranslations.map(t => ({
    seed_number: t.seed_number,
    language_code: 'fra',
    translated_text: t.translated_text,
    source_course: 'eng_for_fra'  // Track where this came from
  }));

  // Insert in chunks of 100
  const chunkSize = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const { error } = await supabase
      .from('canonical_seed_translations')
      .upsert(chunk, {
        onConflict: 'seed_number,language_code',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Error inserting chunk at ${i}:`, error);
    } else {
      inserted += chunk.length;
      console.log(`Inserted ${inserted}/${records.length}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} French translations`);

  // Verify count
  const { count } = await supabase
    .from('canonical_seed_translations')
    .select('*', { count: 'exact', head: true })
    .eq('language_code', 'fra');

  console.log(`Total French translations in database: ${count}`);
}

loadTranslations().catch(console.error);

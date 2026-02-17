#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insertGenderVariants() {
  // Read the gender variants we just created
  const results = JSON.parse(fs.readFileSync('/tmp/gender_variants_ita_29.json', 'utf8'));

  console.log(`\n🚀 Inserting ${results.length} gender variants into Supabase...\n`);

  // Transform for database insertion
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  try {
    // Try a simple insert first
    const { data, error } = await supabase
      .from('course_gender_expansions')
      .insert(rows);

    if (error) {
      console.error(`❌ Error inserting:`, error.message);
      console.error('Details:', error);
      process.exit(1);
    }

    console.log(`\n✨ Successfully inserted ${rows.length} gender expansions for ita_for_eng\n`);
    console.log('Details:');
    results.forEach((r, idx) => {
      console.log(`  ${idx + 1}. "${r.original}"`);
      console.log(`     → Feminine: "${r.expanded_f}"`);
      console.log(`     → Masculine: "${r.expanded_m}"`);
    });

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

insertGenderVariants();

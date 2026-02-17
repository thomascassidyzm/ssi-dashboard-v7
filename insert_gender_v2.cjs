#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Results from batch analysis
const results = [
  {
    course_code: 'por_for_eng',
    original_text: 'Ainda não estou pronto para começar.',
    language: 'por',
    expanded_f: 'Ainda não estou pronta para começar.',
    expanded_m: 'Ainda não estou pronto para começar.'
  }
];

async function insertVariants() {
  console.log(`Inserting ${results.length} gender expansion(s)...`);

  // Prepare rows for insertion
  const rows = results.map(r => ({
    course_code: r.course_code,
    original_text: r.original_text,
    language: r.language,
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  try {
    // Insert with UPSERT - try without onConflict first
    const { data, error } = await supabase
      .from('course_gender_expansions')
      .upsert(rows);

    if (error) {
      console.error('❌ Insert error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${results.length} gender expansion(s)`);
    console.log('\nVariants inserted:');
    results.forEach(r => {
      console.log(`  • "${r.original_text}"`);
      console.log(`    Female: "${r.expanded_f}"`);
      console.log(`    Male:   "${r.expanded_m}"`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertVariants();

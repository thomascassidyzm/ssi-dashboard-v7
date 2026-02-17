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
    // Insert in batches of 500 with UPSERT to handle parallel agents
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, Math.min(i + 500, rows.length));

      const { data, error } = await supabase
        .from('course_gender_expansions')
        .upsert(batch, { onConflict: 'course_code,original_text' });

      if (error) {
        console.error(`❌ Error inserting batch ${i / 500 + 1}:`, error.message);
        process.exit(1);
      }

      totalInserted += batch.length;
      console.log(`✅ Batch ${i / 500 + 1}: inserted ${batch.length} rows`);
    }

    console.log(`\n✨ Successfully inserted ${totalInserted} gender expansions for ita_for_eng\n`);
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

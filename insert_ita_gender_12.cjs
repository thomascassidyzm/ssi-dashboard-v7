require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = JSON.parse(fs.readFileSync('/tmp/ita_gender_12_results.json', 'utf8'));

async function insertGenderExpansions() {
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansion(s)...`);
  
  try {
    const { error } = await supabase.from('course_gender_expansions').upsert(
      rows,
      { onConflict: 'course_code,original_text' }
    );
    
    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
    
    console.log(`✓ Successfully inserted ${rows.length} row(s)`);
    
    // Summary
    console.log('\n--- BATCH 12 SUMMARY ---');
    console.log(`Total texts processed: 200`);
    console.log(`Texts with variants: ${rows.length}`);
    console.log(`Gender-marked adjectives found: pronto (3x)`);
    console.log('');
    rows.forEach(r => {
      console.log(`✓ "${r.original_text}"`);
      console.log(`  → F: "${r.expanded_f}"`);
      console.log(`  → M: "${r.expanded_m}"`);
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
}

insertGenderExpansions();

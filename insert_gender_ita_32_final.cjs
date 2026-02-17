require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insertVariants() {
  const results = JSON.parse(fs.readFileSync('/tmp/gender_variants_ita_32.json', 'utf8'));
  
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions...`);
  
  // Try simple insert
  const { error } = await supabase
    .from('course_gender_expansions')
    .insert(rows);
  
  if (error) {
    console.error('Insert error:', error.message);
    // Try one by one to see which ones fail
    for (const row of rows) {
      const { error: e } = await supabase
        .from('course_gender_expansions')
        .insert([row]);
      if (e) {
        console.error(`Failed to insert "${row.original_text}":`, e.message);
      } else {
        console.log(`✓ Inserted: "${row.original_text}"`);
      }
    }
  } else {
    console.log(`✓ All ${rows.length} gender expansions inserted successfully`);
  }
}

insertVariants().catch(err => console.error('Fatal error:', err.message));

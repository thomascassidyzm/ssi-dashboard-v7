require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insertResults() {
  const fs = require('fs');
  const results = JSON.parse(fs.readFileSync('/tmp/gender_results_ita_batch3.json', 'utf8'));
  
  if (results.length === 0) {
    console.log('No results to insert.');
    return;
  }
  
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));
  
  console.log(`Inserting ${rows.length} gender expansions into Supabase...\n`);
  
  try {
    const { data, error } = await supabase.from('course_gender_expansions').upsert(
      rows,
      { onConflict: 'course_code,original_text' }
    );
    
    if (error) {
      console.error('❌ Insert error:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Successfully inserted gender expansions:');
    rows.forEach(row => {
      console.log(`  Original: "${row.original_text}"`);
      console.log(`  Female:   "${row.expanded_f}"`);
      console.log(`  Male:     "${row.expanded_m}"\n`);
    });
    
    console.log(`✅ Inserted ${rows.length} rows into course_gender_expansions`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertResults();

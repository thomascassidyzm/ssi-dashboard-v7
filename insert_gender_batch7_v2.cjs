require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function insertGenderExpansions() {
  const results = JSON.parse(fs.readFileSync('/tmp/gender_results_batch7.json', 'utf8'));
  
  console.log(`Preparing to insert ${results.length} gender expansions...\n`);

  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  // Use regular insert instead of upsert
  if (rows.length > 0) {
    const { error, data } = await supabase
      .from('course_gender_expansions')
      .insert(rows);
    
    if (error) {
      console.error('Insert error:', error.message);
      if (error.code === '23505') {
        console.log('(duplicate key - may already exist in database)');
      }
      return;
    }
    
    console.log(`✓ Successfully inserted ${rows.length} gender expansions`);
    rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.original_text}`);
      console.log(`     F: ${row.expanded_f}`);
      console.log(`     M: ${row.expanded_m}`);
    });
  } else {
    console.log('No gender expansions to insert');
  }
}

insertGenderExpansions().catch(err => console.error(err));

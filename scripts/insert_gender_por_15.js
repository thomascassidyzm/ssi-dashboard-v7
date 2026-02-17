require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const results = JSON.parse(fs.readFileSync('/tmp/gender_results_por_15.json', 'utf8'));

async function insert() {
  if (results.length === 0) {
    console.log('No results to insert.');
    return;
  }

  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions...`);

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('course_gender_expansions').upsert(
      batch,
      { onConflict: 'course_code,original_text' }
    );
    
    if (error) {
      console.error(`Batch ${i/500 + 1} error:`, error.message);
    } else {
      console.log(`✓ Inserted batch ${i/500 + 1} (${batch.length} rows)`);
    }
  }

  console.log(`\n✓ Completed: ${rows.length} gender expansions inserted`);
}

insert().catch(err => console.error('Fatal error:', err.message));

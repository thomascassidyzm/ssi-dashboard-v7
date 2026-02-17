require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insertGenderExpansions() {
  const results = JSON.parse(fs.readFileSync('/tmp/gender_batch_ita_27_results.json', 'utf8'));
  
  console.log(`Inserting ${results.length} gender expansions for ita_for_eng...\n`);
  
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));
  
  let inserted = 0;
  let errors = 0;
  
  // Try standard insert first
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error, data } = await supabase
      .from('course_gender_expansions')
      .insert(batch);
    
    if (error) {
      console.error(`Batch ${Math.floor(i / 500) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`✓ Batch ${Math.floor(i / 500) + 1}: ${batch.length} rows`);
    }
  }
  
  console.log(`\n✅ Insertion complete!`);
  console.log(`Total inserted: ${inserted} rows`);
  if (errors > 0) console.log(`Errors: ${errors}`);
}

insertGenderExpansions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

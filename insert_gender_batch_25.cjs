require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const results = JSON.parse(fs.readFileSync('/tmp/gender_batch_25_results.json', 'utf8'));

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function insertResults() {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log('Inserting ' + rows.length + ' gender expansions...\n');

  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);

  if (error) {
    console.error('❌ Insert error:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ Successfully inserted ' + rows.length + ' gender expansions\n');
    console.log('INSERTED RECORDS:');
    rows.forEach((r, i) => {
      console.log((i+1) + '. ' + r.original_text);
      console.log('   F: ' + r.expanded_f);
      console.log('   M: ' + r.expanded_m);
    });
  }
}

insertResults().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

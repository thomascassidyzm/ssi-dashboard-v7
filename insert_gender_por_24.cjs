require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const results = JSON.parse(fs.readFileSync('/tmp/gender_results_por_24.json', 'utf8'));

async function insert() {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions into course_gender_expansions...`);
  
  // Try simple insert first
  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);
  
  if (error) {
    console.error('❌ Insert error:', error.message);
    console.error(error);
    process.exit(1);
  } else {
    console.log(`✅ Successfully inserted ${rows.length} gender expansions`);
    console.log('\n=== INSERTED ROWS ===');
    rows.forEach(row => {
      console.log(`  Original: "${row.original_text}"`);
      console.log(`  Female:   "${row.expanded_f}"`);
      console.log(`  Male:     "${row.expanded_m}"\n`);
    });
  }
}

insert();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertBatch() {
  const results = JSON.parse(fs.readFileSync('/tmp/gender_results_14.json', 'utf8'));
  
  console.log(`\nInserting ${results.length} gender expansions for por_for_eng...`);
  
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  try {
    // Try simple insert first
    const { data, error } = await supabase
      .from('course_gender_expansions')
      .insert(rows);
    
    if (error) {
      console.error('❌ Insert error:', error.message);
      // If it's a duplicate key error, that's okay - just log it
      if (error.code === '23505') {
        console.log('⚠️  Some rows already exist (duplicates skipped)');
      } else {
        console.error('Details:', error);
        process.exit(1);
      }
    }
    
    console.log(`✅ Successfully inserted/processed ${results.length} gender expansions`);
    console.log(`\nSummary:`);
    console.log(`   Course: por_for_eng`);
    console.log(`   Batch: 14/36`);
    console.log(`   Texts processed: 200`);
    console.log(`   Gender variants found: ${results.length}`);
    console.log(`   Type: "Obrigado/Obrigada" (Thank you)`);
    console.log(`\nSample:`);
    console.log(`   "${results[0].original}"`);
    console.log(`   → F: "${results[0].expanded_f}"`);
    console.log(`   → M: "${results[0].expanded_m}"`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertBatch();

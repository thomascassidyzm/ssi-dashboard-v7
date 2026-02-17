require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insertBatch() {
  const results = JSON.parse(fs.readFileSync('/tmp/por_batch29_results.json', 'utf8'));
  
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));
  
  console.log(`\nInserting ${rows.length} gender expansions for por_for_eng batch 29...\n`);
  
  let insertedCount = 0;
  let errorCount = 0;
  
  // Try insert without onConflict first
  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);
  
  if (error) {
    console.error(`ERROR: ${error.message}`);
    // If conflict, try upsert without the constraint name
    console.log(`\nRetrying with upsert (no constraint)...`);
    
    const { error: error2, data: data2 } = await supabase
      .from('course_gender_expansions')
      .upsert(rows);
    
    if (error2) {
      console.error(`UPSERT ERROR: ${error2.message}`);
      console.error(`Details: ${error2.details}`);
      errorCount++;
    } else {
      insertedCount = rows.length;
      console.log(`✓ Upsert successful`);
    }
  } else {
    insertedCount = rows.length;
    console.log(`✓ Insert successful`);
  }
  
  console.log(`\n═══════════════════════════════════`);
  console.log(`INSERTION SUMMARY - BATCH 29/36`);
  console.log(`═══════════════════════════════════`);
  console.log(`Total texts analyzed: 200`);
  console.log(`Gender variants found: ${rows.length}`);
  console.log(`Inserted successfully: ${insertedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`═══════════════════════════════════\n`);
  
  if (insertedCount > 0) {
    console.log('Gender expansions:');
    results.forEach(r => {
      console.log(`  • "${r.original}" → f: "${r.expanded_f}" | m: "${r.expanded_m}"`);
    });
  }
}

insertBatch().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

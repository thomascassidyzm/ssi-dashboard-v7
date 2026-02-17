require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = require('/tmp/gender_variants_por_batch8.json');

async function insertVariants() {
  console.log(`\n🔄 Inserting ${results.length} gender variants into course_gender_expansions...\n`);
  
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));
  
  let inserted = 0;
  let failed = 0;
  
  // Try simple INSERT first
  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);
  
  if (error) {
    console.error(`❌ Insert failed:`, error.message);
    console.log(`\nTrying UPDATE approach instead...\n`);
    
    // Try delete-then-insert
    for (const row of rows) {
      const { error: deleteErr } = await supabase
        .from('course_gender_expansions')
        .delete()
        .match({ 
          course_code: row.course_code,
          original_text: row.original_text
        });
      
      const { error: insertErr } = await supabase
        .from('course_gender_expansions')
        .insert(row);
      
      if (insertErr) {
        console.error(`❌ Failed to insert: "${row.original_text}"`, insertErr.message);
        failed++;
      } else {
        inserted++;
      }
    }
  } else {
    inserted = rows.length;
    console.log(`✅ Inserted ${inserted} rows in single batch`);
  }
  
  console.log(`\n📊 Final Results:`);
  console.log(`  Inserted: ${inserted} variants`);
  console.log(`  Failed: ${failed} variants`);
  console.log(`  Total: ${inserted + failed}`);
  console.log(`\n✨ Batch 8/36 complete!\n`);
}

insertVariants().catch(console.error);

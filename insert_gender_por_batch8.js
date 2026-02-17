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
  
  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error, data } = await supabase
      .from('course_gender_expansions')
      .upsert(batch, { onConflict: 'course_code,original_text' });
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / 500) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      console.log(`✅ Batch ${Math.floor(i / 500) + 1}: Inserted ${batch.length} rows`);
      inserted += batch.length;
    }
  }
  
  console.log(`\n📊 Final Results:`);
  console.log(`  Inserted: ${inserted} variants`);
  console.log(`  Failed: ${failed} variants`);
  console.log(`  Total: ${inserted + failed}`);
  console.log(`\n✨ Batch 8/36 complete!\n`);
}

insertVariants().catch(console.error);

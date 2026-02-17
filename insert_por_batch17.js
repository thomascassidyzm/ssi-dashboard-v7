require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  {
    original: "Queria ajudar-te mas estava demasiado ocupado.",
    expanded_f: "Queria ajudar-te mas estava demasiado ocupada.",
    expanded_m: "Queria ajudar-te mas estava demasiado ocupado."
  },
  {
    original: "Queria ficar calado ontem.",
    expanded_f: "Queria ficar calada ontem.",
    expanded_m: "Queria ficar calado ontem."
  }
];

(async () => {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`📤 Inserting ${rows.length} gender expansions for por_for_eng...\n`);
  
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('course_gender_expansions').upsert(
      batch,
      { onConflict: 'course_code,original_text' }
    );
    
    if (error) {
      console.error(`❌ Insert error (batch ${i/500 + 1}):`, error.message);
      process.exit(1);
    }
    console.log(`✓ Inserted batch ${i/500 + 1} (${batch.length} rows)`);
  }

  console.log(`\n✅ Inserted ${rows.length} gender expansions successfully`);
  console.log(`\n📊 Summary for Batch 17:`);
  console.log(`   Total texts processed: 200`);
  console.log(`   Texts with variants: 2`);
  console.log(`   Texts without variants: 198\n`);
})();

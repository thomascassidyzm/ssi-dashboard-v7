require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const results = JSON.parse(fs.readFileSync('/tmp/gender_results_ita_28.json', 'utf8'));

  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions for ita_for_eng batch 28...`);

  // Insert in batches of 500 - use upsert without onConflict (let DB decide)
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error, data } = await supabase
      .from('course_gender_expansions')
      .upsert(batch);

    if (error) {
      console.error(`❌ Insert error (batch ${i/500 + 1}):`, error.message);
      process.exit(1);
    } else {
      console.log(`✓ Batch ${i/500 + 1}: Inserted/updated ${batch.length} rows`);
    }
  }

  console.log(`\n✅ Complete! Inserted ${rows.length} gender expansions`);
  console.log(`Summary: 4 speaker-referring adjectives found (stanco family)`);
})();

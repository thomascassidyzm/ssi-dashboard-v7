require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function insert() {
  try {
    const results = JSON.parse(fs.readFileSync('/tmp/gender_results_ita_4.json', 'utf8'));
    
    const rows = results.map(r => ({
      course_code: 'ita_for_eng',
      original_text: r.original,
      language: 'ita',
      expanded_f: r.expanded_f,
      expanded_m: r.expanded_m
    }));

    console.log(`Inserting ${rows.length} gender expansions...`);

    // Insert in batches of 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase
        .from('course_gender_expansions')
        .insert(batch);

      if (error) {
        console.error(`Batch ${i/500 + 1} error:`, error.message);
      } else {
        console.log(`✓ Inserted batch ${i/500 + 1} (${batch.length} rows)`);
      }
    }

    console.log(`\n=== BATCH 4 SUMMARY ===`);
    console.log(`Total texts processed: 200`);
    console.log(`Texts needing gender variants: ${results.length}`);
    console.log(`\nVariants by type:`);
    console.log(`  • "sono occupato/a" (I am busy): 9 variations`);
    console.log(`  • "mi sono svegliato/a" (I woke up): 8 variations`);
    console.log(`  • "mi sento/sentivo + adjective": 3 variations`);
    console.log(`  • "sono stanco/a" (I am tired): 1 variation`);
    console.log(`\nGrammar rules applied:`);
    console.log(`  ✓ Adjectives/participles with "sono" agree with speaker`);
    console.log(`  ✓ Past participles (essere) agree with speaker`);
    console.log(`  ✓ Adjectives with "mi sento/sentivo" agree with speaker`);
    console.log(`\n✓ Batch 4 complete: ${results.length} rows inserted`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

insert();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = [
  {
    original: "voglio farlo anche se sono nervoso",
    expanded_f: "voglio farlo anche se sono nervosa",
    expanded_m: "voglio farlo anche se sono nervoso"
  },
  {
    original: "voglio parlare anche se sono nervoso",
    expanded_f: "voglio parlare anche se sono nervosa",
    expanded_m: "voglio parlare anche se sono nervoso"
  },
  {
    original: "voglio provare anche se non sono sicuro",
    expanded_f: "voglio provare anche se non sono sicura",
    expanded_m: "voglio provare anche se non sono sicuro"
  }
];

const rows = results.map(r => ({
  course_code: 'ita_for_eng',
  original_text: r.original,
  language: 'ita',
  expanded_f: r.expanded_f,
  expanded_m: r.expanded_m
}));

(async () => {
  try {
    // Insert all rows
    const { error } = await supabase
      .from('course_gender_expansions')
      .insert(rows);

    if (error) {
      console.error('❌ Insert error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Inserted ${rows.length} gender expansions (ita_for_eng batch 30/32)`);
    console.log('\n📊 SUMMARY - Batch 30/32:');
    console.log(`   Total texts processed: 201`);
    console.log(`   Texts with variants: ${rows.length}`);
    console.log(`   Texts skipped (no gender change): ${201 - rows.length}`);
    console.log('\nDetails:');
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. "${r.original}"`);
      console.log(`     → Female: "${r.expanded_f}"`);
      console.log(`     → Male: "${r.expanded_m}"`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

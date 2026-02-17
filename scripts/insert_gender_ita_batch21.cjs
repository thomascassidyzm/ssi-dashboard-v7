require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = [
  {
    original: "molto ti sono grato",
    expanded_f: "molto ti sono grata",
    expanded_m: "molto ti sono grato"
  },
  {
    original: "non fossi pronto a fare una conversazione",
    expanded_f: "non fossi pronta a fare una conversazione",
    expanded_m: "non fossi pronto a fare una conversazione"
  },
  {
    original: "non mi sento come se fossi pronto a fare una conversazione.",
    expanded_f: "non mi sento come se fossi pronta a fare una conversazione.",
    expanded_m: "non mi sento come se fossi pronto a fare una conversazione."
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

    console.log(`✅ Inserted ${rows.length} gender expansions (ita_for_eng batch 21/32)`);
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

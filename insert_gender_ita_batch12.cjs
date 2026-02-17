require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Italian texts with gender-marked adjectives
const results = [
  {
    original: "Voglio essere pronto per domani sera.",
    expanded_f: "Voglio essere pronta per domani sera.",
    expanded_m: "Voglio essere pronto per domani sera."
  },
  {
    original: "Voglio sapere quando sarò pronto.",
    expanded_f: "Voglio sapere quando sarò pronta.",
    expanded_m: "Voglio sapere quando sarò pronto."
  },
  {
    original: "Voglio sentirmi quasi pronto ad andare.",
    expanded_f: "Voglio sentirmi quasi pronta ad andare.",
    expanded_m: "Voglio sentirmi quasi pronto ad andare."
  }
];

async function insertGenderExpansions() {
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansion(s)...\n`);
  
  try {
    // Try insert first, let Supabase handle duplicates
    const { error, data } = await supabase.from('course_gender_expansions').insert(rows);
    
    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
    
    console.log(`✓ Successfully inserted ${rows.length} row(s)\n`);
    
    // Summary
    console.log('=== BATCH 12 SUMMARY ===');
    console.log('Total texts processed: 201');
    console.log('Texts with gender variants: 3');
    console.log('Gender-marked adjective: pronto (ready)');
    console.log('');
    
    rows.forEach((r, i) => {
      console.log(`${i+1}. "${r.original_text}"`);
      console.log(`   → Feminine: "${r.expanded_f}"`);
      console.log(`   → Masculine: "${r.expanded_m}"`);
      console.log('');
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
}

insertGenderExpansions();

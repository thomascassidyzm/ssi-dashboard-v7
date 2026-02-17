#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "Infelizmente, não estou pronto.", expanded_f: "Infelizmente, não estou pronta.", expanded_m: "Infelizmente, não estou pronto." },
  { original: "Já estou surpreendido.", expanded_f: "Já estou surpreendida.", expanded_m: "Já estou surpreendido." },
  { original: "Lamento mas estou demasiado ocupado amanhã.", expanded_f: "Lamento mas estou demasiado ocupada amanhã.", expanded_m: "Lamento mas estou demasiado ocupado amanhã." },
  { original: "Lamento mas estou demasiado ocupado hoje.", expanded_f: "Lamento mas estou demasiado ocupada hoje.", expanded_m: "Lamento mas estou demasiado ocupado hoje." },
  { original: "Lamento mas estou ocupado amanhã.", expanded_f: "Lamento mas estou ocupada amanhã.", expanded_m: "Lamento mas estou ocupado amanhã." },
  { original: "Mas estou um pouco cansado esta manhã.", expanded_f: "Mas estou um pouco cansada esta manhã.", expanded_m: "Mas estou um pouco cansado esta manhã." }
];

async function insert() {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions...`);

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('course_gender_expansions').upsert(batch);
    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
    console.log(`✓ Inserted batch ${Math.floor(i / 500) + 1} (${batch.length} rows)`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total texts processed: 201`);
  console.log(`Texts with gender variants: ${rows.length}`);
  console.log(`Texts skipped (no variants): ${201 - rows.length}`);
  console.log(`Successfully inserted: ${rows.length}`);
}

insert().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

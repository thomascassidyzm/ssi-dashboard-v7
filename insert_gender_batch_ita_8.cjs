require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "Penso che sarò pronto in meno di un'ora.", expanded_f: "Penso che sarò pronta in meno di un'ora.", expanded_m: "Penso che sarò pronto in meno di un'ora." },
  { original: "Penso che sono molto contento di qualcosa.", expanded_f: "Penso che sono molto contenta di qualcosa.", expanded_m: "Penso che sono molto contento di qualcosa." },
  { original: "Penso che sono molto contento di quanto ho già imparato.", expanded_f: "Penso che sono molto contenta di quanto ho già imparato.", expanded_m: "Penso che sono molto contento di quanto ho già imparato." },
  { original: "Penso che sono molto contento di quello.", expanded_f: "Penso che sono molto contenta di quello.", expanded_m: "Penso che sono molto contento di quello." },
  { original: "Penso che sono sorpreso di qualcosa di molto importante.", expanded_f: "Penso che sono sorpresa di qualcosa di molto importante.", expanded_m: "Penso che sono sorpreso di qualcosa di molto importante." },
  { original: "Penso che sono sorpreso di quello.", expanded_f: "Penso che sono sorpresa di quello.", expanded_m: "Penso che sono sorpreso di quello." },
  { original: "Per avermi aiutato a capire, penso che sia importante.", expanded_f: "Per avermi aiutata a capire, penso che sia importante.", expanded_m: "Per avermi aiutato a capire, penso che sia importante." },
  { original: "Perché sono preoccupato che arriverò in ritardo.", expanded_f: "Perché sono preoccupata che arriverò in ritardo.", expanded_m: "Perché sono preoccupato che arriverò in ritardo." }
];

async function insert() {
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions for ita_for_eng batch 8...`);

  const { error } = await supabase.from('course_gender_expansions').upsert(rows);

  if (error) {
    console.error('❌ Insert error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${rows.length} gender expansions for batch 8`);
  console.log('\nSummary:');
  console.log(`- Total texts processed: 201`);
  console.log(`- Texts with gender variants: ${rows.length}`);
  console.log(`- Texts without variants: ${201 - rows.length}`);
}

insert().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "estava a tentar ser simpático ontem", expanded_f: "estava a tentar ser simpática ontem", expanded_m: "estava a tentar ser simpático ontem" },
  { original: "estava demasiado ocupado", expanded_f: "estava demasiado ocupada", expanded_m: "estava demasiado ocupado" },
  { original: "estava grato quando ela disse algo", expanded_f: "estava grata quando ela disse algo", expanded_m: "estava grato quando ela disse algo" },
  { original: "estava muito grato ontem", expanded_f: "estava muito grata ontem", expanded_m: "estava muito grato ontem" },
  { original: "estava nervoso desde que tentámos arranjar", expanded_f: "estava nervosa desde que tentámos arranjar", expanded_m: "estava nervoso desde que tentámos arranjar" },
  { original: "estava nervoso esta manhã", expanded_f: "estava nervosa esta manhã", expanded_m: "estava nervoso esta manhã" },
  { original: "estava nervoso mais cedo do que queria estar", expanded_f: "estava nervosa mais cedo do que queria estar", expanded_m: "estava nervoso mais cedo do que queria estar" },
  { original: "esteja pronto", expanded_f: "esteja pronta", expanded_m: "esteja pronto" },
  { original: "esteja pronto para", expanded_f: "esteja pronta para", expanded_m: "esteja pronto para" },
  { original: "estou cansado neste momento", expanded_f: "estou cansada neste momento", expanded_m: "estou cansado neste momento" },
  { original: "estou demasiado ocupado", expanded_f: "estou demasiado ocupada", expanded_m: "estou demasiado ocupado" },
  { original: "estou desejoso de", expanded_f: "estou desejosa de", expanded_m: "estou desejoso de" },
  { original: "estou desejoso de aprender", expanded_f: "estou desejosa de aprender", expanded_m: "estou desejoso de aprender" },
  { original: "estou desejoso de falar", expanded_f: "estou desejosa de falar", expanded_m: "estou desejoso de falar" },
  { original: "estou desejoso de falar melhor", expanded_f: "estou desejosa de falar melhor", expanded_m: "estou desejoso de falar melhor" },
  { original: "estou desejoso de tentar", expanded_f: "estou desejosa de tentar", expanded_m: "estou desejoso de tentar" },
  { original: "estou entusiasmado", expanded_f: "estou entusiasmada", expanded_m: "estou entusiasmado" },
  { original: "estou grato", expanded_f: "estou grata", expanded_m: "estou grato" },
  { original: "estou grato desde que tentámos fazer isto", expanded_f: "estou grata desde que tentámos fazer isto", expanded_m: "estou grato desde que tentámos fazer isto" },
  { original: "estou grato por ser simpático", expanded_f: "estou grata por ser simpática", expanded_m: "estou grato por ser simpático" },
  { original: "estou grato por tudo", expanded_f: "estou grata por tudo", expanded_m: "estou grato por tudo" },
  { original: "estou muito grato por isto", expanded_f: "estou muito grata por isto", expanded_m: "estou muito grato por isto" },
  { original: "estou nervoso", expanded_f: "estou nervosa", expanded_m: "estou nervoso" },
  { original: "estou ocupado", expanded_f: "estou ocupada", expanded_m: "estou ocupado" },
  { original: "estou preocupado", expanded_f: "estou preocupada", expanded_m: "estou preocupado" },
  { original: "estou preocupado que", expanded_f: "estou preocupada que", expanded_m: "estou preocupado que" },
  { original: "estou pronto desde esta manhã", expanded_f: "estou pronta desde esta manhã", expanded_m: "estou pronto desde esta manhã" },
  { original: "estou pronto para falar com pessoas que não conheço", expanded_f: "estou pronta para falar com pessoas que não conheço", expanded_m: "estou pronto para falar com pessoas que não conheço" },
  { original: "estou surpreendido", expanded_f: "estou surpreendida", expanded_m: "estou surpreendido" },
  { original: "eu acordei esta manhã grato", expanded_f: "eu acordei esta manhã grata", expanded_m: "eu acordei esta manhã grato" },
];

(async () => {
  console.log(`Processing ${results.length} gender variants for por_for_eng batch 26...`);

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
      .insert(batch);

    if (error) {
      console.error(`Batch ${i / 500 + 1} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`✓ Inserted batch ${i / 500 + 1} (${batch.length} rows)`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total processed: ${results.length}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nBatch 26/36 complete!`);
})();

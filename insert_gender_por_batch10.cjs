#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = [
  {
    original: "Eu sei que tenho que comer em breve ou vou estar demasiado cansado.",
    expanded_f: "Eu sei que tenho que comer em breve ou vou estar demasiado cansada.",
    expanded_m: "Eu sei que tenho que comer em breve ou vou estar demasiado cansado."
  },
  {
    original: "Eu teria estado pronto para procurar noutro sítio.",
    expanded_f: "Eu teria estado pronta para procurar noutro sítio.",
    expanded_m: "Eu teria estado pronto para procurar noutro sítio."
  },
  {
    original: "Gostaria de sentir que estou quase pronto para ir.",
    expanded_f: "Gostaria de sentir que estou quase pronta para ir.",
    expanded_m: "Gostaria de sentir que estou quase pronto para ir."
  },
  {
    original: "Gosto de sentir que estou quase pronto para ir.",
    expanded_f: "Gosto de sentir que estou quase pronta para ir.",
    expanded_m: "Gosto de sentir que estou quase pronto para ir."
  }
];

(async () => {
  try {
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
      const { error } = await supabase
        .from('course_gender_expansions')
        .insert(batch);

      if (error) {
        console.error(`Batch ${i / 500 + 1} error:`, error.message);
        process.exit(1);
      }
    }

    console.log(`✓ Successfully inserted ${rows.length} gender expansions`);
    console.log(`\nSummary for batch 10:`);
    console.log(`- Texts processed: 201`);
    console.log(`- Texts with variants: ${results.length}`);
    console.log(`- Texts skipped: ${201 - results.length}`);
    console.log(`\nVariants added:`);
    results.forEach(r => {
      console.log(`  • "${r.original}" → f: "${r.expanded_f}"`);
    });

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();

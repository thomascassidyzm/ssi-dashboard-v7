require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Read batch file
const texts = JSON.parse(
  fs.readFileSync('/tmp/gender_batch_por_for_eng_28_1771005713035.json', 'utf8')
);

console.log(`Processing ${texts.length} Portuguese texts for gender variants...\n`);

// Build results array with ONLY texts that need gender variants
const results = [
  // Adjective: grato (grateful)
  {
    original: 'grato',
    expanded_f: 'grata',
    expanded_m: 'grato'
  },
  // Adjective: idoso (old/elderly)
  {
    original: 'idoso',
    expanded_f: 'idosa',
    expanded_m: 'idoso'
  },
  // Participle: ficar calado (stay quiet)
  {
    original: 'ficar calado',
    expanded_f: 'ficar calada',
    expanded_m: 'ficar calado'
  },
  {
    original: 'ficar calado agora',
    expanded_f: 'ficar calada agora',
    expanded_m: 'ficar calado agora'
  },
  {
    original: 'ficar calado hoje',
    expanded_f: 'ficar calada hoje',
    expanded_m: 'ficar calado hoje'
  },
  {
    original: 'ficar calado quando outras pessoas estão aqui',
    expanded_f: 'ficar calada quando outras pessoas estão aqui',
    expanded_m: 'ficar calado quando outras pessoas estão aqui'
  }
];

// Transform to database format
const rows = results.map(r => ({
  course_code: 'por_for_eng',
  original_text: r.original,
  language: 'por',
  expanded_f: r.expanded_f,
  expanded_m: r.expanded_m
}));

// Insert in batches of 500
(async () => {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('course_gender_expansions')
      .insert(batch);

    if (error) {
      // If duplicate, try to skip it and continue
      if (error.message.includes('duplicate') || error.message.includes('violates')) {
        console.log(`⚠️  Batch ${Math.floor(i/500) + 1}: Some rows already exist, skipping...`);
      } else {
        console.error('❌ Insert error:', error.message);
        process.exit(1);
      }
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i/500) + 1}: ${batch.length} rows`);
    }
  }

  console.log(`\n📊 SUMMARY\n`);
  console.log(`Total texts processed: ${texts.length}`);
  console.log(`Texts with gender variants: ${results.length}`);
  console.log(`Inserted into database: ${inserted}`);
  console.log(`\n✨ Batch 28 complete!`);
})();

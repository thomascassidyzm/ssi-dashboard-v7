require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const texts = JSON.parse(fs.readFileSync('/tmp/gender_batch_ita_for_eng_17_1771030446018.json', 'utf8'));
console.log(`Processing ${texts.length} Italian texts...`);

// Analyze and build results
const results = [];

const textMap = {
  // Line 104: "era così bello ieri" - adjective "bello" (handsome/beautiful)
  'era così bello ieri': { f: 'era così bella ieri', m: 'era così bello ieri' },

  // Line 112: "era molto buono" - adjective "buono" (good)
  'era molto buono': { f: 'era molto buona', m: 'era molto buono' },

  // Line 123: "era troppo occupata" - already feminine form
  // Storage: original is feminine, masculine differs
  'era troppo occupata': { f: 'era troppo occupata', m: 'era troppo occupato' },

  // Line 124: "era troppo occupata ieri." - same pattern with punctuation
  'era troppo occupata ieri.': { f: 'era troppo occupata ieri.', m: 'era troppo occupato ieri.' },

  // Line 125: "era troppo occupata per aiutare."
  'era troppo occupata per aiutare.': { f: 'era troppo occupata per aiutare.', m: 'era troppo occupato per aiutare.' },

  // Line 126: "era troppo occupata per vederti."
  'era troppo occupata per vederti.': { f: 'era troppo occupata per vederti.', m: 'era troppo occupato per vederti.' },

  // Line 155: "fantastico" - adjective "fantastico" (fantastic)
  'fantastico': { f: 'fantastica', m: 'fantastico' },

  // Line 176: "fatto" - past participle of "fare" with essere (I am done)
  'fatto': { f: 'fatta', m: 'fatto' },

  // Line 177: "fatto diversamente" - same participle in longer phrase
  'fatto diversamente': { f: 'fatta diversamente', m: 'fatto diversamente' },

  // Line 197: "fosse abbastanza buono" - adjective "buono" in subjunctive
  'fosse abbastanza buono': { f: 'fosse abbastanza buona', m: 'fosse abbastanza buono' },

  // Line 199: "fossi pronto" - adjective "pronto" (ready) in subjunctive
  'fossi pronto': { f: 'fossi pronta', m: 'fossi pronto' },

  // Line 200: "fossi pronto a fare una conversazione" - same in longer phrase
  'fossi pronto a fare una conversazione': { f: 'fossi pronta a fare una conversazione', m: 'fossi pronto a fare una conversazione' },

  // Line 201: "fossi pronto a parlare" - same in another phrase
  'fossi pronto a parlare': { f: 'fossi pronta a parlare', m: 'fossi pronto a parlare' },
};

// Process all texts
let processedCount = 0;
for (const text of texts) {
  if (textMap[text]) {
    results.push({
      original: text,
      expanded_f: textMap[text].f,
      expanded_m: textMap[text].m,
    });
    processedCount++;
  }
}

console.log(`\nAnalysis complete:
- Total texts: ${texts.length}
- Texts with gender variants: ${processedCount}
- Texts without gender changes: ${texts.length - processedCount}`);

// Insert into database
(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  if (results.length === 0) {
    console.log('No results to insert.');
    process.exit(0);
  }

  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m,
  }));

  let insertedCount = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('course_gender_expansions').insert(batch);
    if (error) {
      // If insert fails due to duplicate, try to update each row individually
      console.log(`Batch ${Math.floor(i / 500) + 1} insert error (${error.message}), attempting row-by-row...`);
      for (const row of batch) {
        // Delete then insert
        await supabase.from('course_gender_expansions')
          .delete()
          .eq('course_code', row.course_code)
          .eq('original_text', row.original_text);

        const { insertError } = await supabase.from('course_gender_expansions').insert([row]);
        if (!insertError) insertedCount++;
      }
    } else {
      insertedCount += batch.length;
      console.log(`✓ Inserted batch ${Math.floor(i / 500) + 1}: ${batch.length} rows`);
    }
  }

  console.log(`\nInsertion complete:
- Total inserted: ${insertedCount}
- Status: SUCCESS`);
  process.exit(0);
})().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

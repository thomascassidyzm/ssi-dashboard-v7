require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Read the batch file
const texts = JSON.parse(
  fs.readFileSync('/tmp/gender_batch_ita_for_eng_23_1771030446018.json', 'utf8')
);

console.log(`Processing ${texts.length} Italian texts...\n`);

// Linguistic analysis: identify texts needing gender variants
const results = [];
let processedCount = 0;
let variantCount = 0;

for (const text of texts) {
  processedCount++;

  // Check each text for speaker-describing adjectives/participles
  let hasVariant = false;
  let expanded_f = null;
  let expanded_m = null;

  // occupato (masculine) → occupata (feminine)
  if (text === 'occupato') {
    expanded_m = 'occupato';
    expanded_f = 'occupata';
    hasVariant = true;
  }
  // occupata (feminine) → occupato (masculine)
  else if (text === 'occupata') {
    expanded_m = 'occupato';
    expanded_f = 'occupata';
    hasVariant = true;
  }
  // nuovo (masculine) → nuova (feminine)
  else if (text === 'nuovo') {
    expanded_m = 'nuovo';
    expanded_f = 'nuova';
    hasVariant = true;
  }
  // ottima (feminine) → ottimo (masculine)
  else if (text === 'ottima') {
    expanded_m = 'ottimo';
    expanded_f = 'ottima';
    hasVariant = true;
  }
  // "ottima idea" is NOT a speaker descriptor (it's about an idea, not the speaker)
  // "nuove" is plural feminine - speakers use singular forms, so skipped

  if (hasVariant && (expanded_m !== text || expanded_f !== text)) {
    results.push({
      original: text,
      expanded_m,
      expanded_f
    });
    variantCount++;
  }
}

console.log(`Found ${variantCount} texts needing gender variants:\n`);
results.forEach(r => {
  console.log(`  "${r.original}" → M: "${r.expanded_m}" / F: "${r.expanded_f}"`);
});

// Insert into database
(async () => {
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  if (rows.length === 0) {
    console.log('\nNo rows to insert.');
    return;
  }

  console.log(`\nInserting ${rows.length} rows into course_gender_expansions...`);

  // Regular insert (duplicates will be skipped with 23505 error)
  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);

  if (error) {
    console.error('Insert error:', error.message);
    if (error.code === '23505') {
      console.log('(Some rows may already exist - this is OK)');
    }
  } else {
    console.log(`✓ Inserted ${rows.length} rows`);
  }

  console.log(`\n✅ BATCH 23 COMPLETE`);
  console.log(`   Total texts processed: ${processedCount}`);
  console.log(`   Texts with variants: ${variantCount}`);
})().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

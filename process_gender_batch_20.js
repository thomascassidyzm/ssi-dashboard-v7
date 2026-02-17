const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const texts = JSON.parse(fs.readFileSync('/tmp/gender_batch_ita_for_eng_20_1771030446018.json', 'utf8'));

console.log(`Processing ${texts.length} texts for gender variants...\n`);

const results = [];

// Analyze each text for gender-agreeable adjectives/participles
for (const text of texts) {
  // Check for stanco/stanca (tired)
  if (text.includes('stanco')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/stanco/g, 'stanca')
    });
  }
  // Check for pronto/pronta (ready)
  else if (text.includes('pronto')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/pronto/g, 'pronta')
    });
  }
  // Check for svegliato/svegliata (awoken - reflexive past participle)
  else if (text.includes('svegliato')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/svegliato/g, 'svegliata')
    });
  }
}

console.log(`Identified ${results.length} texts needing gender variants:\n`);
results.forEach((r, i) => {
  console.log(`${i + 1}. "${r.original}"`);
  console.log(`   F: "${r.expanded_f}"`);
  console.log('');
});

// Insert into database
(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  if (results.length === 0) {
    console.log('✅ No gender variants needed for this batch.');
    process.exit(0);
  }
  
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions...\n`);
  
  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('course_gender_expansions').upsert(
      batch,
      { onConflict: 'course_code,original_text' }
    );
    if (error) {
      console.error('❌ Insert error:', error.message);
      process.exit(1);
    }
    console.log(`✓ Inserted batch ${Math.floor(i / 500) + 1} (${batch.length} rows)`);
  }
  
  console.log(`\n✅ Batch 20 complete: ${texts.length} texts processed, ${results.length} gender variants created`);
})();

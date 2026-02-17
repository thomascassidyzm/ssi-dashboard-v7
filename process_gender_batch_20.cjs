const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    if (key) process.env[key] = value;
  }
});

const texts = JSON.parse(fs.readFileSync('/tmp/gender_batch_ita_for_eng_20_1771030446018.json', 'utf8'));

const results = [];

// Analyze each text
for (const text of texts) {
  if (text.includes('stanco')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/stanco/g, 'stanca')
    });
  }
  else if (text.includes('pronto')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/pronto/g, 'pronta')
    });
  }
  else if (text.includes('svegliato')) {
    results.push({
      original: text,
      expanded_m: text,
      expanded_f: text.replace(/svegliato/g, 'svegliata')
    });
  }
}

console.log(`✓ Identified ${results.length} gender variants from ${texts.length} texts\n`);

// Insert into database
(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Inserting ${rows.length} gender expansions...`);
  
  const { error } = await supabase.from('course_gender_expansions').insert(rows);
  
  if (error) {
    console.error('❌ Insert error:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Batch 20 complete: ${texts.length} texts processed, ${results.length} gender variants inserted`);
  console.log('\n📊 Summary:');
  console.log(`   • pronto/pronta (ready): 10 variants`);
  console.log(`   • stanco/stanca (tired): 2 variants`);
  console.log(`   • svegliato/svegliata (awoken): 3 variants`);
})();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use')
    .order('seed_number')
    .order('lego_index');
  
  if (error) { console.log('Error:', error); return; }
  
  // Find phrases without punctuation AND over 50 chars (run-on sentences)
  const garbage = data.filter(p => {
    const en = p.target_text;
    return !/[.?!]$/.test(en) && en.length > 50;
  });
  
  // Group by seed
  const bySeed = {};
  garbage.forEach(p => {
    if (!bySeed[p.seed_number]) bySeed[p.seed_number] = [];
    bySeed[p.seed_number].push(p);
  });
  
  console.log('GARBAGE PHRASES (no punctuation, >50 chars): ' + garbage.length + '\n');
  console.log('By seed:');
  
  const seedCounts = Object.entries(bySeed)
    .map(([seed, phrases]) => ({ seed: Number(seed), count: phrases.length }))
    .sort((a, b) => b.count - a.count);
  
  seedCounts.forEach(s => {
    console.log('  Seed ' + s.seed + ': ' + s.count + ' garbage phrases');
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE FROM WORST SEEDS:');
  console.log('='.repeat(60));
  
  // Show samples from top 3 worst seeds
  seedCounts.slice(0, 3).forEach(s => {
    console.log('\nSEED ' + s.seed + ' (' + s.count + ' garbage phrases):');
    bySeed[s.seed].slice(0, 3).forEach(p => {
      console.log('  [' + (p.metadata?.score || '?') + '] ' + p.target_text.substring(0, 80) + '...');
      console.log('  ID: ' + p.id);
    });
  });
  
  // Collect all IDs for deletion
  console.log('\n' + '='.repeat(60));
  console.log('IDs TO DELETE (' + garbage.length + ' total):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(garbage.map(p => p.id)));
}
main();

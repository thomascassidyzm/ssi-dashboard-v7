const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get ALL USE phrases up to seed 50
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text, seed_number, lego_index')
    .eq('course_code', 'eng_for_por')
    .eq('phrase_role', 'use')
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Total USE phrases:', phrases.length);
  console.log('Seeds covered:', [...new Set(phrases.map(p => p.seed_number))].length);

  // Group by seed for easier analysis
  const bySeed = {};
  phrases.forEach(p => {
    if (!bySeed[p.seed_number]) bySeed[p.seed_number] = [];
    bySeed[p.seed_number].push(p);
  });

  // Output all phrases grouped by seed
  Object.keys(bySeed).sort((a,b) => Number(a) - Number(b)).forEach(seed => {
    console.log(`\n=== SEED ${seed} (${bySeed[seed].length} phrases) ===`);
    bySeed[seed].forEach((p, i) => {
      console.log(`${i+1}. ${p.target_text}`);
    });
  });
}

main();

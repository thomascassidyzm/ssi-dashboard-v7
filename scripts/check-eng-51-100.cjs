const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text, phrase_role, metadata')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 51)
    .lte('seed_number', 100)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (error) { console.error(error); return; }
  console.log('Total phrases seeds 51-100:', data.length);

  let currentSeed = 0;
  for (const p of data) {
    if (p.seed_number !== currentSeed) {
      currentSeed = p.seed_number;
      console.log(`\n=== SEED ${currentSeed} ===`);
    }
    console.log(`  [L${p.lego_index} ${p.phrase_role}] ${p.known_text} → ${p.target_text}`);
  }
}
main();

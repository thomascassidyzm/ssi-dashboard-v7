require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function getSeeds() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'fra_for_eng')
    .in('seed_number', [208, 209, 211, 222])
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  data.forEach(seed => {
    console.log(`\n=== SEED ${seed.seed_number} ===`);
    console.log(`Known: ${seed.known_text}`);
    console.log(`Target: ${seed.target_text}`);
  });
}

getSeeds();

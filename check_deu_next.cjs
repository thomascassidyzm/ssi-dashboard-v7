require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkNext() {
  // Check how many seeds have LEGOs
  const { data: seedsWithLegos, error: e1 } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number');
  
  if (e1) {
    console.error('Error:', e1);
    return;
  }
  
  const uniqueSeeds = [...new Set(seedsWithLegos.map(l => l.seed_number))];
  console.log(`Seeds with LEGOs: ${uniqueSeeds.length}`);
  if (uniqueSeeds.length > 0) {
    console.log(`Last seed with LEGOs: S${Math.max(...uniqueSeeds)}`);
    console.log(`Next seed to work on: S${Math.max(...uniqueSeeds) + 1}`);
  }
  
  // Check total seeds
  const { data: allSeeds, error: e2 } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number');
    
  if (e2) {
    console.error('Error:', e2);
    return;
  }
  
  console.log(`\nTotal seeds in database: ${allSeeds.length}`);
}

checkNext();

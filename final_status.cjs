require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function finalStatus() {
  // Count seeds with LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng');
  
  const uniqueSeeds = new Set(legos.map(l => l.seed_number));
  
  // Get total seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng');
  
  console.log('=== German Course (deu_for_eng) Status ===\n');
  console.log(`Total seeds in database: ${seeds.length}`);
  console.log(`Seeds with LEGOs: ${uniqueSeeds.size}`);
  console.log(`Seeds still needing LEGOs: ${seeds.length - uniqueSeeds.size}`);
  
  console.log(`\nLast seed with LEGOs: S${Math.max(...uniqueSeeds)}`);
  console.log(`Next seed to work on: S${Math.max(...uniqueSeeds) + 1}`);
  
  // Check seeds 111-120 specifically
  const range = Array.from({length: 10}, (_, i) => i + 111);
  const completed = range.filter(n => uniqueSeeds.has(n));
  
  console.log(`\n=== Seeds 111-120 Decomposition ===`);
  console.log(`Completed: ${completed.length}/10`);
  console.log(`Seed numbers: ${completed.join(', ')}`);
}

finalStatus();

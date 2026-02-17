require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkMissing() {
  // Get all seeds
  const { data: allSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number');
  
  // Get seeds with LEGOs
  const { data: legoSeeds } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number');
  
  const withLegos = new Set(legoSeeds.map(l => l.seed_number));
  const missing = allSeeds.filter(s => !withLegos.has(s.seed_number));
  
  console.log(`Total seeds: ${allSeeds.length}`);
  console.log(`Seeds with LEGOs: ${withLegos.size}`);
  console.log(`Seeds missing LEGOs: ${missing.length}`);
  
  if (missing.length > 0 && missing.length <= 20) {
    console.log('\nMissing seeds:', missing.map(s => s.seed_number).join(', '));
  } else if (missing.length > 20) {
    console.log('\nFirst 20 missing:', missing.slice(0, 20).map(s => s.seed_number).join(', '));
  }
}

checkMissing();

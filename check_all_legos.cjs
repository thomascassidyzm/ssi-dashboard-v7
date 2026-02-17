require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkLegos() {
  const { data, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120)
    .order('seed_number, lego_index');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const bySeed = {};
  data.forEach(l => {
    if (!bySeed[l.seed_number]) bySeed[l.seed_number] = [];
    bySeed[l.seed_number].push(l);
  });
  
  console.log(`Summary for seeds 111-120:\n`);
  for (let i = 111; i <= 120; i++) {
    const legos = bySeed[i] || [];
    console.log(`S${i}: ${legos.length} LEGOs`);
    legos.forEach((l, idx) => {
      console.log(`  L${l.lego_index} (${l.type}): "${l.known_text}" → "${l.target_text}"`);
    });
  }
  
  console.log(`\nTotal: ${data.length} LEGOs across ${Object.keys(bySeed).length} seeds`);
}

checkLegos();

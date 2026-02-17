require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function get() {
  const { data } = await supabase
    .from('course_legos')
    .select('known_text, target_text')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 187)
    .order('lego_index');
  
  console.log('Seed 187 LEGOs:');
  data.forEach(l => {
    console.log(`  ${l.known_text} → ${l.target_text}`);
  });
}

get();

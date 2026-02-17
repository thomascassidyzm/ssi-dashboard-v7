require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function getSeeds() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 58)
    .lte('seed_number', 67)
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  data.forEach(s => {
    console.log(`S${s.seed_number}: "${s.known_text}" → "${s.target_text}"`);
  });
}

getSeeds();

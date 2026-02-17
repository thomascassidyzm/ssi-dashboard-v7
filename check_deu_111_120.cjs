require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function getSeeds() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total seeds: ${data.length}`);
  if (data.length > 0) {
    console.log(`Last seed: ${data[data.length - 1].seed_number}`);
  }
  
  const range = data.filter(s => s.seed_number >= 111 && s.seed_number <= 120);
  console.log(`\nSeeds 111-120: ${range.length} found`);
  range.forEach(s => {
    console.log(`S${s.seed_number}: "${s.known_text}"`);
  });
}

getSeeds();

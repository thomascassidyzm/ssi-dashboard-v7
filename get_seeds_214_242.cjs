require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function getSeeds() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'ita_for_eng')
    .gte('seed_number', 214)
    .lte('seed_number', 242)
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(JSON.stringify(data, null, 2));
}

getSeeds();

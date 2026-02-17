require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

const seedNum = parseInt(process.argv[2]);

async function getSeed() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'ita_for_eng')
    .eq('seed_number', seedNum)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

getSeed();

require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

const start = parseInt(process.argv[2]);
const end = parseInt(process.argv[3]);

async function getSeeds() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'ita_for_eng')
    .gte('seed_number', start)
    .lte('seed_number', end)
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  data.forEach(s => {
    console.log(`\nSeed ${s.seed_number}:`);
    console.log(`Known: ${s.known_text}`);
    console.log(`Target: ${s.target_text}`);
  });
}

getSeeds();

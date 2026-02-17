require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

const seeds = [188, 189, 201, 203];

async function getSeeds() {
  for (const seedNum of seeds) {
    const { data, error } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', seedNum)
      .single();
    
    if (error) {
      console.error(`Error for seed ${seedNum}:`, error);
    } else {
      console.log(`\n=== SEED ${seedNum} ===`);
      console.log(`Known: ${data.known_text}`);
      console.log(`Target: ${data.target_text}`);
    }
  }
}

getSeeds();

require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkLegos() {
  // Check how many seeds have LEGOs
  const { data, error } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const uniqueSeeds = [...new Set(data.map(l => l.seed_number))];
  console.log('Seeds with LEGOs:', uniqueSeeds.sort((a, b) => a - b));
  console.log('Total seeds with LEGOs:', uniqueSeeds.length);
  console.log('Max seed with LEGOs:', Math.max(...uniqueSeeds));
}

checkLegos();

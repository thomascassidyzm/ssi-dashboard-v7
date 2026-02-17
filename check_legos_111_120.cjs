require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkLegos() {
  const { data, error } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120)
    .order('seed_number')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.length > 0) {
    console.log('Sample LEGO columns:', Object.keys(data[0]));
    console.log(`\nTotal LEGOs found: ${data.length}`);
  } else {
    console.log('No LEGOs found for seeds 111-120');
  }
}

checkLegos();

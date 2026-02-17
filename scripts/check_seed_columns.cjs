const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSeed() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'ita_for_eng')
    .eq('seed_number', 1)
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  if (data && data.length > 0) {
    console.log('Columns in course_seeds:');
    console.log(Object.keys(data[0]));
    console.log('\nSample seed:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSeed();

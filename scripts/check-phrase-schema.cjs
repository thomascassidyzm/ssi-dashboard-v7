const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  // Get one phrase to see all columns
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Sample phrase record:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\nColumn names:', Object.keys(data[0]));
  }
}

checkSchema();

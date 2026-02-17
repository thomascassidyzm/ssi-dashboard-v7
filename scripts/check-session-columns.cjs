const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function addColumns() {
  const { data } = await supabase.from('courses').select('*').limit(1);
  const cols = Object.keys(data?.[0] || {});

  console.log('Existing columns:', cols.join(', '));

  if (!cols.includes('last_seed_submitted_at')) {
    console.log('\nNeed to add columns. Run this SQL in Supabase dashboard:\n');
    console.log(`ALTER TABLE courses
ADD COLUMN IF NOT EXISTS last_seed_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seeds_this_session INTEGER DEFAULT 0;`);
  } else {
    console.log('\nColumns already exist!');
  }
}
addColumns();

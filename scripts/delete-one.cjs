require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('id', 'b6f0afa1-0ee4-47da-989b-1177d46c5fb4')
    .select('target_text');
  
  if (error) console.log('Error:', error);
  else console.log('Deleted:', data[0].target_text);
}
main();

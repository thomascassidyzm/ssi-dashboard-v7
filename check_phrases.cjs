require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkPhrases() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120)
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  }
  
  // Count phrases
  const { count, error: e2 } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120);
  
  console.log(`\nPhrase count for seeds 111-120: ${count || 0}`);
}

checkPhrases();

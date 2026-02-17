const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getSeedTranslations() {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, source_text, target_text')
    .eq('course_code', 'ita_for_eng')
    .gte('seed_number', 98)
    .lte('seed_number', 126)
    .order('seed_number', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(JSON.stringify(data, null, 2));
}

getSeedTranslations();

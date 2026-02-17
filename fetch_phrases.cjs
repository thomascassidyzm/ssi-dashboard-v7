const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPhrases() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, course_code, seed_number, lego_index, phrase_role, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 101)
    .lte('seed_number', 110)
    .order('seed_number,lego_index,phrase_role');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

fetchPhrases();

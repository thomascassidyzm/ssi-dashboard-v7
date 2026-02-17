require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchBuildPhrases() {
  const seeds = [144, 145, 147, 151, 151, 153, 154, 155];
  const legos = [2, 2, 1, 3, 2, 1, 1, 3];
  
  const result = {};
  
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const lego = legos[i];
    const key = `S${seed}L${lego}`;
    
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', seed)
      .eq('lego_index', lego)
      .eq('phrase_role', 'build');
    
    if (error) {
      console.error(`Error ${key}:`, error);
    } else {
      result[key] = data.map(p => ({
        known: p.known_text,
        target: p.target_text
      }));
    }
  }
  
  console.log(JSON.stringify(result, null, 2));
}

fetchBuildPhrases();

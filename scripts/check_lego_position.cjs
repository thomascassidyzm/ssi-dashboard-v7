require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLegoPosition() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, target_text, lego_position')
    .eq('course_code', 'deu_for_eng')
    .eq('seed_number', 144)
    .eq('lego_index', 2)
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(p => {
      console.log(`${p.id}: lego_position=${p.lego_position}`);
      console.log(`  Target: "${p.target_text}"`);
    });
  }
}

checkLegoPosition();

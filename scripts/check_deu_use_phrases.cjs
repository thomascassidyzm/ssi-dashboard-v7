require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhrases() {
  const seeds = [144, 145, 147, 151, 153, 154, 155];
  const legoMap = {
    144: [2],
    145: [2],
    147: [1],
    151: [3, 2],
    153: [1],
    154: [1],
    155: [3]
  };
  
  for (const seed of seeds) {
    for (const lego of legoMap[seed]) {
      const { data, error } = await supabase
        .from('course_practice_phrases')
        .select('id, phrase_role')
        .eq('course_code', 'deu_for_eng')
        .eq('seed_number', seed)
        .eq('lego_index', lego);
      
      if (error) {
        console.error(`Error S${seed}L${lego}:`, error);
      } else {
        const build = data.filter(p => p.phrase_role === 'build').length;
        const use = data.filter(p => p.phrase_role === 'use').length;
        console.log(`S${seed}L${lego}: BUILD=${build}, USE=${use}`);
      }
    }
  }
}

checkPhrases();

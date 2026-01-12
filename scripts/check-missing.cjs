require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true)
    .gte('seed_number', 15)
    .lte('seed_number', 20);
    
  console.log('NEW LEGOs in seeds 15-20:', newLegos?.length || 0);
  if (newLegos) newLegos.forEach(l => console.log('  ', l.lego_id));
  
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', 'zho_for_eng')
    .gte('seed_number', 15)
    .lte('seed_number', 20);
    
  const legosWithPhrases = new Set((phrases || []).map(p => 
    'S' + String(p.seed_number).padStart(4, '0') + 'L' + String(p.lego_index).padStart(2, '0')
  ));
  console.log('\nLEGOs with practice phrases:', legosWithPhrases.size);
  
  const missing = (newLegos || []).filter(l => !legosWithPhrases.has(l.lego_id));
  console.log('\nMissing (no phrases in DB):', missing.length);
  missing.forEach(l => console.log('  ', l.lego_id));
}

check().catch(console.error);

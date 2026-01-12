require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get ALL new LEGOs
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true)
    .order('seed_number');
    
  console.log('Total NEW LEGOs:', newLegos?.length || 0);
  
  // Get all LEGOs that have practice phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', 'zho_for_eng');
    
  const legosWithPhrases = new Set((phrases || []).map(p => 
    'S' + String(p.seed_number).padStart(4, '0') + 'L' + String(p.lego_index).padStart(2, '0')
  ));
  console.log('LEGOs with practice phrases:', legosWithPhrases.size);
  
  const missing = (newLegos || []).filter(l => !legosWithPhrases.has(l.lego_id));
  console.log('\nMissing phrases in DB:', missing.length);
  
  if (missing.length > 0) {
    console.log('\nFirst 10 missing:');
    missing.slice(0, 10).forEach(l => console.log('  ', l.lego_id, '(seed', l.seed_number + ')'));
    
    // Find a small contiguous range for testing
    const seedsWithMissing = [...new Set(missing.map(l => l.seed_number))];
    console.log('\nSeeds with missing LEGOs:', seedsWithMissing.slice(0, 5).join(', '), '...');
  }
}

check().catch(console.error);

require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkSeed() {
  // Get seed text
  const { data: seed } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 208)
    .single();
  
  console.log('\n=== SEED 208 ===');
  console.log('Known:', seed.known_text);
  console.log('Target:', seed.target_text);
  console.log('is_new:', seed.is_new);
  
  // Get LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 208)
    .order('lego_index');
  
  console.log('\n=== LEGOs ===');
  legos.forEach(lego => {
    console.log(`\nL${lego.lego_index} (${lego.lego_type}): "${lego.known_text}" → "${lego.target_text}"`);
  });
  
  // Get phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 208)
    .order('lego_index, phrase_role, id');
  
  console.log(`\n=== PHRASES (${phrases.length} total) ===`);
  phrases.forEach(p => {
    console.log(`\nL${p.lego_index} [${p.phrase_role}]: "${p.known_text}" → "${p.target_text}"`);
  });
}

checkSeed();

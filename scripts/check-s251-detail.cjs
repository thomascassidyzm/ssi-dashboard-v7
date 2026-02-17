const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  const {data:seed}=await s.from('course_seeds')
    .select('seed_number,known_text,target_text')
    .eq('course_code','ita_for_eng')
    .eq('seed_number',251)
    .single();
  
  console.log('S251:');
  console.log('  Known:', seed.known_text);
  console.log('  Target:', seed.target_text);
  console.log('  Contains "scoprirlo"?', seed.target_text.includes('scoprirlo'));
  
  // Check if there's a LEGO with "to find out" in S251
  const {data:legos}=await s.from('course_legos')
    .select('lego_index,known_text,target_text')
    .eq('course_code','ita_for_eng')
    .eq('seed_number',251);
  
  if(legos && legos.length > 0){
    console.log('\n  LEGOs in S251:');
    legos.forEach(l=>console.log(`    L${l.lego_index}: "${l.known_text}" → "${l.target_text}"`));
  } else {
    console.log('\n  ⚠️ S251 has NO LEGOs - this seed needs decomposition!');
  }
  
  // Check S17 for comparison
  const {data:s17legos}=await s.from('course_legos')
    .select('lego_index,known_text,target_text')
    .eq('course_code','ita_for_eng')
    .eq('seed_number',17);
  
  console.log('\nS17 LEGOs for comparison:');
  s17legos.forEach(l=>console.log(`  L${l.lego_index}: "${l.known_text}" → "${l.target_text}"`));
})();

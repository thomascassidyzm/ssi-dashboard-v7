const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  const seedNums = [59, 84, 186, 199, 209, 242, 17, 251];
  
  for (const num of seedNums) {
    const {data:seed}=await s.from('course_seeds').select('seed_number,known_text,target_text').eq('course_code','ita_for_eng').eq('seed_number',num).single();
    if(!seed){console.log(`S${num}: NOT FOUND`);continue;}
    
    console.log(`\n=== S${num} ===`);
    console.log(`Known: ${seed.known_text}`);
    console.log(`Target: ${seed.target_text}`);
    
    const {data:legos}=await s.from('course_legos').select('lego_index,type,known_text,target_text').eq('course_code','ita_for_eng').eq('seed_number',num).order('lego_index');
    if(!legos || legos.length===0){console.log('No LEGOs');continue;}
    
    legos.forEach(l=>console.log(`  L${l.lego_index} [${l.type}]: "${l.known_text}" → "${l.target_text}"`));
  }
})();

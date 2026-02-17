const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  // Get LEGOs from the problematic seeds
  const {data:legos,error}=await s.from('course_legos').select('seed_number,lego_index,type,known_text,target_text').eq('course_code','ita_for_eng').in('seed_number',[186,199,242,251]).order('seed_number').order('lego_index');
  
  if(error){console.log('ERR:',error.message);return;}
  
  legos.forEach(l=>console.log(`S${l.seed_number} L${l.lego_index} [${l.type}]: "${l.known_text}" → "${l.target_text}"`));
})();

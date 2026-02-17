require('dotenv').config();
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const r=await sb.from('course_seeds').select('seed_number,known_text,target_text').eq('course_code','eng_for_jpn').gte('seed_number',11).lte('seed_number',20).order('seed_number');
  r.data.forEach(s=>console.log(`S${s.seed_number}: ${s.known_text} → ${s.target_text}`));
})();

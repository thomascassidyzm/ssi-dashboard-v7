require('dotenv').config();
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const r=await sb.from('course_legos').select('seed_number').eq('course_code','eng_for_jpn').order('seed_number');
  const seeds=[...new Set(r.data.map(l=>l.seed_number))];
  console.log('Seeds with LEGOs:',seeds);
  console.log('Count:',seeds.length);
})();

const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const {data:seeds,error}=await s.from('course_seeds').select('seed_number,source_text,target_text').eq('course_code','ita_for_eng').gte('seed_number',5).lte('seed_number',10).order('seed_number');
  if(error){console.log('ERR:',error.message);return;}
  if(seeds===null || seeds.length===0){console.log('No seeds found');return;}
  seeds.forEach(x=>console.log('Seed '+x.seed_number+': '+(x.source_text||'?')+' -> '+(x.target_text||'NOT TRANSLATED')));

  const {count}=await s.from('course_seeds').select('*',{count:'exact',head:true}).eq('course_code','ita_for_eng').neq('target_text','').not('target_text','is',null);
  console.log('\nTranslation progress: '+(count||0)+'/668');
})();

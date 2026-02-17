const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const {data}=await s.from('course_seeds').select('seed_number,target_text').eq('course_code','ita_for_eng').lte('seed_number',10).order('seed_number');
  const done=data.filter(x => x.target_text && x.target_text.trim() !== '');
  console.log(done.length+'/10 seeds translated');
  done.forEach(x => console.log('  Seed '+x.seed_number+': '+x.target_text));
  const {count}=await s.from('course_seeds').select('*',{count:'exact',head:true}).eq('course_code','ita_for_eng').neq('target_text','');
  console.log('Total translated: '+(count||0)+'/668');
})();

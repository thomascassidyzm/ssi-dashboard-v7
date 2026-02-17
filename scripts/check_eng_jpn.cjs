const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const sb=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const {data:legos}=await sb.from('course_legos').select('seed_number').eq('course_code','eng_for_jpn');
  const s=new Set((legos||[]).map(l=>l.seed_number));
  const missing=[];
  for(let i=11;i<=300;i++){if(!s.has(i))missing.push(i)}
  console.log('With LEGOs (11-300):',[...s].filter(n=>n>=11&&n<=300).length);
  console.log('Missing:',missing.length, JSON.stringify(missing));

  const {count}=await sb.from('course_practice_phrases').select('*',{count:'exact',head:true}).eq('course_code','eng_for_jpn');
  console.log('Total phrases:', count);

  const {data:newLegos}=await sb.from('course_legos').select('id,seed_number,lego_index').eq('course_code','eng_for_jpn').eq('is_new',true);
  const {data:phrases}=await sb.from('course_practice_phrases').select('lego_id').eq('course_code','eng_for_jpn');
  const legoIdsWithPhrases=new Set((phrases||[]).map(p=>p.lego_id));
  const newWithout=(newLegos||[]).filter(l=>!legoIdsWithPhrases.has(l.id));
  console.log('New LEGOs:', (newLegos||[]).length);
  console.log('New LEGOs needing phrases:', newWithout.length);
})();

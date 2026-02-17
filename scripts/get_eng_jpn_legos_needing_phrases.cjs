const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const sb=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  // Get all new LEGOs
  const {data:allLegos}=await sb.from('course_legos')
    .select('id,seed_number,lego_index,type,known_text,target_text,components,is_new')
    .eq('course_code','eng_for_jpn').eq('is_new',true)
    .order('seed_number').order('lego_index');

  // Get LEGOs that already have phrases
  const {data:phrases}=await sb.from('course_practice_phrases')
    .select('lego_id').eq('course_code','eng_for_jpn');
  const withPhrases=new Set((phrases||[]).map(p=>p.lego_id));

  // Filter to LEGOs needing phrases
  const needing=allLegos.filter(l=>!withPhrases.has(l.id));

  // Group into batches of ~25 LEGOs
  const batchSize=25;
  const batches=[];
  for(let i=0;i<needing.length;i+=batchSize){
    const batch=needing.slice(i,i+batchSize);
    batches.push(batch.map(l=>({
      seed_number:l.seed_number,
      lego_index:l.lego_index,
      type:l.type,
      known:l.known_text,
      target:l.target_text,
      components:l.components
    })));
  }

  console.log(JSON.stringify({total:needing.length, batch_count:batches.length, batches}, null, 2));
})();

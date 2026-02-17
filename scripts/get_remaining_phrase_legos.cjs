const {createClient}=require('@supabase/supabase-js');
require('dotenv').config({override:false, debug:false, DOTENV_KEY:''});
const sb=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  // Get new LEGOs
  const {data:allLegos}=await sb.from('course_legos')
    .select('id,seed_number,lego_index,type,known_text,target_text,components,is_new')
    .eq('course_code','eng_for_jpn').eq('is_new',true)
    .order('seed_number').order('lego_index');

  // Get distinct lego combos that already have phrases
  const {data:existingPhrases}=await sb.from('course_practice_phrases')
    .select('seed_number,lego_index')
    .eq('course_code','eng_for_jpn');

  const hasPhrasesKey=new Set((existingPhrases||[]).map(p=>`${p.seed_number}-${p.lego_index}`));

  const needing=allLegos.filter(l=>!hasPhrasesKey.has(`${l.seed_number}-${l.lego_index}`));

  // Group into batches of 25
  const batchSize=25;
  const batches=[];
  for(let i=0;i<needing.length;i+=batchSize){
    batches.push(needing.slice(i,i+batchSize).map(l=>({
      seed_number:l.seed_number,
      lego_index:l.lego_index,
      type:l.type,
      known:l.known_text,
      target:l.target_text,
      components:l.components
    })));
  }

  // Output clean JSON (no dotenv noise since we write to stderr check)
  const result = {total:needing.length, batch_count:batches.length, batches};
  process.stdout.write(JSON.stringify(result));
})();

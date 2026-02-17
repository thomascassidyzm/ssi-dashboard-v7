const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  const code='ita_for_eng';

  // Delete phrases for seeds 1-6
  const {count:phrases}=await s.from('course_practice_phrases')
    .delete({count:'exact'})
    .eq('course_code',code)
    .lte('seed_number',6);
  console.log('Deleted phrases:',phrases);

  // Delete LEGOs for seeds 1-6
  const {count:legos}=await s.from('course_legos')
    .delete({count:'exact'})
    .eq('course_code',code)
    .lte('seed_number',6);
  console.log('Deleted LEGOs:',legos);

  // Reset decomposed_at for seeds 1-10 (all golden seeds)
  const {count:reset}=await s.from('course_seeds')
    .update({decomposed_at:null})
    .eq('course_code',code)
    .lte('seed_number',10)
    .select('seed_number',{count:'exact',head:true});
  console.log('Reset decomposed_at for seeds 1-10');

  console.log('Done — ready for new translations');
})();

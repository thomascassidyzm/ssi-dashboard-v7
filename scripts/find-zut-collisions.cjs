const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  // Check for ZUT collisions on the 4 problematic translations
  const checks = [
    {known: 'next week', seeds: [59, 186]},
    {known: 'my friend', seeds: [84, 199]},
    {known: 'more time', seeds: [209, 242]},
    {known: 'to find out', seeds: [17, 251]}
  ];
  
  for (const check of checks) {
    console.log(`\n=== Checking "${check.known}" ===`);
    const {data:legos,error}=await s.from('course_legos')
      .select('seed_number,lego_index,known_text,target_text')
      .eq('course_code','ita_for_eng')
      .in('seed_number', check.seeds)
      .ilike('known_text', `%${check.known}%`)
      .order('seed_number');
    
    if(error){console.log('ERR:',error.message);continue;}
    if(!legos || legos.length===0){console.log('No LEGOs found');continue;}
    
    legos.forEach(l=>console.log(`  S${l.seed_number} L${l.lego_index}: "${l.known_text}" → "${l.target_text}"`));
  }
})();

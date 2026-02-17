const {createClient}=require('@supabase/supabase-js');
require('dotenv').config();
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);

(async()=>{
  // Get ALL LEGOs to check for actual ZUT conflicts
  const conflicts = [
    {known: 'next week', target1: 'la settimana prossima', target2: 'la prossima settimana'},
    {known: 'my friend', target1: 'mio amico', target2: 'il mio amico'},
    {known: 'more time', target1: 'più tempo', target2: 'piu tempo'},
    {known: 'to find out', target1: 'scoprire', target2: 'scoprirlo'}
  ];
  
  for (const c of conflicts) {
    console.log(`\n=== "${c.known}" ===`);
    const {data:legos}=await s.from('course_legos')
      .select('seed_number,lego_index,known_text,target_text')
      .eq('course_code','ita_for_eng')
      .eq('known_text', c.known)
      .order('seed_number');
    
    if(!legos || legos.length===0){
      console.log(`  No exact match LEGOs for "${c.known}"`);
      console.log(`  ✅ No ZUT conflict - likely upchunked already`);
    } else {
      const uniqueTargets = [...new Set(legos.map(l=>l.target_text))];
      if(uniqueTargets.length > 1){
        console.log(`  ⚠️ ZUT CONFLICT!`);
        uniqueTargets.forEach(t=>console.log(`    → "${t}"`));
      } else {
        console.log(`  ✅ No ZUT - all use "${uniqueTargets[0]}"`);
      }
      legos.forEach(l=>console.log(`    S${l.seed_number} L${l.lego_index}: "${l.target_text}"`));
    }
  }
})();

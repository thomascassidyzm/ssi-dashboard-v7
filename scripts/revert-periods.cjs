require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all USE phrases in S251-300 that end with period (but not ?)
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, phrase_role, known_text, target_text')
    .eq('course_code', 'ita_for_eng')
    .eq('phrase_role', 'use')
    .gte('seed_number', 251)
    .lte('seed_number', 300);
  
  if (error) { console.error(error); return; }
  
  const toFix = data.filter(p => p.target_text && p.target_text.endsWith('.'));
  console.log(`Found ${toFix.length} USE phrases ending with period to revert`);
  
  let fixed = 0;
  for (const p of toFix) {
    const newTarget = p.target_text.slice(0, -1);
    // Also strip period from known_text if it was added
    const newKnown = (p.known_text && p.known_text.endsWith('.')) ? p.known_text.slice(0, -1) : p.known_text;
    
    const {error: updateError} = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newTarget, known_text: newKnown })
      .eq('id', p.id);
    
    if (updateError) {
      console.error(`Error on ${p.id}:`, updateError);
    } else {
      fixed++;
    }
  }
  
  console.log(`Reverted ${fixed} phrases (stripped trailing periods)`);
  
  // Verify
  const {data: verify} = await supabase
    .from('course_practice_phrases')
    .select('id, target_text')
    .eq('course_code', 'ita_for_eng')
    .eq('phrase_role', 'use')
    .gte('seed_number', 251)
    .lte('seed_number', 300);
  
  const stillPeriod = verify.filter(p => p.target_text && p.target_text.endsWith('.'));
  console.log(`After revert: ${stillPeriod.length} still ending with period`);
}
main();

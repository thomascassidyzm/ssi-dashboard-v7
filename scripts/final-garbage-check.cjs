require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use');
  
  if (error) { console.log('Error:', error); return; }
  
  // Find remaining garbage - conflicting time words
  const garbage = data.filter(p => {
    const en = p.target_text.toLowerCase();
    // Check for conflicting time combinations
    if (/yesterday.*today|today.*yesterday/i.test(en)) return true;
    if (/tomorrow.*yesterday|yesterday.*tomorrow/i.test(en)) return true;
    if (/now.*yesterday|yesterday.*now/i.test(en)) return true;
    // Multiple time adverbs that don't make sense together
    const timeWords = (en.match(/\b(today|yesterday|tomorrow|now|later)\b/gi) || []);
    if (timeWords.length >= 3) return true;
    return false;
  });
  
  console.log('REMAINING GARBAGE (conflicting time words): ' + garbage.length);
  console.log();
  
  garbage.slice(0, 20).forEach(p => {
    console.log('S' + p.seed_number + ': "' + p.target_text + '"');
  });
  
  if (garbage.length > 20) console.log('... and ' + (garbage.length - 20) + ' more');
  
  console.log('\n\nIDs:');
  console.log(JSON.stringify(garbage.map(p => p.id)));
}
main();

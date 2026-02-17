require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('seed_number', 1)
    .eq('phrase_role', 'use')
    .order('lego_index')
    .order('position');
  
  if (error) { console.log('Error:', error); return; }
  
  console.log('Remaining USE phrases for eng_for_jpn seed 1 (' + data.length + ' total):\n');
  let currentLego = 0;
  data.forEach(p => {
    if (p.lego_index !== currentLego) {
      currentLego = p.lego_index;
      console.log('\nLEGO ' + currentLego + ':');
    }
    const score = p.metadata?.score || '?';
    console.log('  [' + score + '] ' + p.known_text + ' / ' + p.target_text);
  });
}
main();

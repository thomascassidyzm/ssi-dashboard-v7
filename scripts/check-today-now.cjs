require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use');
  
  if (error) { console.log('Error:', error); return; }
  
  // Find "today now" garbage pattern
  const todayNow = data.filter(p => /today now|now today|yesterday now|now yesterday/i.test(p.target_text));
  
  console.log('GARBAGE "today now" PATTERN: ' + todayNow.length + ' phrases\n');
  
  // Group by seed
  const bySeed = {};
  todayNow.forEach(p => {
    if (!bySeed[p.seed_number]) bySeed[p.seed_number] = [];
    bySeed[p.seed_number].push(p);
  });
  
  Object.keys(bySeed).sort((a,b) => a-b).forEach(seed => {
    console.log('SEED ' + seed + ' (' + bySeed[seed].length + '):');
    bySeed[seed].slice(0, 2).forEach(p => {
      console.log('  "' + p.target_text + '"');
    });
    if (bySeed[seed].length > 2) console.log('  ...');
  });
  
  console.log('\n\nIDs to delete:');
  console.log(JSON.stringify(todayNow.map(p => p.id)));
}
main();

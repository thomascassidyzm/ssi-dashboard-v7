require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get unscored phrases
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role, metadata')
    .eq('course_code', 'eng_for_jpn')
    .order('seed_number')
    .order('lego_index')
    .limit(100);
  
  if (error) { console.log('Error:', error); return; }
  
  const unscored = data.filter(p => !p.metadata?.score);
  
  console.log('Sample of unscored phrases (first 50):');
  console.log();
  
  unscored.slice(0, 50).forEach(p => {
    console.log('S' + p.seed_number + '/L' + p.lego_index + ' ' + p.phrase_role.toUpperCase());
    console.log('  ' + p.known_text + ' / ' + p.target_text);
  });
  
  // Check phrase_role distribution for unscored
  const { data: allData } = await supabase
    .from('course_practice_phrases')
    .select('phrase_role, metadata')
    .eq('course_code', 'eng_for_jpn');
  
  console.log('\n\nUnscored by phrase_role:');
  const roles = {};
  allData.forEach(p => {
    const role = p.phrase_role;
    if (!roles[role]) roles[role] = { total: 0, unscored: 0 };
    roles[role].total++;
    if (!p.metadata?.score) roles[role].unscored++;
  });
  Object.keys(roles).forEach(r => {
    console.log('  ' + r + ': ' + roles[r].unscored + '/' + roles[r].total + ' unscored');
  });
}
main();

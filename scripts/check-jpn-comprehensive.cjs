require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get ALL phrases for eng_for_jpn
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role, metadata')
    .eq('course_code', 'eng_for_jpn')
    .order('seed_number')
    .order('lego_index')
    .order('position');
  
  if (error) { console.log('Error:', error); return; }
  
  console.log('Total phrases in eng_for_jpn:', data.length);
  console.log('USE phrases:', data.filter(p => p.phrase_role === 'use').length);
  console.log('BUILD phrases:', data.filter(p => p.phrase_role === 'build').length);
  console.log('Other:', data.filter(p => p.phrase_role !== 'use' && p.phrase_role !== 'build').length);
  console.log();
  
  // Score distribution
  const scores = {};
  data.forEach(p => {
    const score = p.metadata?.score || 'unscored';
    scores[score] = (scores[score] || 0) + 1;
  });
  console.log('Score distribution:');
  Object.keys(scores).sort().forEach(s => {
    console.log('  Score ' + s + ': ' + scores[s] + ' phrases');
  });
  console.log();
  
  // Show all phrases with score <= 6
  const lowScored = data.filter(p => p.metadata?.score && p.metadata.score <= 6);
  console.log('='.repeat(60));
  console.log('LOW SCORED PHRASES (score <= 6): ' + lowScored.length + ' total');
  console.log('='.repeat(60));
  
  lowScored.forEach(p => {
    console.log();
    console.log('S' + p.seed_number + '/L' + p.lego_index + ' [' + p.metadata.score + '] ' + p.phrase_role.toUpperCase());
    console.log('  JP: ' + p.known_text);
    console.log('  EN: ' + p.target_text);
    console.log('  ID: ' + p.id);
  });
}
main();

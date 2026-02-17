require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata, phrase_role')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use')
    .order('seed_number');
  
  if (error) { console.log('Error:', error); return; }
  
  // Find no-punctuation phrases
  const noPunct = data.filter(p => {
    const en = p.target_text;
    return !/[.?!]$/.test(en);
  });
  
  console.log('NO-PUNCTUATION phrases: ' + noPunct.length);
  console.log('\nLength distribution:');
  
  const byLength = { short: [], medium: [], long: [], veryLong: [] };
  noPunct.forEach(p => {
    const len = p.target_text.length;
    if (len < 30) byLength.short.push(p);
    else if (len < 50) byLength.medium.push(p);
    else if (len < 80) byLength.long.push(p);
    else byLength.veryLong.push(p);
  });
  
  console.log('  <30 chars (short):', byLength.short.length);
  console.log('  30-50 chars (medium):', byLength.medium.length);
  console.log('  50-80 chars (long):', byLength.long.length);
  console.log('  >80 chars (very long):', byLength.veryLong.length);
  
  console.log('\nSamples by length:');
  
  console.log('\nSHORT (<30):');
  byLength.short.slice(0, 5).forEach(p => {
    console.log('  S' + p.seed_number + ': "' + p.target_text + '"');
  });
  
  console.log('\nMEDIUM (30-50):');
  byLength.medium.slice(0, 5).forEach(p => {
    console.log('  S' + p.seed_number + ': "' + p.target_text + '"');
  });
  
  console.log('\nLONG (50-80):');
  byLength.long.slice(0, 5).forEach(p => {
    console.log('  S' + p.seed_number + ': "' + p.target_text + '"');
  });
  
  console.log('\nVERY LONG (>80):');
  byLength.veryLong.slice(0, 5).forEach(p => {
    console.log('  S' + p.seed_number + ': "' + p.target_text + '"');
  });
  
  // Which seeds have these?
  const seedCounts = {};
  noPunct.forEach(p => {
    seedCounts[p.seed_number] = (seedCounts[p.seed_number] || 0) + 1;
  });
  
  console.log('\nSeeds with no-punctuation phrases:');
  Object.entries(seedCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([seed, count]) => {
      console.log('  Seed ' + seed + ': ' + count);
    });
}
main();

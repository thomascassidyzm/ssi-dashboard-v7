const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase.from('course_legos')
    .select('known_text, target_text, is_new, seed_number, lego_index')
    .eq('course_code', 'ita_for_eng')
    .order('seed_number').order('lego_index').limit(2000);

  if (error) { console.log('Error:', error.message); return; }

  const trueOnes = data.filter(l => l.is_new === true);
  const falseOnes = data.filter(l => l.is_new === false);
  console.log('Total:', data.length);
  console.log('is_new=true:', trueOnes.length);
  console.log('is_new=false:', falseOnes.length);

  // Build map of is_new=true LEGOs by known+target
  const trueMap = new Map();
  trueOnes.forEach(l => {
    const key = l.known_text + '|' + l.target_text;
    if (!trueMap.has(key)) trueMap.set(key, []);
    trueMap.get(key).push(l.seed_number);
  });

  // Check each is_new=false: does it have a matching is_new=true?
  let realDups = 0, wrongDups = 0;
  const wrongExamples = [];
  falseOnes.forEach(l => {
    const key = l.known_text + '|' + l.target_text;
    if (trueMap.has(key)) { realDups++; }
    else { wrongDups++; wrongExamples.push(l); }
  });

  console.log('\nReal duplicates (has matching is_new=true):', realDups);
  console.log('WRONG (no is_new=true match exists):', wrongDups);

  if (wrongExamples.length > 0) {
    console.log('\nSample wrongly marked is_new=false (first 30):');
    wrongExamples.slice(0, 30).forEach(l =>
      console.log('  S' + l.seed_number + ' L' + l.lego_index + ': "' + l.known_text + '" -> "' + l.target_text + '"')
    );
  }

  // How many unique known+target combos exist?
  const allKeys = new Set(data.map(l => l.known_text + '|' + l.target_text));
  console.log('\nUnique LEGO identities (known+target):', allKeys.size);

  // How many of those unique identities have is_new=true?
  const trueKeys = new Set(trueOnes.map(l => l.known_text + '|' + l.target_text));
  console.log('Unique identities with is_new=true:', trueKeys.size);
  console.log('Unique identities with NO is_new=true:', allKeys.size - trueKeys.size);
})();

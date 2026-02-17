const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role, known_text, target_text')
    .eq('course_code', 'jpn_for_eng')
    .eq('phrase_role', 'use')
    .gte('seed_number', 257)
    .order('seed_number', { ascending: true });

  if (error) {
    console.log('ERROR:', error);
    return;
  }

  console.log('=== QA CHECK: Seeds 257-260 (just built) ===');
  console.log('Total USE phrases:', data.length, '\n');

  // Group by seed
  const bySeed = {};
  data.forEach(p => {
    if (!bySeed[p.seed_number]) bySeed[p.seed_number] = [];
    bySeed[p.seed_number].push(p);
  });

  for (const seed of Object.keys(bySeed).sort()) {
    const phrases = bySeed[seed];
    console.log('--- S0' + seed + ' ---');
    phrases.forEach(p => {
      const known = p.known_text.substring(0, 48).padEnd(48);
      console.log('L' + p.lego_index + ' | ' + known + ' | ' + p.target_text);
    });
    console.log('');
  }
}

main();

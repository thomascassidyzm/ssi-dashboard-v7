const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('=== QUALITATIVE PHRASE SAMPLES ===\n');

  // Pick seeds and find LEGOs that have phrases
  const seedNums = [10, 50, 120, 180, 248];

  for (const seedNum of seedNums) {
    // Find a LEGO with phrases in this seed
    const { data: legoWithPhrases } = await supabase
      .from('course_legos')
      .select('lego_index, known_text, target_text')
      .eq('course_code', 'zho_for_eng')
      .eq('seed_number', seedNum)
      .eq('is_new', true)
      .limit(1)
      .single();

    if (!legoWithPhrases) {
      console.log('--- SEED ' + seedNum + ': No new LEGOs found ---\n');
      continue;
    }

    console.log('--- SEED ' + seedNum + ', LEGO ' + legoWithPhrases.lego_index + ': ' + legoWithPhrases.known_text + ' → ' + legoWithPhrases.target_text + ' ---');

    // Get phrases
    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', 'zho_for_eng')
      .eq('seed_number', seedNum)
      .eq('lego_index', legoWithPhrases.lego_index);

    (phrases || []).forEach((p, i) => {
      const len = p.target_text.length;
      const tier = len <= 2 ? 'T' : len <= 5 ? 'S' : len <= 9 ? 'M' : 'L';
      console.log('  ' + (i+1) + '. [' + tier + '] ' + p.known_text);
      console.log('       → ' + p.target_text);
    });
    console.log('');
  }

  process.exit(0);
})();

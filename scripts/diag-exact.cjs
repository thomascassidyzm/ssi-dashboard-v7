const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get the exact missing phrases
  const testTexts = [
    "i feel as if i'm doing worse today than yesterday",
    "are (you)",
    "no problem. everything is okay"
  ];

  for (const text of testTexts) {
    // Check if audio exists for this exact normalized text
    const { data: audio, count } = await sb.from('course_audio')
      .select('id, text_normalized, role', { count: 'exact' })
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'known')
      .eq('text_normalized', text);

    console.log(`\n"${text}"`);
    console.log(`  Audio matches: ${count}`);

    // Also check what the phrase table has
    const { data: phrases } = await sb.from('course_practice_phrases')
      .select('known_text, seed_number')
      .eq('course_code', 'nld_for_eng')
      .ilike('known_text', `%${text.slice(0, 30)}%`)
      .limit(3);

    if (phrases) {
      for (const p of phrases) {
        console.log(`  Phrase: "${p.known_text}" (seed ${p.seed_number})`);
        console.log(`    Normalized match: ${p.known_text.toLowerCase().trim() === text}`);
      }
    }
  }

  // Now check: does the plan endpoint filter out these phrases?
  // The plan uses phrases + legos that need audio, checked against course_audio
  // Let's see if these 139 are just phrases without audio that the plan somehow skips

  // Count phrases beyond seed 300
  const { count: beyondTarget } = await sb.from('course_practice_phrases')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'nld_for_eng')
    .gt('seed_number', 300);
  console.log('\n\nPhrases beyond seed 300:', beyondTarget);

  // Count total phrases within target
  const { count: withinTarget } = await sb.from('course_practice_phrases')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'nld_for_eng')
    .lte('seed_number', 300);
  console.log('Phrases within seed 300:', withinTarget);
})();

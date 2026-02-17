const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check which seeds have LEGOs (meaning they were fully finalized)
  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'jpn_for_eng')
    .gte('seed_number', 51)
    .lte('seed_number', 300);

  if (error) { console.log('Error:', error.message); return; }

  const seedsWithLegos = new Set(legos.map(l => l.seed_number));
  const allDrafted = [];
  for (let i = 51; i <= 300; i++) allDrafted.push(i);

  const finalized = allDrafted.filter(s => seedsWithLegos.has(s));
  const missing = allDrafted.filter(s => !seedsWithLegos.has(s));

  console.log(`Seeds with LEGOs: ${finalized.length}/250`);
  console.log(`Missing seeds: ${missing.length}`);
  if (missing.length <= 50) {
    console.log(`Missing: ${missing.join(', ')}`);
  } else {
    console.log(`Missing range: ${missing[0]}-${missing[missing.length-1]}`);
  }

  // Also check phrase counts for some finalized seeds
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number')
    .eq('course_code', 'jpn_for_eng')
    .gte('seed_number', 51)
    .lte('seed_number', 300);

  const seedsWithPhrases = new Set((phrases || []).map(p => p.seed_number));
  const withLegosNoPhrases = finalized.filter(s => !seedsWithPhrases.has(s));
  console.log(`\nSeeds with LEGOs but NO phrases: ${withLegosNoPhrases.length}`);
  if (withLegosNoPhrases.length > 0 && withLegosNoPhrases.length <= 30) {
    console.log(`  ${withLegosNoPhrases.join(', ')}`);
  }
})();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://swfvymspfxmnfhevgdkg.supabase.co',
  'sb_secret_rjnajgh-6CuwZUEJv7Xtkg_wCZuRyTh'
);

(async () => {
  // Get all M-type LEGOs for seeds 1-50
  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', 'zho_for_eng')
    .eq('type', 'M')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total M-LEGOs in seeds 1-50: ${legos.length}\n`);

  // Group by seed
  const bySeed = {};
  legos.forEach(l => {
    if (!bySeed[l.seed_number]) bySeed[l.seed_number] = [];
    bySeed[l.seed_number].push(l);
  });

  // Show M-LEGOs per seed
  for (let seed = 1; seed <= 50; seed++) {
    const seedLegos = bySeed[seed] || [];
    if (seedLegos.length > 0) {
      console.log(`S${String(seed).padStart(4,'0')}: ${seedLegos.length} M-LEGOs`);
      seedLegos.forEach(l => {
        console.log(`  L${String(l.lego_index).padStart(2,'0')}: "${l.known_text}" → "${l.target_text}"`);
      });
    }
  }
})();

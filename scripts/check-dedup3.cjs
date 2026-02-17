require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Count LEGOs per seed to find seeds with unusual LEGO counts
  const { data: allLegos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .order('lego_index');

  if (error) { console.error('Error:', error.message); return; }

  // Group by seed
  const seedMap = new Map();
  for (const l of allLegos) {
    if (!seedMap.has(l.seed_number)) seedMap.set(l.seed_number, []);
    seedMap.get(l.seed_number).push(l);
  }

  // Seeds with >3 LEGOs (might have orphans from prior builds)
  console.log('Seeds with >3 LEGOs:');
  let orphanCount = 0;
  for (const [seed, legos] of [...seedMap.entries()].sort((a, b) => a[0] - b[0])) {
    if (legos.length > 3) {
      console.log(`  S${seed}: ${legos.length} LEGOs — ${legos.map(l => `L${l.lego_index} "${l.known_text}" (is_new=${l.is_new})`).join(', ')}`);
    }
  }

  // Check for non-contiguous lego_index values (gaps suggest orphans)
  console.log('\nSeeds with non-contiguous lego_index:');
  for (const [seed, legos] of [...seedMap.entries()].sort((a, b) => a[0] - b[0])) {
    const indices = legos.map(l => l.lego_index).sort((a, b) => a - b);
    const expected = Array.from({ length: indices.length }, (_, i) => i + 1);
    if (JSON.stringify(indices) !== JSON.stringify(expected)) {
      console.log(`  S${seed}: indices [${indices.join(',')}] — ${legos.map(l => `L${l.lego_index} "${l.known_text}"`).join(', ')}`);
    }
  }

  // How many seeds have LEGOs?
  console.log(`\nTotal seeds with LEGOs: ${seedMap.size}`);
  console.log(`Seeds range: ${Math.min(...seedMap.keys())} to ${Math.max(...seedMap.keys())}`);

  // Distribution of LEGO counts per seed
  const countDist = new Map();
  for (const [seed, legos] of seedMap) {
    const count = legos.length;
    countDist.set(count, (countDist.get(count) || 0) + 1);
  }
  console.log('\nLEGO count distribution:');
  for (const [count, seeds] of [...countDist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${count} LEGOs: ${seeds} seeds`);
  }
})();

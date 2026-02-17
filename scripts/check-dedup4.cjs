require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check course_seeds.decomposed_at timestamps to understand build history
  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, decomposed_at, status')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .limit(20);

  if (error) { console.error('Error:', error.message); return; }

  console.log('First 20 seeds decomposed_at:');
  seeds.forEach(s => {
    console.log(`  S${s.seed_number}: ${s.decomposed_at || 'null'} (${s.status})`);
  });

  // Check how many seeds have decomposed_at set
  const { count: decomposedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'fra_for_eng')
    .not('decomposed_at', 'is', null);

  console.log(`\nTotal seeds with decomposed_at: ${decomposedCount}`);

  // Check if there are LEGOs beyond seed 300 (which would indicate prior build artifacts)
  const { data: highLegos, error: e2 } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text')
    .eq('course_code', 'fra_for_eng')
    .gt('seed_number', 300)
    .order('seed_number')
    .limit(10);

  console.log(`\nLEGOs beyond seed 300: ${highLegos?.length || 0}`);
  if (highLegos?.length > 0) {
    highLegos.forEach(l => console.log(`  S${l.seed_number} L${l.lego_index}: "${l.known_text}"`));
  }

  // Check the is_new distribution across seed ranges
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('seed_number, is_new')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number');

  const ranges = [
    { label: 'Golden (1-10)', min: 1, max: 10 },
    { label: 'Early (11-50)', min: 11, max: 50 },
    { label: 'Mid (51-150)', min: 51, max: 150 },
    { label: 'Late (151-300)', min: 151, max: 300 },
  ];

  console.log('\nis_new distribution by seed range:');
  for (const r of ranges) {
    const inRange = allLegos.filter(l => l.seed_number >= r.min && l.seed_number <= r.max);
    const isNew = inRange.filter(l => l.is_new).length;
    const isDup = inRange.filter(l => !l.is_new).length;
    console.log(`  ${r.label}: ${inRange.length} LEGOs (${isNew} new, ${isDup} dup)`);
  }
})();

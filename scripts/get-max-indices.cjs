const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://swfvymspfxmnfhevgdkg.supabase.co',
  'sb_secret_rjnajgh-6CuwZUEJv7Xtkg_wCZuRyTh'
);

(async () => {
  // Get max lego_index for each seed 1-50
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index')
    .eq('course_code', 'zho_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index', { ascending: false });

  // Group by seed and get max index
  const maxIndices = {};
  legos.forEach(l => {
    if (!maxIndices[l.seed_number] || l.lego_index > maxIndices[l.seed_number]) {
      maxIndices[l.seed_number] = l.lego_index;
    }
  });

  console.log(JSON.stringify(maxIndices, null, 2));
})();

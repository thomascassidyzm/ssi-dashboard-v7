require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check if course_legos has a created_at or updated_at column
  const { data: sample, error } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 11)
    .limit(1);

  if (error) { console.error('Error:', error.message); return; }
  if (sample?.length > 0) {
    console.log('course_legos columns for S11:');
    console.log(Object.keys(sample[0]).join(', '));
    console.log(JSON.stringify(sample[0], null, 2));
  }

  // Also check if there are any course_seed_drafts left
  const { count: draftCount } = await supabase
    .from('course_seed_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'fra_for_eng');
  console.log(`\nRemaining drafts: ${draftCount}`);

  // Check Dutch course for comparison — was it finalized similarly?
  const { data: nldLegos } = await supabase
    .from('course_legos')
    .select('seed_number, is_new')
    .eq('course_code', 'nld_for_eng');

  if (nldLegos?.length > 0) {
    const nldNew = nldLegos.filter(l => l.is_new).length;
    const nldDup = nldLegos.filter(l => !l.is_new).length;
    console.log(`\nDutch comparison: ${nldLegos.length} LEGOs (${nldNew} new, ${nldDup} dup)`);
  }
})();

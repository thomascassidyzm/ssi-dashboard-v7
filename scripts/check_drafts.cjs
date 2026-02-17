const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('course_seed_drafts')
    .select('seed_number, submission_data')
    .eq('course_code', 'jpn_for_eng')
    .order('seed_number');
  if (error) { console.log('Error:', error.message); return; }
  console.log('Total drafts:', data.length);
  let issues = 0;
  for (const d of data) {
    const sd = d.submission_data;
    if (!sd) { console.log(`S${d.seed_number}: NULL submission_data`); issues++; continue; }
    const legos = sd.legos || [];
    if (legos.length === 0) { console.log(`S${d.seed_number}: EMPTY legos array`); issues++; continue; }
    for (const lego of legos) {
      if (!lego.known || lego.known === '') {
        console.log(`S${d.seed_number} L${lego.idx}: NULL/empty known -- keys=${Object.keys(lego)}`);
        issues++;
      }
      if (!lego.target || lego.target === '') {
        console.log(`S${d.seed_number} L${lego.idx}: NULL/empty target`);
        issues++;
      }
    }
  }
  console.log(`Issues found: ${issues}`);
})();

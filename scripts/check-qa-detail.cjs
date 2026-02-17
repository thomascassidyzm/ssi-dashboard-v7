const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // 1. Get ALL flags (no filter on course_code first, to debug)
  const { data: allFlags, error: allErr } = await supabase
    .from('course_qa_flags')
    .select('*')
    .limit(20);

  console.log('=== ALL FLAGS (any course, limit 20) ===');
  console.log('Error:', allErr?.message || 'none');
  console.log('Count:', allFlags?.length || 0);
  if (allFlags) {
    allFlags.forEach(f => {
      console.log(`  ${f.course_code} S${f.seed_number} [${f.check_type}/${f.severity}/${f.status}]: ${f.issue}`);
      if (f.details) console.log('    details:', JSON.stringify(f.details));
    });
  }

  // 2. Check qa_checked timestamps on phrases
  const { data: checkedPhrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, qa_checked')
    .eq('course_code', 'fra_for_eng')
    .not('qa_checked', 'is', null)
    .order('qa_checked', { ascending: true })
    .limit(5);

  console.log('\n=== EARLIEST qa_checked timestamps ===');
  if (checkedPhrases) {
    checkedPhrases.forEach(p => console.log('  S' + p.seed_number + ':', p.qa_checked));
  }

  const { data: latestChecked } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, qa_checked')
    .eq('course_code', 'fra_for_eng')
    .not('qa_checked', 'is', null)
    .order('qa_checked', { ascending: false })
    .limit(5);

  console.log('\n=== LATEST qa_checked timestamps ===');
  if (latestChecked) {
    latestChecked.forEach(p => console.log('  S' + p.seed_number + ':', p.qa_checked));
  }

  // 3. Count how many phrases per seed range are checked
  const { data: seedCounts } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, qa_checked')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 11)
    .lte('seed_number', 50)
    .order('seed_number');

  console.log('\n=== Seeds 11-50: qa_checked status ===');
  if (seedCounts) {
    const byCheck = {};
    for (const p of seedCounts) {
      const key = p.qa_checked ? 'checked' : 'unchecked';
      byCheck[key] = (byCheck[key] || 0) + 1;
    }
    console.log('  Checked:', byCheck.checked || 0);
    console.log('  Unchecked:', byCheck.unchecked || 0);
    console.log('  Total:', seedCounts.length);
  }
}
main();

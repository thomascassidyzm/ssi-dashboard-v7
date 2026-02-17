const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get ALL fra_for_eng flags
  const { data: flags, error, count } = await supabase
    .from('course_qa_flags')
    .select('*', { count: 'exact' })
    .eq('course_code', 'fra_for_eng');

  console.log('Error:', error?.message || 'none');
  console.log('Count from header:', count);
  console.log('Data length:', flags?.length || 0);
  console.log('');

  if (flags && flags.length > 0) {
    flags.forEach(f => {
      console.log(`S${f.seed_number} [${f.check_type}/${f.severity}/${f.status}]: ${f.issue}`);
      if (f.details) {
        console.log('  known:', f.details.known || f.details.known_text);
        console.log('  target:', f.details.target || f.details.target_text);
      }
      console.log('  created:', f.created_at);
      console.log('');
    });
  }

  // Also check: what seed ranges are covered by qa_checked timestamps?
  // Group by approximate time ranges
  const { data: ranges } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, qa_checked')
    .eq('course_code', 'fra_for_eng')
    .not('qa_checked', 'is', null)
    .order('seed_number')
    .limit(5000);

  if (ranges) {
    // Find distinct qa_checked timestamps and what seed ranges they cover
    const byTimestamp = {};
    for (const r of ranges) {
      // Round to nearest minute
      const ts = r.qa_checked.substring(0, 16);
      if (!byTimestamp[ts]) byTimestamp[ts] = { min: r.seed_number, max: r.seed_number, count: 0 };
      byTimestamp[ts].min = Math.min(byTimestamp[ts].min, r.seed_number);
      byTimestamp[ts].max = Math.max(byTimestamp[ts].max, r.seed_number);
      byTimestamp[ts].count++;
    }

    console.log('=== QA CHECK TIMESTAMPS (when was each range checked?) ===');
    const sorted = Object.entries(byTimestamp).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [ts, info] of sorted) {
      console.log(`  ${ts} → Seeds ${info.min}-${info.max} (${info.count} phrases)`);
    }
  }
}
main();

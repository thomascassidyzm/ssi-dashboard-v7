const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  let total = 0;
  while (true) {
    const { data: batch, error: fetchErr } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', 'nld_for_eng')
      .limit(500);
    if (fetchErr) { console.error('Fetch error:', fetchErr.message); break; }
    if (!batch || batch.length === 0) break;

    const ids = batch.map(r => r.id);
    const { count, error } = await supabase
      .from('course_audio')
      .delete({ count: 'exact' })
      .in('id', ids);
    if (error) { console.error('Delete error:', error.message); break; }
    total += (count || 0);
    process.stdout.write('Deleted ' + total + ' / ~52911\r');
  }
  console.log('\nDone:', total, 'audio records deleted');
})();

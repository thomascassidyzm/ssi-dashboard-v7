const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  let totalDeleted = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'presentation')
      .limit(200);

    if (!batch || batch.length === 0) break;

    const ids = batch.map(b => b.id);
    const { error } = await supabase
      .from('course_audio')
      .delete()
      .in('id', ids);

    if (error) { console.error('Delete error:', error); break; }
    totalDeleted += ids.length;
    console.log(`Deleted ${totalDeleted}...`);
  }

  console.log(`\nTotal deleted: ${totalDeleted}`);

  const { count } = await supabase
    .from('course_audio')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'nld_for_eng')
    .eq('role', 'presentation');

  const { count: legosPres } = await supabase
    .from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'nld_for_eng')
    .not('presentation_audio_id', 'is', null);

  console.log('Verification:');
  console.log(`  Presentation audio remaining: ${count}`);
  console.log(`  LEGOs with presentation_audio_id: ${legosPres}`);
})();

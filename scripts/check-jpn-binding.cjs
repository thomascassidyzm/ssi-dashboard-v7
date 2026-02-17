const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, presentation_audio_id')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .limit(5);

  console.log('Sample presentation_audio_ids:');
  for (const l of legos) {
    console.log('  S' + l.seed_number + 'L' + l.lego_index + ':', l.presentation_audio_id);
  }

  const ids = legos.map(l => l.presentation_audio_id);
  const { data: found } = await supabase
    .from('course_audio')
    .select('id, role, s3_key')
    .in('id', ids);

  console.log('\nMatched in course_audio:', (found || []).length, '/', ids.length);
  for (const a of (found || [])) {
    console.log('  id:', a.id, 'role:', a.role, 's3:', (a.s3_key || '').substring(0, 50));
  }

  const foundIds = new Set((found || []).map(a => a.id));
  const missing = ids.filter(id => {
    return !foundIds.has(id);
  });
  if (missing.length > 0) {
    console.log('\nMISSING from course_audio:', missing);
  } else {
    console.log('\nAll presentation_audio_ids are valid database IDs');
  }

  // Also spot-check a broader sample
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('presentation_audio_id')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .not('presentation_audio_id', 'is', null);

  const allIds = allLegos.map(l => l.presentation_audio_id);

  // Check in batches of 100
  let totalMissing = 0;
  for (let i = 0; i < allIds.length; i += 100) {
    const batch = allIds.slice(i, i + 100);
    const { data: batchFound } = await supabase
      .from('course_audio')
      .select('id')
      .in('id', batch);

    const batchFoundSet = new Set((batchFound || []).map(a => a.id));
    const batchMissing = batch.filter(id => !batchFoundSet.has(id));
    totalMissing += batchMissing.length;
    if (batchMissing.length > 0) {
      console.log('\nBatch', i, '- missing:', batchMissing.slice(0, 3));
    }
  }

  console.log('\n=== FULL CHECK ===');
  console.log('Total presentation_audio_ids:', allIds.length);
  console.log('Missing from course_audio:', totalMissing);
  if (totalMissing === 0) {
    console.log('All presentation audio bindings are VALID');
  } else {
    console.log('BROKEN bindings need fixing');
  }
})();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Count new LEGOs
  const { count: legoCount } = await sb
    .from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true);

  // Count introductions
  const { data: intros, count: introCount } = await sb
    .from('lego_introductions')
    .select('lego_id, presentation_audio_id', { count: 'exact' })
    .eq('course_code', 'jpn_for_eng');

  console.log('New LEGOs:', legoCount);
  console.log('Introductions:', introCount || 0);
  console.log('Gap:', legoCount - (introCount || 0));

  if (intros && intros.length > 0) {
    console.log('\nSample intros:');
    for (const i of intros.slice(0, 5)) {
      console.log(' ', i.lego_id, '→ pres_audio:', i.presentation_audio_id || 'NULL');
    }
    const withAudio = intros.filter(i => i.presentation_audio_id);
    const withoutAudio = intros.filter(i => i.presentation_audio_id === null);
    console.log('\nWith presentation_audio_id:', withAudio.length);
    console.log('Without (NULL):', withoutAudio.length);
  } else {
    console.log('\nNo introductions found at all!');
  }

  // Find LEGOs missing introductions
  const { data: allNewLegos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .limit(1000);

  const introLegoIds = new Set((intros || []).map(i => i.lego_id));

  const missing = [];
  for (const l of allNewLegos) {
    const legoId = `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`;
    if (!introLegoIds.has(legoId)) {
      missing.push({ legoId, known: l.known_text, target: l.target_text });
    }
  }

  console.log('\n=== LEGOs MISSING Introductions ===');
  console.log('Total missing:', missing.length);
  if (missing.length > 0) {
    for (const m of missing.slice(0, 20)) {
      console.log(' ', m.legoId + ':', m.known, '→', m.target);
    }
    if (missing.length > 20) console.log('  ... and', missing.length - 20, 'more');
  }

  // Also compare with zho_for_eng for reference
  const { count: zhoIntros } = await sb
    .from('lego_introductions')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'zho_for_eng');

  const { count: zhoLegos } = await sb
    .from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true);

  console.log('\n=== zho_for_eng comparison ===');
  console.log('New LEGOs:', zhoLegos);
  console.log('Introductions:', zhoIntros);
})();

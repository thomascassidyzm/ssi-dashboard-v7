const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get all presentation audio lego_ids
  const { data: presAudio } = await sb
    .from('course_audio')
    .select('id, lego_id')
    .eq('course_code', 'nld_for_eng')
    .eq('role', 'presentation');

  const audioLegoIds = new Set((presAudio || []).map(a => a.lego_id));
  console.log('Presentation audio records:', (presAudio || []).length);
  console.log('Unique lego_ids with audio:', audioLegoIds.size);

  // Get all new LEGOs
  const { data: legos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, presentation_audio_id')
    .eq('course_code', 'nld_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  console.log('New LEGOs:', legos.length);

  // Find missing
  const missing = [];
  for (const l of legos) {
    const legoId = `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`;
    if (!audioLegoIds.has(legoId)) {
      missing.push({ legoId, known: l.known_text, target: l.target_text, seed: l.seed_number, hasId: !!l.presentation_audio_id });
    }
  }

  console.log('\nMissing presentation audio (' + missing.length + '):');
  for (const m of missing) {
    console.log(`  ${m.legoId}: ${m.known} → ${m.target}  (has pres_id: ${m.hasId})`);
  }
})();

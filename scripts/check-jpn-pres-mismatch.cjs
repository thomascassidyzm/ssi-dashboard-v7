const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get all new LEGOs with their presentation_audio_id
  const { data: legos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, presentation_audio_id')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .not('presentation_audio_id', 'is', null)
    .order('seed_number')
    .order('lego_index');

  // Get the corresponding course_audio records to see what text was generated
  const audioIds = legos.map(l => l.presentation_audio_id);

  // Batch fetch
  const audioMap = new Map();
  for (let i = 0; i < audioIds.length; i += 100) {
    const batch = audioIds.slice(i, i + 100);
    const { data } = await sb
      .from('course_audio')
      .select('id, text_content, lego_id, seed_number, lego_index, role')
      .in('id', batch);
    for (const a of (data || [])) {
      audioMap.set(a.id, a);
    }
  }

  // Check for mismatches
  let mismatches = 0;
  let matched = 0;

  for (const lego of legos) {
    const audio = audioMap.get(lego.presentation_audio_id);
    if (!audio) {
      console.log(`S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}: ${lego.known_text} → ${lego.target_text}`);
      console.log(`  ⚠ Audio record NOT FOUND for id: ${lego.presentation_audio_id}`);
      mismatches++;
      continue;
    }

    // Check if audio's lego_id matches this LEGO
    const expectedLegoId = `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`;
    const audioLegoId = audio.lego_id;

    // Check if seed/lego index match
    const seedMatch = audio.seed_number === lego.seed_number;
    const idxMatch = audio.lego_index === lego.lego_index;

    if (!seedMatch || !idxMatch) {
      console.log(`S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}: ${lego.known_text} → ${lego.target_text}`);
      console.log(`  MISMATCH! Audio belongs to seed=${audio.seed_number} lego=${audio.lego_index} (${audio.lego_id})`);
      console.log(`  Audio text: "${(audio.text_content || '').substring(0, 80)}"`);
      mismatches++;
    } else {
      matched++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total new LEGOs with presentation audio: ${legos.length}`);
  console.log(`Correctly matched: ${matched}`);
  console.log(`Mismatched: ${mismatches}`);
})();

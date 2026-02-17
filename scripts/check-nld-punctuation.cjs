const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MISSING_SEEDS = [126,131,133,142,151,155,156,157,171,264,267];
const MISSING_IDXS = [4,4,3,3,3,3,3,3,3,1,1];

(async () => {
  for (let i = 0; i < MISSING_SEEDS.length; i++) {
    const seedNum = MISSING_SEEDS[i];
    const legoIdx = MISSING_IDXS[i];
    const legoId = `S${String(seedNum).padStart(4,'0')}L${String(legoIdx).padStart(2,'0')}`;

    // Get the LEGO
    const { data: lego } = await sb
      .from('course_legos')
      .select('known_text, target_text')
      .eq('course_code', 'nld_for_eng')
      .eq('seed_number', seedNum)
      .eq('lego_index', legoIdx)
      .single();

    if (!lego) { console.log(legoId + ': LEGO not found'); continue; }

    // Search for audio with similar text (fuzzy match)
    const knownNorm = lego.known_text.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
    const targetNorm = lego.target_text.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();

    // Search known audio
    const { data: knownAudio } = await sb
      .from('course_audio')
      .select('id, text, text_normalized, role, lego_id')
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'known')
      .ilike('text_normalized', `%${knownNorm}%`)
      .limit(3);

    // Search target audio
    const { data: targetAudio } = await sb
      .from('course_audio')
      .select('id, text, text_normalized, role, lego_id')
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'target1')
      .ilike('text_normalized', `%${targetNorm}%`)
      .limit(3);

    // Search presentation audio
    const presText = `the dutch for '${knownNorm}'`;
    const { data: presAudio } = await sb
      .from('course_audio')
      .select('id, text, text_normalized, role, lego_id')
      .eq('course_code', 'nld_for_eng')
      .eq('role', 'presentation')
      .ilike('text_normalized', `%${knownNorm}%`)
      .limit(3);

    console.log(`${legoId}: "${lego.known_text}" → "${lego.target_text}"`);
    console.log(`  known_norm: "${knownNorm}"  target_norm: "${targetNorm}"`);
    console.log(`  known audio matches: ${(knownAudio || []).length}`);
    for (const a of (knownAudio || [])) {
      console.log(`    ${a.lego_id}: "${a.text}" (norm: "${a.text_normalized}")`);
    }
    console.log(`  target1 audio matches: ${(targetAudio || []).length}`);
    for (const a of (targetAudio || [])) {
      console.log(`    ${a.lego_id}: "${a.text}" (norm: "${a.text_normalized}")`);
    }
    console.log(`  presentation audio matches: ${(presAudio || []).length}`);
    for (const a of (presAudio || [])) {
      console.log(`    ${a.lego_id}: "${a.text_normalized?.substring(0, 80)}"`);
    }
    console.log();
  }
})();

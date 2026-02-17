const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MISSING = ['S0126L04','S0131L04','S0133L03','S0142L03','S0151L03','S0155L03','S0156L03','S0157L03','S0171L03','S0264L01','S0267L01'];

(async () => {
  for (const legoId of MISSING) {
    const seedNum = parseInt(legoId.substring(1, 5));
    const legoIdx = parseInt(legoId.substring(6, 8));

    // Get the LEGO details
    const { data: lego } = await sb
      .from('course_legos')
      .select('*')
      .eq('course_code', 'nld_for_eng')
      .eq('seed_number', seedNum)
      .eq('lego_index', legoIdx)
      .single();

    // Check if it has known/target audio
    const { data: audio } = await sb
      .from('course_audio')
      .select('id, role, text, created_at, lego_id')
      .eq('course_code', 'nld_for_eng')
      .eq('lego_id', legoId);

    // Check phrases for this LEGO
    const { count: phraseCount } = await sb
      .from('course_practice_phrases')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', 'nld_for_eng')
      .eq('seed_number', seedNum)
      .eq('lego_index', legoIdx);

    console.log(`${legoId}: "${lego.known_text}" → "${lego.target_text}"`);
    console.log(`  type: ${lego.type}, is_new: ${lego.is_new}`);
    console.log(`  known_audio_id: ${lego.known_audio_id || 'NULL'}`);
    console.log(`  target1_audio_id: ${lego.target1_audio_id || 'NULL'}`);
    console.log(`  presentation_audio_id: ${lego.presentation_audio_id || 'NULL'}`);
    console.log(`  created_at: ${lego.created_at || 'unknown'}`);
    console.log(`  phrases: ${phraseCount}`);
    console.log(`  audio records in course_audio: ${(audio || []).length}`);
    if (audio && audio.length > 0) {
      for (const a of audio) {
        console.log(`    ${a.role}: ${a.id} (${a.created_at})`);
      }
    }
    console.log();
  }

  // Compare: when was the last audio generation run?
  const { data: latestAudio } = await sb
    .from('course_audio')
    .select('created_at, role')
    .eq('course_code', 'nld_for_eng')
    .eq('role', 'presentation')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Latest presentation audio generated:');
  for (const a of (latestAudio || [])) {
    console.log(`  ${a.created_at}`);
  }

  // When were these LEGOs created?
  const { data: missingLegos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, created_at')
    .eq('course_code', 'nld_for_eng')
    .in('seed_number', [126,131,133,142,151,155,156,157,171,264,267]);

  const missingCreated = missingLegos.filter(l =>
    MISSING.includes(`S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`)
  );
  console.log('\nMissing LEGOs created_at:');
  for (const l of missingCreated) {
    console.log(`  S${l.seed_number}L${l.lego_index}: ${l.created_at}`);
  }
})();

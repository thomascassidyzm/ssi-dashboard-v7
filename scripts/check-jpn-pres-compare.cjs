const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get presentation audio from course_audio
  const { data: presAudio } = await sb
    .from('course_audio')
    .select('id, s3_key, lego_id, seed_number, lego_index, text_content')
    .eq('course_code', 'jpn_for_eng')
    .eq('role', 'presentation')
    .order('seed_number')
    .order('lego_index')
    .limit(10);

  console.log('Presentation audio in course_audio (first 10):');
  if (!presAudio || presAudio.length === 0) {
    console.log('  NONE FOUND!');
    return;
  }
  for (const a of presAudio) {
    console.log(`  DB id: ${a.id}`);
    console.log(`  lego: ${a.lego_id} (S${a.seed_number}L${a.lego_index})`);
    console.log(`  text: ${(a.text_content || '').substring(0, 80)}`);
    console.log();
  }

  // Get LEGOs for same seeds
  const seedNums = [...new Set(presAudio.map(a => a.seed_number))];
  const { data: legos } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, presentation_audio_id')
    .eq('course_code', 'jpn_for_eng')
    .in('seed_number', seedNums)
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  console.log('\nLEGOs for same seeds:');
  for (const l of legos) {
    const matchingAudio = presAudio.find(a => a.seed_number === l.seed_number && a.lego_index === l.lego_index);
    const match = matchingAudio ? (matchingAudio.id === l.presentation_audio_id ? 'MATCH' : 'WRONG ID') : 'NO AUDIO';
    console.log(`  S${l.seed_number}L${l.lego_index}: ${l.known_text} → ${l.target_text}`);
    console.log(`    stored pres_id: ${l.presentation_audio_id}`);
    if (matchingAudio) {
      console.log(`    actual DB id:   ${matchingAudio.id}`);
      console.log(`    status: ${match}`);
    }
    console.log();
  }
})();

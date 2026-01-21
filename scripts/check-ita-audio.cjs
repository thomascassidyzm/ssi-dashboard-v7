const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const courseCode = 'ita_for_eng';

  // Check course_audio for this course
  const { data: audio, count: audioCount } = await supabase
    .from('course_audio')
    .select('id, role, text_normalized, s3_key', { count: 'exact' })
    .eq('course_code', courseCode)
    .limit(10);

  console.log(`\n=== course_audio for ${courseCode} ===`);
  console.log(`Total records: ${audioCount}`);
  console.log('\nSample records:');
  for (const a of audio || []) {
    console.log(`  [${a.role}] ${a.text_normalized?.substring(0, 50)}...`);
  }

  // Check practice_cycles view
  const { data: cycles } = await supabase
    .from('practice_cycles')
    .select('known_text, target_text, known_audio_uuid, target1_audio_uuid, target2_audio_uuid')
    .eq('course_code', courseCode)
    .limit(5);

  console.log('\n=== practice_cycles sample ===');
  for (const c of cycles || []) {
    console.log(`  Known: "${c.known_text?.substring(0, 30)}" UUID: ${c.known_audio_uuid || 'null'}`);
    console.log(`  Target: "${c.target_text?.substring(0, 30)}" T1: ${c.target1_audio_uuid || 'null'} T2: ${c.target2_audio_uuid || 'null'}`);
    console.log('---');
  }

  // Check if there are any phrases that have matching audio
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text')
    .eq('course_code', courseCode)
    .limit(5);

  console.log('\n=== Checking specific phrases for audio match ===');
  for (const p of phrases || []) {
    // Check for known audio
    const { data: knownAudio } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', courseCode)
      .eq('text_normalized', p.known_text?.toLowerCase().trim())
      .eq('role', 'known')
      .single();

    // Check for target audio
    const { data: targetAudio } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', courseCode)
      .eq('text_normalized', p.target_text?.toLowerCase().trim())
      .eq('role', 'target1')
      .single();

    console.log(`Phrase: "${p.known_text}" / "${p.target_text}"`);
    console.log(`  Known audio: ${knownAudio ? 'FOUND' : 'MISSING'}`);
    console.log(`  Target1 audio: ${targetAudio ? 'FOUND' : 'MISSING'}`);
  }
}

check().catch(console.error);

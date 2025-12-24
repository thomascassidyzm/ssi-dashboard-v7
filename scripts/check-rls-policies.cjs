require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use the ANON key (like the learning app does) instead of service key
const supabase = createClient(
  process.env.SUPABASE_URL,
  'sb_publishable_qtEtXRcEOkvapw99x5suww_SuCXYmvg' // Anon key from learning app .env
);

async function check() {
  console.log('=== Testing with ANON key (like learning app) ===\n');

  // Test reading texts
  const { data: texts, error: textsError } = await supabase
    .from('texts')
    .select('id, content, language')
    .eq('content', 'I want to speak')
    .limit(1);

  if (textsError) {
    console.log('❌ texts table: BLOCKED -', textsError.message);
  } else {
    console.log('✅ texts table: READABLE -', texts?.length, 'row(s)');
  }

  // Test reading audio_files
  const { data: audio, error: audioError } = await supabase
    .from('audio_files')
    .select('id, voice_id')
    .limit(1);

  if (audioError) {
    console.log('❌ audio_files table: BLOCKED -', audioError.message);
  } else {
    console.log('✅ audio_files table: READABLE -', audio?.length, 'row(s)');
  }

  // Test reading course_audio
  const { data: courseAudio, error: caError } = await supabase
    .from('course_audio')
    .select('audio_id, role')
    .eq('course_code', 'cym_n_for_eng')
    .limit(1);

  if (caError) {
    console.log('❌ course_audio table: BLOCKED -', caError.message);
  } else {
    console.log('✅ course_audio table: READABLE -', courseAudio?.length, 'row(s)');
  }

  // Test reading lego_introductions
  const { data: intros, error: introsError } = await supabase
    .from('lego_introductions')
    .select('lego_id, audio_uuid')
    .limit(1);

  if (introsError) {
    console.log('❌ lego_introductions table: BLOCKED -', introsError.message);
  } else {
    console.log('✅ lego_introductions table: READABLE -', intros?.length, 'row(s)');
  }

  // Test the full lookup chain with anon key
  console.log('\n=== Full lookup chain with ANON key ===\n');

  const { data: textData } = await supabase
    .from('texts')
    .select('id')
    .eq('content', 'I want to speak');

  if (!textData || textData.length === 0) {
    console.log('Step 1 FAILED: No text found');
    return;
  }
  console.log('Step 1: texts - found', textData.length, 'row(s)');

  const textId = textData[0].id;
  const { data: audioData } = await supabase
    .from('audio_files')
    .select('id')
    .eq('text_id', textId);

  if (!audioData || audioData.length === 0) {
    console.log('Step 2 FAILED: No audio_files found');
    return;
  }
  console.log('Step 2: audio_files - found', audioData.length, 'row(s)');

  const audioId = audioData[0].id;
  const { data: caData } = await supabase
    .from('course_audio')
    .select('role')
    .eq('audio_id', audioId)
    .eq('course_code', 'cym_n_for_eng');

  if (!caData || caData.length === 0) {
    console.log('Step 3 FAILED: No course_audio found');
    return;
  }
  console.log('Step 3: course_audio - found', caData.length, 'row(s) with role:', caData[0].role);

  console.log('\n✅ Full chain works with ANON key!');
}

check().catch(console.error);

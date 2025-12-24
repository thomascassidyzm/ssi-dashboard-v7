const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function traceV12Lookup() {
  const testText = 'dw i isio';
  const courseCode = 'cym_n_for_eng';

  console.log('=== V12 Lookup Simulation ===');
  console.log('Text:', JSON.stringify(testText));
  console.log('Course:', courseCode);
  console.log('');

  // Step 1: texts table
  console.log('Step 1: Query texts table');
  const { data: texts, error: e1 } = await supabase
    .from('texts')
    .select('id, content')
    .eq('content', testText);
  console.log('  Result:', texts ? texts.length : 0, 'rows');
  if (!texts || texts.length === 0) {
    console.log('  FAIL: Text not found in texts table');
    return;
  }
  const textId = texts[0].id;
  console.log('  text_id:', textId);

  // Step 2: audio_files table
  console.log('');
  console.log('Step 2: Query audio_files for text_id');
  const { data: audioFiles, error: e2 } = await supabase
    .from('audio_files')
    .select('id, text_id')
    .eq('text_id', textId);
  console.log('  Result:', audioFiles ? audioFiles.length : 0, 'rows');
  if (!audioFiles || audioFiles.length === 0) {
    console.log('  FAIL: No audio_files for this text_id');
    return;
  }
  const audioIds = audioFiles.map(af => af.id);
  console.log('  audio_ids:', audioIds);

  // Step 3: course_audio table
  console.log('');
  console.log('Step 3: Query course_audio with course_code AND audio_id filter');
  const { data: courseAudio, error: e3 } = await supabase
    .from('course_audio')
    .select('audio_id, role, course_code')
    .eq('course_code', courseCode)
    .in('audio_id', audioIds);
  console.log('  Result:', courseAudio ? courseAudio.length : 0, 'rows');
  if (courseAudio && courseAudio.length > 0) {
    console.log('  SUCCESS!');
    courseAudio.forEach(ca => console.log('    ', ca.role, '->', ca.audio_id));
  } else {
    console.log('  FAIL: No course_audio entries!');

    // Debug: check if audio_ids exist in course_audio for ANY course
    const { data: anyCA } = await supabase
      .from('course_audio')
      .select('audio_id, role, course_code')
      .in('audio_id', audioIds);
    console.log('  course_audio for these audio_ids (any course):', anyCA ? anyCA.length : 0);
    if (anyCA && anyCA.length > 0) {
      console.log('  Found in courses:', [...new Set(anyCA.map(ca => ca.course_code))]);
    }
  }
}

traceV12Lookup().catch(console.error);

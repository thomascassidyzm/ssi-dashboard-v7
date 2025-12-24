require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Check for any course_audio with 'known' or 'source' role
  console.log('=== Checking for known/source audio ===\n');

  const { data: knownAudio } = await supabase
    .from('course_audio')
    .select('course_code, role')
    .or('role.eq.known,role.eq.source');

  console.log('Entries with known/source role:', knownAudio?.length || 0);
  if (knownAudio && knownAudio.length > 0) {
    console.log('Sample:', knownAudio.slice(0, 5));
  }

  // Check for en-cy-north course code
  const { data: enCyNorth } = await supabase
    .from('course_audio')
    .select('course_code, role')
    .eq('course_code', 'en-cy-north')
    .limit(10);

  console.log('\nEntries with en-cy-north course_code:', enCyNorth?.length || 0);

  // Check texts table for English text (should be source/known language)
  const { data: engTexts, count: engCount } = await supabase
    .from('texts')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'eng');

  console.log('\nTexts in English (eng):', engCount);

  // Check audio_files for English texts
  const { data: sampleEngText } = await supabase
    .from('texts')
    .select('id, content')
    .eq('language', 'eng')
    .limit(5);

  console.log('\nSample English texts:', sampleEngText?.map(t => t.content));

  if (sampleEngText && sampleEngText.length > 0) {
    const textIds = sampleEngText.map(t => t.id);
    const { data: audioForEng } = await supabase
      .from('audio_files')
      .select('id, text_id, voice_id')
      .in('text_id', textIds);

    console.log('\nAudio files for English texts:', audioForEng?.length || 0);
    if (audioForEng && audioForEng.length > 0) {
      console.log('Sample audio_files:', audioForEng.slice(0, 3));

      // Check if these have course_audio entries
      const audioIds = audioForEng.map(a => a.id);
      const { data: courseAudioForEng } = await supabase
        .from('course_audio')
        .select('audio_id, course_code, role')
        .in('audio_id', audioIds);

      console.log('\ncourse_audio entries for English audio:', courseAudioForEng?.length || 0);
      if (courseAudioForEng && courseAudioForEng.length > 0) {
        console.log('Sample:', courseAudioForEng.slice(0, 3));
      }
    }
  }

  // Check a specific known text like "I want"
  console.log('\n=== Checking specific text "I want" ===');
  const { data: iWant } = await supabase
    .from('texts')
    .select('id, content, language')
    .ilike('content', 'i want');

  console.log('Texts matching "I want":', iWant);

  if (iWant && iWant.length > 0) {
    for (const t of iWant) {
      const { data: audioForIWant } = await supabase
        .from('audio_files')
        .select('id, voice_id, s3_key')
        .eq('text_id', t.id);

      console.log(`\nAudio for "${t.content}" (${t.language}):`, audioForIWant?.length || 0);
      if (audioForIWant && audioForIWant.length > 0) {
        console.log(audioForIWant);
      }
    }
  }
}

check().catch(console.error);

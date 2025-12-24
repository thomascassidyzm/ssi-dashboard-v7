require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const courseId = 'cym_n_for_eng';

async function check() {
  const testTexts = [
    'to speak',
    'I want to speak Welsh',
    'Welsh',
    'I want',
    'speak Welsh'
  ];

  console.log('=== Checking specific texts in v12 chain ===\n');

  for (const text of testTexts) {
    console.log(`Checking "${text}":`);

    // Step 1: texts
    const { data: textRow } = await supabase
      .from('texts')
      .select('id, content, language')
      .eq('content', text)
      .eq('language', 'eng')
      .single();

    if (!textRow) {
      console.log('  ❌ NOT in texts table (eng)');
      continue;
    }
    console.log(`  ✅ texts: ${textRow.id.substring(0, 8)}...`);

    // Step 2: audio_files
    const { data: audioRow } = await supabase
      .from('audio_files')
      .select('id, voice_id')
      .eq('text_id', textRow.id)
      .single();

    if (!audioRow) {
      console.log('  ❌ NOT in audio_files');
      continue;
    }
    console.log(`  ✅ audio_files: ${audioRow.id.substring(0, 8)}... (${audioRow.voice_id})`);

    // Step 3: course_audio
    const { data: courseRow } = await supabase
      .from('course_audio')
      .select('role')
      .eq('audio_id', audioRow.id)
      .eq('course_code', courseId)
      .single();

    if (!courseRow) {
      console.log('  ❌ NOT in course_audio for ' + courseId);
      continue;
    }
    console.log(`  ✅ course_audio: role=${courseRow.role}`);

    console.log('');
  }
}

check().catch(console.error);

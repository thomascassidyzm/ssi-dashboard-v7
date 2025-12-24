require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  console.log('=== Full course_audio stats for Welsh ===\n');

  // Get counts by role for Welsh course
  const { data: allRoles, error } = await supabase
    .from('course_audio')
    .select('role')
    .eq('course_code', 'cym_n_for_eng');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const roleCounts = {};
  for (const row of allRoles) {
    roleCounts[row.role] = (roleCounts[row.role] || 0) + 1;
  }

  console.log('cym_n_for_eng course_audio by role:');
  for (const [role, count] of Object.entries(roleCounts)) {
    console.log(`  ${role}: ${count}`);
  }
  console.log(`  TOTAL: ${allRoles.length}`);

  // Now let's trace a specific text through the lookup chain
  console.log('\n=== Tracing "I want to speak" ===');

  const testText = 'I want to speak';

  // Step 1: Find in texts
  const { data: textRow } = await supabase
    .from('texts')
    .select('id, content, language')
    .eq('content', testText)
    .single();

  if (!textRow) {
    console.log('Text not found');
    return;
  }
  console.log('1. texts row:', textRow);

  // Step 2: Find audio_files
  const { data: audioFiles } = await supabase
    .from('audio_files')
    .select('id, text_id, voice_id, s3_key, s3_bucket')
    .eq('text_id', textRow.id);

  console.log('2. audio_files:', audioFiles);

  // Step 3: Find course_audio
  if (audioFiles && audioFiles.length > 0) {
    const audioIds = audioFiles.map(a => a.id);
    const { data: courseAudio } = await supabase
      .from('course_audio')
      .select('audio_id, course_code, role')
      .eq('course_code', 'cym_n_for_eng')
      .in('audio_id', audioIds);

    console.log('3. course_audio:', courseAudio);
  }
}

check().catch(console.error);

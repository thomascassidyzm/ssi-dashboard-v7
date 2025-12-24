const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkPracticePhraseAudio() {
  // Get a practice phrase text
  const testPhrases = [
    'dw i isio siarad',        // practice phrase
    'siarad Cymraeg',          // practice phrase
    'dw i isio'                // LEGO (should have audio)
  ];

  console.log('=== Checking Audio Coverage ===');
  for (const text of testPhrases) {
    console.log('Text:', JSON.stringify(text));

    // Step 1: Find in texts
    const { data: t } = await supabase
      .from('texts')
      .select('id')
      .eq('content', text);

    if (!t || t.length === 0) {
      console.log('  NOT IN texts table');
      continue;
    }
    const textId = t[0].id;

    // Step 2: Find audio_files
    const { data: af } = await supabase
      .from('audio_files')
      .select('id')
      .eq('text_id', textId);

    if (!af || af.length === 0) {
      console.log('  IN texts table but NO audio_files!');
      continue;
    }

    // Step 3: Find course_audio for Welsh
    const audioIds = af.map(a => a.id);
    const { data: ca } = await supabase
      .from('course_audio')
      .select('role')
      .eq('course_code', 'cym_n_for_eng')
      .in('audio_id', audioIds);

    console.log('  audio_files:', af.length, '| course_audio:', ca ? ca.length : 0);
    if (ca && ca.length > 0) {
      console.log('  Roles:', ca.map(c => c.role).join(', '));
    }
    console.log('');
  }

  // Also check overall coverage
  console.log('=== Overall Audio Coverage ===');
  const { count: textCount } = await supabase
    .from('texts')
    .select('*', { count: 'exact', head: true });

  const { count: audioCount } = await supabase
    .from('audio_files')
    .select('*', { count: 'exact', head: true });

  const { count: welshAudioCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'cym_n_for_eng');

  console.log('texts table:', textCount);
  console.log('audio_files table:', audioCount);
  console.log('course_audio for cym_n_for_eng:', welshAudioCount);
}

checkPracticePhraseAudio().catch(console.error);

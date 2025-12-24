require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  console.log('=== Checking for duplicate content across languages ===\n');

  // Check if any text content appears in both English and Welsh
  const { data: engTexts } = await supabase
    .from('texts')
    .select('content')
    .eq('language', 'eng')
    .limit(100);

  const engContents = engTexts?.map(t => t.content) || [];

  const { data: duplicates } = await supabase
    .from('texts')
    .select('content, language')
    .in('content', engContents)
    .neq('language', 'eng');

  if (duplicates && duplicates.length > 0) {
    console.log('Found duplicates (same content in different languages):');
    for (const d of duplicates.slice(0, 10)) {
      console.log(`  "${d.content}" also exists in ${d.language}`);
    }
    console.log(`Total: ${duplicates.length} duplicates found`);
  } else {
    console.log('No duplicate content found across languages');
  }

  // Also check the exact lookup flow for "I want to speak"
  console.log('\n=== Trace "I want to speak" lookup flow ===\n');

  const testText = 'I want to speak';

  // Step 1: Query texts without language filter (like CourseExplorer does)
  const { data: step1 } = await supabase
    .from('texts')
    .select('id, content, language')
    .in('content', [testText]);

  console.log('Step 1 - texts query (no language filter):');
  console.log(step1);

  if (step1 && step1.length > 0) {
    const textIds = step1.map(t => t.id);

    // Step 2: Query audio_files
    const { data: step2 } = await supabase
      .from('audio_files')
      .select('id, text_id, voice_id')
      .in('text_id', textIds);

    console.log('\nStep 2 - audio_files for these text_ids:');
    console.log(step2);

    if (step2 && step2.length > 0) {
      const audioIds = step2.map(a => a.id);

      // Step 3: Query course_audio for cym_n_for_eng
      const { data: step3 } = await supabase
        .from('course_audio')
        .select('audio_id, role, course_code')
        .eq('course_code', 'cym_n_for_eng')
        .in('audio_id', audioIds);

      console.log('\nStep 3 - course_audio for cym_n_for_eng:');
      console.log(step3);

      // Check if any have role='known'
      const known = (step3 || []).filter(r => r.role === 'known');
      console.log('\nKnown role entries:', known.length);
    }
  }
}

check().catch(console.error);

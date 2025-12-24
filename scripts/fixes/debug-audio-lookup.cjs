/**
 * Debug audio lookup to understand why by-text isn't working
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function debug() {
  console.log('=== Debug Audio Lookup ===\n');

  // Check course_audio table structure
  console.log('1. Sample course_audio records:');
  const { data: courseAudio, error: caError } = await supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', 'zho_for_eng')
    .limit(5);

  if (caError) {
    console.log('  Error:', caError.message);
  } else if (courseAudio?.length) {
    console.log('  Columns:', Object.keys(courseAudio[0]).join(', '));
    courseAudio.forEach(row => {
      console.log(`  - ${row.audio_uuid}: ${JSON.stringify(row).substring(0, 100)}...`);
    });
  } else {
    console.log('  No course_audio records found');
  }

  // Check audio_files table
  console.log('\n2. Sample audio_files records:');
  const { data: audioFiles, error: afError } = await supabase
    .from('audio_files')
    .select('id, text_normalized, s3_key')
    .limit(5);

  if (afError) {
    console.log('  Error:', afError.message);
  } else if (audioFiles?.length) {
    audioFiles.forEach(row => {
      console.log(`  - ${row.id}: "${row.text_normalized}" | ${row.s3_key}`);
    });
  }

  // Try to find specific Chinese text
  const testText = '我要说整个句子';
  console.log(`\n3. Searching for: "${testText}"`);

  // Search in audio_files
  const { data: found, error: findError } = await supabase
    .from('audio_files')
    .select('id, text_normalized, s3_key')
    .ilike('text_normalized', `%${testText}%`)
    .limit(5);

  if (findError) {
    console.log('  Error:', findError.message);
  } else if (found?.length) {
    console.log('  Found in audio_files:');
    found.forEach(row => {
      console.log(`    - ${row.id}: "${row.text_normalized}"`);
    });
  } else {
    console.log('  Not found in audio_files');
  }

  // Check texts table
  console.log('\n4. Checking texts table:');
  const { data: texts, error: textsError } = await supabase
    .from('texts')
    .select('id, text, lang')
    .ilike('text', `%${testText}%`)
    .limit(5);

  if (textsError) {
    console.log('  Error:', textsError.message);
  } else if (texts?.length) {
    console.log('  Found in texts:');
    texts.forEach(row => {
      console.log(`    - ${row.id}: "${row.text}" (${row.lang})`);
    });
  } else {
    console.log('  Not found in texts table');
  }

  // Check course_practice_phrases
  console.log('\n5. Checking course_practice_phrases:');
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('id, target_text, known_text')
    .eq('course_code', 'zho_for_eng')
    .ilike('target_text', `%${testText}%`)
    .limit(5);

  if (phrasesError) {
    console.log('  Error:', phrasesError.message);
  } else if (phrases?.length) {
    console.log('  Found in course_practice_phrases:');
    phrases.forEach(row => {
      console.log(`    - ${row.id}: "${row.target_text}" / "${row.known_text}"`);
    });
  } else {
    console.log('  Not found in course_practice_phrases');
  }
}

debug().catch(console.error);

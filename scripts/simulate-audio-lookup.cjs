require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const courseId = 'cym_n_for_eng';

async function simulate() {
  console.log('=== Simulating CourseExplorer audio lookup ===\n');

  // Simulate items with known texts from the course
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('known_text')
    .eq('course_code', courseId)
    .limit(10);

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('known_text')
    .eq('course_code', courseId)
    .limit(20);

  // Combine all known texts (like buildAudioMap does)
  const uniqueKnownTexts = new Set();
  for (const s of seeds || []) uniqueKnownTexts.add(s.known_text);
  for (const p of phrases || []) uniqueKnownTexts.add(p.known_text);

  const knownTextsArray = [...uniqueKnownTexts];
  console.log('Known texts to look up:', knownTextsArray.length);
  console.log('Sample:', knownTextsArray.slice(0, 5));

  // Simulate the exact query in CourseExplorer
  const map = new Map();

  console.log('\n=== Running V12 lookup ===\n');

  // Process in batches of 100 (like CourseExplorer)
  for (let i = 0; i < knownTextsArray.length; i += 100) {
    const batch = knownTextsArray.slice(i, i + 100);

    // Step 1: Query texts
    const { data: textsData, error: textsError } = await supabase
      .from('texts')
      .select('id, content')
      .in('content', batch);

    console.log(`Batch ${i}: texts found:`, textsData?.length || 0, 'error:', textsError?.message || 'none');

    if (textsError || !textsData || textsData.length === 0) {
      console.log('  Skipping batch - no texts found');
      continue;
    }

    const textIdToKnown = new Map();
    const textIds = [];
    for (const t of textsData) {
      textIdToKnown.set(t.id, t.content);
      textIds.push(t.id);
    }

    // Step 2: Query audio_files
    const { data: audioFilesData } = await supabase
      .from('audio_files')
      .select('id, text_id')
      .in('text_id', textIds);

    console.log(`  audio_files found:`, audioFilesData?.length || 0);

    if (!audioFilesData || audioFilesData.length === 0) {
      console.log('  Skipping batch - no audio files');
      continue;
    }

    const audioIdToTextId = new Map();
    const audioIds = [];
    for (const af of audioFilesData) {
      audioIdToTextId.set(af.id, af.text_id);
      audioIds.push(af.id);
    }

    // Step 3: Query course_audio
    const { data: courseAudioData } = await supabase
      .from('course_audio')
      .select('audio_id, role')
      .eq('course_code', courseId)
      .in('audio_id', audioIds);

    console.log(`  course_audio found:`, courseAudioData?.length || 0);

    let knownCount = 0;
    for (const row of (courseAudioData || [])) {
      if (row.role !== 'known') continue;
      knownCount++;

      const textId = audioIdToTextId.get(row.audio_id);
      const knownText = textIdToKnown.get(textId);
      if (!knownText) continue;

      if (!map.has(knownText)) {
        map.set(knownText, {});
      }
      map.get(knownText).source = row.audio_id;
    }
    console.log(`  known entries added to map:`, knownCount);
  }

  console.log('\n=== Final Map Stats ===\n');
  console.log('Map size:', map.size);

  // Check a few specific texts
  const testTexts = ['I want to speak', 'to speak', 'I want to speak Welsh'];
  for (const text of testTexts) {
    const entry = map.get(text);
    if (entry?.source) {
      console.log(`✅ "${text}" → source: ${entry.source.substring(0, 8)}...`);
    } else {
      console.log(`❌ "${text}" → NOT FOUND in map`);
    }
  }
}

simulate().catch(console.error);

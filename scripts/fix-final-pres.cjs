const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  const courseCode = 'fra_for_eng';

  // Get course and config
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  const voiceId = course.voice_config?.voices?.presentation?.voiceId || 'en-GB-AbbiNeural';

  // Get seeds for context
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', courseCode)
    .in('seed_number', [1, 2]);

  const seedMap = {};
  for (const s of seeds) seedMap[s.seed_number] = s.known_text;

  console.log('Seed 1:', seedMap[1]);
  console.log('Seed 2:', seedMap[2]);

  // The 3 missing/pending LEGOs
  const missing = [
    { lego_id: 'S0002L02', known: 'to learn', seed_num: 2 },
    { lego_id: 'S0001L02', known: 'to speak', seed_num: 1 },
    { lego_id: 'S0001L04', known: 'with you', seed_num: 1 }
  ];

  for (const m of missing) {
    const seedText = seedMap[m.seed_num] || m.known;
    const presText = `The French for '${m.known}', as in '${seedText}', is:`;
    const normalized = presText.toLowerCase().trim();

    console.log(`\n${m.lego_id}: ${presText}`);

    // Check if record exists
    const { data: existing } = await supabase
      .from('course_audio')
      .select('id, s3_key')
      .eq('course_code', courseCode)
      .eq('text_normalized', normalized)
      .eq('role', 'presentation')
      .single();

    if (existing) {
      console.log('  Existing record:', existing.id, 's3_key:', existing.s3_key?.substring(0, 30));
      // Update lego_id if needed
      await supabase
        .from('course_audio')
        .update({ lego_id: m.lego_id })
        .eq('id', existing.id);
      console.log('  Updated lego_id');
    } else {
      // Create new record
      const newRecord = {
        course_code: courseCode,
        text: presText,
        text_normalized: normalized,
        language: 'eng',
        role: 'presentation',
        voice_id: voiceId,
        origin: 'tts',
        s3_key: `pending/${uuidv4().toUpperCase()}.mp3`,
        lego_id: m.lego_id
      };

      const { error } = await supabase
        .from('course_audio')
        .insert(newRecord);

      if (error) {
        console.log('  Insert error:', error.message);
      } else {
        console.log('  Created new pending record');
      }
    }
  }
}

fix();

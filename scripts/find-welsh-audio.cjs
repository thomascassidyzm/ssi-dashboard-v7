#!/usr/bin/env node
const supabase = require('../services/supabase-client.cjs');

async function findAudio() {
  const client = supabase.getClient();

  // Look for the specific Welsh phrases we need
  const phrases = [
    'dw i isio siarad Cymraeg',           // Seed 1
    'fedra i ddim cofio sut i siarad Cymraeg', // Seed 6
    'ond well i mi ymarfer siarad Cymraeg rŵan', // Seed 11
    'dw i ddim isio siarad Cymraeg rŵan'  // Seed 60 (target)
  ];

  console.log('Searching for Welsh audio recordings...\n');

  for (const phrase of phrases) {
    const { data } = await client
      .from('course_audio')
      .select('id, text, role, voice_id, origin, s3_key')
      .eq('course_code', 'cym_n_for_eng')
      .ilike('text', phrase)
      .limit(3);

    console.log(`"${phrase}"`);
    if (data && data.length > 0) {
      for (const a of data) {
        const origin = a.origin || 'tts';
        console.log(`  ✓ ${a.role} (${origin}): ${a.voice_id}`);
        console.log(`    s3: ${a.s3_key}`);
      }
    } else {
      console.log('  ✗ Not found');
    }
    console.log();
  }

  // Check what Welsh target voices exist
  const { data: voices } = await client
    .from('course_audio')
    .select('voice_id, role, origin')
    .eq('course_code', 'cym_n_for_eng')
    .eq('language', 'cym')
    .limit(50);

  const uniqueVoices = {};
  for (const v of voices || []) {
    const key = v.voice_id + '_' + v.role;
    if (!uniqueVoices[key]) uniqueVoices[key] = v;
  }

  console.log('Welsh voices in use:');
  for (const v of Object.values(uniqueVoices)) {
    const origin = v.origin || 'tts';
    console.log(`  ${v.role}: ${v.voice_id} (${origin})`);
  }
}

findAudio().catch(console.error);

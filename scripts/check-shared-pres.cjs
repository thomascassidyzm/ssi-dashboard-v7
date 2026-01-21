const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LANG_NAMES = { fra: 'French' };

async function check() {
  const courseCode = 'fra_for_eng';
  
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();
  
  // Get LEGOs with their seed text
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, seed_number')
    .eq('course_code', courseCode);
  
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', courseCode);
  
  const seedMap = {};
  for (const s of seeds || []) seedMap[s.seed_number] = s.known_text;
  
  // Get all presentation audio
  const { data: presentations } = await supabase
    .from('course_audio')
    .select('text_normalized, s3_key, lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation');
  
  const presTextMap = new Map();
  for (const p of presentations || []) {
    presTextMap.set(p.text_normalized, p);
  }
  
  // Build presentation text for each LEGO and check if it exists
  const template = "The French for '{known}', as in '{seed}', is:";
  let missingAudio = 0;
  let hasAudioButWrongLegoId = 0;
  
  for (const lego of legos) {
    const seedText = seedMap[lego.seed_number] || lego.known_text;
    const presText = template
      .replace('{known}', lego.known_text)
      .replace('{seed}', seedText)
      .toLowerCase().trim();
    
    const existing = presTextMap.get(presText);
    if (!existing) {
      missingAudio++;
      if (missingAudio <= 5) {
        console.log('Missing audio for:', lego.lego_id, '-', lego.known_text);
      }
    } else if (!existing.s3_key || existing.s3_key.startsWith('pending/')) {
      missingAudio++;
      if (missingAudio <= 10) {
        console.log('Pending audio for:', lego.lego_id, '-', lego.known_text);
      }
    } else if (existing.lego_id !== lego.lego_id) {
      hasAudioButWrongLegoId++;
    }
  }
  
  console.log('\n--- Summary ---');
  console.log('Total LEGOs:', legos.length);
  console.log('Missing or pending audio:', missingAudio);
  console.log('Has audio but different lego_id:', hasAudioButWrongLegoId);
}

check();

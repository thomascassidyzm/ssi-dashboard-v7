const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LANG_NAMES = { fra: 'French', eng: 'English', spa: 'Spanish', zho: 'Chinese' };

async function createMissing() {
  const courseCode = 'fra_for_eng';
  
  // Get course
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();
  
  const targetLangName = LANG_NAMES[course.target_lang] || course.target_lang;
  const voiceId = course.voice_config?.voices?.presentation?.voiceId || 'en-GB-AbbiNeural';
  
  // Get all LEGOs with their seed's known_text for context
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, seed_number')
    .eq('course_code', courseCode);
  
  // Get seed texts for context
  const seedNumbers = [...new Set(legos.map(l => l.seed_number).filter(Boolean))];
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', courseCode)
    .in('seed_number', seedNumbers);
  
  const seedMap = {};
  for (const s of seeds || []) {
    seedMap[s.seed_number] = s.known_text;
  }
  
  // Get existing presentations with lego_id
  const { data: presentations } = await supabase
    .from('course_audio')
    .select('lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .not('s3_key', 'like', 'pending/%');
  
  const existingLegoIds = new Set(presentations.filter(p => p.lego_id).map(p => p.lego_id));
  
  // Find missing LEGOs
  const missingLegos = legos.filter(l => !existingLegoIds.has(l.lego_id));
  
  console.log(`Found ${missingLegos.length} LEGOs missing presentation`);
  
  if (missingLegos.length === 0) return;
  
  // Create presentation records
  const template = "The {target_lang_name} for '{known}', as in '{seed}', is:";
  const records = missingLegos.map(lego => {
    const seedText = seedMap[lego.seed_number] || lego.known_text;
    const presText = template
      .replace('{target_lang_name}', targetLangName)
      .replace('{known}', lego.known_text)
      .replace('{seed}', seedText);
    
    return {
      course_code: courseCode,
      text: presText,
      text_normalized: presText.toLowerCase().trim(),
      language: course.known_lang,
      role: 'presentation',
      voice_id: voiceId,
      origin: 'tts',
      s3_key: `pending/${uuidv4().toUpperCase()}.mp3`,
      lego_id: lego.lego_id
    };
  });
  
  console.log('\nSample records (first 3):');
  for (const r of records.slice(0, 3)) {
    console.log(`  ${r.lego_id}: ${r.text.substring(0, 60)}...`);
  }
  
  // Insert (not upsert - we want new records)
  const { error } = await supabase
    .from('course_audio')
    .insert(records);
  
  if (error) {
    console.log('\nInsert error:', error.message);
    // Try individual inserts to find problematic ones
    let inserted = 0;
    for (const r of records) {
      const { error: e } = await supabase.from('course_audio').insert(r);
      if (!e) inserted++;
    }
    console.log(`Individually inserted ${inserted}/${records.length}`);
  } else {
    console.log(`\nInserted ${records.length} presentation records`);
  }
}

createMissing();

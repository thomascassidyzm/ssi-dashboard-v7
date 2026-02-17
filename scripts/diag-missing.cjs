const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: course } = await sb.from('courses').select('seed_count').eq('course_code','nld_for_eng').single();
  const rt = course.seed_count || 260;
  console.log('Release target:', rt);

  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('known_text, target_text')
    .eq('course_code','nld_for_eng')
    .lte('seed_number', rt);
  const { data: audio } = await sb.from('course_audio')
    .select('text_normalized, role')
    .eq('course_code','nld_for_eng')
    .in('role',['known','target1','target2']);

  const existingSet = new Set(audio.map(a => `${a.text_normalized}|${a.role}`));

  const needed = new Set();
  for (const p of phrases) {
    needed.add(`${p.known_text.toLowerCase().trim()}|known`);
    needed.add(`${p.target_text.toLowerCase().trim()}|target1`);
    needed.add(`${p.target_text.toLowerCase().trim()}|target2`);
  }

  const missing = [];
  for (const key of needed) {
    if (!existingSet.has(key)) missing.push(key);
  }

  console.log('Unique needed:', needed.size);
  console.log('Existing audio records:', audio.length);
  console.log('Existing unique:', existingSet.size);
  console.log('Missing:', missing.length);
  console.log('\nFirst 20 missing:');
  missing.slice(0, 20).forEach(m => console.log(' ', m));

  // Check if any missing are due to LEGO debut audio (not phrase audio)
  const missingKnown = missing.filter(m => m.endsWith('|known'));
  const missingT1 = missing.filter(m => m.endsWith('|target1'));
  const missingT2 = missing.filter(m => m.endsWith('|target2'));
  console.log(`\nBy role: known=${missingKnown.length}, target1=${missingT1.length}, target2=${missingT2.length}`);
})();

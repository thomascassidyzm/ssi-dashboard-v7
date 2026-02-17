const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: legos } = await supabase.from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', 'ita_for_eng')
    .lte('seed_number', 10)
    .order('seed_number').order('lego_index');

  const { data: phrases } = await supabase.from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role, position')
    .eq('course_code', 'ita_for_eng')
    .lte('seed_number', 10)
    .order('seed_number').order('lego_index').order('position');

  const legoMap = {};
  for (const l of legos) legoMap[l.seed_number + '-' + l.lego_index] = l;

  let pass = 0, fail = 0;
  for (const p of phrases) {
    const lego = legoMap[p.seed_number + '-' + p.lego_index];
    if (!lego) { console.log('NO LEGO for S' + p.seed_number + 'L' + p.lego_index); continue; }
    if (p.target_text.toLowerCase().includes(lego.target_text.toLowerCase())) {
      pass++;
    } else {
      fail++;
      console.log('FAIL S' + p.seed_number + 'L' + p.lego_index + ' [' + p.phrase_role + '] LEGO: "' + lego.target_text + '" | Phrase: "' + p.target_text + '"');
    }
  }
  console.log('\n' + pass + ' pass, ' + fail + ' fail out of ' + phrases.length + ' phrases');
})();

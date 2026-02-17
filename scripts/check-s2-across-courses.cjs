require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { supabase } = require('../services/supabase-client.cjs');

async function main() {
  const courses = ['fra_for_eng', 'ita_for_eng', 'por_for_eng', 'zho_for_eng', 'jpn_for_eng'];
  for (const cc of courses) {
    const { data: seed } = await supabase.from('course_seeds').select('target_text').eq('course_code', cc).eq('seed_number', 2).maybeSingle();
    const { data: legos } = await supabase.from('course_legos').select('lego_index, type, known_text, target_text').eq('course_code', cc).eq('seed_number', 2).order('lego_index');
    if (!legos || legos.length === 0) continue;
    console.log(`\n${cc}: ${seed?.target_text || ''}`);
    for (const l of legos) {
      console.log(`  L${l.lego_index} [${l.type}] "${l.known_text}" → "${l.target_text}"`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });

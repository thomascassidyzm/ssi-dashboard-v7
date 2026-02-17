require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, known_text, target_text, metadata')
    .eq('course_code', 'ita_for_eng')
    .eq('metadata->>qa_flag', 'review')
    .order('seed_number')
    .order('lego_index');
  
  if (error) { console.error(error); return; }
  
  data.forEach(p => {
    const reason = p.metadata?.qa_reason || '?';
    const detail = p.metadata?.qa_detail || '';
    const shortDetail = detail.length > 80 ? detail.slice(0, 80) + '...' : detail;
    console.log(`S${p.seed_number} L${p.lego_index} [${p.phrase_role}] ${reason}`);
    console.log(`  EN: ${p.known_text}`);
    console.log(`  IT: ${p.target_text}`);
    if (shortDetail) console.log(`  >> ${shortDetail}`);
    console.log();
  });
}
main();

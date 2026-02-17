require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all flagged phrases with punctuation-only reasons
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, metadata')
    .eq('course_code', 'ita_for_eng')
    .not('metadata->qa_flag', 'is', null);
  
  if (error) { console.error(error); return; }
  
  // Only clear missing_period and punctuation flags - keep genuine fragment flags
  const toClear = data.filter(p => {
    const reason = p.metadata?.qa_reason;
    return reason === 'missing_period' || reason === 'punctuation';
  });
  
  console.log(`Clearing ${toClear.length} false punctuation flags...`);
  
  let cleared = 0;
  for (const p of toClear) {
    const newMeta = { ...p.metadata };
    delete newMeta.qa_flag;
    delete newMeta.qa_reason;
    delete newMeta.qa_detail;
    delete newMeta.qa_date;
    delete newMeta.qa_batch;
    
    const {error: err} = await supabase
      .from('course_practice_phrases')
      .update({ metadata: Object.keys(newMeta).length > 0 ? newMeta : null })
      .eq('id', p.id);
    
    if (!err) cleared++;
  }
  
  console.log(`Cleared ${cleared} false flags`);
  
  // Final count
  const {data: remaining} = await supabase
    .from('course_practice_phrases')
    .select('id, metadata')
    .eq('course_code', 'ita_for_eng')
    .not('metadata->qa_flag', 'is', null);
  
  const deletes = remaining.filter(p => p.metadata?.qa_flag === 'delete');
  const reviews = remaining.filter(p => p.metadata?.qa_flag === 'review');
  
  console.log(`\nRemaining genuine flags: ${remaining.length} (${deletes.length} delete, ${reviews.length} review)`);
}
main();

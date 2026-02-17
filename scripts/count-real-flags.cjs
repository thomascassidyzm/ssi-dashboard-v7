require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all flagged phrases
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, phrase_role, known_text, target_text, metadata')
    .eq('course_code', 'ita_for_eng')
    .not('metadata->qa_flag', 'is', null);
  
  if (error) { console.error(error); return; }
  
  console.log(`Total flagged phrases: ${data.length}`);
  
  // Separate punctuation flags from content flags
  const punctFlags = data.filter(p => {
    const reason = p.metadata?.qa_reason;
    return reason === 'fragment' || reason === 'missing_period' || reason === 'punctuation';
  });
  
  const contentFlags = data.filter(p => {
    const reason = p.metadata?.qa_reason;
    return reason !== 'fragment' && reason !== 'missing_period' && reason !== 'punctuation';
  });
  
  console.log(`\nPunctuation/fragment flags (to clear): ${punctFlags.length}`);
  console.log(`Content flags (genuine): ${contentFlags.length}`);
  
  // Breakdown by flag type
  const byReason = {};
  const byFlag = {delete: 0, review: 0};
  contentFlags.forEach(p => {
    const reason = p.metadata?.qa_reason || 'unknown';
    byReason[reason] = (byReason[reason] || 0) + 1;
    const flag = p.metadata?.qa_flag || 'unknown';
    byFlag[flag] = (byFlag[flag] || 0) + 1;
  });
  
  console.log('\nContent flags by reason:');
  Object.entries(byReason).sort((a,b) => b[1] - a[1]).forEach(([r, c]) => console.log(`  ${r}: ${c}`));
  
  console.log('\nContent flags by action:');
  Object.entries(byFlag).forEach(([f, c]) => console.log(`  ${f}: ${c}`));
  
  // By batch
  const byBatch = {};
  contentFlags.forEach(p => {
    const batch = p.metadata?.qa_batch || '?';
    byBatch[batch] = (byBatch[batch] || 0) + 1;
  });
  console.log('\nContent flags by batch:');
  Object.entries(byBatch).sort((a,b) => a[0] - b[0]).forEach(([b, c]) => console.log(`  Batch ${b}: ${c}`));
  
  // Also check: are there fragment flags that ARE genuine (USE phrases that are truly incomplete)?
  console.log('\n--- Fragment flags detail ---');
  punctFlags.forEach(p => {
    console.log(`  S${p.seed_number} [${p.phrase_role}] "${p.known_text}" → "${p.target_text}" (${p.metadata?.qa_reason})`);
  });
}
main();

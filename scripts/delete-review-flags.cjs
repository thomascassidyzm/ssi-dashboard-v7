require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id')
    .eq('course_code', 'ita_for_eng')
    .eq('metadata->>qa_flag', 'review');
  
  if (error) { console.error(error); return; }
  console.log(`Deleting ${data.length} review-flagged phrases...`);
  
  const ids = data.map(p => p.id);
  const {error: delError} = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', ids);
  
  if (delError) console.error('Delete error:', delError);
  else console.log(`Deleted ${ids.length} phrases`);
  
  // Verify
  const {data: remaining} = await supabase
    .from('course_practice_phrases')
    .select('id')
    .eq('course_code', 'ita_for_eng')
    .not('metadata->qa_flag', 'is', null);
  console.log(`Remaining flags: ${remaining.length}`);
}
main();

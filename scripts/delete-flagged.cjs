require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all delete-flagged phrases
  const {data, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, known_text, target_text, metadata')
    .eq('course_code', 'ita_for_eng')
    .eq('metadata->>qa_flag', 'delete');
  
  if (error) { console.error('Fetch error:', error); return; }
  
  console.log(`Found ${data.length} delete-flagged phrases`);
  
  // Show what we're deleting
  const byBatch = {};
  data.forEach(p => {
    const b = p.metadata?.qa_batch || '?';
    byBatch[b] = (byBatch[b] || 0) + 1;
  });
  console.log('\nBy batch:', JSON.stringify(byBatch));
  
  // Delete them
  const ids = data.map(p => p.id);
  const {error: delError, count} = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', ids);
  
  if (delError) {
    console.error('Delete error:', delError);
  } else {
    console.log(`\nDeleted ${ids.length} phrases`);
  }
  
  // Verify
  const {data: check} = await supabase
    .from('course_practice_phrases')
    .select('id')
    .eq('course_code', 'ita_for_eng')
    .eq('metadata->>qa_flag', 'delete');
  
  console.log(`Remaining delete flags: ${check.length}`);
  
  // Total phrases remaining
  const {data: total} = await supabase
    .from('course_practice_phrases')
    .select('id', {count: 'exact', head: true})
    .eq('course_code', 'ita_for_eng');
  
  const {count: totalCount} = await supabase
    .from('course_practice_phrases')
    .select('id', {count: 'exact', head: true})
    .eq('course_code', 'ita_for_eng');
  
  console.log(`Total phrases remaining in course: ${totalCount}`);
}
main();

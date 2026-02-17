const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { count } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'fra_for_eng');
  console.log('Audio records for fra_for_eng:', count);

  // Check a sample
  const { data: sample } = await supabase
    .from('course_audio')
    .select('id, role, text, origin, created_at')
    .eq('course_code', 'fra_for_eng')
    .limit(5);
  if (sample && sample.length > 0) {
    console.log('\nSample audio records:');
    sample.forEach(s => console.log(`  [${s.role}/${s.origin}] "${s.text}" (${s.created_at})`));
  }
}
main();

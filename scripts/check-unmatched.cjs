const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: pres } = await supabase
    .from('course_audio')
    .select('text_normalized')
    .eq('course_code', 'fra_for_eng')
    .eq('role', 'presentation')
    .not('s3_key', 'like', 'pending/%');

  const regex = /for '([^']+)'[,\.]/;
  const noMatch = [];
  for (const p of pres || []) {
    if (!p.text_normalized?.match(regex)) {
      noMatch.push(p.text_normalized);
    }
  }

  console.log('Unmatched presentations (sample):');
  for (const t of noMatch.slice(0, 10)) {
    console.log(' ', t?.substring(0, 70));
  }
}
check();

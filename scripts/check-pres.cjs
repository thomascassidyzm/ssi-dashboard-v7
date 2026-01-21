const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text')
    .eq('course_code', 'fra_for_eng');
  
  const { data: presentations } = await supabase
    .from('course_audio')
    .select('id, lego_id, text')
    .eq('course_code', 'fra_for_eng')
    .eq('role', 'presentation')
    .not('s3_key', 'like', 'pending/%');
  
  const presLegoIds = new Set((presentations || []).filter(p => p.lego_id).map(p => p.lego_id));
  const missingLegos = (legos || []).filter(l => !presLegoIds.has(l.lego_id));
  
  console.log('Total LEGOs:', (legos || []).length);
  console.log('Presentations with lego_id:', presLegoIds.size);
  console.log('Presentations without lego_id:', (presentations || []).filter(p => !p.lego_id).length);
  console.log('LEGOs missing presentation by lego_id:', missingLegos.length);
  
  if (missingLegos.length > 0) {
    console.log('\nMissing LEGOs (first 10):');
    for (const l of missingLegos.slice(0, 10)) {
      console.log('  ', l.lego_id, '-', l.known_text);
    }
  }
}

check();

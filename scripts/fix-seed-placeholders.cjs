const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', 'zho_for_eng')
    .like('target_text', '%placeholder%');

  console.log('Seeds with placeholder:', seeds?.length);

  for (const seed of seeds || []) {
    const { data: legos } = await supabase
      .from('course_legos')
      .select('target_text')
      .eq('course_code', 'zho_for_eng')
      .eq('seed_number', seed.seed_number)
      .order('lego_index', { ascending: false })
      .limit(1);

    if (legos && legos[0]) {
      await supabase
        .from('course_seeds')
        .update({ target_text: legos[0].target_text })
        .eq('course_code', 'zho_for_eng')
        .eq('seed_number', seed.seed_number);

      console.log('✓ S' + String(seed.seed_number).padStart(4,'0') + ':', legos[0].target_text);
    }
  }
  console.log('Done');
}
fix();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  try {
    const seedNum = parseInt(process.argv[2]);
    if (!seedNum) {
      console.error('Usage: node get_specific_draft.cjs SEED_NUMBER');
      process.exit(1);
    }

    const { data, error } = await supabase
      .from('course_seed_drafts')
      .select('*')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', seedNum)
      .single();

    if (error) throw error;
    if (!data) {
      console.error(`No draft found for seed ${seedNum}`);
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

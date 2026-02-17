require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkDrafts() {
  const { data, error } = await supabase
    .from('course_seed_drafts')
    .select('*')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} drafts for seeds 111-120`);
  data.forEach(d => {
    console.log(`S${d.seed_number}: ${d.legos ? JSON.parse(d.legos).length : 0} LEGOs`);
  });
}

checkDrafts();

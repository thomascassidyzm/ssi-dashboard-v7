require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function check() {
  // Get vocab through seed 187
  const { data } = await supabase.rpc('get_course_vocab_flat', {
    p_course_code: 'fra_for_eng',
    p_through_seed: 187
  });
  
  const vocab = data[0].vocab.split(',').map(w => w.trim());
  
  // Check specific words
  const checks = ['essayais', 'disais', 'attendais', 'attendre', 'peur', 'retard', 'vieil', 'homme', 'étais', 'savais'];
  
  checks.forEach(word => {
    console.log(`${word}: ${vocab.includes(word) ? 'YES' : 'NO'}`);
  });
  
  console.log('\n=== Conjugations in vocab:');
  vocab.filter(w => w.includes('ais')).forEach(w => console.log(w));
}

check();

#!/usr/bin/env node
require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const {data: phrases} = await supabase
    .from('course_practice_phrases')
    .select('seed_number, known_text, target_text, phrase_role, lego_index')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 271)
    .lte('seed_number', 300)
    .order('seed_number')
    .order('lego_index');

  console.log('=== BATCH 10 PHRASES (271-300) ===\n');
  let current = null;
  phrases.forEach(p => {
    if (p.seed_number !== current) {
      console.log('\nS' + p.seed_number + ':');
      current = p.seed_number;
    }
    console.log('  [' + p.phrase_role.toUpperCase() + '] EN: ' + p.known_text);
    console.log('        FR: ' + p.target_text);
  });
})();

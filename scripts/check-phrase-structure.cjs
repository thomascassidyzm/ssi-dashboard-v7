#!/usr/bin/env node
require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const {data: phrases} = await supabase
    .from('course_practice_phrases')
    .select('seed_number, phrase_role')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 271)
    .lte('seed_number', 280);

  const byRole = {};
  phrases.forEach(p => {
    if (!byRole[p.seed_number]) byRole[p.seed_number] = {build: 0, use: 0, other: 0};
    if (p.phrase_role === 'build') byRole[p.seed_number].build++;
    else if (p.phrase_role === 'use') byRole[p.seed_number].use++;
    else byRole[p.seed_number].other++;
  });

  console.log('Phrase counts by seed (271-280):');
  Object.entries(byRole).forEach(([seed, counts]) => {
    console.log('  S' + seed + ': ' + counts.build + ' BUILD, ' + counts.use + ' USE');
  });
})();

require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkRange(label, start, end) {
  const {data} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, target_text')
    .eq('course_code', 'ita_for_eng')
    .eq('phrase_role', 'use')
    .gte('seed_number', start)
    .lte('seed_number', end);
  
  const period = data.filter(p => p.target_text && p.target_text.endsWith('.'));
  const question = data.filter(p => p.target_text && p.target_text.endsWith('?'));
  const none = data.filter(p => {
    if (!p.target_text) return false;
    const last = p.target_text.slice(-1);
    return last !== '.' && last !== '?' && last !== '!';
  });
  
  console.log(`${label}: ${data.length} total | ${period.length} period | ${question.length} ? | ${none.length} no-punct`);
}

async function main() {
  await checkRange('S11-40  (B1)', 11, 40);
  await checkRange('S41-70  (B2)', 41, 70);
  await checkRange('S71-100 (B3)', 71, 100);
  await checkRange('S101-130(B4)', 101, 130);
  await checkRange('S131-160(B5)', 131, 160);
  await checkRange('S161-190(B6)', 161, 190);
  await checkRange('S191-220(B7)', 191, 220);
  await checkRange('S221-250(B8)', 221, 250);
  await checkRange('S251-280(B9)', 251, 280);
  await checkRange('S281-300(B10)', 281, 300);
}
main();

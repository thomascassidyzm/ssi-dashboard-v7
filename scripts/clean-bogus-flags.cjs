const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const execute = process.argv.includes('--execute');

(async () => {
  // Get all open flags
  const { data: flags } = await supabase.from('course_qa_flags')
    .select('id, issue, seed_number')
    .eq('course_code', 'ita_for_eng')
    .eq('status', 'open');

  const isBogus = (issue) => {
    const lower = issue.toLowerCase();
    return lower.includes('capitali') || lower.includes('punctuat') || lower.includes('lowercase');
  };

  const bogus = flags.filter(f => isBogus(f.issue));
  const real = flags.filter(f => !isBogus(f.issue));

  console.log('Total flags:', flags.length);
  console.log('Bogus (punctuation/casing):', bogus.length);
  console.log('Real grammar flags:', real.length);

  console.log('\nSample real flags:');
  real.slice(0, 10).forEach(f => console.log('  S' + f.seed_number + ': ' + f.issue.substring(0, 100)));

  if (!execute) {
    console.log('\nDry run. Add --execute to delete bogus flags.');
    return;
  }

  // Delete bogus flags
  const bogusIds = bogus.map(f => f.id);
  for (let i = 0; i < bogusIds.length; i += 100) {
    const batch = bogusIds.slice(i, i + 100);
    const { error } = await supabase.from('course_qa_flags').delete().in('id', batch);
    if (error) { console.error('Delete error:', error.message); return; }
  }
  console.log('\nDeleted', bogus.length, 'bogus flags.');

  // Reset qa_checked on ALL phrases so QA can re-run clean
  const { error: resetErr } = await supabase.from('course_practice_phrases')
    .update({ qa_checked: null })
    .eq('course_code', 'ita_for_eng');
  if (resetErr) console.error('Reset error:', resetErr.message);
  else console.log('Reset qa_checked on all phrases.');
})();

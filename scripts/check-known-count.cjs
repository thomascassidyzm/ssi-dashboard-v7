require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get explicit count of known role for cym_n_for_eng
  const { count: knownCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'cym_n_for_eng')
    .eq('role', 'known');

  console.log('known count for cym_n_for_eng:', knownCount);

  const { count: target1Count } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'cym_n_for_eng')
    .eq('role', 'target1');

  console.log('target1 count for cym_n_for_eng:', target1Count);

  const { count: target2Count } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'cym_n_for_eng')
    .eq('role', 'target2');

  console.log('target2 count for cym_n_for_eng:', target2Count);

  const { count: totalCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'cym_n_for_eng');

  console.log('total for cym_n_for_eng:', totalCount);

  // Get a sample of known entries
  const { data: knownSample } = await supabase
    .from('course_audio')
    .select('audio_id, role')
    .eq('course_code', 'cym_n_for_eng')
    .eq('role', 'known')
    .limit(5);

  console.log('\nSample known entries:', knownSample);

  // Get a sample of all roles
  const { data: allRolesSample } = await supabase
    .from('course_audio')
    .select('role')
    .eq('course_code', 'cym_n_for_eng')
    .limit(100);

  const roleDist = {};
  for (const r of allRolesSample || []) {
    roleDist[r.role] = (roleDist[r.role] || 0) + 1;
  }
  console.log('\nFirst 100 rows role distribution:', roleDist);
}

check().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normZUT(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '').trim().replace(/\s+/g, ' ');
}

const EXECUTE = process.argv.includes('--execute');

(async () => {
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .order('lego_index');

  const newLegos = legos.filter(l => l.is_new);
  const dupLegos = legos.filter(l => !l.is_new);
  const exactSet = new Set(newLegos.map(l => l.known_text + '|||' + l.target_text));
  const normSet = new Set(newLegos.map(l => normZUT(l.known_text) + '|||' + normZUT(l.target_text)));

  const orphans = dupLegos.filter(l =>
    !exactSet.has(l.known_text + '|||' + l.target_text) &&
    !normSet.has(normZUT(l.known_text) + '|||' + normZUT(l.target_text))
  );

  console.log(`Found ${orphans.length} orphan duplicates to fix`);

  if (!EXECUTE) {
    console.log('DRY RUN — pass --execute to update');
    return;
  }

  let fixed = 0;
  for (const l of orphans) {
    const { error } = await supabase
      .from('course_legos')
      .update({ is_new: true })
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', l.seed_number)
      .eq('lego_index', l.lego_index);

    if (error) {
      console.error(`  Failed S${l.seed_number}L${l.lego_index}: ${error.message}`);
    } else {
      fixed++;
    }
  }
  console.log(`Fixed ${fixed}/${orphans.length} LEGOs → is_new: true`);
})();

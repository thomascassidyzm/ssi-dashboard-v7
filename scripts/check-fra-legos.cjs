const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normZUT(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '').trim().replace(/\s+/g, ' ');
}

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

  console.log('Total LEGOs:', legos.length);
  console.log('is_new=true:', newLegos.length);
  console.log('is_new=false:', dupLegos.length);

  const correctDups = dupLegos.filter(l => exactSet.has(l.known_text + '|||' + l.target_text));
  const normDups = dupLegos.filter(l => {
    if (exactSet.has(l.known_text + '|||' + l.target_text)) return false;
    return normSet.has(normZUT(l.known_text) + '|||' + normZUT(l.target_text));
  });
  const orphans = dupLegos.filter(l => {
    return !exactSet.has(l.known_text + '|||' + l.target_text) &&
           !normSet.has(normZUT(l.known_text) + '|||' + normZUT(l.target_text));
  });

  console.log('\nCorrect duplicates (exact match):', correctDups.length);
  console.log('False duplicates (normalization mismatch):', normDups.length);
  console.log('Orphan duplicates (no match at all):', orphans.length);

  if (normDups.length > 0) {
    console.log('\n--- FALSE DUPLICATES (normalization caused wrong dedup) ---');
    normDups.slice(0, 20).forEach(l => {
      const normK = normZUT(l.known_text);
      const normT = normZUT(l.target_text);
      const match = newLegos.find(n => normZUT(n.known_text) === normK && normZUT(n.target_text) === normT);
      console.log(`  S${String(l.seed_number).padStart(4,'0')}L${l.lego_index}: "${l.known_text}" -> "${l.target_text}"`);
      if (match) {
        console.log(`    MATCHED (normalized) to S${String(match.seed_number).padStart(4,'0')}: "${match.known_text}" -> "${match.target_text}"`);
      }
    });
  }

  if (orphans.length > 0) {
    console.log('\n--- ORPHAN DUPLICATES (no is_new=true match at all) ---');
    orphans.slice(0, 20).forEach(l => {
      console.log(`  S${String(l.seed_number).padStart(4,'0')}L${l.lego_index}: "${l.known_text}" -> "${l.target_text}"`);
    });
  }
})();

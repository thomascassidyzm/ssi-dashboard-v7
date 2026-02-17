require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: allLegos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .order('lego_index');

  if (error) { console.error('Error:', error.message); return; }

  // Simulate what the finalize dedup SHOULD have done
  // Process LEGOs in seed order, first occurrence = new, subsequent = duplicate
  const knownMap = new Map(); // normalized known -> { target, seed, idx }
  let shouldBeNew = 0;
  let shouldBeDup = 0;
  const wrongIsNew = []; // is_new=true but should be false
  const wrongIsDup = []; // is_new=false but should be true

  function normalizeForZUT(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  for (const lego of allLegos) {
    const normKey = normalizeForZUT(lego.known_text);
    const existing = knownMap.get(normKey);

    if (existing) {
      const existingTarget = normalizeForZUT(existing.target);
      const thisTarget = normalizeForZUT(lego.target_text);

      if (existingTarget === thisTarget) {
        // Should be duplicate
        shouldBeDup++;
        if (lego.is_new) {
          wrongIsNew.push({
            seed: lego.seed_number,
            idx: lego.lego_index,
            known: lego.known_text,
            target: lego.target_text,
            firstSeen: `S${existing.seed} L${existing.idx}`
          });
        }
      } else {
        // Different target — collision (should still be is_new if it was processed)
        shouldBeNew++;
        // Add this to map too since it's a different target
        // (Actually in finalize this would be a collision, not a new LEGO)
      }
    } else {
      // First occurrence — should be new
      shouldBeNew++;
      knownMap.set(normKey, {
        target: lego.target_text,
        seed: lego.seed_number,
        idx: lego.lego_index
      });
      if (!lego.is_new) {
        wrongIsDup.push({
          seed: lego.seed_number,
          idx: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text
        });
      }
    }
  }

  console.log(`Total LEGOs: ${allLegos.length}`);
  console.log(`\nExpected dedup (simulating finalize):`);
  console.log(`  Should be new (first occurrence): ${shouldBeNew}`);
  console.log(`  Should be duplicate: ${shouldBeDup}`);
  console.log(`\nActual in DB:`);
  console.log(`  is_new=true: ${allLegos.filter(l => l.is_new).length}`);
  console.log(`  is_new=false: ${allLegos.filter(l => !l.is_new).length}`);
  console.log(`\nMismatches:`);
  console.log(`  is_new=true but should be duplicate: ${wrongIsNew.length}`);
  wrongIsNew.forEach(l => {
    console.log(`    S${l.seed} L${l.idx}: "${l.known}" -> "${l.target}" (first seen: ${l.firstSeen})`);
  });
  console.log(`  is_new=false but should be new: ${wrongIsDup.length}`);
  wrongIsDup.forEach(l => {
    console.log(`    S${l.seed} L${l.idx}: "${l.known}" -> "${l.target}"`);
  });
})();

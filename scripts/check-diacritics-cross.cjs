const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/Œ/g, 'OE').replace(/Æ/g, 'AE');
}

async function main() {
  // Check specific suspicious LEGOs against their seeds
  const suspects = [
    { seed: 83, lego: 3, expect: 'à propos' },
    { seed: 153, lego: 2, expect: 'même façon' },
    { seed: 155, lego: 3, expect: 'ça' },
    { seed: 154, lego: 3, expect: 'où' },
  ];

  for (const s of suspects) {
    const { data: seed } = await supabase
      .from('course_seeds')
      .select('target_text')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', s.seed)
      .single();

    const { data: lego } = await supabase
      .from('course_legos')
      .select('target_text')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', s.seed)
      .eq('lego_index', s.lego)
      .single();

    console.log(`S${s.seed} L${s.lego} (expecting "${s.expect}"):`);
    console.log(`  Seed:  ${seed?.target_text}`);
    console.log(`  LEGO:  ${lego?.target_text}`);
    console.log('');
  }

  // Now: build a full word mapping from seeds
  // Get ALL seed target texts (these are the source of truth)
  const { data: allSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number, target_text')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number');

  // Extract words with diacritics, build stripped→correct mapping
  const wordMap = new Map(); // stripped → Set of correct forms
  for (const seed of allSeeds) {
    const words = seed.target_text.replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
    for (const w of words) {
      const stripped = stripDiacritics(w.toLowerCase());
      const lower = w.toLowerCase();
      if (stripped !== lower) {
        // This word has diacritics
        if (!wordMap.has(stripped)) wordMap.set(stripped, new Set());
        wordMap.get(stripped).add(lower);
      }
    }
  }

  console.log('=== WORD MAPPING FROM SEEDS ===');
  console.log(`Unique words with diacritics: ${wordMap.size}`);

  // Show ambiguous mappings (one stripped form → multiple correct forms)
  let ambiguous = 0;
  let unambiguous = 0;
  for (const [stripped, forms] of wordMap) {
    if (forms.size > 1) {
      ambiguous++;
      console.log(`  AMBIGUOUS: "${stripped}" → ${[...forms].join(' / ')}`);
    } else {
      unambiguous++;
    }
  }
  console.log(`Unambiguous: ${unambiguous}, Ambiguous: ${ambiguous}`);

  // Show all unambiguous mappings
  console.log('\n=== UNAMBIGUOUS WORD MAPPINGS ===');
  for (const [stripped, forms] of [...wordMap].sort()) {
    if (forms.size === 1) {
      console.log(`  "${stripped}" → "${[...forms][0]}"`);
    }
  }

  // Now check: how many LEGO words could be fixed with this mapping?
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number');

  let legoFixable = 0;
  let legoNeedsFix = 0;
  for (const lego of allLegos) {
    const words = lego.target_text.replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
    for (const w of words) {
      const stripped = stripDiacritics(w.toLowerCase());
      const lower = w.toLowerCase();
      if (stripped === lower && wordMap.has(stripped)) {
        legoNeedsFix++;
        const forms = wordMap.get(stripped);
        if (forms.size === 1) legoFixable++;
      }
    }
  }
  console.log(`\n=== LEGO FIX POTENTIAL ===`);
  console.log(`Words needing fix: ${legoNeedsFix}`);
  console.log(`Fixable (unambiguous): ${legoFixable}`);
  console.log(`Need manual review: ${legoNeedsFix - legoFixable}`);
}
main();

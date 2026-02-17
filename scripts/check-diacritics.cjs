const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Check if a string has diacritics
function hasDiacritics(str) {
  return /[àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/.test(str);
}

// Strip diacritics from a string
function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
}

async function main() {
  // 1. Check SEED target texts
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, target_text')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .limit(300);

  console.log('=== SEEDS ===');
  let seedsWithDiacritics = 0;
  let seedsWithout = 0;
  let seedSamples = [];
  for (const s of seeds) {
    if (hasDiacritics(s.target_text)) {
      seedsWithDiacritics++;
      if (seedSamples.length < 5) seedSamples.push(`  S${s.seed_number}: ${s.target_text}`);
    } else {
      seedsWithout++;
      // Check if it SHOULD have diacritics (French words that typically have them)
      if (/francais|francaise|etre|pret|deja|tres|apres|bientot/.test(s.target_text.toLowerCase())) {
        console.log(`  MISSING: S${s.seed_number}: ${s.target_text}`);
      }
    }
  }
  console.log(`With diacritics: ${seedsWithDiacritics}/${seeds.length}`);
  console.log(`Without: ${seedsWithout}/${seeds.length}`);
  console.log('Samples with diacritics:');
  seedSamples.forEach(s => console.log(s));

  // 2. Check LEGO target texts
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .limit(1000);

  console.log('\n=== LEGOS ===');
  let legosWithDiacritics = 0;
  let legosWithout = 0;
  let legoMissing = [];
  for (const l of legos) {
    if (hasDiacritics(l.target_text)) {
      legosWithDiacritics++;
    } else {
      legosWithout++;
      const stripped = l.target_text.toLowerCase();
      if (/francais|etre|pret|deja|tres|apres|bientot|ca|la$| la |ou |a |daccord|repondre|repeter|interessant/.test(stripped)) {
        legoMissing.push(`  S${l.seed_number} L${l.lego_index}: "${l.target_text}"`);
      }
    }
  }
  console.log(`With diacritics: ${legosWithDiacritics}/${legos.length}`);
  console.log(`Without: ${legosWithout}/${legos.length}`);
  if (legoMissing.length > 0) {
    console.log('Possibly missing diacritics:');
    legoMissing.slice(0, 20).forEach(s => console.log(s));
  }

  // 3. Check PHRASE target texts (sample)
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, target_text, phrase_role')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 11)
    .lte('seed_number', 50)
    .limit(2000);

  console.log('\n=== PHRASES (seeds 11-50) ===');
  let phrasesWithDiacritics = 0;
  let phrasesWithout = 0;
  let phraseShouldHave = [];
  for (const p of phrases) {
    if (hasDiacritics(p.target_text)) {
      phrasesWithDiacritics++;
    } else {
      phrasesWithout++;
      const stripped = p.target_text.toLowerCase();
      if (/francais|etre|pret|deja|tres|apres|bientot|ca |la |repond|repet|interesse|reuss|etes|etais|meme/.test(stripped)) {
        if (phraseShouldHave.length < 20) {
          phraseShouldHave.push(`  S${p.seed_number} L${p.lego_index} [${p.phrase_role}]: "${p.target_text}"`);
        }
      }
    }
  }
  console.log(`With diacritics: ${phrasesWithDiacritics}/${phrases.length}`);
  console.log(`Without: ${phrasesWithout}/${phrases.length}`);
  if (phraseShouldHave.length > 0) {
    console.log('Phrases likely missing diacritics:');
    phraseShouldHave.forEach(s => console.log(s));
  }

  // 4. Cross-reference: find a LEGO with diacritics and see if its phrases match
  const { data: testLego } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'fra_for_eng')
    .like('target_text', '%ç%')
    .limit(1);

  if (testLego && testLego.length > 0) {
    const tl = testLego[0];
    console.log(`\n=== CROSS-CHECK: LEGO S${tl.seed_number} L${tl.lego_index} = "${tl.target_text}" ===`);

    const { data: legosPhrases } = await supabase
      .from('course_practice_phrases')
      .select('target_text, phrase_role')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', tl.seed_number)
      .eq('lego_index', tl.lego_index);

    if (legosPhrases) {
      legosPhrases.forEach(p => {
        const hasIt = p.target_text.includes('ç');
        console.log(`  ${hasIt ? 'OK' : 'MISSING'} [${p.phrase_role}]: "${p.target_text}"`);
      });
    }
  }
}
main();

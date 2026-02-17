require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'fra_for_eng';
const START_SEED = 121;
const END_SEED = 150;

async function reviewSeed(seedNum) {
  const {data: phrases} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, known_text, target_text, metadata')
    .eq('course_code', COURSE)
    .eq('seed_number', seedNum)
    .in('phrase_role', ['build', 'use'])
    .order('lego_index')
    .order('position');

  return phrases || [];
}

async function main() {
  console.log(`QA BATCH 5: French Phrases (Seeds ${START_SEED}-${END_SEED})\n`);
  
  let totalReviewed = 0;
  let totalFlagged = 0;
  let buildCount = 0;
  let useCount = 0;

  for (let seed = START_SEED; seed <= END_SEED; seed++) {
    const phrases = await reviewSeed(seed);
    
    if (phrases.length === 0) {
      console.log(`Seed ${seed}: No phrases found`);
      continue;
    }

    console.log(`\n--- SEED ${seed} ---`);
    
    for (const phrase of phrases) {
      const role = phrase.phrase_role.toUpperCase();
      const known = phrase.known_text;
      const target = phrase.target_text;
      
      console.log(`  [${role}] ${known} → ${target}`);
      totalReviewed++;
      
      if (role === 'BUILD') {
        buildCount++;
      } else {
        useCount++;
      }
    }
  }

  console.log(`\n\nBATCH 5 SUMMARY`);
  console.log(`Seeds: ${START_SEED}-${END_SEED}`);
  console.log(`Phrases reviewed: ${totalReviewed} (${buildCount} BUILD, ${useCount} USE)`);
  console.log(`Flagged: ${totalFlagged}`);
}

main().catch(console.error);

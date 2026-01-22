const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getPhraseSample(courseCode, limit = 50, minSeed = 1, maxSeed = 260) {
  // Get random sample of phrases from seed range
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .gte('seed_number', minSeed)
    .lte('seed_number', maxSeed)
    .limit(2000);  // Get more to shuffle from

  if (!phrases || phrases.length === 0) {
    console.log(courseCode + ': No phrases found');
    return [];
  }

  // Random sample
  const shuffled = phrases.sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, limit);

  console.log('\n=== ' + courseCode.toUpperCase() + ' - ' + limit + ' PHRASE SAMPLE FOR QA ===\n');

  sample.forEach((p, i) => {
    console.log(`${i+1}. [S${p.seed_number}L${p.lego_index}]`);
    console.log(`   EN: "${p.known_text}"`);
    console.log(`   TG: "${p.target_text}"`);
    console.log('');
  });

  return sample;
}

async function getSeedSample(courseCode, limit = 10) {
  // Get random sample of seed translations
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .gte('seed_number', 1)
    .lte('seed_number', 260)
    .limit(500);

  if (!seeds || seeds.length === 0) {
    console.log(courseCode + ': No seeds found');
    return [];
  }

  // Random sample
  const shuffled = seeds.sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, limit).sort((a, b) => a.seed_number - b.seed_number);

  console.log('\n=== ' + courseCode.toUpperCase() + ' - ' + limit + ' SEED TRANSLATIONS ===\n');

  sample.forEach((s, i) => {
    console.log(`${i+1}. [S${s.seed_number}]`);
    console.log(`   EN: "${s.known_text}"`);
    console.log(`   TG: "${s.target_text}"`);
    console.log('');
  });

  return sample;
}

async function main() {
  // Sample seed translations from rebuild candidates
  await getSeedSample('jpn_for_eng', 10);
  await getSeedSample('kor_for_eng', 10);
  await getSeedSample('deu_for_eng', 10);
  await getSeedSample('nld_for_eng', 10);
}

main().catch(console.error);

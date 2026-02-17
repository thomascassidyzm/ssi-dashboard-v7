/**
 * Query ara_for_eng course data for learner journey review
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('Querying ara_for_eng seeds 1-50...\n');

  // Get course info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .single();

  if (courseError) {
    console.error('Course error:', courseError);
    return;
  }

  console.log('=== COURSE INFO ===');
  console.log(JSON.stringify(course, null, 2));
  console.log('\n');

  // Get seeds for 1-50
  const { data: seeds, error: seedsError } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number');

  if (seedsError) {
    console.error('Seeds error:', seedsError);
    return;
  }

  console.log(`=== SEEDS (${seeds?.length || 0} found) ===`);
  for (const seed of (seeds || [])) {
    console.log(`Seed ${seed.seed_number}: "${seed.known_text}" => "${seed.target_text}"`);
  }
  console.log('\n');

  // Get all LEGOs for seeds 1-50
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (legosError) {
    console.error('LEGOs error:', legosError);
    return;
  }

  console.log(`=== LEGOs (${legos?.length || 0} found) ===\n`);

  // Get all practice phrases for seeds 1-50
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phrasesError) {
    console.error('Phrases error:', phrasesError);
    return;
  }

  console.log(`=== PRACTICE PHRASES (${phrases?.length || 0} found) ===\n`);

  // Group LEGOs by seed
  const legosBySeed = {};
  for (const lego of (legos || [])) {
    if (!legosBySeed[lego.seed_number]) {
      legosBySeed[lego.seed_number] = [];
    }
    legosBySeed[lego.seed_number].push(lego);
  }

  // Group phrases by seed and lego
  const phrasesBySeedLego = {};
  for (const phrase of (phrases || [])) {
    const key = `${phrase.seed_number}-${phrase.lego_index}`;
    if (!phrasesBySeedLego[key]) {
      phrasesBySeedLego[key] = [];
    }
    phrasesBySeedLego[key].push(phrase);
  }

  // Output detailed view
  console.log('=== DETAILED LEARNER JOURNEY ===\n');

  for (let seedNum = 1; seedNum <= 50; seedNum++) {
    const seedData = seeds?.find(s => s.seed_number === seedNum);
    const seedLegos = legosBySeed[seedNum] || [];

    if (seedLegos.length === 0) {
      console.log(`--- SEED ${seedNum}: NO DATA ---\n`);
      continue;
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`SEED ${seedNum}: "${seedData?.known_text || 'N/A'}"`);
    console.log(`TARGET: "${seedData?.target_text || 'N/A'}"`);
    console.log(`${'='.repeat(60)}\n`);

    for (const lego of seedLegos) {
      console.log(`  [LEGO ${lego.lego_index}] ${lego.lego_type}-LEGO: "${lego.known_text}" => "${lego.target_text}"`);

      const key = `${seedNum}-${lego.lego_index}`;
      const legoPhrases = phrasesBySeedLego[key] || [];

      const buildPhrases = legoPhrases.filter(p => p.phrase_role === 'BUILD');
      const usePhrases = legoPhrases.filter(p => p.phrase_role === 'USE');

      if (buildPhrases.length > 0) {
        console.log(`      BUILD (${buildPhrases.length}):`);
        for (const p of buildPhrases) {
          console.log(`        - "${p.known_text}" => "${p.target_text}"`);
        }
      }

      if (usePhrases.length > 0) {
        console.log(`      USE (${usePhrases.length}):`);
        for (const p of usePhrases) {
          const score = p.score ? ` [score: ${p.score}]` : '';
          console.log(`        - "${p.known_text}" => "${p.target_text}"${score}`);
        }
      }

      console.log('');
    }
    console.log('');
  }

  // Output summary stats
  console.log('=== SUMMARY STATISTICS ===\n');

  let totalBuild = 0;
  let totalUse = 0;
  let aLegoCount = 0;
  let mLegoCount = 0;

  for (const lego of (legos || [])) {
    if (lego.lego_type === 'A') aLegoCount++;
    if (lego.lego_type === 'M') mLegoCount++;
  }

  for (const phrase of (phrases || [])) {
    if (phrase.phrase_role === 'BUILD') totalBuild++;
    if (phrase.phrase_role === 'USE') totalUse++;
  }

  console.log(`Seeds with data: ${Object.keys(legosBySeed).length}`);
  console.log(`Total LEGOs: ${legos?.length || 0}`);
  console.log(`  - A-LEGOs: ${aLegoCount}`);
  console.log(`  - M-LEGOs: ${mLegoCount}`);
  console.log(`Total Phrases: ${phrases?.length || 0}`);
  console.log(`  - BUILD: ${totalBuild}`);
  console.log(`  - USE: ${totalUse}`);

  // Output JSON for deeper analysis
  console.log('\n\n=== RAW DATA (JSON) ===\n');
  console.log(JSON.stringify({
    seeds: seeds || [],
    legos: legos || [],
    phrases: phrases || []
  }, null, 2));
}

main().catch(console.error);

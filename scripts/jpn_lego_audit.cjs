const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, is_new, known_text, target_text, type, components')
    .eq('course_code', 'jpn_for_eng')
    .order('seed_number').order('lego_index');

  const { data: seeds } = await sb.from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'jpn_for_eng')
    .order('seed_number');

  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role')
    .eq('course_code', 'jpn_for_eng');

  const seedMap = new Map(seeds.map(s => [s.seed_number, s]));
  const phrasesBySeedLego = {};
  for (const p of phrases) {
    const key = `${p.seed_number}:${p.lego_index}`;
    if (!phrasesBySeedLego[key]) phrasesBySeedLego[key] = { component: 0, build: 0, use: 0 };
    phrasesBySeedLego[key][p.phrase_role] = (phrasesBySeedLego[key][p.phrase_role] || 0) + 1;
  }

  // 1. Empty seeds analysis
  const seedNewCounts = {};
  for (let i = 1; i <= 300; i++) seedNewCounts[i] = 0;
  for (const l of legos) {
    if (l.is_new) seedNewCounts[l.seed_number]++;
  }
  const emptySeeds = Object.entries(seedNewCounts).filter(([_, c]) => c === 0).map(([s]) => parseInt(s));

  console.log('=== EMPTY SEEDS (0 new LEGOs) ===');
  console.log(`Count: ${emptySeeds.length} / 300\n`);
  for (const sn of emptySeeds.slice(0, 20)) {
    const seed = seedMap.get(sn);
    const seedLegos = legos.filter(l => l.seed_number === sn);
    console.log(`S${sn}: "${seed?.known_text}"`);
    console.log(`  → "${seed?.target_text}"`);
    for (const l of seedLegos) {
      console.log(`  L${l.lego_index} (dup): "${l.known_text}" → "${l.target_text}"`);
    }
  }
  if (emptySeeds.length > 20) console.log(`  ... and ${emptySeeds.length - 20} more`);

  // 2. Target text length distribution for new LEGOs
  const newLegos = legos.filter(l => l.is_new);
  const targetLengths = newLegos.map(l => l.target_text.length);
  const avgLen = targetLengths.reduce((a, b) => a + b, 0) / targetLengths.length;
  const knownLengths = newLegos.map(l => l.known_text.split(/\s+/).length);
  const avgKnownWords = knownLengths.reduce((a, b) => a + b, 0) / knownLengths.length;

  console.log('\n=== NEW LEGO SIZE ANALYSIS ===');
  console.log(`Avg target length: ${avgLen.toFixed(1)} chars`);
  console.log(`Avg known words: ${avgKnownWords.toFixed(1)} words`);

  // Length distribution
  const lenDist = { '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9+': 0 };
  for (const len of targetLengths) {
    if (len <= 2) lenDist['1-2']++;
    else if (len <= 4) lenDist['3-4']++;
    else if (len <= 6) lenDist['5-6']++;
    else if (len <= 8) lenDist['7-8']++;
    else lenDist['9+']++;
  }
  console.log('Target length distribution:');
  for (const [range, count] of Object.entries(lenDist)) {
    console.log(`  ${range} chars: ${count} LEGOs (${(100*count/newLegos.length).toFixed(0)}%)`);
  }

  // 3. Compare with ita/fra
  for (const course of ['ita_for_eng', 'fra_for_eng']) {
    const { data: cLegos } = await sb.from('course_legos')
      .select('target_text, known_text')
      .eq('course_code', course)
      .eq('is_new', true);
    if (!cLegos || cLegos.length === 0) continue;
    const cTargetLens = cLegos.map(l => l.target_text.length);
    const cAvgLen = cTargetLens.reduce((a, b) => a + b, 0) / cTargetLens.length;
    const cKnownLens = cLegos.map(l => l.known_text.split(/\s+/).length);
    const cAvgKnown = cKnownLens.reduce((a, b) => a + b, 0) / cKnownLens.length;
    console.log(`\n${course}: avg target ${cAvgLen.toFixed(1)} chars, avg known ${cAvgKnown.toFixed(1)} words, total ${cLegos.length} new`);
  }

  // 4. Seeds with 1 LEGO that's very large
  console.log('\n=== SEEDS WITH 1 LARGE LEGO (known 5+ words) ===');
  let bigSingleCount = 0;
  for (let sn = 1; sn <= 300; sn++) {
    const seedLegos = legos.filter(l => l.seed_number === sn && l.is_new);
    if (seedLegos.length === 1 && seedLegos[0].known_text.split(/\s+/).length >= 5) {
      bigSingleCount++;
      if (bigSingleCount <= 15) {
        const l = seedLegos[0];
        const seed = seedMap.get(sn);
        console.log(`S${sn}: LEGO "${l.known_text}" → "${l.target_text}" (${l.known_text.split(/\s+/).length} words)`);
        console.log(`  Seed: "${seed?.known_text}"`);
      }
    }
  }
  console.log(`Total: ${bigSingleCount} seeds with single large LEGO`);

  // 5. Phrase counts per new LEGO
  let noPhraseLegos = 0;
  let lowPhraseLegos = 0;
  for (const l of newLegos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const pc = phrasesBySeedLego[key];
    const total = pc ? (pc.component + pc.build + pc.use) : 0;
    if (total === 0) noPhraseLegos++;
    if (total > 0 && total < 10) lowPhraseLegos++;
  }
  console.log(`\n=== PHRASE COVERAGE ===`);
  console.log(`New LEGOs with 0 phrases: ${noPhraseLegos}`);
  console.log(`New LEGOs with <10 phrases: ${lowPhraseLegos}`);
  console.log(`Total new LEGOs: ${newLegos.length}`);
})();

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, is_new, known_text, target_text, type, components')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .order('seed_number').order('lego_index');

  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role, known_text, target_text')
    .eq('course_code', 'jpn_for_eng');

  // Build phrase counts per seed:lego
  const phraseCounts = {};
  for (const p of phrases) {
    const key = `${p.seed_number}:${p.lego_index}`;
    if (!phraseCounts[key]) phraseCounts[key] = { component: 0, build: 0, use: 0, total: 0 };
    phraseCounts[key][p.phrase_role] = (phraseCounts[key][p.phrase_role] || 0) + 1;
    phraseCounts[key].total++;
  }

  // M-LEGOs missing components
  const mLegos = legos.filter(l => l.type === 'M');
  const mWithComponents = mLegos.filter(l => l.components && l.components.length > 0);
  const mWithoutComponents = mLegos.filter(l => !l.components || l.components.length === 0);

  console.log('=== M-LEGO COMPONENT ANALYSIS ===');
  console.log(`Total new M-LEGOs: ${mLegos.length}`);
  console.log(`With components: ${mWithComponents.length}`);
  console.log(`WITHOUT components: ${mWithoutComponents.length} (${(100*mWithoutComponents.length/mLegos.length).toFixed(0)}%)`);

  // Check if those without components have component phrases anyway
  let missingBoth = 0;
  for (const l of mWithoutComponents) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const pc = phraseCounts[key];
    if (!pc || pc.component === 0) missingBoth++;
  }
  console.log(`Missing components AND component phrases: ${missingBoth}`);

  console.log('\nSample M-LEGOs without components (first 20):');
  for (const l of mWithoutComponents.slice(0, 20)) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const pc = phraseCounts[key] || { component: 0, build: 0, use: 0, total: 0 };
    console.log(`  S${l.seed_number}L${l.lego_index}: "${l.known_text}" → "${l.target_text}" | C:${pc.component} B:${pc.build} U:${pc.use}`);
  }

  // Phrase count distribution
  console.log('\n=== PHRASE COUNT DISTRIBUTION (new LEGOs only) ===');
  const totalDist = { '0': 0, '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21+': 0 };
  const buildDist = { '0': 0, '1-2': 0, '3-4': 0, '5+': 0 };
  const useDist = { '0': 0, '1-4': 0, '5-7': 0, '8-10': 0, '11+': 0 };

  for (const l of legos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const pc = phraseCounts[key] || { component: 0, build: 0, use: 0, total: 0 };

    if (pc.total === 0) totalDist['0']++;
    else if (pc.total <= 5) totalDist['1-5']++;
    else if (pc.total <= 10) totalDist['6-10']++;
    else if (pc.total <= 15) totalDist['11-15']++;
    else if (pc.total <= 20) totalDist['16-20']++;
    else totalDist['21+']++;

    if (pc.build === 0) buildDist['0']++;
    else if (pc.build <= 2) buildDist['1-2']++;
    else if (pc.build <= 4) buildDist['3-4']++;
    else buildDist['5+']++;

    if (pc.use === 0) useDist['0']++;
    else if (pc.use <= 4) useDist['1-4']++;
    else if (pc.use <= 7) useDist['5-7']++;
    else if (pc.use <= 10) useDist['8-10']++;
    else useDist['11+']++;
  }

  console.log('Total phrases per new LEGO:');
  for (const [range, count] of Object.entries(totalDist)) {
    console.log(`  ${range}: ${count} LEGOs`);
  }
  console.log('\nBUILD phrases per new LEGO:');
  for (const [range, count] of Object.entries(buildDist)) {
    console.log(`  ${range}: ${count} LEGOs`);
  }
  console.log('\nUSE phrases per new LEGO:');
  for (const [range, count] of Object.entries(useDist)) {
    console.log(`  ${range}: ${count} LEGOs`);
  }

  // Target phrase counts
  const totalPhrases = phrases.length;
  const avgPerNewLego = totalPhrases / legos.length;
  console.log(`\nTotal phrases: ${totalPhrases}`);
  console.log(`Avg per new LEGO: ${avgPerNewLego.toFixed(1)}`);

  // Compare targets
  console.log('\n=== COMPARISON TARGETS ===');
  for (const course of ['ita_for_eng', 'fra_for_eng']) {
    const { data: cPhrases } = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', course);
    const { data: cLegos } = await sb.from('course_legos')
      .select('seed_number')
      .eq('course_code', course)
      .eq('is_new', true);
    if (!cPhrases || !cLegos) continue;
    console.log(`${course}: ${cPhrases.length} phrases / ${cLegos.length} new LEGOs = ${(cPhrases.length/cLegos.length).toFixed(1)} per LEGO`);
  }
})();

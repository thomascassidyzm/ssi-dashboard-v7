const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, is_new, known_text, target_text, type, components')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .order('seed_number').order('lego_index');

  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role')
    .eq('course_code', 'jpn_for_eng');

  // Count USE phrases per new LEGO
  const useCounts = {};
  for (const p of phrases) {
    if (p.phrase_role === 'use') {
      const key = `${p.seed_number}:${p.lego_index}`;
      useCounts[key] = (useCounts[key] || 0) + 1;
    }
  }

  // Find LEGOs with < 5 USE phrases
  const thin = [];
  for (const l of legos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const useCount = useCounts[key] || 0;
    if (useCount < 5) {
      thin.push({ ...l, useCount });
    }
  }

  console.log(`=== LEGOs with < 5 USE phrases ===`);
  console.log(`Total new LEGOs: ${legos.length}`);
  console.log(`LEGOs with < 5 USE: ${thin.length}\n`);

  // Breakdown
  const byCount = {};
  for (const t of thin) {
    byCount[t.useCount] = (byCount[t.useCount] || 0) + 1;
  }
  for (const [count, num] of Object.entries(byCount).sort((a,b) => parseInt(a) - parseInt(b))) {
    console.log(`  ${count} USE phrases: ${num} LEGOs`);
  }

  console.log('\nAll thin LEGOs:');
  for (const t of thin) {
    const hasComp = t.components && t.components.length > 0 ? 'C' : '-';
    console.log(`  S${t.seed_number}L${t.lego_index} (${t.type}${hasComp}): "${t.known_text}" → "${t.target_text}" | USE: ${t.useCount}`);
  }

  // Also count: how many LEGOs have 5-7 USE (borderline)
  let borderline = 0;
  for (const l of legos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const useCount = useCounts[key] || 0;
    if (useCount >= 5 && useCount < 8) borderline++;
  }
  console.log(`\nBorderline (5-7 USE): ${borderline} LEGOs`);

  // Overall distribution
  console.log('\n=== USE phrase distribution (all new LEGOs) ===');
  const dist = {};
  for (const l of legos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const uc = useCounts[key] || 0;
    const bucket = uc === 0 ? '0' : uc <= 4 ? '1-4' : uc <= 7 ? '5-7' : uc <= 10 ? '8-10' : '11+';
    dist[bucket] = (dist[bucket] || 0) + 1;
  }
  for (const b of ['0', '1-4', '5-7', '8-10', '11+']) {
    console.log(`  ${b}: ${dist[b] || 0} LEGOs`);
  }
})();

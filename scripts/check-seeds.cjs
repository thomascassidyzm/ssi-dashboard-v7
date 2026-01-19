const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get LEGOs for seeds 61+
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, idx, type, known, target, components')
    .eq('course_code', 'zho_for_eng')
    .gte('seed_number', 61)
    .order('seed_number')
    .order('idx');

  if (!legos || legos.length === 0) {
    console.log('No LEGOs for seeds 61+ yet');
    return;
  }

  // Group by seed
  const bySeeds = {};
  for (const l of legos) {
    if (!bySeeds[l.seed_number]) bySeeds[l.seed_number] = [];
    bySeeds[l.seed_number].push(l);
  }

  // Get phrase counts
  const { data: phraseCounts } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_idx')
    .eq('course_code', 'zho_for_eng')
    .gte('seed_number', 61);

  const phrasesBySeed = {};
  if (phraseCounts) {
    for (const p of phraseCounts) {
      if (!phrasesBySeed[p.seed_number]) phrasesBySeed[p.seed_number] = 0;
      phrasesBySeed[p.seed_number]++;
    }
  }

  let totalM = 0, totalA = 0, totalPhrases = 0;

  for (const [seedNum, seedLegos] of Object.entries(bySeeds)) {
    const mCount = seedLegos.filter(l => l.type === 'M').length;
    const aCount = seedLegos.filter(l => l.type === 'A').length;
    totalM += mCount;
    totalA += aCount;
    const phrases = phrasesBySeed[seedNum] || 0;
    totalPhrases += phrases;

    console.log(`\nS${String(seedNum).padStart(4,'0')}: ${seedLegos.length} LEGOs (${mCount}M, ${aCount}A) | ${phrases} phrases`);
    for (const l of seedLegos) {
      const comps = l.components ? ' [' + l.components.map(c => c.known + '→' + c.target).join(', ') + ']' : '';
      console.log(`  L${l.idx} [${l.type}] "${l.known}" → ${l.target}${comps}`);
    }
  }

  const seedCount = Object.keys(bySeeds).length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`QUALITY SUMMARY (Seeds 61+)`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Seeds with LEGOs: ${seedCount}`);
  console.log(`M-LEGOs: ${totalM} (${Math.round(totalM/(totalM+totalA)*100)}%)`);
  console.log(`A-LEGOs: ${totalA}`);
  console.log(`Avg LEGOs/seed: ${((totalM+totalA)/seedCount).toFixed(1)}`);
  console.log(`Avg phrases/LEGO: ${(totalPhrases/(totalM+totalA)).toFixed(1)}`);

  // Quality assessment
  const mRatio = totalM/(totalM+totalA);
  const avgLegos = (totalM+totalA)/seedCount;
  const avgPhrases = totalPhrases/(totalM+totalA);

  console.log(`\nQUALITY CHECK:`);
  console.log(`  M-LEGO ratio: ${mRatio >= 0.3 ? '✓' : '✗'} ${(mRatio*100).toFixed(0)}% (target: 30%+)`);
  console.log(`  LEGOs/seed: ${avgLegos >= 3 && avgLegos <= 5 ? '✓' : '✗'} ${avgLegos.toFixed(1)} (target: 3-5)`);
  console.log(`  Phrases/LEGO: ${avgPhrases >= 7 ? '✓' : '✗'} ${avgPhrases.toFixed(1)} (target: 7+)`);
}

check();

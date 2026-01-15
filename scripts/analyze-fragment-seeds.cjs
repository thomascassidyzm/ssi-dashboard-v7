#!/usr/bin/env node
/**
 * Analyze why some seeds have fragment translations
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyze() {
  // Get all seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text, status, updated_at, created_at')
    .eq('course_code', 'zho_for_eng')
    .order('seed_number');

  // Get all LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, created_at')
    .eq('course_code', 'zho_for_eng')
    .order('seed_number')
    .order('lego_index');

  // Identify fragment seeds
  const fragmentSeeds = seeds.filter(s => {
    const targetLen = s.target_text?.length || 0;
    const hasEnding = /[。！？]$/.test(s.target_text || '');
    return targetLen < 5 || (!hasEnding && targetLen < 8);
  });

  const fullSeeds = seeds.filter(s => {
    const targetLen = s.target_text?.length || 0;
    const hasEnding = /[。！？]$/.test(s.target_text || '');
    return !(targetLen < 5 || (!hasEnding && targetLen < 8));
  });

  // Group LEGOs by seed
  const legosBySeed = {};
  for (const l of legos) {
    if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
    legosBySeed[l.seed_number].push(l);
  }

  console.log('=== FRAGMENT SEED ANALYSIS ===\n');
  console.log(`Total seeds: ${seeds.length}`);
  console.log(`Full translations: ${fullSeeds.length}`);
  console.log(`Fragments: ${fragmentSeeds.length}`);

  // Detailed analysis of fragment seeds
  console.log('\n--- FRAGMENT SEEDS DETAIL ---\n');
  console.log('Seed    | Target (fragment)        | LEGOs | LEGO targets concatenated');
  console.log('--------|--------------------------|-------|---------------------------');

  for (const s of fragmentSeeds) {
    const seedLegos = legosBySeed[s.seed_number] || [];
    const legoTargets = seedLegos.map(l => l.target_text).join(' + ');
    const seedNum = 'S' + String(s.seed_number).padStart(4, '0');
    const target = (s.target_text || '').padEnd(24).slice(0, 24);
    console.log(`${seedNum} | "${target}" | ${seedLegos.length}     | ${legoTargets.slice(0, 50)}`);
  }

  // Check if fragment = first LEGO target
  console.log('\n\n--- CORRELATION ANALYSIS ---\n');
  let matchesFirstLego = 0;
  let matchesLastLego = 0;
  let matchesSomeLego = 0;
  let noMatch = 0;

  for (const s of fragmentSeeds) {
    const seedLegos = legosBySeed[s.seed_number] || [];
    if (seedLegos.length === 0) continue;

    const target = s.target_text;
    const firstLegoTarget = seedLegos[0]?.target_text;
    const lastLegoTarget = seedLegos[seedLegos.length - 1]?.target_text;
    const allLegoTargets = seedLegos.map(l => l.target_text);

    if (target === lastLegoTarget) {
      matchesLastLego++;
    } else if (target === firstLegoTarget) {
      matchesFirstLego++;
    } else if (allLegoTargets.includes(target)) {
      matchesSomeLego++;
    } else {
      noMatch++;
    }
  }

  console.log('Fragment text matches:');
  console.log(`  Last LEGO target: ${matchesLastLego}`);
  console.log(`  First LEGO target: ${matchesFirstLego}`);
  console.log(`  Some other LEGO: ${matchesSomeLego}`);
  console.log(`  No LEGO match: ${noMatch}`);

  // Check the course-builder flow
  console.log('\n\n--- HYPOTHESIS ---\n');
  console.log('The fragment appears to be the LAST LEGO target text, not the full seed translation.');
  console.log('This suggests the agent stored lego.target instead of the full seed translation.');
  console.log('\nThe PATCH /api/seed endpoint expects the FULL Chinese translation of the English seed.');
  console.log('But it seems the agent is passing just one LEGO\'s target text.\n');
}

analyze().catch(console.error);

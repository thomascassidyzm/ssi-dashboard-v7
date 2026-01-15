#!/usr/bin/env node
/**
 * Sample seeds to see actual content
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Sample of course_seeds
  console.log('\n=== COURSE_SEEDS SAMPLE (first 10) ===\n');
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'zho_for_eng')
    .order('seed_number')
    .limit(10);

  seeds?.forEach(s => {
    console.log(`S${String(s.seed_number).padStart(4,'0')}: "${s.known_text}"`);
    console.log(`        → "${s.target_text || '(MISSING)'}"`);
    console.log(`        status: ${s.status || 'unknown'}\n`);
  });

  // Check canonical_seeds too
  console.log('\n=== CANONICAL_SEEDS SAMPLE (first 5) ===\n');
  const { data: canonical } = await supabase
    .from('canonical_seeds')
    .select('*')
    .order('seed_number')
    .limit(5);

  canonical?.forEach(s => {
    console.log(`S${String(s.seed_number).padStart(4,'0')}: "${s.source_text}"`);
  });

  // Check if any LEGOs for early seeds are missing
  console.log('\n=== LEGO COUNT BY SEED (first 20 seeds) ===\n');
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index')
    .eq('course_code', 'zho_for_eng')
    .order('seed_number')
    .order('lego_index');

  const legosBySeed = {};
  legos?.forEach(l => {
    legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;
  });

  for (let i = 1; i <= 20; i++) {
    const count = legosBySeed[i] || 0;
    const status = count === 0 ? '❌ MISSING' : count < 3 ? '⚠️  FEW' : '✓';
    console.log(`S${String(i).padStart(4,'0')}: ${count} LEGOs ${status}`);
  }
}

check().catch(console.error);

#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const FRAGMENT_SEEDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48];

async function main() {
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', 'zho_for_eng')
    .in('seed_number', FRAGMENT_SEEDS)
    .order('seed_number');

  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'zho_for_eng')
    .in('seed_number', FRAGMENT_SEEDS)
    .order('seed_number')
    .order('lego_index');

  const legosBySeed = {};
  for (const l of legos) {
    if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
    legosBySeed[l.seed_number].push(l.target_text);
  }

  for (const s of seeds) {
    const targets = legosBySeed[s.seed_number] || [];
    console.log(`S${String(s.seed_number).padStart(4,'0')}:`);
    console.log(`  EN: ${s.known_text}`);
    console.log(`  LEGOs: ${targets.join(' | ')}`);
    console.log('');
  }
}

main().catch(console.error);

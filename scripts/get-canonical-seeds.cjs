#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data: seeds, error } = await supabase
    .from('canonical_seeds')
    .select('seed_number, seed_id, source_text')
    .lte('seed_number', 10)
    .order('seed_number');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('CANONICAL ENGLISH SEEDS (First 10):');
  console.log('='.repeat(80));
  seeds.forEach(seed => {
    console.log(`\n${seed.seed_id}: ${seed.source_text}`);
  });
}

main();

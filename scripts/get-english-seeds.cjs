#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_zho')
    .lte('seed_number', 10)
    .order('seed_number');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('CANONICAL ENGLISH SEEDS (from eng_for_zho):');
  console.log('='.repeat(80));
  seeds.forEach(seed => {
    const seedNum = String(seed.seed_number).padStart(4, '0');
    console.log(`\nS${seedNum}:`);
    console.log(`  English (canonical): ${seed.target_text}`);
    console.log(`  Chinese (source):    ${seed.known_text}`);
  });
}

main();

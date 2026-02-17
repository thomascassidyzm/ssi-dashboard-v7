#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data: seeds, error } = await supabase
    .from('canonical_seeds')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('Canonical Seeds Schema:');
  console.log(JSON.stringify(seeds[0], null, 2));
}

main();

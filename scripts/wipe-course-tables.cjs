#!/usr/bin/env node
/**
 * Wipe all course content tables (seeds, legos, lego_components, basket_phrases)
 * Does NOT touch: courses, audio_samples, encouragements
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function wipeTables() {
  console.log('=== WIPING COURSE CONTENT TABLES ===\n');

  // Delete in order (children first due to foreign keys)
  const tables = [
    'basket_phrases',
    'lego_components',
    'legos',
    'seeds'
  ];

  for (const table of tables) {
    const { count: before } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`${table}: ${before} rows`);

    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error(`  ERROR: ${error.message}`);
    } else {
      const { count: after } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`  → deleted, now ${after} rows`);
    }
  }

  console.log('\n=== WIPE COMPLETE ===');
  console.log('Tables preserved: courses, audio_samples, encouragements');
}

wipeTables().catch(console.error);

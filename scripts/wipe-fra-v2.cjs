#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const course = 'fra_for_eng';

async function wipe() {
  console.log(`Wiping LEGOs and phrases for ${course}...`);

  const { data: phrases, error: pe } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', course)
    .select('id');
  console.log(`Deleted ${phrases?.length || 0} phrases${pe ? ' ERROR: ' + pe.message : ''}`);

  const { data: legos, error: le } = await supabase
    .from('course_legos')
    .delete()
    .eq('course_code', course)
    .select('id');
  console.log(`Deleted ${legos?.length || 0} LEGOs${le ? ' ERROR: ' + le.message : ''}`);

  console.log('Wipe complete. Seeds preserved.');
}

wipe().then(() => process.exit(0));

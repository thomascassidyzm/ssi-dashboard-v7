#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSeeds() {
  console.log('Fixing fra_for_eng seeds...\n');

  // S003: Remove capitalization from fragment
  const s003 = await supabase
    .from('course_seeds')
    .update({ target_text: 'comment parler aussi souvent que possible' })
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 3)
    .select();

  if (s003.error) {
    console.error('Error updating S003:', s003.error);
  } else {
    console.log('✅ S003: Fixed capitalization');
    console.log('   Old: Comment parler aussi souvent que possible');
    console.log('   New: comment parler aussi souvent que possible\n');
  }

  // S004: Remove capitalization from fragment
  const s004 = await supabase
    .from('course_seeds')
    .update({ target_text: 'comment dire quelque chose en français' })
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 4)
    .select();

  if (s004.error) {
    console.error('Error updating S004:', s004.error);
  } else {
    console.log('✅ S004: Fixed capitalization');
    console.log('   Old: Comment dire quelque chose en français');
    console.log('   New: comment dire quelque chose en français\n');
  }

  // S007: Fix to more literal translation with "je peux"
  const s007 = await supabase
    .from('course_seeds')
    .update({ target_text: 'je veux essayer aussi fort que je peux aujourd\'hui' })
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', 7)
    .select();

  if (s007.error) {
    console.error('Error updating S007:', s007.error);
  } else {
    console.log('✅ S007: Fixed to literal mapping');
    console.log('   Old: Je veux essayer autant que possible aujourd\'hui');
    console.log('   New: je veux essayer aussi fort que je peux aujourd\'hui\n');
  }

  // Verify all changes
  const { data: verification, error: verifyError } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'fra_for_eng')
    .in('seed_number', [3, 4, 7])
    .order('seed_number');

  if (verifyError) {
    console.error('Error verifying changes:', verifyError);
  } else {
    console.log('\n=== VERIFICATION ===\n');
    verification.forEach(seed => {
      console.log(`S${seed.seed_number.toString().padStart(3, '0')}: ${seed.known_text}`);
      console.log(`      ${seed.target_text}\n`);
    });
  }

  console.log('✅ All changes applied successfully!');
}

fixSeeds().catch(console.error);

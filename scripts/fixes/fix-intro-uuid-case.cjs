/**
 * Fix UUID case in lego_introductions table
 *
 * Problem: lego_introductions.audio_uuid is UPPERCASE
 *          but S3 keys use lowercase UUIDs
 *          S3 is case-sensitive, so UPPERCASE paths fail
 *
 * Solution: Convert lego_introductions.audio_uuid to lowercase
 *           The FK should allow this since PostgreSQL UUID comparison is case-insensitive
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function fixIntroUuids() {
  console.log('=== Fix Introduction UUID Case ===\n');

  // Get all introductions with uppercase UUIDs
  const { data: intros, error } = await supabase
    .from('lego_introductions')
    .select('id, lego_id, audio_uuid, course_code')
    .not('audio_uuid', 'is', null);

  if (error) {
    console.error('Error fetching introductions:', error);
    return;
  }

  // Find ones that need fixing
  const needsFix = intros.filter(i => i.audio_uuid !== i.audio_uuid.toLowerCase());

  console.log(`Total introductions: ${intros.length}`);
  console.log(`Need lowercase fix: ${needsFix.length}\n`);

  if (needsFix.length === 0) {
    console.log('✅ All UUIDs are already lowercase!');
    return;
  }

  // Check if the audio_uuid column is actually UUID type (case-insensitive FK) or text
  console.log('Attempting to update using RPC function...\n');

  // Since direct update failed due to FK, let's try using raw SQL via RPC
  // First check if we can run SQL
  const { data: testResult, error: testError } = await supabase.rpc('exec_sql', {
    sql_query: "SELECT 1 as test"
  });

  if (testError) {
    console.log('RPC not available. Generating SQL for manual execution.\n');

    // Generate SQL to run manually
    console.log('=== Run this SQL in Supabase SQL Editor ===\n');
    console.log(`
-- The audio_uuid column references audio_files.id
-- PostgreSQL UUID type is case-insensitive for storage/comparison
-- But the stored text representation matters for S3 key construction

-- Check if audio_uuid is UUID or TEXT type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lego_introductions'
AND column_name = 'audio_uuid';

-- If it's TEXT, we need to update to lowercase
-- If it's UUID, the case is normalized internally but displayed might vary

-- Force lowercase for all audio_uuids
UPDATE lego_introductions
SET audio_uuid = LOWER(audio_uuid::text)::uuid
WHERE audio_uuid IS NOT NULL
AND audio_uuid::text != LOWER(audio_uuid::text);

-- Verify the fix
SELECT lego_id, audio_uuid
FROM lego_introductions
WHERE course_code = 'zho_for_eng'
LIMIT 10;
`);
    return;
  }

  console.log('Updating via RPC...');

  // If RPC is available, run the update
  const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
    sql_query: `
      UPDATE lego_introductions
      SET audio_uuid = LOWER(audio_uuid::text)::uuid
      WHERE audio_uuid IS NOT NULL
      AND audio_uuid::text != LOWER(audio_uuid::text);
    `
  });

  if (updateError) {
    console.error('Update failed:', updateError);
    console.log('\nTry running the SQL manually in Supabase SQL Editor.');
  } else {
    console.log('✅ Update complete!');

    // Verify
    const { data: verifyData } = await supabase
      .from('lego_introductions')
      .select('lego_id, audio_uuid')
      .eq('course_code', 'zho_for_eng')
      .limit(5);

    console.log('\nVerification (should be lowercase):');
    verifyData?.forEach(v => {
      console.log(`  ${v.lego_id}: ${v.audio_uuid}`);
    });
  }
}

fixIntroUuids().catch(console.error);

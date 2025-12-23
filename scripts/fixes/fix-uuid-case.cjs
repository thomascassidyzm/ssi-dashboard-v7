/**
 * Fix UUID case mismatch between lego_introductions and audio_files
 *
 * Problem: lego_introductions.audio_uuid stores UPPERCASE UUIDs
 *          but audio_files.id stores lowercase UUIDs
 *          FK constraint requires audio_uuid to exist in audio_files.id
 *
 * Solution: Update audio_files.id to UPPERCASE to match lego_introductions
 *           (and also update s3_key references)
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

async function fixUuidCase() {
  console.log('=== UUID Case Fix ===\n');

  // Step 1: Get all UUIDs from lego_introductions (these are the source of truth)
  console.log('Step 1: Fetching UUIDs from lego_introductions...');
  const { data: introductions, error: introError } = await supabase
    .from('lego_introductions')
    .select('lego_id, audio_uuid')
    .not('audio_uuid', 'is', null);

  if (introError) {
    console.error('Error fetching introductions:', introError);
    process.exit(1);
  }

  console.log(`  Found ${introductions.length} introductions with audio_uuid\n`);

  // Step 2: Check audio_files for these UUIDs (case-insensitive)
  console.log('Step 2: Checking audio_files table...');

  // Get a sample of audio_files to see the case
  const { data: audioSample, error: audioError } = await supabase
    .from('audio_files')
    .select('id, s3_key')
    .limit(5);

  if (audioError) {
    console.error('Error fetching audio_files:', audioError);
    process.exit(1);
  }

  console.log('  Sample audio_files records:');
  audioSample.forEach(a => {
    console.log(`    id: ${a.id}`);
    console.log(`    s3_key: ${a.s3_key}\n`);
  });

  // Step 3: Identify mismatches
  console.log('Step 3: Analyzing case mismatches...\n');

  // Get all audio_files
  const { data: allAudio, error: allAudioError } = await supabase
    .from('audio_files')
    .select('id, s3_key, s3_bucket');

  if (allAudioError) {
    console.error('Error fetching all audio_files:', allAudioError);
    process.exit(1);
  }

  // Build lookup maps
  const audioByLowerUuid = new Map();
  allAudio.forEach(a => {
    audioByLowerUuid.set(a.id.toLowerCase(), a);
  });

  // Find introductions where the uppercase UUID needs a lowercase match
  const mismatches = [];
  for (const intro of introductions) {
    const lowerUuid = intro.audio_uuid.toLowerCase();
    const audioRecord = audioByLowerUuid.get(lowerUuid);

    if (audioRecord && audioRecord.id !== intro.audio_uuid) {
      mismatches.push({
        lego_id: intro.lego_id,
        intro_uuid: intro.audio_uuid,        // UPPERCASE from lego_introductions
        audio_uuid: audioRecord.id,          // lowercase from audio_files
        s3_key: audioRecord.s3_key,
        s3_bucket: audioRecord.s3_bucket
      });
    }
  }

  console.log(`Found ${mismatches.length} UUIDs that need case conversion\n`);

  if (mismatches.length === 0) {
    console.log('✅ No case mismatches found!');
    return;
  }

  console.log('Sample mismatches:');
  mismatches.slice(0, 5).forEach(m => {
    console.log(`  ${m.lego_id}:`);
    console.log(`    lego_introductions: ${m.intro_uuid}`);
    console.log(`    audio_files:        ${m.audio_uuid}`);
    console.log();
  });

  // Step 4: Update audio_files.id to match the uppercase from lego_introductions
  // Note: This requires updating the primary key, which may require special handling
  console.log('Step 4: The fix requires changing primary keys in audio_files.');
  console.log('This is a destructive operation that may break other FK references.\n');

  // Check if there are other tables referencing audio_files.id
  console.log('Checking for other FK references to audio_files.id...');

  const { data: courseAudio, error: courseAudioError } = await supabase
    .from('course_audio')
    .select('audio_uuid')
    .limit(5);

  if (!courseAudioError && courseAudio) {
    console.log(`  course_audio has ${courseAudio.length > 0 ? 'some' : 'no'} references`);
    if (courseAudio.length > 0) {
      console.log('  Sample course_audio.audio_uuid:', courseAudio[0].audio_uuid);
    }
  }

  // The safest approach: Update the learning app to do case-insensitive lookups
  // OR run direct SQL to update the IDs

  console.log('\n=== RECOMMENDED FIX ===');
  console.log('Run this SQL in Supabase SQL Editor:\n');

  console.log(`
-- Option 1: Update audio_files.id to uppercase (matches lego_introductions)
-- This will also update all FK references if cascade is enabled

BEGIN;

-- Temporarily disable FK checks if needed
-- ALTER TABLE lego_introductions DISABLE TRIGGER ALL;
-- ALTER TABLE course_audio DISABLE TRIGGER ALL;

-- Update audio_files.id to uppercase
UPDATE audio_files
SET id = UPPER(id)
WHERE id != UPPER(id);

-- Update s3_key to use uppercase UUID
UPDATE audio_files
SET s3_key = REPLACE(s3_key, LOWER(id), UPPER(id))
WHERE s3_key LIKE '%' || LOWER(id) || '%';

-- Update course_audio.audio_uuid to uppercase
UPDATE course_audio
SET audio_uuid = UPPER(audio_uuid)
WHERE audio_uuid != UPPER(audio_uuid);

-- Re-enable triggers if disabled
-- ALTER TABLE lego_introductions ENABLE TRIGGER ALL;
-- ALTER TABLE course_audio ENABLE TRIGGER ALL;

COMMIT;
`);

  console.log('\nOR Option 2: Make the lookup case-insensitive in the learning app.');
  console.log('Look for the query that fetches audio by UUID and use LOWER() or UPPER() on both sides.');
}

fixUuidCase().catch(console.error);

/**
 * Sync existing S3 audio files to Supabase audio_samples table
 *
 * This script:
 * 1. Scans S3 for existing audio files in mastered/
 * 2. Gets the audio needs from Phase 8 (which have UUIDs)
 * 3. For any matching UUIDs, registers them in Supabase
 */

// Load env BEFORE requiring modules that use it
const path = require('path');
// Load both .env (Supabase) and .env.automation (AWS)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.automation') });

const s3Service = require('../services/s3-service.cjs');
const db = require('../services/supabase-client.cjs');

async function syncS3ToSupabase(courseCode) {
  console.log(`\n=== Syncing S3 audio to Supabase for ${courseCode} ===\n`);

  // Wait for Supabase to initialize
  await new Promise(r => setTimeout(r, 500));

  if (!db.isInitialized()) {
    console.error('Supabase not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.');
    process.exit(1);
  }

  // Step 1: Get all UUIDs from S3
  console.log('1. Scanning S3 bucket for existing audio...');
  let s3Uuids;
  try {
    s3Uuids = await s3Service.buildMasteredIndex();
    console.log(`   Found ${s3Uuids.size} audio files in S3`);
  } catch (err) {
    console.error('   Error scanning S3:', err.message);
    process.exit(1);
  }

  // Step 2: Get audio needs from Phase 8 plan (which includes UUIDs)
  console.log('\n2. Getting audio needs from Phase 8...');
  const axios = require('axios');
  let planData;
  try {
    const response = await axios.post('http://localhost:3465/plan', { courseCode });
    planData = response.data;
    console.log(`   Phase 8 reports ${planData.plan?.total || 0} audio needs`);
  } catch (err) {
    console.error('   Error getting plan from Phase 8:', err.message);
    console.error('   Make sure Phase 8 is running on port 3465');
    process.exit(1);
  }

  // Step 3: Find matching UUIDs
  const samples = planData.plan?.samples || [];
  const matchingInS3 = samples.filter(s => s3Uuids.has(s.uuid?.toUpperCase()));
  console.log(`\n3. Found ${matchingInS3.length} matching audio files in S3`);

  if (matchingInS3.length === 0) {
    console.log('   No matching audio to register.');
    process.exit(0);
  }

  // Step 4: Register in Supabase
  console.log('\n4. Registering audio in Supabase...');
  const supabase = db.getClient();

  let registered = 0;
  let skipped = 0;
  let errors = 0;

  for (const sample of matchingInS3) {
    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from('audio_samples')
        .select('uuid')
        .eq('uuid', sample.uuid)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Register the sample
      const { error } = await supabase
        .from('audio_samples')
        .insert({
          uuid: sample.uuid,
          text: sample.text,
          lang: sample.lang,
          role: sample.role,
          voice_id: planData.voices?.[sample.role] || null,
          cadence: sample.role === 'known' ? 'natural' : 'slow',
          s3_bucket: 'ssi-audio-stage',
          s3_key: `mastered/${sample.uuid}.mp3`,
          course_code: courseCode,
          source: 'sync-import',
          created_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === '23505') { // Duplicate
          skipped++;
        } else {
          console.error(`   Error registering ${sample.uuid}:`, error.message);
          errors++;
        }
      } else {
        registered++;
      }
    } catch (err) {
      console.error(`   Error processing ${sample.uuid}:`, err.message);
      errors++;
    }
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`   Registered: ${registered}`);
  console.log(`   Skipped (already exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);

  // Step 5: Verify
  console.log('\n5. Verifying...');
  const verifyResponse = await axios.post('http://localhost:3465/plan', { courseCode });
  const newExisting = verifyResponse.data.plan?.existing || 0;
  console.log(`   Phase 8 now reports ${newExisting} existing samples`);

  process.exit(0);
}

// Run with course code argument
const courseCode = process.argv[2] || 'zho_for_eng';
syncS3ToSupabase(courseCode);

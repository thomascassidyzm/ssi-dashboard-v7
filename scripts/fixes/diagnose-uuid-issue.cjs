/**
 * Diagnose UUID mismatch between lego_introductions and audio_files
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

async function diagnose() {
  console.log('=== UUID Diagnosis ===\n');

  // Get lego_introductions for zho_for_eng
  const { data: intros, error: introError } = await supabase
    .from('lego_introductions')
    .select('lego_id, audio_uuid, course_code')
    .eq('course_code', 'zho_for_eng')
    .not('audio_uuid', 'is', null)
    .order('lego_id')
    .limit(20);

  if (introError) {
    console.error('Error fetching introductions:', introError);
    return;
  }

  console.log(`Found ${intros.length} zho_for_eng introductions with audio_uuid\n`);

  // Check each UUID in audio_files
  console.log('Checking if these UUIDs exist in audio_files...\n');

  for (const intro of intros.slice(0, 10)) {
    const uuid = intro.audio_uuid;
    const lowerUuid = uuid.toLowerCase();
    const upperUuid = uuid.toUpperCase();

    // Try exact match
    const { data: exact } = await supabase
      .from('audio_files')
      .select('id, s3_key')
      .eq('id', uuid)
      .single();

    // Try lowercase match
    const { data: lower } = await supabase
      .from('audio_files')
      .select('id, s3_key')
      .eq('id', lowerUuid)
      .single();

    // Try uppercase match
    const { data: upper } = await supabase
      .from('audio_files')
      .select('id, s3_key')
      .eq('id', upperUuid)
      .single();

    console.log(`${intro.lego_id}: ${uuid}`);
    console.log(`  Exact match:     ${exact ? '✅ ' + exact.s3_key : '❌ not found'}`);
    console.log(`  Lowercase match: ${lower ? '✅ ' + lower.s3_key : '❌ not found'}`);
    console.log(`  Uppercase match: ${upper ? '✅ ' + upper.s3_key : '❌ not found'}`);
    console.log();
  }

  // Also check audio_files count and sample
  console.log('=== audio_files table stats ===\n');

  const { count: totalAudio } = await supabase
    .from('audio_files')
    .select('*', { count: 'exact', head: true });

  console.log(`Total audio_files records: ${totalAudio}`);

  // Sample random audio_files
  const { data: randomAudio } = await supabase
    .from('audio_files')
    .select('id, s3_key, s3_bucket')
    .limit(10);

  console.log('\nSample audio_files records:');
  randomAudio?.forEach(a => {
    console.log(`  ${a.id} | ${a.s3_bucket} | ${a.s3_key}`);
  });

  // Check if any introduction UUIDs exist at all
  console.log('\n=== Cross-reference check ===\n');

  const introUuids = intros.map(i => i.audio_uuid);
  const lowerUuids = intros.map(i => i.audio_uuid.toLowerCase());

  const { data: foundExact, count: foundExactCount } = await supabase
    .from('audio_files')
    .select('id', { count: 'exact' })
    .in('id', introUuids);

  const { data: foundLower, count: foundLowerCount } = await supabase
    .from('audio_files')
    .select('id', { count: 'exact' })
    .in('id', lowerUuids);

  console.log(`UUIDs from lego_introductions: ${introUuids.length}`);
  console.log(`Found in audio_files (exact):     ${foundExactCount || 0}`);
  console.log(`Found in audio_files (lowercase): ${foundLowerCount || 0}`);
}

diagnose().catch(console.error);

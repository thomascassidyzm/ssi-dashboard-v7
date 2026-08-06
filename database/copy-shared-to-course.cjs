#!/usr/bin/env node
/**
 * Copy Shared Audio to Course Audio (v13 Schema)
 *
 * Copies encouragements and instructions from shared_audio to course_audio
 * for a specific course. This makes them available to the learning app
 * without needing to query two tables.
 *
 * Usage:
 *   node database/copy-shared-to-course.cjs <course_code> --dry-run
 *   node database/copy-shared-to-course.cjs <course_code>
 *
 * Example:
 *   node database/copy-shared-to-course.cjs cym_s_for_eng --dry-run
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
// One canonicalising mapper, shared with the other shared->course copier
// (api/import-course.js has its own, bundle-constrained, twin).
const { canonicalSharedIdentity } = require('./lib/import-legacy-course-core.cjs');

// =============================================================================
// CONFIG
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Map audio_type to role for course_audio
const TYPE_TO_ROLE = {
  'encouragement': 'encouragement',
  'instruction': 'instruction'
};

// =============================================================================
// COPY LOGIC
// =============================================================================

async function copySharedToCourse(courseCode, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Copy Shared Audio to Course Audio (v13 Schema)');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log();

  // Get course info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name')
    .eq('course_code', courseCode)
    .single();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseCode}`);
  }

  console.log(`Course: ${course.display_name}`);
  console.log(`Known language: ${course.known_lang}`);
  console.log();

  // Get shared audio for this known language
  const { data: sharedAudio, error: sharedError } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('language', course.known_lang);

  if (sharedError) {
    throw new Error(`Failed to fetch shared audio: ${sharedError.message}`);
  }

  if (!sharedAudio || sharedAudio.length === 0) {
    console.log(`No shared audio found for language: ${course.known_lang}`);
    return { copied: 0 };
  }

  console.log(`Found ${sharedAudio.length} shared audio records for ${course.known_lang}`);

  // Count by type
  const byType = {};
  sharedAudio.forEach(a => {
    byType[a.audio_type] = (byType[a.audio_type] || 0) + 1;
  });
  console.log('  By type:', JSON.stringify(byType));
  console.log();

  // Check what already exists in course_audio
  const { data: existingAudio, error: existingError } = await supabase
    .from('course_audio')
    .select('text_normalized, role')
    .eq('course_code', courseCode)
    .in('role', ['encouragement', 'instruction']);

  if (existingError) {
    throw new Error(`Failed to check existing audio: ${existingError.message}`);
  }

  const existingSet = new Set(
    (existingAudio || []).map(a => `${a.text_normalized}|${a.role}`)
  );

  console.log(`Existing encouragement/instruction audio in course: ${existingSet.size}`);

  // Build records to insert (skip existing)
  const recordsToInsert = [];
  const unresolved = [];

  for (const shared of sharedAudio) {
    const role = TYPE_TO_ROLE[shared.audio_type] || shared.audio_type;
    const key = `${shared.text_normalized}|${role}`;

    if (existingSet.has(key)) {
      continue; // Already exists
    }

    // Canonicalise the identity on the way across. Copying language and
    // voice_id verbatim is how drift propagates from shared_audio into
    // course_audio; a row whose identity cannot be resolved is skipped and
    // listed rather than copied under a value we cannot vouch for.
    const identity = canonicalSharedIdentity(shared);
    if (!identity) {
      unresolved.push(shared);
      continue;
    }

    recordsToInsert.push({
      course_code: courseCode,
      text: shared.text,
      text_normalized: shared.text_normalized,
      language: identity.language,
      role: role,
      voice_id: identity.voice_id,
      origin: shared.origin,
      s3_key: shared.s3_key,
      duration_ms: shared.duration_ms
    });
  }

  if (unresolved.length) {
    console.log(`⚠️  Skipped ${unresolved.length} shared row(s) whose identity cannot be canonicalised:`);
    for (const u of unresolved.slice(0, 10)) {
      console.log(`    language=${JSON.stringify(u.language)} voice_id=${JSON.stringify(u.voice_id)} audio_type=${JSON.stringify(u.audio_type)} text="${String(u.text).slice(0, 40)}"`);
    }
    if (unresolved.length > 10) console.log(`    … and ${unresolved.length - 10} more`);
    console.log();
  }

  console.log(`New records to copy: ${recordsToInsert.length}`);
  console.log(`Skipped (already exist): ${sharedAudio.length - recordsToInsert.length}`);
  console.log();

  if (recordsToInsert.length === 0) {
    console.log('Nothing to copy - all shared audio already exists in course.');
    return { copied: 0, skipped: sharedAudio.length };
  }

  if (dryRun) {
    console.log('DRY RUN - would copy:');
    recordsToInsert.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.role}] ${r.text.slice(0, 50)}...`);
    });
    if (recordsToInsert.length > 5) {
      console.log(`  ... and ${recordsToInsert.length - 5} more`);
    }
    console.log();
    console.log('Run without --dry-run to execute');
    return { wouldCopy: recordsToInsert.length };
  }

  // Insert records
  console.log('Copying shared audio to course_audio...');

  const batchSize = 50;
  let copied = 0;
  let errors = 0;

  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);

    const { error: insertError } = await supabase
      .from('course_audio')
      .insert(batch);

    if (insertError) {
      console.error(`  Error in batch ${i}-${i + batch.length}:`, insertError.message);
      errors += batch.length;
    } else {
      copied += batch.length;
    }
  }

  console.log(`  ✓ Copied ${copied} records (${errors} errors)`);

  // Verify
  console.log();
  console.log('Verification:');

  const { count: encouragementCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('role', 'encouragement');

  const { count: instructionCount } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('role', 'instruction');

  console.log(`  Encouragements in course: ${encouragementCount}`);
  console.log(`  Instructions in course: ${instructionCount}`);

  console.log();
  console.log('='.repeat(60));
  console.log('COPY COMPLETE');
  console.log('='.repeat(60));

  return { copied, errors, encouragementCount, instructionCount };
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!courseCode) {
    console.error('Usage: node database/copy-shared-to-course.cjs <course_code> [--dry-run]');
    console.error('Example: node database/copy-shared-to-course.cjs cym_s_for_eng');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  await copySharedToCourse(courseCode, dryRun);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Migrate course code from legacy format to APML naming conventions
 * Handles foreign key constraints properly by:
 * 1. Creating new course entry
 * 2. Updating all dependent tables
 * 3. Deleting old course entry
 *
 * Usage:
 *   node scripts/migrate-course-code-v2.cjs en-cy-north cym_n_for_eng --dry-run
 *   node scripts/migrate-course-code-v2.cjs en-cy-north cym_n_for_eng --execute
 */
require('dotenv').config();
const { supabase } = require('../services/supabase-client.cjs');

const oldCode = process.argv[2];
const newCode = process.argv[3];
const mode = process.argv[4] || '--dry-run';

if (!oldCode || !newCode) {
  console.log('Usage: node scripts/migrate-course-code-v2.cjs <old_code> <new_code> [--dry-run|--execute]');
  console.log('Example: node scripts/migrate-course-code-v2.cjs en-cy-north cym_n_for_eng --execute');
  process.exit(1);
}

const isDryRun = mode !== '--execute';

async function main() {
  console.log(`\n=== COURSE CODE MIGRATION (v2) ===`);
  console.log(`Old: ${oldCode}`);
  console.log(`New: ${newCode}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}\n`);

  // Step 1: Get the old course entry
  const { data: oldCourse, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', oldCode)
    .single();

  if (courseError || !oldCourse) {
    console.error(`Error: Course '${oldCode}' not found`);
    console.error(courseError);
    process.exit(1);
  }

  console.log('Source course found:', {
    course_code: oldCourse.course_code,
    known_lang: oldCourse.known_lang,
    target_lang: oldCourse.target_lang
  });

  // Check if new code already exists
  const { data: existingNew } = await supabase
    .from('courses')
    .select('course_code')
    .eq('course_code', newCode)
    .single();

  if (existingNew) {
    console.error(`Error: Course '${newCode}' already exists. Delete it first or choose a different code.`);
    process.exit(1);
  }

  // Tables with FK to courses.course_code
  const dependentTables = [
    'course_seeds',
    'course_legos',
    'course_practice_phrases',
    'lego_introductions',
  ];

  // Tables without FK (just have course_code column)
  const looselyLinkedTables = [
    'course_audio',
    'course_audio_usage',
    'sample_flags'
  ];

  const results = {};

  // Count all affected rows
  console.log('\nCounting affected rows...');

  for (const table of [...dependentTables, ...looselyLinkedTables]) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('course_code', oldCode);

    results[table] = { count: count || 0, error: error?.message };
  }

  // Print summary
  console.log('\nAffected rows:');
  console.log('Table                        | Count');
  console.log('-'.repeat(45));
  let total = 0;
  for (const [table, info] of Object.entries(results)) {
    if (info.error) {
      console.log(`${table.padEnd(28)} | error: ${info.error.substring(0, 20)}`);
    } else {
      console.log(`${table.padEnd(28)} | ${info.count}`);
      total += info.count;
    }
  }
  console.log('-'.repeat(45));
  console.log(`Total: ${total} rows\n`);

  if (isDryRun) {
    console.log('=== DRY RUN - No changes made ===');
    console.log(`\nTo execute: node scripts/migrate-course-code-v2.cjs ${oldCode} ${newCode} --execute`);
    return;
  }

  // EXECUTE MODE
  console.log('=== EXECUTING MIGRATION ===\n');

  // Step 1: Create new course entry
  console.log('Step 1: Creating new course entry...');
  const { course_code: _, id: __, created_at: ___, ...courseData } = oldCourse;
  const { error: insertError } = await supabase
    .from('courses')
    .insert({
      ...courseData,
      course_code: newCode
    });

  if (insertError) {
    console.error('Failed to create new course entry:', insertError);
    process.exit(1);
  }
  console.log(`  ✓ Created course '${newCode}'`);

  // Step 2: Update dependent tables (these have FK constraints)
  console.log('\nStep 2: Updating dependent tables...');
  for (const table of dependentTables) {
    if (results[table].count === 0) {
      console.log(`  - ${table}: 0 rows (skipped)`);
      continue;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ course_code: newCode })
      .eq('course_code', oldCode);

    if (updateError) {
      console.error(`  ✗ ${table}: ${updateError.message}`);
    } else {
      console.log(`  ✓ ${table}: ${results[table].count} rows updated`);
    }
  }

  // Step 3: Update loosely linked tables
  console.log('\nStep 3: Updating loosely linked tables...');
  for (const table of looselyLinkedTables) {
    if (results[table].count === 0) {
      console.log(`  - ${table}: 0 rows (skipped)`);
      continue;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ course_code: newCode })
      .eq('course_code', oldCode);

    if (updateError) {
      console.error(`  ✗ ${table}: ${updateError.message}`);
    } else {
      console.log(`  ✓ ${table}: ${results[table].count} rows updated`);
    }
  }

  // Step 4: Delete old course entry
  console.log('\nStep 4: Deleting old course entry...');
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('course_code', oldCode);

  if (deleteError) {
    console.error(`  ✗ Failed to delete '${oldCode}': ${deleteError.message}`);
    console.log('  Note: Old course entry remains. You may need to delete it manually.');
  } else {
    console.log(`  ✓ Deleted course '${oldCode}'`);
  }

  // Verification
  console.log('\n=== VERIFICATION ===');
  const { count: newCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', newCode);

  const { count: oldCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', oldCode);

  console.log(`Seeds with '${newCode}': ${newCount}`);
  console.log(`Seeds with '${oldCode}': ${oldCount}`);

  if (newCount > 0 && oldCount === 0) {
    console.log('\n✓ Migration successful!');
  } else {
    console.log('\n⚠ Migration may not be complete. Please verify.');
  }
}

main().catch(console.error);

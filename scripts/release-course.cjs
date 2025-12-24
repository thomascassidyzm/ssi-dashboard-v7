#!/usr/bin/env node
/**
 * Release Course Content
 *
 * Updates all course content from 'draft' to 'released' status.
 * This makes the content available for manifest generation and the learning app.
 *
 * Usage:
 *   node scripts/release-course.cjs <course_code> [--dry-run]
 *   node scripts/release-course.cjs cym_n_for_eng --dry-run
 *   node scripts/release-course.cjs cym_n_for_eng
 */

require('dotenv').config();
const { supabase } = require('../services/supabase-client.cjs');

const courseCode = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!courseCode) {
  console.log('Usage: node scripts/release-course.cjs <course_code> [--dry-run]');
  console.log('Example: node scripts/release-course.cjs cym_n_for_eng');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Release Course Content');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('');

  // Check course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('course_code, status')
    .eq('course_code', courseCode)
    .single();

  if (courseError || !course) {
    console.error(`Course '${courseCode}' not found`);
    process.exit(1);
  }

  console.log(`Course found: ${course.course_code} (status: ${course.status})`);

  // Count content by status
  const tables = ['course_seeds', 'course_legos', 'course_practice_phrases'];
  const counts = {};

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('status', { count: 'exact', head: false })
      .eq('course_code', courseCode);

    if (error) {
      console.error(`Error querying ${table}:`, error.message);
      continue;
    }

    // Count by status
    const statusCounts = { draft: 0, released: 0, deprecated: 0 };
    for (const row of data || []) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    }
    counts[table] = statusCounts;
  }

  console.log('\nCurrent status counts:');
  console.log('Table                        | draft | released | deprecated');
  console.log('-'.repeat(60));
  for (const [table, statusCounts] of Object.entries(counts)) {
    console.log(
      `${table.padEnd(28)} | ${String(statusCounts.draft).padStart(5)} | ${String(statusCounts.released).padStart(8)} | ${String(statusCounts.deprecated).padStart(10)}`
    );
  }

  // Calculate total to release
  const totalDraft = Object.values(counts).reduce((sum, c) => sum + c.draft, 0);
  console.log(`\nTotal draft items to release: ${totalDraft}`);

  if (totalDraft === 0) {
    console.log('\nNo draft content to release. Already released?');
    return;
  }

  if (dryRun) {
    console.log('\n=== DRY RUN - No changes made ===');
    console.log(`To execute: node scripts/release-course.cjs ${courseCode}`);
    return;
  }

  // Execute release
  console.log('\n=== EXECUTING RELEASE ===\n');

  // Update course status
  const { error: courseUpdateError } = await supabase
    .from('courses')
    .update({ status: 'released' })
    .eq('course_code', courseCode);

  if (courseUpdateError) {
    console.error('Error updating course:', courseUpdateError.message);
  } else {
    console.log('✓ Course status updated to released');
  }

  // Update content tables
  for (const table of tables) {
    const { error: updateError, count } = await supabase
      .from(table)
      .update({ status: 'released' })
      .eq('course_code', courseCode)
      .eq('status', 'draft')
      .select('id', { count: 'exact', head: true });

    if (updateError) {
      console.error(`✗ ${table}: ${updateError.message}`);
    } else {
      console.log(`✓ ${table}: ${counts[table].draft} items released`);
    }
  }

  // Verification
  console.log('\n=== VERIFICATION ===');
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('status', 'released');

    console.log(`${table}: ${count} released`);
  }

  console.log('\n✓ Release complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

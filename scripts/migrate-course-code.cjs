#!/usr/bin/env node
/**
 * Migrate course code from legacy format to APML naming conventions
 *
 * Usage:
 *   node scripts/migrate-course-code.cjs en-cy-north cym_n_for_eng --dry-run
 *   node scripts/migrate-course-code.cjs en-cy-north cym_n_for_eng --execute
 */
require('dotenv').config();
const { supabase } = require('../services/supabase-client.cjs');

const oldCode = process.argv[2];
const newCode = process.argv[3];
const mode = process.argv[4] || '--dry-run';

if (!oldCode || !newCode) {
  console.log('Usage: node scripts/migrate-course-code.cjs <old_code> <new_code> [--dry-run|--execute]');
  console.log('Example: node scripts/migrate-course-code.cjs en-cy-north cym_n_for_eng --execute');
  process.exit(1);
}

const isDryRun = mode !== '--execute';

async function main() {
  console.log(`\n=== COURSE CODE MIGRATION ===`);
  console.log(`Old: ${oldCode}`);
  console.log(`New: ${newCode}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}\n`);

  // Tables that need course_code updated
  const tables = [
    'courses',
    'course_seeds',
    'course_legos',
    'course_practice_phrases',
    'lego_introductions',
    'course_audio',
    'course_audio_usage',
    'sample_flags'
  ];

  const results = {};

  for (const table of tables) {
    // Count affected rows
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('course_code', oldCode);

    if (countError) {
      // Table might not exist or have different schema
      results[table] = { count: 0, error: countError.message };
      continue;
    }

    results[table] = { count: count || 0 };

    if (!isDryRun && count > 0) {
      // Execute the update
      const { error: updateError } = await supabase
        .from(table)
        .update({ course_code: newCode })
        .eq('course_code', oldCode);

      if (updateError) {
        results[table].updateError = updateError.message;
      } else {
        results[table].updated = true;
      }
    }
  }

  // Print results
  console.log('Table                        | Count   | Status');
  console.log('-'.repeat(60));

  for (const [table, info] of Object.entries(results)) {
    const count = String(info.count).padEnd(7);
    let status = isDryRun ? 'would update' : (info.updated ? 'UPDATED' : 'no action');
    if (info.error) status = `error: ${info.error.substring(0, 30)}`;
    if (info.updateError) status = `update failed: ${info.updateError.substring(0, 20)}`;
    if (info.count === 0) status = 'no rows';

    console.log(`${table.padEnd(28)} | ${count} | ${status}`);
  }

  // Summary
  const totalRows = Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0);
  console.log('-'.repeat(60));
  console.log(`Total affected rows: ${totalRows}`);

  if (isDryRun) {
    console.log(`\nTo execute, run: node scripts/migrate-course-code.cjs ${oldCode} ${newCode} --execute`);
  } else {
    console.log(`\nMigration complete!`);
  }
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * Import Legacy Course - CLI
 *
 * Consolidated script for importing legacy course manifests to v13 schema.
 * Replaces: import-course-v13.cjs, import-course-structure.cjs, import-lego-introductions.cjs
 *
 * Usage:
 *   node database/import-legacy-course.cjs <manifest.json> [--dry-run] [--max-seeds=N] [--clear-first]
 *
 * Examples:
 *   node database/import-legacy-course.cjs ~/Downloads/en-ga.json --dry-run
 *   node database/import-legacy-course.cjs ~/Downloads/en-ga.json
 *   node database/import-legacy-course.cjs ~/Downloads/en-es.json --max-seeds=100
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { importLegacyCourse, COURSE_ALIASES } = require('./lib/import-legacy-course-core.cjs');

// =============================================================================
// CLI PARSING
// =============================================================================

const args = process.argv.slice(2);
const manifestPath = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const clearFirst = args.includes('--clear-first');
const maxSeedsArg = args.find(a => a.startsWith('--max-seeds='));
const maxSeeds = maxSeedsArg ? parseInt(maxSeedsArg.split('=')[1], 10) : null;

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  if (!manifestPath) {
    console.error('Usage: node database/import-legacy-course.cjs <manifest.json> [--dry-run] [--max-seeds=N]');
    console.error('');
    console.error('Options:');
    console.error('  --dry-run       Analyze manifest without importing');
    console.error('  --max-seeds=N   Limit number of seeds to import');
    console.error('  --clear-first   Delete existing data before importing (use with caution)');
    console.error('');
    console.error('Supported course aliases:');
    for (const [legacy, canonical] of Object.entries(COURSE_ALIASES)) {
      console.error(`  ${legacy} → ${canonical}`);
    }
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
  }

  // Load manifest
  const resolvedPath = path.resolve(manifestPath);
  if (!await fs.pathExists(resolvedPath)) {
    console.error(`Error: Manifest not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Legacy Course Import');
  console.log('='.repeat(60));

  const manifest = await fs.readJson(resolvedPath);

  console.log(`Manifest: ${resolvedPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
  if (maxSeeds) console.log(`Max seeds: ${maxSeeds}`);
  if (clearFirst) console.log(`Clear first: YES (will delete existing data)`);
  console.log('');

  // Progress callback
  const onProgress = ({ step, message }) => {
    process.stdout.write(`\rStep ${step}/8: ${message}`.padEnd(80));
  };

  try {
    const result = await importLegacyCourse(manifest, {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_KEY,
      dryRun,
      clearFirst,
      maxSeeds,
      onProgress: dryRun ? null : onProgress
    });

    console.log('');
    console.log('');

    if (result.dryRun) {
      // Dry run output
      const { analysis } = result;
      console.log('Course ID:', analysis.legacyId, '→', analysis.courseCode);
      console.log('Languages:', analysis.knownLang, '→', analysis.targetLang);
      console.log('Display name:', analysis.displayName);
      console.log('');
      console.log('DRY RUN - Would import:');
      console.log(`  courses:                  1`);
      console.log(`  course_audio:             ${analysis.sampleCount.toLocaleString()}`);
      console.log(`  shared_audio:             ${analysis.orderedEncouragements + analysis.pooledEncouragements} (${analysis.orderedEncouragements} instructions + ${analysis.pooledEncouragements} encouragements)`);
      console.log(`  course_seeds:             ${analysis.seedCount.toLocaleString()}`);
      console.log(`  course_legos:             ${analysis.legoCount.toLocaleString()}`);
      console.log(`  course_practice_phrases:  ${analysis.phraseCount.toLocaleString()}`);
      console.log(`  lego_introductions:       ${analysis.legoCount.toLocaleString()}`);
      console.log('');
      console.log('Run without --dry-run to execute import.');
    } else {
      // Live import output
      const { analysis, steps } = result;

      console.log('='.repeat(60));
      console.log('IMPORT COMPLETE');
      console.log('='.repeat(60));
      console.log(`Course: ${analysis.courseCode} (${analysis.displayName})`);
      console.log('');

      // Show cleared data if --clear-first was used
      if (steps.clearData) {
        console.log('Cleared (before import):');
        for (const [table, result] of Object.entries(steps.clearData)) {
          if (result.deleted > 0) {
            console.log(`  ${table}: ${result.deleted.toLocaleString()} rows deleted`);
          }
        }
        console.log('');
      }

      console.log('Imported:');
      console.log(`  courses:                  ${steps.courseRecord.count}`);
      console.log(`  course_audio:             ${steps.audioSamples.count.toLocaleString()}${steps.copyShared.count > 0 ? ` + ${steps.copyShared.count} shared` : ''}`);
      console.log(`  shared_audio:             ${steps.sharedAudio.count}${steps.sharedAudio.skipped ? ' (already exists)' : ''}`);
      console.log(`  course_seeds:             ${steps.seeds.count.toLocaleString()}`);
      console.log(`  course_legos:             ${steps.legos.count.toLocaleString()}`);
      console.log(`  course_practice_phrases:  ${steps.practicePhrases.count.toLocaleString()}`);
      console.log(`  lego_introductions:       ${steps.legoIntroductions.count.toLocaleString()}`);

      if (steps.audioSamples.errors > 0) {
        console.log('');
        console.log(`Warnings: ${steps.audioSamples.errors} audio insert errors (duplicates?)`);
      }
    }

  } catch (err) {
    console.error('');
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * find-missing-baskets.cjs - Find LEGOs that need practice phrases
 *
 * Queries the Supabase database for LEGOs with is_new=true that don't have
 * any practice phrases yet. Used for Phase 3 resume operations.
 *
 * Usage:
 *   node tools/validators/find-missing-baskets.cjs <courseCode> [startSeed] [endSeed]
 *
 * Examples:
 *   node tools/validators/find-missing-baskets.cjs zho_for_eng
 *   node tools/validators/find-missing-baskets.cjs zho_for_eng 1 50
 *   node tools/validators/find-missing-baskets.cjs spa_for_eng 100 200
 *
 * Output:
 *   - List of missing LEGOs with their IDs and seed info
 *   - Summary statistics
 *   - JSON output for programmatic use (with --json flag)
 */

const path = require('path');

// Load environment from project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const courseDataService = require('../../services/course-data-service.cjs');

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const jsonOutput = args.includes('--json');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  const courseCode = filteredArgs[0];
  const startSeed = filteredArgs[1] ? parseInt(filteredArgs[1], 10) : 1;
  const endSeed = filteredArgs[2] ? parseInt(filteredArgs[2], 10) : 9999;

  if (!courseCode) {
    console.error('Usage: node find-missing-baskets.cjs <courseCode> [startSeed] [endSeed] [--json]');
    console.error('');
    console.error('Examples:');
    console.error('  node find-missing-baskets.cjs zho_for_eng');
    console.error('  node find-missing-baskets.cjs zho_for_eng 1 50');
    console.error('  node find-missing-baskets.cjs spa_for_eng 100 200 --json');
    process.exit(1);
  }

  // Check if database reads are enabled
  if (!courseDataService.USE_DATABASE_READS) {
    console.error('Error: Database reads not enabled (USE_DATABASE_READS=false)');
    console.error('Set USE_DATABASE_READS=true in your .env file');
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log(`\nFinding missing baskets for ${courseCode} (seeds ${startSeed}-${endSeed})...\n`);
    }

    // Query database for missing LEGOs
    const missingLegos = await courseDataService.getMissingLegosFromDatabase(
      courseCode,
      startSeed,
      endSeed
    );

    if (missingLegos === null) {
      console.error('Error: Could not query database');
      process.exit(1);
    }

    if (missingLegos.length === 0) {
      if (jsonOutput) {
        console.log(JSON.stringify({ count: 0, legos: [] }));
      } else {
        console.log('No missing baskets found. All LEGOs have practice phrases.');
      }
      process.exit(0);
    }

    // Group by seed for better output
    const bySeed = {};
    for (const lego of missingLegos) {
      if (!bySeed[lego.seed]) {
        bySeed[lego.seed] = [];
      }
      bySeed[lego.seed].push(lego);
    }

    const seedList = Object.keys(bySeed).sort();

    if (jsonOutput) {
      // JSON output for programmatic use
      const output = {
        courseCode,
        seedRange: { start: startSeed, end: endSeed },
        count: missingLegos.length,
        seeds: seedList,
        legos: missingLegos.map(l => ({
          legoId: l.legoId,
          seed: l.seed,
          known: l.known,
          target: l.target,
          type: l.type
        }))
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Human-readable output
      console.log(`Found ${missingLegos.length} LEGOs missing practice phrases:\n`);

      for (const seed of seedList) {
        const legos = bySeed[seed];
        console.log(`${seed}: ${legos.length} LEGOs`);
        for (const lego of legos) {
          console.log(`  - ${lego.legoId}: "${lego.known}" / "${lego.target}"`);
        }
      }

      console.log(`\n--- Summary ---`);
      console.log(`Total missing: ${missingLegos.length} LEGOs`);
      console.log(`Affected seeds: ${seedList.length}`);
      console.log(`Seed range: ${seedList[0]} to ${seedList[seedList.length - 1]}`);

      // Suggest command for resume
      console.log(`\n--- Resume Command ---`);
      console.log(`Use these LEGOs for Phase 3 resume:`);
      console.log(`  LEGO IDs: ${missingLegos.map(l => l.legoId).join(', ')}`);
    }

    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    if (!jsonOutput) {
      console.error('\nMake sure:');
      console.error('  1. SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
      console.error('  2. USE_DATABASE_READS=true in .env');
      console.error('  3. The database has LEGOs for this course');
    }
    process.exit(1);
  }
}

main();

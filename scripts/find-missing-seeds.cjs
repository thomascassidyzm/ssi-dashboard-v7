#!/usr/bin/env node
/**
 * find-missing-seeds.cjs
 *
 * CLI tool to find seeds that are missing from the database for a course.
 * Used for intelligent resume - identifies which seeds still need processing.
 *
 * Usage:
 *   node scripts/find-missing-seeds.cjs <course_code> <start_seed> <end_seed> [options]
 *
 * Options:
 *   --json      Output as JSON array
 *   --count     Just output the count of missing seeds
 *   --verbose   Show additional details (seeds without LEGOs)
 *
 * Examples:
 *   node scripts/find-missing-seeds.cjs spa_for_eng 1 10
 *   node scripts/find-missing-seeds.cjs spa_for_eng 1 260 --count
 *   node scripts/find-missing-seeds.cjs spa_for_eng 1 260 --json
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function findMissingSeeds(courseCode, startSeed, endSeed, options = {}) {
  // Get all seeds that exist in database for this course within range
  const { data: existingSeeds, error: seedsError } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', startSeed)
    .lte('seed_number', endSeed);

  if (seedsError) {
    console.error('Error fetching seeds:', seedsError.message);
    process.exit(1);
  }

  const existingSet = new Set((existingSeeds || []).map(s => s.seed_number));

  // Find seeds that don't exist
  const missingSeeds = [];
  for (let i = startSeed; i <= endSeed; i++) {
    if (!existingSet.has(i)) {
      missingSeeds.push(i);
    }
  }

  // Optional: Check for seeds that exist but have no LEGOs
  let seedsWithoutLegos = [];
  if (options.verbose && existingSeeds && existingSeeds.length > 0) {
    const { data: legoCounts, error: legoError } = await supabase
      .from('course_legos')
      .select('seed_number')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed);

    if (!legoError) {
      const seedsWithLegos = new Set((legoCounts || []).map(l => l.seed_number));
      seedsWithoutLegos = [...existingSet].filter(s => !seedsWithLegos.has(s));
    }
  }

  return { missingSeeds, seedsWithoutLegos, existingCount: existingSeeds?.length || 0 };
}

function formatSeedId(num) {
  return `S${String(num).padStart(4, '0')}`;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    json: args.includes('--json'),
    count: args.includes('--count'),
    verbose: args.includes('--verbose')
  };

  // Remove options from args
  const positionalArgs = args.filter(a => !a.startsWith('--'));

  if (positionalArgs.length < 3) {
    console.error('Usage: node scripts/find-missing-seeds.cjs <course_code> <start_seed> <end_seed> [--json|--count|--verbose]');
    console.error('');
    console.error('Example: node scripts/find-missing-seeds.cjs spa_for_eng 1 10');
    process.exit(1);
  }

  const [courseCode, startStr, endStr] = positionalArgs;
  const startSeed = parseInt(startStr, 10);
  const endSeed = parseInt(endStr, 10);

  if (isNaN(startSeed) || isNaN(endSeed)) {
    console.error('Error: start_seed and end_seed must be numbers');
    process.exit(1);
  }

  if (startSeed > endSeed) {
    console.error('Error: start_seed must be <= end_seed');
    process.exit(1);
  }

  const { missingSeeds, seedsWithoutLegos, existingCount } = await findMissingSeeds(
    courseCode,
    startSeed,
    endSeed,
    options
  );

  const totalInRange = endSeed - startSeed + 1;

  // Output based on options
  if (options.json) {
    const output = {
      course: courseCode,
      range: { start: startSeed, end: endSeed },
      existing: existingCount,
      missing: missingSeeds.length,
      missingSeeds: missingSeeds.map(formatSeedId)
    };
    if (options.verbose && seedsWithoutLegos.length > 0) {
      output.seedsWithoutLegos = seedsWithoutLegos.map(formatSeedId);
    }
    console.log(JSON.stringify(output, null, 2));
  } else if (options.count) {
    console.log(missingSeeds.length);
  } else {
    // Default: human-readable output
    console.log(`Course: ${courseCode}`);
    console.log(`Range: S${String(startSeed).padStart(4, '0')} - S${String(endSeed).padStart(4, '0')} (${totalInRange} seeds)`);
    console.log(`Existing: ${existingCount}`);
    console.log(`Missing: ${missingSeeds.length}`);

    if (missingSeeds.length > 0) {
      console.log('');
      if (missingSeeds.length <= 20) {
        console.log('Missing seeds:', missingSeeds.map(formatSeedId).join(', '));
      } else {
        console.log('Missing seeds (first 20):', missingSeeds.slice(0, 20).map(formatSeedId).join(', '));
        console.log(`... and ${missingSeeds.length - 20} more`);
      }
    }

    if (options.verbose && seedsWithoutLegos.length > 0) {
      console.log('');
      console.log(`Seeds without LEGOs: ${seedsWithoutLegos.length}`);
      if (seedsWithoutLegos.length <= 10) {
        console.log('  ' + seedsWithoutLegos.map(formatSeedId).join(', '));
      }
    }
  }

  // Exit with code 0 if all seeds exist, 1 if any missing
  process.exit(missingSeeds.length > 0 ? 0 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

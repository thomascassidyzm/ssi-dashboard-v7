#!/usr/bin/env node

/**
 * Detect Missing Phase 5 Baskets
 *
 * Compares GitHub branches against expected seeds to find gaps.
 * Used for recovery operations after failures or quality issues.
 *
 * Usage:
 *   node scripts/detect_missing_baskets.cjs <course_code>
 *
 * Example:
 *   node scripts/detect_missing_baskets.cjs cmn_for_eng
 *
 * Output:
 *   - Prints summary to console
 *   - Writes missing_seeds.json with structured data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/detect_missing_baskets.cjs <course_code>');
  console.error('Example: node scripts/detect_missing_baskets.cjs cmn_for_eng');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('PHASE 5 BASKET GAP DETECTION');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`Course: ${courseCode}`);
console.log(`Analyzing GitHub branches...\n`);

// Fetch latest from GitHub
try {
  execSync('git fetch --all', { stdio: 'ignore' });
} catch (err) {
  console.error('⚠️  Warning: Could not fetch from GitHub');
}

// Get all basket branches for this course
let branches;
try {
  const branchOutput = execSync('git branch -r', { encoding: 'utf8' });
  branches = branchOutput
    .split('\n')
    .filter(b => b.includes(`baskets-${courseCode}`) && b.includes('origin/'))
    .map(b => b.trim());
} catch (err) {
  console.error('❌ Error getting git branches:', err.message);
  process.exit(1);
}

console.log(`Found ${branches.length} basket branches for ${courseCode}\n`);

// Extract seeds from all branches
const seedsFound = new Set();

for (const branch of branches) {
  try {
    const filesOutput = execSync(`git ls-tree -r --name-only ${branch}`, { encoding: 'utf8' });
    const files = filesOutput.split('\n');

    // Look for basket files
    const basketFiles = files.filter(f =>
      f.includes('phase5_outputs') &&
      f.endsWith('.json') &&
      f.includes('seed_')
    );

    // Extract seed numbers
    for (const file of basketFiles) {
      const match = file.match(/[Ss]eed_[Ss](\d{4})/);
      if (match) {
        seedsFound.add(parseInt(match[1], 10));
      }
    }
  } catch (err) {
    // Skip branches that error
    continue;
  }
}

// Calculate missing seeds (assuming 668 total)
const TOTAL_SEEDS = 668;
const allExpected = Array.from({ length: TOTAL_SEEDS }, (_, i) => i + 1);
const missing = allExpected.filter(num => !seedsFound.has(num));

console.log('═══════════════════════════════════════════════════════════');
console.log('RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`Total expected:     ${TOTAL_SEEDS} seeds`);
console.log(`Found on GitHub:    ${seedsFound.size} seeds`);
console.log(`Missing:            ${missing.length} seeds`);
console.log(`Completion:         ${((seedsFound.size / TOTAL_SEEDS) * 100).toFixed(1)}%\n`);

if (missing.length === 0) {
  console.log('✅ All baskets complete! No recovery needed.\n');

  // Write empty result
  const outputPath = path.join(__dirname, '..', 'missing_seeds.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    course: courseCode,
    total_expected: TOTAL_SEEDS,
    found: seedsFound.size,
    missing_count: 0,
    missing_seeds: [],
    missing_ranges: []
  }, null, 2));

  process.exit(0);
}

// Group missing seeds into ranges
const ranges = [];
let rangeStart = missing[0];
let rangeEnd = missing[0];

for (let i = 1; i <= missing.length; i++) {
  const current = missing[i];

  if (current === rangeEnd + 1) {
    // Continue range
    rangeEnd = current;
  } else {
    // End of range
    const count = rangeEnd - rangeStart + 1;
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
      count: count,
      range: count === 1
        ? `S${String(rangeStart).padStart(4, '0')}`
        : `S${String(rangeStart).padStart(4, '0')}-S${String(rangeEnd).padStart(4, '0')}`
    });

    if (i < missing.length) {
      rangeStart = current;
      rangeEnd = current;
    }
  }
}

console.log('Missing ranges:');
for (const range of ranges) {
  console.log(`  ${range.range} (${range.count} seed${range.count > 1 ? 's' : ''})`);
}

// Calculate recovery parameters
const NUM_WINDOWS = 12;
const AGENTS_PER_WINDOW = 10;
const seedsPerAgent = Math.ceil(missing.length / (NUM_WINDOWS * AGENTS_PER_WINDOW));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('RECOVERY PARAMETERS');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`Windows:            ${NUM_WINDOWS}`);
console.log(`Agents per window:  ${AGENTS_PER_WINDOW}`);
console.log(`Seeds per agent:    ${seedsPerAgent}`);
console.log(`Total capacity:     ${NUM_WINDOWS * AGENTS_PER_WINDOW * seedsPerAgent} seeds`);
console.log(`\nEstimated time:     ${Math.ceil(missing.length / 100)} - ${Math.ceil(missing.length / 50)} hours\n`);

// Save structured output
const output = {
  course: courseCode,
  total_expected: TOTAL_SEEDS,
  found: seedsFound.size,
  missing_count: missing.length,
  missing_seeds: missing,
  missing_ranges: ranges,
  recovery_params: {
    num_windows: NUM_WINDOWS,
    agents_per_window: AGENTS_PER_WINDOW,
    seeds_per_agent: seedsPerAgent,
    total_capacity: NUM_WINDOWS * AGENTS_PER_WINDOW * seedsPerAgent
  }
};

const outputPath = path.join(__dirname, '..', 'missing_seeds.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Saved analysis to: missing_seeds.json\n`);
console.log(`Next step: node scripts/generate_recovery_prompts.cjs ${courseCode}\n`);

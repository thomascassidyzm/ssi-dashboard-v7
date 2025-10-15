#!/usr/bin/env node

/**
 * Phase 3 Orchestrator: LEGO Generation + Validation
 *
 * Automated workflow:
 * 1. Generate LEGO decompositions using APML Phase 3 agent
 * 2. Run automated validation
 * 3. Report results
 * 4. Optionally regenerate if validation fails
 *
 * Usage:
 *   node process-phase-3-with-validation.cjs <course_dir>
 *   node process-phase-3-with-validation.cjs spa_for_eng_30seeds
 *   node process-phase-3-with-validation.cjs spa_for_eng_30seeds --max-attempts=3
 *   node process-phase-3-with-validation.cjs --all
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Run command and capture output
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });
    }

    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Parse validation results from output
 */
function parseValidationResults(output) {
  const lines = output.split('\n');

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let passed = false;

  for (const line of lines) {
    if (line.includes('CRITICAL:')) {
      const match = line.match(/CRITICAL:\s*(\d+)/);
      if (match) critical = parseInt(match[1], 10);
    }
    if (line.includes('HIGH:')) {
      const match = line.match(/HIGH:\s*(\d+)/);
      if (match) high = parseInt(match[1], 10);
    }
    if (line.includes('MEDIUM:')) {
      const match = line.match(/MEDIUM:\s*(\d+)/);
      if (match) medium = parseInt(match[1], 10);
    }
    if (line.includes('LOW:')) {
      const match = line.match(/LOW:\s*(\d+)/);
      if (match) low = parseInt(match[1], 10);
    }
    if (line.includes('✅ VALIDATION PASSED')) {
      passed = true;
    }
  }

  return { critical, high, medium, low, passed, total: critical + high + medium + low };
}

/**
 * Backup existing LEGO file
 */
async function backupLEGOFile(coursePath, attemptNum) {
  const legoPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

  if (await fs.pathExists(legoPath)) {
    const backupPath = path.join(
      coursePath,
      `LEGO_BREAKDOWNS_COMPLETE.backup_attempt${attemptNum}.json`
    );
    await fs.copy(legoPath, backupPath);
    console.log(`${colors.gray}  Backed up to: ${path.basename(backupPath)}${colors.reset}`);
    return backupPath;
  }

  return null;
}

/**
 * Generate LEGOs using Task agent (simulated - would call actual agent)
 */
async function generateLEGOs(coursePath) {
  const courseName = path.basename(coursePath);

  console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Phase 3: LEGO Generation${colors.reset}`);
  console.log(`${colors.cyan}Course: ${courseName}${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  // NOTE: In production, this would launch the Task agent
  // For now, this is a placeholder showing the structure

  console.log(`${colors.yellow}⚠️  Manual generation required${colors.reset}`);
  console.log(`${colors.gray}In production, this would automatically launch Task agent${colors.reset}`);
  console.log(`${colors.gray}For now, ensure LEGO_BREAKDOWNS_COMPLETE.json exists${colors.reset}\n`);

  // Check if LEGO file exists
  const legoPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
  if (!await fs.pathExists(legoPath)) {
    throw new Error(`LEGO_BREAKDOWNS_COMPLETE.json not found in ${courseName}`);
  }

  console.log(`${colors.green}✓ Found LEGO_BREAKDOWNS_COMPLETE.json${colors.reset}\n`);

  return true;
}

/**
 * Run validation on course
 */
async function validateCourse(coursePath) {
  const courseName = path.basename(coursePath);

  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Phase 3.9: Quality Validation${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    const result = await runCommand(
      'node',
      ['validate-lego-breakdowns.cjs', courseName],
      { cwd: __dirname }
    );

    const validationResults = parseValidationResults(result.stdout);
    return validationResults;

  } catch (error) {
    console.error(`${colors.red}Validation failed: ${error.message}${colors.reset}`);
    return { critical: 999, high: 0, medium: 0, low: 0, passed: false, total: 999 };
  }
}

/**
 * Process single course with retries
 */
async function processCourseWithRetries(courseDir, maxAttempts = 3) {
  const coursePath = path.resolve(courseDir);
  const courseName = path.basename(coursePath);

  console.log(`\n${colors.magenta}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}Processing: ${courseName}${colors.reset}`);
  console.log(`${colors.magenta}Max Attempts: ${maxAttempts}${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(70)}${colors.reset}\n`);

  const attempts = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n${colors.blue}─── Attempt ${attempt} of ${maxAttempts} ───${colors.reset}\n`);

    // Backup existing LEGOs if not first attempt
    if (attempt > 1) {
      await backupLEGOFile(coursePath, attempt - 1);
    }

    // Generate LEGOs
    try {
      await generateLEGOs(coursePath);
    } catch (error) {
      console.error(`${colors.red}✗ Generation failed: ${error.message}${colors.reset}\n`);
      continue;
    }

    // Validate
    const validationResults = await validateCourse(coursePath);
    attempts.push({
      attempt,
      ...validationResults
    });

    // If passed, we're done
    if (validationResults.passed) {
      console.log(`\n${colors.green}✅ SUCCESS${colors.reset} - Validation passed on attempt ${attempt}\n`);
      return { success: true, attempts, finalAttempt: attempt };
    }

    // If not last attempt and has CRITICAL/HIGH issues, suggest retry
    if (attempt < maxAttempts && (validationResults.critical > 0 || validationResults.high > 0)) {
      console.log(`\n${colors.yellow}⚠️  Attempt ${attempt} has ${validationResults.critical} CRITICAL and ${validationResults.high} HIGH issues${colors.reset}`);
      console.log(`${colors.yellow}Proceeding to attempt ${attempt + 1}...${colors.reset}\n`);
    }
  }

  // All attempts exhausted
  console.log(`\n${colors.red}❌ FAILED${colors.reset} - All ${maxAttempts} attempts completed`);
  console.log(`${colors.yellow}Choose best attempt manually or regenerate with improved prompt${colors.reset}\n`);

  // Show comparison
  console.log(`${colors.cyan}Attempt Comparison:${colors.reset}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`Attempt  | Critical | High | Medium | Low | Total | Status`);
  console.log(`${'─'.repeat(70)}`);

  for (const att of attempts) {
    const status = att.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`   ${att.attempt}     |    ${att.critical}     |  ${att.high}   |   ${att.medium}    | ${att.low}  |  ${att.total}  | ${status}`);
  }
  console.log(`${'─'.repeat(70)}\n`);

  // Find best attempt (fewest CRITICAL, then HIGH, then total)
  const best = attempts.reduce((best, curr) => {
    if (curr.critical < best.critical) return curr;
    if (curr.critical === best.critical && curr.high < best.high) return curr;
    if (curr.critical === best.critical && curr.high === best.high && curr.total < best.total) return curr;
    return best;
  });

  console.log(`${colors.cyan}Recommendation: Use attempt ${best.attempt}${colors.reset}`);
  console.log(`${colors.gray}  (Fewest CRITICAL: ${best.critical}, HIGH: ${best.high}, Total: ${best.total})${colors.reset}\n`);

  return { success: false, attempts, finalAttempt: maxAttempts, bestAttempt: best.attempt };
}

/**
 * Process all courses
 */
async function processAllCourses(maxAttempts) {
  const coursesDir = path.resolve(__dirname);
  const entries = await fs.readdir(coursesDir);

  const results = [];

  for (const entry of entries) {
    const entryPath = path.join(coursesDir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory() && entry.includes('_for_')) {
      const result = await processCourseWithRetries(entryPath, maxAttempts);
      results.push({ course: entry, ...result });
    }
  }

  // Overall summary
  console.log(`\n${colors.magenta}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}MULTI-COURSE PROCESSING SUMMARY${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(70)}${colors.reset}\n`);

  for (const result of results) {
    const status = result.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status}  ${result.course} (${result.finalAttempt} attempts)`);
  }

  console.log();
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log(`  node process-phase-3-with-validation.cjs <course_dir> [--max-attempts=N]`);
    console.log(`  node process-phase-3-with-validation.cjs spa_for_eng_30seeds`);
    console.log(`  node process-phase-3-with-validation.cjs spa_for_eng_30seeds --max-attempts=3`);
    console.log(`  node process-phase-3-with-validation.cjs --all\n`);
    console.log(`${colors.gray}Options:${colors.reset}`);
    console.log(`  --max-attempts=N    Maximum generation attempts (default: 3)`);
    console.log(`  --all               Process all courses\n`);
    process.exit(1);
  }

  // Parse options
  let maxAttempts = 3;
  let courseDir = null;
  let processAll = false;

  for (const arg of args) {
    if (arg.startsWith('--max-attempts=')) {
      maxAttempts = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--all') {
      processAll = true;
    } else {
      courseDir = arg;
    }
  }

  if (processAll) {
    await processAllCourses(maxAttempts);
  } else if (courseDir) {
    const result = await processCourseWithRetries(courseDir, maxAttempts);
    if (!result.success) {
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}Error: Must specify course directory or --all${colors.reset}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});

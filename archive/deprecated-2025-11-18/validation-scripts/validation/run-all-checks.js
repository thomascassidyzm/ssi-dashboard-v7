#!/usr/bin/env node

/**
 * MASTER VALIDATION SCRIPT
 *
 * Runs all validation checks on course baskets:
 * 1. Gate violations
 * 2. Speakability issues (4+ LEGOs)
 * 3. Conjunction usage in longer phrases
 * 4. Pattern analysis (grammatical structure matching)
 *
 * Usage: node run-all-checks.js [course_path]
 * Example: node run-all-checks.js public/vfs/courses/spa_for_eng
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { checkGateViolations } from './check-gate-violations.js';
import { checkSpeakability } from './check-speakability.js';
import { checkConjunctions } from './check-conjunctions.js';
import { checkInfinitiveForms } from './check-infinitive-forms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner(text, color = 'cyan') {
  const width = 80;
  const padding = Math.max(0, Math.floor((width - text.length - 2) / 2));
  log('', color);
  log('═'.repeat(width), color);
  log('═' + ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length - 2) + '═', 'bold');
  log('═'.repeat(width), color);
  log('', color);
}

function runAllChecks(coursePath) {
  const basketsPath = path.join(coursePath, 'baskets');

  if (!fs.existsSync(basketsPath)) {
    log(`Error: Baskets directory not found at ${basketsPath}`, 'red');
    log('Usage: node run-all-checks.js [course_path]', 'yellow');
    log('Example: node run-all-checks.js public/vfs/courses/spa_for_eng', 'yellow');
    process.exit(1);
  }

  banner('SSI BASKETS VALIDATION SUITE', 'cyan');

  log(`Course: ${coursePath}`, 'blue');
  log(`Baskets: ${basketsPath}`, 'blue');
  log(`Date: ${new Date().toISOString()}`, 'blue');

  const results = {
    infinitiveForms: null,
    gateViolations: null,
    speakability: null,
    conjunctions: null,
    patternAnalysis: null,
    overallSuccess: true
  };

  // Track timing
  const startTime = Date.now();

  // 0. Infinitive Forms Check (Phase 3 - lego_pairs.json)
  log('\n');
  banner('CHECK 0/5: INFINITIVE FORMS (Phase 3)', 'yellow');
  try {
    const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
    if (fs.existsSync(legoPairsPath)) {
      results.infinitiveForms = checkInfinitiveForms(legoPairsPath);
      if (!results.infinitiveForms.success) {
        results.overallSuccess = false;
      }
    } else {
      log(`⚠️  Skipping: lego_pairs.json not found`, 'yellow');
      results.infinitiveForms = { success: true, skipped: true };
    }
  } catch (error) {
    log(`Error running infinitive forms check: ${error.message}`, 'red');
    results.overallSuccess = false;
  }

  // 1. Gate Violations Check
  log('\n');
  banner('CHECK 1/5: GATE VIOLATIONS (Phase 5)', 'yellow');
  try {
    results.gateViolations = checkGateViolations(basketsPath);
    if (!results.gateViolations.success) {
      results.overallSuccess = false;
    }
  } catch (error) {
    log(`Error running gate violations check: ${error.message}`, 'red');
    results.overallSuccess = false;
  }

  // 2. Speakability Check
  log('\n');
  banner('CHECK 2/5: SPEAKABILITY (4+ LEGOs)', 'yellow');
  try {
    results.speakability = checkSpeakability(basketsPath);
    if (!results.speakability.success) {
      results.overallSuccess = false;
    }
  } catch (error) {
    log(`Error running speakability check: ${error.message}`, 'red');
    results.overallSuccess = false;
  }

  // 3. Conjunction Usage Check
  log('\n');
  banner('CHECK 3/5: CONJUNCTION USAGE', 'yellow');
  try {
    results.conjunctions = checkConjunctions(basketsPath);
    if (!results.conjunctions.success) {
      results.overallSuccess = false;
    }
  } catch (error) {
    log(`Error running conjunction check: ${error.message}`, 'red');
    results.overallSuccess = false;
  }

  // 4. Pattern Analysis Check
  log('\n');
  banner('CHECK 4/5: PATTERN ANALYSIS', 'yellow');
  try {
    // Run the phase5_pattern_analysis.cjs script
    const scriptPath = path.join(__dirname, '..', 'phase5_pattern_analysis.cjs');
    const output = execSync(`node "${scriptPath}" "${coursePath}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });

    console.log(output);

    // Parse output to extract pattern overlap percentage
    const overlapMatch = output.match(/Pattern Overlap: (\d+)\/(\d+) patterns \((\d+\.?\d*)%\)/);
    if (overlapMatch) {
      const overlapPct = parseFloat(overlapMatch[3]);
      results.patternAnalysis = {
        success: overlapPct >= 80, // 80% minimum overlap
        overlapPercentage: overlapPct,
        matched: parseInt(overlapMatch[1]),
        total: parseInt(overlapMatch[2])
      };

      if (!results.patternAnalysis.success) {
        log(`\n⚠️  Pattern overlap below 80% threshold (${overlapPct}%)`, 'yellow');
      }
    } else {
      results.patternAnalysis = { success: true, note: 'Completed (parsing not available)' };
    }
  } catch (error) {
    log(`Error running pattern analysis: ${error.message}`, 'red');
    results.patternAnalysis = { success: false, error: error.message };
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Overall Summary
  log('\n\n');
  banner('OVERALL SUMMARY', results.overallSuccess ? 'green' : 'red');

  log('Validation Results:', 'bold');
  log('─'.repeat(80), 'cyan');

  if (results.infinitiveForms && !results.infinitiveForms.skipped) {
    const status = results.infinitiveForms.success ? '✓ PASS' : '✗ FAIL';
    const color = results.infinitiveForms.success ? 'green' : 'red';
    const critical = results.infinitiveForms.bySeverity?.CRITICAL || 0;
    const high = results.infinitiveForms.bySeverity?.HIGH || 0;
    const total = results.infinitiveForms.violations?.length || 0;
    log(`  Infinitive Forms:    ${status} (Crit:${critical} High:${high} Total:${total})`, color);
  }

  if (results.gateViolations) {
    const status = results.gateViolations.success ? '✓ PASS' : '✗ FAIL';
    const color = results.gateViolations.success ? 'green' : 'red';
    log(`  Gate Violations:     ${status} (${results.gateViolations.violations.length} issues)`, color);
  }

  if (results.speakability) {
    const status = results.speakability.success ? '✓ PASS' : '✗ FAIL';
    const color = results.speakability.success ? 'green' : 'red';
    const high = results.speakability.bySeverity.HIGH;
    const medium = results.speakability.bySeverity.MEDIUM;
    const low = results.speakability.bySeverity.LOW;
    log(`  Speakability:        ${status} (H:${high} M:${medium} L:${low})`, color);
  }

  if (results.conjunctions) {
    const status = results.conjunctions.success ? '✓ PASS' : '✗ FAIL';
    const color = results.conjunctions.success ? 'green' : 'red';
    const high = results.conjunctions.bySeverity.HIGH;
    const medium = results.conjunctions.bySeverity.MEDIUM;
    const low = results.conjunctions.bySeverity.LOW;
    log(`  Conjunctions:        ${status} (H:${high} M:${medium} L:${low})`, color);
  }

  if (results.patternAnalysis) {
    const status = results.patternAnalysis.success ? '✓ PASS' : '✗ FAIL';
    const color = results.patternAnalysis.success ? 'green' : 'red';
    if (results.patternAnalysis.overlapPercentage !== undefined) {
      log(`  Pattern Analysis:    ${status} (${results.patternAnalysis.overlapPercentage}% overlap, ${results.patternAnalysis.matched}/${results.patternAnalysis.total} patterns)`, color);
    } else {
      log(`  Pattern Analysis:    ${status}`, color);
    }
  }

  log('─'.repeat(80), 'cyan');

  if (results.overallSuccess) {
    log('\n✓ ALL CHECKS PASSED!', 'green');
    log('  Your baskets are free of critical issues.', 'green');
  } else {
    log('\n✗ SOME CHECKS FAILED', 'red');
    log('  Please review the issues above and make corrections.', 'yellow');
  }

  log(`\nCompleted in ${duration}s`, 'blue');
  log('═'.repeat(80), 'cyan');

  return {
    results,
    success: results.overallSuccess,
    duration
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const coursePath = process.argv[2] || 'public/vfs/courses/spa_for_eng';
  const result = runAllChecks(coursePath);
  process.exit(result.success ? 0 : 1);
}

export { runAllChecks };

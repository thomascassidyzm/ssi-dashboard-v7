#!/usr/bin/env node

/**
 * Test Script for Regeneration & Quality System
 *
 * Demonstrates the complete self-healing workflow:
 * 1. Quality analysis
 * 2. Targeted regeneration
 * 3. Attempt tracking
 * 4. Prompt evolution
 *
 * Usage: node test-regeneration-system.js [courseCode]
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3456/api';
const courseCode = process.argv[2] || 'mkd_for_eng_574seeds';

// Helper to make colored console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
}

// API Helper
async function api(method, path, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${path}`,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.data = data;

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.data.error || error.message}`);
    }
    throw error;
  }
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// TEST 1: Quality Analysis
// ============================================================================

async function test1_qualityAnalysis() {
  section('TEST 1: Quality Analysis');

  log('Fetching quality report...', 'cyan');
  const report = await api('GET', `/courses/${courseCode}/quality`);

  log(`\nCourse: ${report.course_code}`, 'bright');
  log(`Total Seeds: ${report.total_seeds}`);
  log(`Average Quality: ${report.avg_quality}/100`);

  log('\nQuality Distribution:', 'yellow');
  log(`  Excellent (90-100): ${report.quality_distribution.excellent}`, 'green');
  log(`  Good (70-89):       ${report.quality_distribution.good}`, 'green');
  log(`  Poor (50-69):       ${report.quality_distribution.poor}`, 'yellow');
  log(`  Critical (0-49):    ${report.quality_distribution.critical}`, 'red');

  log('\nAttempt Summary:', 'yellow');
  log(`  Total Attempts: ${report.attempt_summary.total_attempts}`);
  log(`  Avg Attempts/Seed: ${report.attempt_summary.avg_attempts_per_seed}`);
  log(`  Seeds with Multiple Attempts: ${report.attempt_summary.seeds_with_multiple_attempts}`);

  if (report.flagged_seeds.length > 0) {
    log(`\nFlagged Seeds (${report.flagged_seeds.length}):`, 'red');
    report.flagged_seeds.slice(0, 5).forEach(seed => {
      log(`  ${seed.seed_id}: Score ${seed.quality_score}, ${seed.attempts} attempts`);
      seed.issues.forEach(issue => {
        log(`    - ${issue.type}: ${issue.message || issue.lego || ''}`, 'red');
      });
    });
    if (report.flagged_seeds.length > 5) {
      log(`  ... and ${report.flagged_seeds.length - 5} more`, 'yellow');
    }
  } else {
    log('\nNo flagged seeds - all quality looks good!', 'green');
  }

  return report;
}

// ============================================================================
// TEST 2: Detailed Seed Review
// ============================================================================

async function test2_seedReview(seedId) {
  section(`TEST 2: Detailed Seed Review - ${seedId}`);

  log('Fetching seed review...', 'cyan');
  const review = await api('GET', `/courses/${courseCode}/seeds/${seedId}/review`);

  log(`\nSeed: ${review.seed_id}`, 'bright');
  log(`Status: ${review.status}`);
  log(`Total Attempts: ${review.total_attempts}`);
  log(`Current Quality Score: ${review.quality.composite_score}/100`);

  log('\nTranslation:', 'yellow');
  log(`  Source: ${review.translation.source}`);
  log(`  Target: ${review.translation.target}`);

  log('\nQuality Details:', 'yellow');
  log(`  IRON RULE Compliance: ${review.quality.details.iron_rule_compliance}/100`);
  log(`  LEGO Count: ${review.quality.details.lego_count}`);
  log(`  Avg LEGO Quality: ${review.quality.details.avg_lego_quality}/100`);

  if (review.quality.details.issues.length > 0) {
    log('\nIssues:', 'red');
    review.quality.details.issues.forEach(issue => {
      log(`  - ${issue.type}: ${issue.message || issue.lego || ''}`, 'red');
    });
  } else {
    log('\nNo issues detected!', 'green');
  }

  if (review.legos.length > 0) {
    log(`\nLEGOs (${review.legos.length}):`, 'yellow');
    review.legos.forEach(lego => {
      const status = lego.metadata.iron_rule_compliant ? '✓' : '✗';
      log(`  ${status} ${lego.provenance}: "${lego.text}"`);
    });
  }

  if (review.attempts.length > 1) {
    log('\nAttempt History:', 'yellow');
    review.attempts.forEach(attempt => {
      const current = attempt.status === 'current' ? ' (CURRENT)' : '';
      log(`  Attempt ${attempt.attempt_number}${current}:`);
      log(`    Quality: ${attempt.quality_score}/100`);
      log(`    LEGOs: ${attempt.lego_count}`);
      log(`    Time: ${attempt.timestamp}`);
    });
  }

  return review;
}

// ============================================================================
// TEST 3: Regeneration
// ============================================================================

async function test3_regeneration(seedIds, reason = 'test_regeneration') {
  section(`TEST 3: Regeneration - ${seedIds.length} seeds`);

  log(`Triggering regeneration for: ${seedIds.join(', ')}`, 'cyan');
  log(`Reason: ${reason}\n`);

  const job = await api('POST', `/courses/${courseCode}/seeds/regenerate`, {
    seed_ids: seedIds,
    reason: reason,
    prompt_version: 'v1.0'
  });

  log('Regeneration job started!', 'green');
  log(`Job ID: ${job.job.jobId}`, 'bright');
  log(`Status: ${job.job.status}`);

  log('\nNote: Agent spawned in Terminal. Complete the task there.', 'yellow');
  log('This test will poll for completion (or you can manually check).', 'yellow');

  return job.job;
}

// ============================================================================
// TEST 4: Job Status Polling
// ============================================================================

async function test4_pollJob(jobId, maxAttempts = 10) {
  section(`TEST 4: Job Status Polling - ${jobId}`);

  log('Polling job status...', 'cyan');

  for (let i = 1; i <= maxAttempts; i++) {
    const status = await api('GET', `/courses/${courseCode}/regeneration/${jobId}`);

    const elapsed = Math.round(status.elapsed / 1000);
    log(`\nAttempt ${i}/${maxAttempts} (${elapsed}s elapsed):`);
    log(`  Status: ${status.job.status}`);

    if (status.job.status === 'completed') {
      log('\nJob completed!', 'green');
      return status;
    } else if (status.job.status === 'failed') {
      log('\nJob failed!', 'red');
      return status;
    }

    if (i < maxAttempts) {
      await sleep(3000);
    }
  }

  log('\nPolling limit reached. Job still in progress.', 'yellow');
  log('Check status manually with:', 'yellow');
  log(`  curl ${API_BASE}/courses/${courseCode}/regeneration/${jobId}`, 'cyan');

  return null;
}

// ============================================================================
// TEST 5: Accept/Exclude Seeds
// ============================================================================

async function test5_acceptSeed(seedId) {
  section(`TEST 5: Accept Seed - ${seedId}`);

  log('Marking seed as accepted...', 'cyan');
  const result = await api('POST', `/courses/${courseCode}/seeds/${seedId}/accept`);

  log('Seed accepted!', 'green');
  log(`Status: ${result.translation.metadata.status}`);
  log(`Accepted at: ${result.translation.metadata.accepted_at}`);

  return result;
}

async function test5_excludeSeed(seedId, reason = 'test_exclusion') {
  section(`TEST 5: Exclude Seed - ${seedId}`);

  log(`Marking seed as excluded (reason: ${reason})...`, 'cyan');
  const result = await api('DELETE', `/courses/${courseCode}/seeds/${seedId}`, {
    reason
  });

  log('Seed excluded!', 'yellow');
  log(`Status: ${result.translation.metadata.status}`);
  log(`Excluded at: ${result.translation.metadata.excluded_at}`);

  return result;
}

// ============================================================================
// TEST 6: Prompt Evolution
// ============================================================================

async function test6_promptEvolution() {
  section('TEST 6: Prompt Evolution');

  log('Fetching prompt evolution data...', 'cyan');
  const evolution = await api('GET', `/courses/${courseCode}/prompt-evolution`);

  log(`\nCourse: ${evolution.course_code}`, 'bright');
  log(`Versions: ${evolution.versions.length}`);

  log('\nPrompt Versions:', 'yellow');
  evolution.versions.forEach(version => {
    const status = version.status === 'active' ? ' (ACTIVE)' : '';
    log(`  ${version.version}${status}`);
    log(`    Created: ${version.created_at}`);
    log(`    Rules: ${version.rules.length}`);
    if (version.success_rate !== null) {
      log(`    Success Rate: ${(version.success_rate * 100).toFixed(1)}%`);
    }
  });

  if (evolution.learned_rules.length > 0) {
    log('\nLearned Rules:', 'green');
    evolution.learned_rules.forEach(rule => {
      log(`  - ${rule.rule}`);
      log(`    Success Rate: ${(rule.success_rate * 100).toFixed(1)}%`);
      log(`    Status: ${rule.status}`);
    });
  }

  if (evolution.experimental_rules.length > 0) {
    log('\nExperimental Rules:', 'yellow');
    evolution.experimental_rules.forEach(rule => {
      log(`  - ${rule.rule}`);
      log(`    Success Rate: ${(rule.success_rate * 100).toFixed(1)}%`);
    });
  }

  return evolution;
}

// ============================================================================
// TEST 7: Experimental Rule Testing
// ============================================================================

async function test7_experimentalRule() {
  section('TEST 7: Experimental Rule Testing');

  const rule = 'Avoid splitting phrasal verbs across LEGO boundaries';
  const testSeeds = ['C0001', 'C0002', 'C0003']; // Adjust to actual seeds

  log(`Testing rule: "${rule}"`, 'cyan');
  log(`Test seeds: ${testSeeds.join(', ')}\n`);

  try {
    const experiment = await api('POST', `/courses/${courseCode}/experimental-rules`, {
      rule,
      test_seed_ids: testSeeds,
      description: 'Test if phrasal verbs should be kept together'
    });

    log('Experiment started!', 'green');
    log(`Version: ${experiment.experiment.version}`, 'bright');
    log(`Job ID: ${experiment.experiment.jobId}`);

    log('\nNote: Agent spawned in Terminal. Complete the task there.', 'yellow');

    return experiment;
  } catch (error) {
    log('Experiment failed to start:', 'red');
    log(error.message, 'red');
    return null;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.clear();
  log('╔════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║         SSi Regeneration & Quality System - Test Suite            ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════╝', 'bright');

  log(`\nCourse Code: ${courseCode}`, 'cyan');
  log(`API Base: ${API_BASE}`, 'cyan');

  try {
    // Test 1: Quality Analysis
    const report = await test1_qualityAnalysis();

    // Test 2: Detailed Seed Review (if flagged seeds exist)
    if (report.flagged_seeds.length > 0) {
      const firstFlagged = report.flagged_seeds[0].seed_id;
      await test2_seedReview(firstFlagged);
    }

    // Test 3: Regeneration (optional - uncomment to test)
    // Uncomment these lines to test regeneration:
    /*
    const seedsToRegen = report.flagged_seeds.slice(0, 2).map(s => s.seed_id);
    if (seedsToRegen.length > 0) {
      const job = await test3_regeneration(seedsToRegen, 'automated_test');

      // Test 4: Poll job status
      await test4_pollJob(job.jobId, 5);
    }
    */

    // Test 5: Accept/Exclude (optional - uncomment to test)
    // Note: These will modify your course data
    /*
    if (report.flagged_seeds.length > 0) {
      const testSeed = report.flagged_seeds[0].seed_id;
      await test5_acceptSeed(testSeed);
    }
    */

    // Test 6: Prompt Evolution
    await test6_promptEvolution();

    // Test 7: Experimental Rule (optional - uncomment to test)
    // await test7_experimentalRule();

    section('TEST SUITE COMPLETE');
    log('All tests passed!', 'green');
    log('\nNote: Some tests are commented out to prevent data modification.', 'yellow');
    log('Uncomment sections in runTests() to test regeneration/accept/exclude.', 'yellow');

  } catch (error) {
    section('TEST SUITE FAILED');
    log('Error:', 'red');
    log(error.message, 'red');

    if (error.message.includes('ECONNREFUSED')) {
      log('\nIs the automation server running?', 'yellow');
      log('Start it with: node automation_server.cjs', 'cyan');
    }

    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };

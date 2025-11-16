#!/usr/bin/env node

/**
 * Orchestrator Pipeline Integration Test
 *
 * Tests the three new pipeline endpoints:
 * 1. POST /api/courses/:courseCode/phase/3/validate
 * 2. GET /api/courses/:courseCode/baskets/gaps
 * 3. POST /api/courses/:courseCode/baskets/cleanup
 *
 * Usage: node tests/orchestrator-pipeline.test.js
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const TEST_COURSE = process.env.TEST_COURSE || 'spa_for_eng';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    debug: colors.gray
  };
  const color = levelColors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

async function testLutCheckEndpoint() {
  log('info', '🧪 Testing LUT Check Endpoint...');
  log('info', `   POST ${BASE_URL}/api/courses/${TEST_COURSE}/phase/3/validate`);

  try {
    const response = await axios.post(
      `${BASE_URL}/api/courses/${TEST_COURSE}/phase/3/validate`
    );

    log('success', '   ✅ LUT check endpoint responded');
    log('info', `   Status: ${response.data.status}`);
    log('info', `   Collisions: ${response.data.collisions}`);

    if (response.data.status === 'pass') {
      log('success', '   ✅ No violations detected');
      return { passed: true, hasViolations: false };
    } else if (response.data.status === 'fail') {
      log('warn', '   ⚠️  Violations detected (expected for courses with collisions)');
      log('info', `   Re-extraction needed: ${response.data.reextractionNeeded}`);

      if (response.data.report) {
        log('info', `   Violations in report: ${response.data.report.violation_count || response.data.report.violations?.length || 0}`);
      }

      if (response.data.manifest) {
        log('info', `   Affected seeds: ${response.data.manifest.affected_seeds?.length || 0}`);
      }

      return { passed: true, hasViolations: true };
    } else {
      log('error', `   ❌ Unexpected status: ${response.data.status}`);
      return { passed: false, hasViolations: false };
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log('warn', '   ⚠️  lego_pairs.json not found - course may not have Phase 3 data');
      return { passed: true, hasViolations: false, skipped: true };
    }

    log('error', `   ❌ LUT check failed: ${error.message}`);
    if (error.response) {
      log('error', `   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { passed: false, hasViolations: false };
  }
}

async function testBasketGapAnalysis() {
  log('info', '🧪 Testing Basket Gap Analysis Endpoint...');
  log('info', `   GET ${BASE_URL}/api/courses/${TEST_COURSE}/baskets/gaps`);

  try {
    const response = await axios.get(
      `${BASE_URL}/api/courses/${TEST_COURSE}/baskets/gaps`
    );

    log('success', '   ✅ Gap analysis endpoint responded');
    log('info', `   Total LEGOs: ${response.data.total_legos}`);
    log('info', `   Existing baskets: ${response.data.existing_baskets}`);
    log('info', `   Coverage: ${response.data.coverage_percentage}%`);

    const analysis = response.data.analysis;
    log('info', `   Baskets to keep: ${analysis.baskets_to_keep}`);
    log('info', `   Baskets to delete: ${analysis.baskets_to_delete}`);
    log('info', `   Baskets missing: ${analysis.baskets_missing}`);

    if (analysis.baskets_to_delete > 0) {
      log('warn', `   ⚠️  Found ${analysis.baskets_to_delete} basket(s) to delete`);
    }

    if (analysis.baskets_missing > 0) {
      log('warn', `   ⚠️  Found ${analysis.baskets_missing} missing basket(s)`);
    }

    // Verify response structure
    const requiredFields = [
      'course_code',
      'timestamp',
      'total_legos',
      'existing_baskets',
      'coverage_percentage',
      'analysis',
      'baskets_to_keep',
      'baskets_to_delete',
      'baskets_missing',
      'next_steps'
    ];

    for (const field of requiredFields) {
      if (!(field in response.data)) {
        log('error', `   ❌ Missing required field: ${field}`);
        return { passed: false };
      }
    }

    log('success', '   ✅ Response structure valid');

    return {
      passed: true,
      basketsToDelete: response.data.baskets_to_delete,
      analysis: response.data.analysis
    };
  } catch (error) {
    if (error.response?.status === 404) {
      log('warn', '   ⚠️  lego_pairs.json not found - course may not have Phase 3 data');
      return { passed: true, skipped: true };
    }

    log('error', `   ❌ Gap analysis failed: ${error.message}`);
    if (error.response) {
      log('error', `   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { passed: false };
  }
}

async function testBasketCleanup(basketsToDelete) {
  log('info', '🧪 Testing Basket Cleanup Endpoint...');
  log('info', `   POST ${BASE_URL}/api/courses/${TEST_COURSE}/baskets/cleanup`);

  // Test with empty array (should be no-op)
  try {
    const emptyResponse = await axios.post(
      `${BASE_URL}/api/courses/${TEST_COURSE}/baskets/cleanup`,
      { basketIdsToDelete: [] }
    );

    log('success', '   ✅ Empty array handled correctly');
    log('info', `   Message: ${emptyResponse.data.message}`);
  } catch (error) {
    log('error', `   ❌ Empty array test failed: ${error.message}`);
    return { passed: false };
  }

  // Test with missing parameter (should return 400)
  try {
    await axios.post(
      `${BASE_URL}/api/courses/${TEST_COURSE}/baskets/cleanup`,
      {}
    );

    log('error', '   ❌ Missing parameter should return 400');
    return { passed: false };
  } catch (error) {
    if (error.response?.status === 400) {
      log('success', '   ✅ Missing parameter validation works');
    } else {
      log('error', `   ❌ Unexpected error: ${error.message}`);
      return { passed: false };
    }
  }

  // Test with actual basket deletion (only if we have baskets to delete)
  if (basketsToDelete && basketsToDelete.length > 0) {
    const testBasketId = basketsToDelete[0];
    log('warn', `   ⚠️  Skipping actual deletion test to preserve data`);
    log('info', `   Would delete: ${testBasketId}`);

    // Instead, test with a non-existent basket ID
    try {
      const response = await axios.post(
        `${BASE_URL}/api/courses/${TEST_COURSE}/baskets/cleanup`,
        { basketIdsToDelete: ['NONEXISTENT_BASKET_ID'] }
      );

      log('success', '   ✅ Non-existent basket handled correctly');
      log('info', `   Deleted: ${response.data.deleted}`);
      log('info', `   Not found: ${response.data.notFound}`);

      if (response.data.notFound !== 1) {
        log('error', '   ❌ Expected notFound=1 for non-existent basket');
        return { passed: false };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('warn', '   ⚠️  lego_baskets.json not found - course may not have Phase 5 data');
        return { passed: true, skipped: true };
      }

      log('error', `   ❌ Cleanup test failed: ${error.message}`);
      return { passed: false };
    }
  }

  log('success', '   ✅ Cleanup endpoint tests passed');
  return { passed: true };
}

async function testWorkflowIntegration() {
  log('info', '🧪 Testing Automated Workflow Integration...');

  // Check if workflow files are generated
  const vfsPath = path.join(__dirname, '../public/vfs/courses', TEST_COURSE);

  const workflowFiles = [
    'lego_pairs_fd_report.json',
    'basket_gaps_report.json',
    'reextraction_task_list.json'
  ];

  let filesFound = 0;

  for (const file of workflowFiles) {
    const filePath = path.join(vfsPath, file);
    if (await fs.pathExists(filePath)) {
      log('success', `   ✅ Found: ${file}`);
      filesFound++;
    } else {
      log('info', `   ℹ️  Not found: ${file} (expected if no violations)`);
    }
  }

  if (filesFound === 0) {
    log('info', '   ℹ️  No workflow files found - course may not have violations');
  } else {
    log('success', `   ✅ Found ${filesFound}/${workflowFiles.length} workflow files`);
  }

  return { passed: true, filesFound };
}

async function runTests() {
  console.log('');
  log('info', '================================================');
  log('info', 'Orchestrator Pipeline Integration Tests');
  log('info', '================================================');
  log('info', `Base URL: ${BASE_URL}`);
  log('info', `Test Course: ${TEST_COURSE}`);
  log('info', '');

  const results = {
    lutCheck: null,
    gapAnalysis: null,
    cleanup: null,
    workflow: null
  };

  // Test 1: LUT Check
  results.lutCheck = await testLutCheckEndpoint();
  console.log('');

  // Test 2: Basket Gap Analysis
  results.gapAnalysis = await testBasketGapAnalysis();
  console.log('');

  // Test 3: Basket Cleanup
  results.cleanup = await testBasketCleanup(
    results.gapAnalysis?.basketsToDelete || []
  );
  console.log('');

  // Test 4: Workflow Integration
  results.workflow = await testWorkflowIntegration();
  console.log('');

  // Summary
  log('info', '================================================');
  log('info', 'Test Summary');
  log('info', '================================================');

  const tests = [
    { name: 'LUT Check Endpoint', result: results.lutCheck },
    { name: 'Basket Gap Analysis Endpoint', result: results.gapAnalysis },
    { name: 'Basket Cleanup Endpoint', result: results.cleanup },
    { name: 'Workflow Integration', result: results.workflow }
  ];

  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const test of tests) {
    const status = test.result?.skipped
      ? '⏭️  SKIPPED'
      : test.result?.passed
      ? '✅ PASSED'
      : '❌ FAILED';

    const color = test.result?.skipped
      ? colors.yellow
      : test.result?.passed
      ? colors.green
      : colors.red;

    console.log(`${color}${status}${colors.reset} - ${test.name}`);

    if (test.result?.skipped) {
      skippedCount++;
    } else if (test.result?.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('');
  log('info', `Total: ${tests.length} tests`);
  log('success', `Passed: ${passedCount}`);
  log('error', `Failed: ${failedCount}`);
  log('warn', `Skipped: ${skippedCount}`);
  console.log('');

  if (failedCount > 0) {
    log('error', '❌ Some tests failed');
    process.exit(1);
  } else if (skippedCount === tests.length) {
    log('warn', '⚠️  All tests skipped - course may not have required data');
    log('info', 'Run Phase 3 first to generate lego_pairs.json');
    process.exit(0);
  } else {
    log('success', '✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log('error', `Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Safari Tab Spawning Test Script
 *
 * Purpose: Diagnose why spawning multiple Safari tabs results in:
 *   - First tabs: wrong URL (e.g., claude.com/product/claude-code)
 *   - Last tab: correct URL (e.g., claude.ai/code)
 *
 * This script tests different osascript approaches with various delays
 * to understand Safari's tab spawning behavior.
 *
 * Usage: node scripts/experiments/safari-spawn-test.js
 *
 * SAFE TO RUN: Uses httpbin.org test URLs (no side effects)
 */

const { execSync, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Test configuration
const TEST_URLS = [
  'https://httpbin.org/get?tab=1&ts=' + Date.now(),
  'https://httpbin.org/get?tab=2&ts=' + Date.now(),
  'https://httpbin.org/get?tab=3&ts=' + Date.now(),
];

const DELAYS = {
  short: 500,
  medium: 1000,
  long: 2000,
};

// Utility: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Log with timestamp
const log = (msg) => {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
};

// Utility: Run osascript and measure time
async function runOsascript(script, description) {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    const elapsed = Date.now() - start;
    log(`  SUCCESS (${elapsed}ms): ${description}`);
    if (stdout.trim()) log(`    stdout: ${stdout.trim()}`);
    if (stderr.trim()) log(`    stderr: ${stderr.trim()}`);
    return { success: true, elapsed, stdout, stderr };
  } catch (error) {
    const elapsed = Date.now() - start;
    log(`  FAILED (${elapsed}ms): ${description}`);
    log(`    error: ${error.message}`);
    return { success: false, elapsed, error };
  }
}

// ============================================================================
// APPROACH 1: Direct URL opening with "open location"
// ============================================================================
async function testApproach1_OpenLocation(url, delay) {
  const script = `
    tell application "Safari"
      activate
      open location "${url}"
    end tell
  `;
  return runOsascript(script, `open location "${url}"`);
}

// ============================================================================
// APPROACH 2: Create new tab, then set URL
// ============================================================================
async function testApproach2_NewTabThenNavigate(url, delay) {
  const script = `
    tell application "Safari"
      activate
      tell front window
        set newTab to make new tab
        set URL of newTab to "${url}"
      end tell
    end tell
  `;
  return runOsascript(script, `new tab then set URL to "${url}"`);
}

// ============================================================================
// APPROACH 3: Use "do shell script" with open command
// ============================================================================
async function testApproach3_ShellOpen(url, delay) {
  const script = `
    do shell script "open -a Safari '${url}'"
  `;
  return runOsascript(script, `shell open -a Safari "${url}"`);
}

// ============================================================================
// APPROACH 4: Create document with URL
// ============================================================================
async function testApproach4_MakeDocument(url, delay) {
  const script = `
    tell application "Safari"
      activate
      make new document with properties {URL:"${url}"}
    end tell
  `;
  return runOsascript(script, `make new document with URL "${url}"`);
}

// ============================================================================
// APPROACH 5: Two-step with delay - create tab, wait, then set URL
// ============================================================================
async function testApproach5_TwoStepWithDelay(url, delay) {
  // Step 1: Create the tab
  const createScript = `
    tell application "Safari"
      activate
      tell front window
        make new tab
      end tell
    end tell
  `;

  const createResult = await runOsascript(createScript, 'create empty tab');
  if (!createResult.success) return createResult;

  // Wait a bit
  await sleep(100);

  // Step 2: Set the URL on the current tab
  const setUrlScript = `
    tell application "Safari"
      set URL of current tab of front window to "${url}"
    end tell
  `;

  return runOsascript(setUrlScript, `set URL to "${url}"`);
}

// ============================================================================
// APPROACH 6: Using clipboard (sometimes more reliable for complex URLs)
// ============================================================================
async function testApproach6_Clipboard(url, delay) {
  // Set clipboard
  execSync(`echo '${url}' | pbcopy`);

  const script = `
    tell application "Safari"
      activate
      tell front window
        set newTab to make new tab
        set URL of newTab to (the clipboard)
      end tell
    end tell
  `;
  return runOsascript(script, `clipboard approach for "${url}"`);
}

// ============================================================================
// APPROACH 7: JavaScript execution in Safari
// ============================================================================
async function testApproach7_JavaScript(url, delay) {
  const script = `
    tell application "Safari"
      activate
      tell front window
        set newTab to make new tab
        do JavaScript "window.location.href = '${url}';" in newTab
      end tell
    end tell
  `;
  return runOsascript(script, `JavaScript navigation to "${url}"`);
}

// ============================================================================
// Test Runner
// ============================================================================
async function runTestSuite(approaches, delayMs, testName) {
  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUITE: ${testName} (delay: ${delayMs}ms between tabs)`);
  console.log('='.repeat(70));

  const results = [];

  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    log(`\nTab ${i + 1}: ${url}`);

    for (const [name, fn] of Object.entries(approaches)) {
      log(`  Testing approach: ${name}`);
      const result = await fn(url, delayMs);
      results.push({ tab: i + 1, approach: name, ...result });
    }

    if (i < TEST_URLS.length - 1) {
      log(`  Waiting ${delayMs}ms before next tab...`);
      await sleep(delayMs);
    }
  }

  return results;
}

// ============================================================================
// Individual Approach Test (for focused testing)
// ============================================================================
async function testSingleApproach(approachName, approachFn, delayMs) {
  console.log('\n' + '='.repeat(70));
  console.log(`SINGLE APPROACH TEST: ${approachName} (delay: ${delayMs}ms)`);
  console.log('='.repeat(70));

  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    log(`\nTab ${i + 1}: ${url}`);
    await approachFn(url, delayMs);

    if (i < TEST_URLS.length - 1) {
      log(`Waiting ${delayMs}ms before next tab...`);
      await sleep(delayMs);
    }
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('Safari Tab Spawning Diagnostic Test');
  console.log('====================================');
  console.log('');
  console.log('This script tests different methods of opening Safari tabs');
  console.log('to diagnose URL resolution issues.');
  console.log('');
  console.log('Test URLs (using httpbin.org for safety):');
  TEST_URLS.forEach((url, i) => console.log(`  Tab ${i + 1}: ${url}`));
  console.log('');

  // Check if Safari is running
  try {
    execSync('pgrep -x Safari', { stdio: 'pipe' });
    log('Safari is running');
  } catch {
    log('Safari is not running - will be launched');
  }

  // Define all approaches
  const allApproaches = {
    'open_location': testApproach1_OpenLocation,
    'new_tab_set_url': testApproach2_NewTabThenNavigate,
    'shell_open': testApproach3_ShellOpen,
    'make_document': testApproach4_MakeDocument,
    'two_step_delay': testApproach5_TwoStepWithDelay,
    'clipboard': testApproach6_Clipboard,
    'javascript': testApproach7_JavaScript,
  };

  // Parse command line arguments
  const args = process.argv.slice(2);
  const approach = args.find(a => a.startsWith('--approach='))?.split('=')[1];
  const delay = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1]) || DELAYS.medium;
  const listOnly = args.includes('--list');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log('Usage: node safari-spawn-test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --approach=NAME   Test only this approach (see --list)');
    console.log('  --delay=MS        Delay between tabs in milliseconds (default: 1000)');
    console.log('  --list            List available approaches');
    console.log('  --help, -h        Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node safari-spawn-test.js                    # Run all approaches with 1000ms delay');
    console.log('  node safari-spawn-test.js --delay=2000       # Run all with 2000ms delay');
    console.log('  node safari-spawn-test.js --approach=open_location --delay=500');
    return;
  }

  if (listOnly) {
    console.log('Available approaches:');
    Object.keys(allApproaches).forEach(name => console.log(`  ${name}`));
    return;
  }

  // Run tests
  if (approach) {
    if (!allApproaches[approach]) {
      console.error(`Unknown approach: ${approach}`);
      console.log('Use --list to see available approaches');
      process.exit(1);
    }
    await testSingleApproach(approach, allApproaches[approach], delay);
  } else {
    // Run each approach separately to avoid interference
    for (const [name, fn] of Object.entries(allApproaches)) {
      await testSingleApproach(name, fn, delay);

      // Pause between approach tests
      console.log('\n--- Pausing 3 seconds before next approach ---\n');
      await sleep(3000);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Next steps:');
  console.log('1. Check Safari tabs to see which URLs loaded correctly');
  console.log('2. Look for patterns in timing vs success');
  console.log('3. Try different --delay values if issues persist');
  console.log('4. Test specific approach with --approach=NAME');
}

main().catch(console.error);

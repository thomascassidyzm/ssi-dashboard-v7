#!/usr/bin/env node
/**
 * Audio Generation Preflight
 *
 * Unified preparation script that combines:
 * 1. S3 sync (canonical resources: voices.json, welcomes, encouragements)
 * 2. Preflight checks (with auto-fix where possible)
 * 3. Manifest deduplication
 *
 * Usage:
 *   node scripts/audio-gen-preflight.cjs <course_code> [options]
 *
 * Options:
 *   --skip-sync         Skip S3 sync step
 *   --skip-dedup        Skip deduplication step
 *   --no-auto-fix       Don't auto-fix issues (report only)
 *   --verbose           Show detailed output
 *   --quiet             Minimal output
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Import services
const preflightService = require('../services/preflight-check-service.cjs');
const { runDeduplication } = require('./manifest-deduplication.cjs');

// Paths
const CANONICAL_PATH = path.join(__dirname, '..', 'public', 'vfs', 'canonical');
const VFS_COURSES_PATH = path.join(__dirname, '..', 'public', 'vfs', 'courses');

/**
 * Run S3 sync to get canonical resources
 */
async function runS3Sync(options = {}) {
  const { verbose = true, quiet = false } = options;

  if (!quiet) {
    console.log('\n' + '='.repeat(60));
    console.log('Step 1: S3 Sync - Canonical Resources');
    console.log('='.repeat(60));
  }

  try {
    // Check if AWS CLI is available
    execSync('which aws', { stdio: 'ignore' });

    const cmd = 'aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/ --exclude ".DS_Store"';

    if (verbose) {
      console.log(`\nRunning: ${cmd}\n`);
    }

    const output = execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe'
    });

    // Check what files exist after sync
    const files = await fs.readdir(CANONICAL_PATH).catch(() => []);

    if (!quiet) {
      console.log('\n✅ S3 sync complete');
      if (verbose) {
        console.log(`   Files in canonical/: ${files.join(', ')}`);
      }
    }

    return {
      success: true,
      message: 'S3 sync completed',
      files
    };
  } catch (error) {
    if (error.message.includes('which aws')) {
      return {
        success: false,
        error: 'AWS CLI not installed',
        agentAction: 'Install AWS CLI: brew install awscli (macOS) or apt-get install awscli (Linux)'
      };
    }

    return {
      success: false,
      error: `S3 sync failed: ${error.message}`,
      agentAction: 'Check AWS credentials and network connection'
    };
  }
}

/**
 * Run all preflight checks
 */
async function runPreflight(courseCode, options = {}) {
  const { autoFix = true, verbose = true, quiet = false } = options;

  if (!quiet) {
    console.log('\n' + '='.repeat(60));
    console.log('Step 2: Preflight Checks');
    console.log('='.repeat(60));
  }

  const result = await preflightService.runPreflightChecks({
    courseCode,
    autoFix,
    verbose: verbose && !quiet
  });

  return {
    success: result.allPassed,
    passed: result.passed,
    failed: result.failed,
    fixed: result.fixed || [],
    agentActions: result.agentActions || [],
    unfixable: result.unfixable || []
  };
}

/**
 * Run manifest deduplication
 */
async function runDedup(courseCode, options = {}) {
  const { verbose = true, quiet = false } = options;

  if (!quiet) {
    console.log('\n' + '='.repeat(60));
    console.log('Step 3: Manifest Deduplication');
    console.log('='.repeat(60));
  }

  try {
    const result = await runDeduplication(courseCode, {
      verbose: verbose && !quiet,
      save: true
    });

    return {
      success: result.success,
      modified: result.modified,
      sampleCount: result.sampleCount,
      changes: result.changes || []
    };
  } catch (error) {
    return {
      success: false,
      error: `Deduplication failed: ${error.message}`
    };
  }
}

/**
 * Main preflight function
 * Can be called programmatically or via CLI
 */
async function runAudioGenPreflight(courseCode, options = {}) {
  const {
    skipSync = false,
    skipDedup = false,
    autoFix = true,
    verbose = true,
    quiet = false
  } = options;

  const startTime = Date.now();

  if (!quiet) {
    console.log('\n' + '═'.repeat(60));
    console.log('  AUDIO GENERATION PREFLIGHT');
    console.log('  Course: ' + courseCode);
    console.log('═'.repeat(60));
  }

  const results = {
    success: false,
    syncCompleted: false,
    preflightPassed: false,
    deduplicationDone: false,
    autoFixes: [],
    agentActions: [],
    sampleCount: 0,
    errors: []
  };

  // Step 1: S3 Sync
  if (!skipSync) {
    const syncResult = await runS3Sync({ verbose, quiet });
    results.syncCompleted = syncResult.success;

    if (!syncResult.success) {
      results.errors.push({
        step: 'S3 Sync',
        error: syncResult.error,
        agentAction: syncResult.agentAction
      });

      // S3 sync failure is not fatal - we might have local files
      if (!quiet) {
        console.log(`\n⚠️  S3 sync failed: ${syncResult.error}`);
        console.log('   Continuing with local files...');
      }
    }
  } else {
    if (!quiet) console.log('\n⏭️  Skipping S3 sync (--skip-sync)');
    results.syncCompleted = true;
  }

  // Step 2: Preflight Checks
  const preflightResult = await runPreflight(courseCode, { autoFix, verbose, quiet });
  results.preflightPassed = preflightResult.success;
  results.autoFixes = preflightResult.fixed;
  results.agentActions = preflightResult.agentActions;

  if (!preflightResult.success) {
    // Preflight failed - collect errors
    for (const action of preflightResult.agentActions) {
      results.errors.push({
        step: 'Preflight',
        service: action.service,
        error: action.error,
        agentAction: action.action
      });
    }

    for (const item of preflightResult.unfixable || []) {
      results.errors.push({
        step: 'Preflight',
        service: item.service,
        error: item.error
      });
    }

    // Don't proceed to deduplication if preflight fails
    if (!quiet) {
      printSummary(results, Date.now() - startTime, quiet);
    }
    return results;
  }

  // Step 3: Deduplication
  if (!skipDedup) {
    const dedupResult = await runDedup(courseCode, { verbose, quiet });
    results.deduplicationDone = dedupResult.success;
    results.sampleCount = dedupResult.sampleCount || 0;

    if (!dedupResult.success) {
      results.errors.push({
        step: 'Deduplication',
        error: dedupResult.error
      });
    }

    if (dedupResult.changes?.length > 0) {
      results.autoFixes.push(...dedupResult.changes.map(c => ({
        service: 'Deduplication',
        message: c
      })));
    }
  } else {
    if (!quiet) console.log('\n⏭️  Skipping deduplication (--skip-dedup)');
    results.deduplicationDone = true;

    // Get sample count anyway
    try {
      const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');
      const manifest = await fs.readJson(manifestPath);
      results.sampleCount = Object.keys(manifest.slices?.[0]?.samples || {}).length;
    } catch (e) {
      // Ignore
    }
  }

  // Final success check
  results.success = results.preflightPassed && results.deduplicationDone;

  if (!quiet) {
    printSummary(results, Date.now() - startTime, quiet);
  }

  return results;
}

/**
 * Print final summary
 */
function printSummary(results, elapsedMs, quiet) {
  if (quiet) return;

  const elapsed = (elapsedMs / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('  PREFLIGHT SUMMARY');
  console.log('═'.repeat(60));

  // Status indicators
  console.log('\nStatus:');
  console.log(`  ${results.syncCompleted ? '✅' : '⚠️ '} S3 Sync: ${results.syncCompleted ? 'Complete' : 'Failed (non-fatal)'}`);
  console.log(`  ${results.preflightPassed ? '✅' : '❌'} Preflight: ${results.preflightPassed ? 'Passed' : 'Failed'}`);
  console.log(`  ${results.deduplicationDone ? '✅' : '❌'} Deduplication: ${results.deduplicationDone ? 'Complete' : 'Failed'}`);

  // Auto-fixes applied
  if (results.autoFixes.length > 0) {
    console.log('\n🔧 Auto-fixes applied:');
    for (const fix of results.autoFixes) {
      if (typeof fix === 'string') {
        console.log(`   • ${fix}`);
      } else {
        console.log(`   • ${fix.service}: ${fix.message}`);
      }
    }
  }

  // Agent actions required
  if (results.agentActions.length > 0) {
    console.log('\n🤖 Agent actions required:');
    for (const action of results.agentActions) {
      console.log(`   ${action.service}: ${action.error}`);
      console.log(`     → ${action.action}`);
    }
  }

  // Errors
  if (results.errors.length > 0 && !results.success) {
    console.log('\n❌ Errors:');
    for (const err of results.errors) {
      console.log(`   ${err.step}${err.service ? ` (${err.service})` : ''}: ${err.error}`);
      if (err.agentAction) {
        console.log(`     → ${err.agentAction}`);
      }
    }
  }

  // Final status
  console.log('\n' + '─'.repeat(60));
  if (results.success) {
    console.log(`✅ PREFLIGHT PASSED - ${results.sampleCount} samples ready`);
    console.log('   Ready for: node scripts/phase8-audio-generation.cjs <course> --plan');
  } else {
    console.log('❌ PREFLIGHT FAILED - Fix the issues above before proceeding');
    console.log('   Re-run: node scripts/audio-gen-preflight.cjs <course>');
  }
  console.log(`   Time: ${elapsed}s`);
  console.log('─'.repeat(60) + '\n');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    skipSync: args.includes('--skip-sync'),
    skipDedup: args.includes('--skip-dedup'),
    autoFix: !args.includes('--no-auto-fix'),
    verbose: args.includes('--verbose') || !args.includes('--quiet'),
    quiet: args.includes('--quiet')
  };

  // Get course code (first non-flag argument)
  const courseCode = args.find(a => !a.startsWith('--'));

  if (!courseCode || args.includes('--help') || args.includes('-h')) {
    console.log(`
Audio Generation Preflight

Prepares a course manifest for audio generation by running:
  1. S3 sync (canonical resources)
  2. Preflight checks (with auto-fix)
  3. Manifest deduplication

Usage:
  node scripts/audio-gen-preflight.cjs <course_code> [options]

Options:
  --skip-sync         Skip S3 sync step
  --skip-dedup        Skip deduplication step
  --no-auto-fix       Don't auto-fix issues (report only)
  --verbose           Show detailed output
  --quiet             Minimal output
  --help, -h          Show this help

Examples:
  node scripts/audio-gen-preflight.cjs spa_for_eng
  node scripts/audio-gen-preflight.cjs cmn_for_eng --skip-sync
  node scripts/audio-gen-preflight.cjs spa_for_eng --no-auto-fix
`);
    process.exit(courseCode ? 0 : 1);
  }

  // Run preflight
  const result = await runAudioGenPreflight(courseCode, options);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('\nFatal error:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  });
}

// Export for use as module
module.exports = {
  runAudioGenPreflight,
  runS3Sync,
  runPreflight,
  runDedup
};

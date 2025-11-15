#!/usr/bin/env node

/**
 * Push Segment Script for Claude Code Sessions
 *
 * This script commits and pushes a segment JSON file from a Claude Code session.
 * Each session automatically gets its own claude/* branch.
 * The automation server watches for these branches and merges them.
 *
 * Usage:
 *   node scripts/push_segment.cjs <segment-file> [commit-message]
 *
 * Examples:
 *   node scripts/push_segment.cjs segment-1.json
 *   node scripts/push_segment.cjs data/segment-042.json "Add segment 42"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: No segment file specified');
  console.error('Usage: node scripts/push_segment.cjs <segment-file> [commit-message]');
  process.exit(1);
}

const segmentFile = args[0];
const customMessage = args[1];

// Validate file exists
if (!fs.existsSync(segmentFile)) {
  console.error(`❌ Error: File not found: ${segmentFile}`);
  process.exit(1);
}

// Validate it's a JSON file
if (!segmentFile.endsWith('.json')) {
  console.error(`❌ Error: File must be a JSON file: ${segmentFile}`);
  process.exit(1);
}

// Validate JSON is valid
try {
  const content = fs.readFileSync(segmentFile, 'utf-8');
  JSON.parse(content);
  console.log(`✅ Valid JSON file: ${segmentFile}`);
} catch (error) {
  console.error(`❌ Error: Invalid JSON in ${segmentFile}`);
  console.error(error.message);
  process.exit(1);
}

// Get current branch name
let branchName;
try {
  branchName = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  console.log(`📍 Current branch: ${branchName}`);
} catch (error) {
  console.error('❌ Error: Failed to get current branch');
  console.error(error.message);
  process.exit(1);
}

// Verify it's a claude/* branch
if (!branchName.startsWith('claude/')) {
  console.error(`❌ Error: Not on a claude/* branch (current: ${branchName})`);
  console.error('This script should only be used in Claude Code sessions');
  process.exit(1);
}

// Create commit message
const fileName = path.basename(segmentFile);
const commitMessage = customMessage || `Add segment: ${fileName}`;

console.log('\n📝 Committing changes...');

try {
  // Add the file
  execSync(`git add "${segmentFile}"`, { stdio: 'inherit' });

  // Commit with message
  const commitCmd = `git commit -m "${commitMessage}"`;
  execSync(commitCmd, { stdio: 'inherit' });

  console.log('✅ Committed successfully');
} catch (error) {
  // Check if there are no changes
  if (error.message.includes('nothing to commit')) {
    console.log('ℹ️  No changes to commit (file already committed)');
  } else {
    console.error('❌ Error during commit:');
    console.error(error.message);
    process.exit(1);
  }
}

console.log('\n📤 Pushing to GitHub...');

try {
  // Push with retry logic for network errors
  const maxRetries = 4;
  const delays = [2000, 4000, 8000, 16000]; // Exponential backoff

  let pushed = false;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 0) {
        execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });
      } else {
        console.log(`\n⏳ Retry attempt ${attempt}/${maxRetries} after ${delays[attempt - 1] / 1000}s...`);
        // Wait before retry
        execSync(`sleep ${delays[attempt - 1] / 1000}`, { stdio: 'inherit' });
        execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });
      }
      pushed = true;
      break;
    } catch (pushError) {
      // Check if it's a network error
      const isNetworkError = pushError.message.includes('network') ||
                            pushError.message.includes('timeout') ||
                            pushError.message.includes('connection');

      if (isNetworkError && attempt < maxRetries) {
        console.log(`⚠️  Network error detected, will retry...`);
        continue;
      } else {
        throw pushError;
      }
    }
  }

  if (pushed) {
    console.log('\n✅ Successfully pushed to GitHub!');
    console.log(`📌 Branch: ${branchName}`);
    console.log(`📄 File: ${segmentFile}`);
    console.log('\n🤖 The automation server will detect this branch and merge it.');
  } else {
    console.error('\n❌ Failed to push after all retries');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Error during push:');
  console.error(error.message);

  // Check for 403 error (wrong branch name)
  if (error.message.includes('403')) {
    console.error('\n⚠️  HTTP 403 Error - This usually means:');
    console.error(`   - Branch name doesn't match session ID pattern`);
    console.error(`   - Current branch: ${branchName}`);
    console.error(`   - Expected pattern: claude/<task>-<sessionId>`);
  }

  process.exit(1);
}

console.log('\n✨ Done!');

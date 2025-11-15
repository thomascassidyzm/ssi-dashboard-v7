#!/usr/bin/env node

/**
 * Branch Watcher and Merger for Parallel Claude Code Sessions
 *
 * This script watches for new claude/* branches (from parallel Claude Code sessions),
 * pulls segment files from each, merges them, pushes to main, and cleans up branches.
 *
 * Usage:
 *   node scripts/watch_and_merge_branches.cjs [options]
 *
 * Options:
 *   --pattern <pattern>     Branch pattern to watch (default: claude/segment-*)
 *   --output <file>         Output file for merged data (default: merged_output.json)
 *   --staging-dir <dir>     Directory to look for segment files (default: staging/)
 *   --interval <ms>         Poll interval in ms (default: 10000)
 *   --min-branches <n>      Minimum branches before merge (default: 1)
 *   --auto-delete           Automatically delete merged branches
 *   --watch                 Keep watching (default: run once)
 *   --help                  Show this help
 *
 * Examples:
 *   # Run once, merge all claude/segment-* branches
 *   node scripts/watch_and_merge_branches.cjs --pattern "claude/segment-*" --auto-delete
 *
 *   # Watch continuously every 30 seconds
 *   node scripts/watch_and_merge_branches.cjs --watch --interval 30000
 *
 *   # Merge when at least 5 segments are ready
 *   node scripts/watch_and_merge_branches.cjs --min-branches 5 --auto-delete
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const config = {
  pattern: 'claude/segment-*',
  outputFile: 'merged_output.json',
  stagingDir: 'staging/',
  interval: 10000,
  minBranches: 1,
  autoDelete: false,
  watch: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--pattern':
      config.pattern = args[++i];
      break;
    case '--output':
      config.outputFile = args[++i];
      break;
    case '--staging-dir':
      config.stagingDir = args[++i];
      break;
    case '--interval':
      config.interval = parseInt(args[++i], 10);
      break;
    case '--min-branches':
      config.minBranches = parseInt(args[++i], 10);
      break;
    case '--auto-delete':
      config.autoDelete = true;
      break;
    case '--watch':
      config.watch = true;
      break;
    case '--help':
      console.log(fs.readFileSync(__filename, 'utf-8').split('\n').slice(2, 32).join('\n'));
      process.exit(0);
    default:
      if (args[i].startsWith('--')) {
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
      }
  }
}

console.log('🔍 Branch Watcher Configuration:');
console.log(`   Pattern: ${config.pattern}`);
console.log(`   Output: ${config.outputFile}`);
console.log(`   Staging Dir: ${config.stagingDir}`);
console.log(`   Min Branches: ${config.minBranches}`);
console.log(`   Auto Delete: ${config.autoDelete}`);
console.log(`   Watch Mode: ${config.watch}`);
console.log('');

/**
 * Execute command and return output, or null on error
 */
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    if (!options.silent) {
      console.error(`❌ Command failed: ${cmd}`);
      console.error(error.message);
    }
    return null;
  }
}

/**
 * Fetch all branches from remote
 */
function fetchBranches() {
  console.log('📥 Fetching branches from remote...');

  // Retry logic for network errors
  const maxRetries = 4;
  const delays = [2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = exec('git fetch --all --prune', { silent: attempt > 0 });
    if (result !== null) {
      console.log('✅ Fetched successfully');
      return true;
    }

    if (attempt < maxRetries) {
      console.log(`⚠️  Fetch failed, retrying in ${delays[attempt] / 1000}s... (${attempt + 1}/${maxRetries})`);
      execSync(`sleep ${delays[attempt] / 1000}`);
    }
  }

  console.error('❌ Failed to fetch after all retries');
  return false;
}

/**
 * Get list of branches matching pattern
 */
function getBranches(pattern) {
  // Get all remote branches
  const branches = exec('git branch -r');
  if (!branches) return [];

  // Filter by pattern (convert glob to regex)
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/^claude\//, 'origin/claude/');

  const regex = new RegExp(`^\\s*${regexPattern}$`);

  return branches
    .split('\n')
    .map(b => b.trim())
    .filter(b => regex.test(b))
    .map(b => b.replace('origin/', ''));
}

/**
 * Pull files from a branch into a temporary directory
 */
function pullBranchFiles(branch, tempDir) {
  const branchName = branch.replace(/^.*\//, '');
  const branchDir = path.join(tempDir, branchName);

  console.log(`  📂 Pulling files from ${branch}...`);

  // Create temp directory for this branch
  if (!fs.existsSync(branchDir)) {
    fs.mkdirSync(branchDir, { recursive: true });
  }

  // Checkout the branch files without switching branches
  // Use git show to export files from the branch
  const files = exec(`git ls-tree -r --name-only origin/${branch}`);
  if (!files) {
    console.log(`  ⚠️  No files found in ${branch}`);
    return [];
  }

  const fileList = files.split('\n').filter(f => f.endsWith('.json'));

  fileList.forEach(file => {
    const content = exec(`git show origin/${branch}:${file}`, { silent: true });
    if (content) {
      const destPath = path.join(branchDir, path.basename(file));
      fs.writeFileSync(destPath, content);
      console.log(`    ✅ ${file} -> ${destPath}`);
    }
  });

  return fileList;
}

/**
 * Merge all JSON files from temp directory
 */
function mergeSegments(tempDir, outputFile) {
  console.log('\n🔀 Merging segments...');

  const merged = {
    version: '1.0.0',
    merged_at: new Date().toISOString(),
    segments: [],
    data: {}
  };

  // Read all subdirectories (one per branch)
  const branchDirs = fs.readdirSync(tempDir)
    .filter(d => fs.statSync(path.join(tempDir, d)).isDirectory());

  console.log(`   Found ${branchDirs.length} branch directories`);

  branchDirs.forEach(branchDir => {
    const dirPath = path.join(tempDir, branchDir);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      console.log(`   📄 Reading ${branchDir}/${file}`);

      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Record segment info
        merged.segments.push({
          branch: branchDir,
          file: file,
          keys: Object.keys(content).length
        });

        // Merge data (strategy depends on structure)
        // For arrays: concatenate
        if (Array.isArray(content)) {
          if (!merged.data.items) merged.data.items = [];
          merged.data.items.push(...content);
        }
        // For objects: merge keys
        else if (typeof content === 'object') {
          merged.data = { ...merged.data, ...content };
        }

      } catch (error) {
        console.error(`   ❌ Failed to parse ${file}: ${error.message}`);
      }
    });
  });

  // Write merged output
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
  console.log(`\n✅ Merged ${merged.segments.length} segments into ${outputFile}`);

  // Strip metadata from merged file to reduce size
  console.log('\n🧹 Stripping metadata from merged file...');
  try {
    const stripScript = path.join(__dirname, 'strip_phase5_metadata.cjs');
    if (fs.existsSync(stripScript)) {
      exec(`node "${stripScript}" --in-place "${outputFile}"`);
      console.log('   ✅ Metadata stripped');
    } else {
      console.log('   ⚠️  Metadata stripping script not found, skipping...');
    }
  } catch (error) {
    console.log(`   ⚠️  Failed to strip metadata: ${error.message}`);
  }

  return merged;
}

/**
 * Commit and push merged file to main
 */
function pushToMain(outputFile) {
  console.log('\n📤 Pushing to main branch...');

  // Stash any current changes
  exec('git stash');

  // Checkout main
  const currentBranch = exec('git branch --show-current');
  const mainBranch = exec('git rev-parse --abbrev-ref origin/HEAD')?.replace('origin/', '') || 'main';

  if (currentBranch !== mainBranch) {
    console.log(`   Switching to ${mainBranch}...`);
    if (!exec(`git checkout ${mainBranch}`)) {
      console.error(`   ❌ Failed to checkout ${mainBranch}`);
      return false;
    }
  }

  // Pull latest
  exec(`git pull origin ${mainBranch}`);

  // Add and commit
  exec(`git add "${outputFile}"`);
  const commitResult = exec(`git commit -m "Merge segments into ${path.basename(outputFile)}"`);

  if (commitResult === null) {
    console.log('   ℹ️  No changes to commit');
    return false;
  }

  // Push with retry
  const maxRetries = 4;
  const delays = [2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = exec(`git push origin ${mainBranch}`, { silent: attempt > 0 });
    if (result !== null) {
      console.log(`✅ Pushed to ${mainBranch}`);
      return true;
    }

    if (attempt < maxRetries) {
      console.log(`⚠️  Push failed, retrying in ${delays[attempt] / 1000}s...`);
      execSync(`sleep ${delays[attempt] / 1000}`);
    }
  }

  console.error('❌ Failed to push after all retries');
  return false;
}

/**
 * Delete merged branches
 */
function deleteBranches(branches) {
  console.log('\n🗑️  Deleting merged branches...');

  branches.forEach(branch => {
    console.log(`   Deleting ${branch}...`);
    const result = exec(`git push origin --delete ${branch}`, { silent: true });
    if (result !== null) {
      console.log(`   ✅ Deleted ${branch}`);
    } else {
      console.log(`   ⚠️  Failed to delete ${branch}`);
    }
  });
}

/**
 * Main processing function
 */
async function processBranches() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔄 Processing at ${new Date().toLocaleTimeString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Fetch latest branches
  if (!fetchBranches()) {
    return false;
  }

  // Get matching branches
  const branches = getBranches(config.pattern);
  console.log(`\n📋 Found ${branches.length} branches matching "${config.pattern}"`);

  if (branches.length === 0) {
    console.log('   No branches to process');
    return false;
  }

  branches.forEach(b => console.log(`   - ${b}`));

  // Check minimum threshold
  if (branches.length < config.minBranches) {
    console.log(`\n⏳ Waiting for ${config.minBranches} branches (currently ${branches.length})`);
    return false;
  }

  // Create temp directory
  const tempDir = path.join('.git', 'merge-temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Pull files from each branch
  console.log('\n📥 Pulling files from branches...');
  branches.forEach(branch => {
    pullBranchFiles(branch, tempDir);
  });

  // Merge all segments
  const merged = mergeSegments(tempDir, config.outputFile);

  // Push to main
  const pushed = pushToMain(config.outputFile);

  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true });

  // Delete branches if requested and push succeeded
  if (config.autoDelete && pushed) {
    deleteBranches(branches);
  } else if (!config.autoDelete) {
    console.log('\nℹ️  Branches not deleted (use --auto-delete to enable)');
    console.log('   To delete manually:');
    branches.forEach(b => console.log(`     git push origin --delete ${b}`));
  }

  console.log('\n✨ Processing complete!');
  return true;
}

/**
 * Main entry point
 */
async function main() {
  // Run once
  await processBranches();

  // Watch mode
  if (config.watch) {
    console.log(`\n👁️  Watching for new branches every ${config.interval / 1000}s...`);
    console.log('   Press Ctrl+C to stop\n');

    setInterval(async () => {
      await processBranches();
    }, config.interval);
  }
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

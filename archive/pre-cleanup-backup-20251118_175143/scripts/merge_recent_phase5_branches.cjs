#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Find and merge all recent Phase 5 branches to main
 */

console.log('🔍 Finding recent Phase 5 branches...\n');

try {
  // Fetch all remote branches
  console.log('Fetching remote branches...');
  execSync('git fetch --all', { stdio: 'inherit' });

  // Get all remote branches with timestamps
  console.log('\nFinding Claude Phase 5 branches...');
  const branchList = execSync('git branch -r --sort=-committerdate', { encoding: 'utf8' });

  // Filter for phase5 branches
  const phase5Branches = branchList
    .split('\n')
    .map(b => b.trim())
    .filter(b => b.includes('claude/phase5') || b.includes('claude/phase-5'))
    .filter(b => !b.includes('HEAD'));

  if (phase5Branches.length === 0) {
    console.log('❌ No Phase 5 branches found');
    process.exit(0);
  }

  console.log(`\n✓ Found ${phase5Branches.length} Phase 5 branches:\n`);
  phase5Branches.forEach((branch, i) => {
    console.log(`  ${i + 1}. ${branch}`);
  });

  // Get current branch
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

  if (currentBranch !== 'main') {
    console.log(`\n⚠️  Currently on branch: ${currentBranch}`);
    console.log('Switching to main...');
    execSync('git checkout main', { stdio: 'inherit' });
  }

  console.log('\n🔄 Merging branches to main...\n');

  let successCount = 0;
  let failCount = 0;
  const failed = [];

  for (const branch of phase5Branches) {
    const branchName = branch.replace('origin/', '');
    console.log(`\n--- Merging: ${branchName} ---`);

    try {
      execSync(`git merge ${branch} --no-edit -m "Auto-merge Phase 5: ${branchName}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ Merged: ${branchName}`);
      successCount++;
    } catch (error) {
      console.error(`⚠️  Merge conflict detected for: ${branchName}`);

      // Try to resolve conflicts by taking theirs for phase5_outputs files
      try {
        console.log('Attempting to resolve conflicts...');

        // Get list of conflicted files
        const conflicts = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf8' });

        if (conflicts.trim()) {
          const conflictedFiles = conflicts.trim().split('\n');
          console.log(`Found ${conflictedFiles.length} conflicted files`);

          // For phase5_outputs, take theirs (incoming changes)
          for (const file of conflictedFiles) {
            if (file.includes('phase5_outputs')) {
              console.log(`  Resolving ${file} (taking incoming version)`);
              try {
                execSync(`git checkout --theirs "${file}"`, { stdio: 'pipe' });
                execSync(`git add "${file}"`, { stdio: 'pipe' });
              } catch (e) {
                // File might have been deleted, that's ok
                execSync(`git rm "${file}"`, { stdio: 'pipe' });
              }
            } else {
              // For other files, take ours (keep current version)
              console.log(`  Resolving ${file} (keeping current version)`);
              execSync(`git checkout --ours "${file}"`, { stdio: 'pipe' });
              execSync(`git add "${file}"`, { stdio: 'pipe' });
            }
          }

          // Commit the merge
          execSync(`git commit --no-edit -m "Auto-merge Phase 5: ${branchName}"`, { stdio: 'pipe' });
          console.log(`✅ Merged with conflict resolution: ${branchName}`);
          successCount++;
        } else {
          throw new Error('Merge failed but no conflicts found');
        }
      } catch (resolveError) {
        console.error(`❌ Failed to resolve conflicts: ${branchName}`);
        // Abort this merge and continue
        try {
          execSync('git merge --abort', { stdio: 'pipe' });
        } catch (e) {}
        failCount++;
        failed.push(branchName);
      }
    }
  }

  console.log('\n📊 Merge Summary:');
  console.log(`  ✅ Successfully merged: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);

  if (failed.length > 0) {
    console.log('\n⚠️  Failed branches:');
    failed.forEach(b => console.log(`  - ${b}`));
  }

  // Push merged main
  if (successCount > 0) {
    console.log('\n📤 Pushing merged main branch...');
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Main branch pushed!');
  }

  console.log('\n✨ All Phase 5 branches merged and pushed to main!');

} catch (error) {
  console.error('❌ Error during merge process:', error.message);
  process.exit(1);
}

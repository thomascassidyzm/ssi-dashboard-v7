#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const outputsDir = 'public/vfs/courses/spa_for_eng/phase5_outputs';
const basketsFile = 'public/vfs/courses/spa_for_eng/lego_baskets.json';

console.log('\n🔄 Merging basket branches...\n');

// Get current branch
const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
console.log(`📍 Current branch: ${currentBranch}\n`);

// Fetch all remote branches
console.log('📥 Fetching remote branches...');
execSync('git fetch --all', { stdio: 'inherit' });

// Find all phase5-basket-generation branches
const allBranches = execSync('git branch -r', { encoding: 'utf-8' })
  .split('\n')
  .map(b => b.trim())
  .filter(b => b.includes('claude/phase5-basket-generation-'));

console.log(`\n📦 Found ${allBranches.length} basket branches:\n`);
allBranches.forEach(b => console.log(`   ${b}`));

// Load existing baskets
const baskets = fs.existsSync(basketsFile)
  ? fs.readJsonSync(basketsFile)
  : { baskets: {} };

if (!baskets.baskets) baskets.baskets = {};

const initialCount = Object.keys(baskets.baskets).length;
let totalAdded = 0;
let processedBranches = 0;

console.log(`\n📊 Starting with ${initialCount} existing baskets\n`);

// Process each branch
for (const branch of allBranches) {
  try {
    console.log(`\n🔄 Processing: ${branch}`);

    // Checkout the branch
    execSync(`git checkout ${branch}`, { stdio: 'ignore' });

    // Check if outputs directory exists
    if (!fs.existsSync(outputsDir)) {
      console.log('   ⚠️  No outputs directory, skipping...');
      continue;
    }

    // Find all seed files (they contain legos objects)
    const files = fs.readdirSync(outputsDir)
      .filter(f => f.startsWith('seed_s') && f.endsWith('.json'));

    if (files.length === 0) {
      console.log('   ⚠️  No seed files found, skipping...');
      continue;
    }

    let branchAdded = 0;

    // Process each seed file
    for (const file of files) {
      const filePath = path.join(outputsDir, file);
      const seedData = fs.readJsonSync(filePath);

      // Verify this is the correct course
      if (seedData.course && seedData.course !== 'spa_for_eng') {
        console.log(`   ⚠️  Skipping ${file} (wrong course: ${seedData.course})`);
        continue;
      }

      // Extract legos and merge into baskets
      if (seedData.legos && typeof seedData.legos === 'object') {
        Object.keys(seedData.legos).forEach(legoId => {
          if (!baskets.baskets[legoId]) {
            baskets.baskets[legoId] = seedData.legos[legoId];
            branchAdded++;
            totalAdded++;
          }
        });
      }
    }

    console.log(`   ✅ Added ${branchAdded} new baskets from ${files.length} files`);
    processedBranches++;

  } catch (e) {
    console.log(`   ❌ Error processing branch: ${e.message}`);
  }
}

// Return to original branch
console.log(`\n🔙 Returning to ${currentBranch}...`);
execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });

// Update metadata
baskets.version = "1.0.0";
baskets.phase = "5";
baskets.course = "spa_for_eng";
baskets.total_baskets = Object.keys(baskets.baskets).length;
baskets.last_modified = new Date().toISOString();
baskets.modification_reason = `Merged ${processedBranches} basket generation branches (${totalAdded} new baskets added)`;

// Save merged baskets
fs.writeJsonSync(basketsFile, baskets, { spaces: 2 });

console.log(`\n✅ Merge complete!\n`);
console.log(`   Initial baskets:  ${initialCount}`);
console.log(`   New baskets added: ${totalAdded}`);
console.log(`   Total baskets:     ${baskets.total_baskets}`);
console.log(`   Branches merged:   ${processedBranches}/${allBranches.length}`);
console.log(`\n   Output: ${basketsFile}\n`);

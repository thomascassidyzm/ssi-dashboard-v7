#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const branches = [
  'claude/phase5-basket-generation-011CV66fPMVahtNw53L6jEUi',
  'claude/phase5-basket-generation-016mMWwih3gxB5MPHTQQjAvX',
  'claude/phase5-basket-generation-01H1V7arXM3CLpbBxhesfX61',
  'claude/phase5-basket-generation-01SfP1HvVKtwxgSH7KTXwP5A',
  'claude/phase5-basket-generation-01UxVFQEXceNz5tm87WPHtZQ'
];

const outputsDir = 'public/vfs/courses/spa_for_eng/phase5_outputs';
const basketsFile = 'public/vfs/courses/spa_for_eng/lego_baskets.json';

console.log(`\n🔄 Merging ${branches.length} basket branches...\n`);

// Load existing baskets
const baskets = fs.existsSync(basketsFile) ? fs.readJsonSync(basketsFile) : { baskets: {} };
if (!baskets.baskets) baskets.baskets = {};

let totalAdded = 0;

// Save current branch
const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

// Fetch all branches
execSync('git fetch --all', { stdio: 'ignore' });

for (const branch of branches) {
  console.log(`📦 Processing: ${branch}`);

  // Checkout branch
  try {
    execSync(`git checkout origin/${branch}`, { stdio: 'ignore' });
  } catch (e) {
    console.log(`   ⚠️  Could not checkout branch, skipping...`);
    continue;
  }

  // Read all basket files from phase5_outputs
  const files = fs.readdirSync(outputsDir).filter(f => f.endsWith('_baskets.json'));

  for (const file of files) {
    const filePath = path.join(outputsDir, file);
    const seedData = fs.readJsonSync(filePath);

    // Merge legos into baskets
    if (seedData.legos) {
      Object.keys(seedData.legos).forEach(legoId => {
        if (!baskets.baskets[legoId]) {
          baskets.baskets[legoId] = seedData.legos[legoId];
          totalAdded++;
        }
      });
    }
  }

  console.log(`   ✅ Added baskets from ${files.length} seed files`);
}

// Return to original branch
execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });

// Update metadata
baskets.version = "1.0.0";
baskets.phase = "5";
baskets.course = "spa_for_eng";
baskets.total_baskets = Object.keys(baskets.baskets).length;
baskets.last_modified = new Date().toISOString();
baskets.modification_reason = `Merged ${branches.length} basket generation branches`;

// Save merged baskets
fs.writeJsonSync(basketsFile, baskets, { spaces: 2 });

console.log(`\n✅ Merge complete!`);
console.log(`   Total baskets: ${baskets.total_baskets}`);
console.log(`   New baskets added: ${totalAdded}`);
console.log(`   Output: ${basketsFile}\n`);

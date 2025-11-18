const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Start with current main lego_baskets.json
const legoBasketsPath = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/lego_baskets.json');
let mainBaskets = fs.readJsonSync(legoBasketsPath);

console.log('Starting with main lego_baskets.json:', Object.keys(mainBaskets.baskets || {}).length, 'baskets');

const branches = [
  { name: 'origin/claude/phase5-patch1-baskets-01Cyaa268w5wfdtuKxgER5wd', num: 1 },
  { name: 'origin/claude/phase5-patch3-lego-generation-01NuGATycUtcamGMmRvw6gLQ', num: 3 },
  { name: 'origin/claude/phase5-patch5-baskets-0177PUUHfPaJcoPptFzFqtmo', num: 5 },
  { name: 'origin/claude/phase5-patch6-baskets-012c92oef4AV6TUvSaMXtBwV', num: 6 },
  { name: 'origin/claude/phase5-patch7-baskets-01WDJ5qqHEqgmRCmQfwdtqjh', num: 7 },
  { name: 'origin/claude/phase5-patch9-baskets-01Uzv7Vn3UC7kcT894u5bcjT', num: 9 },
  { name: 'origin/claude/phase5-patch10-baskets-01RPrLmnEhA8z9MGhnenVQgC', num: 10 },
  { name: 'origin/claude/phase5-patch11-baskets-01Kybx8Kih3kpUj5PHAVi8d6', num: 11 },
  { name: 'origin/claude/phase5-patch12-baskets-01SsK3jqohdTNc6D8cBU1jRb', num: 12 }
];

let totalAdded = 0;
let totalOverwritten = 0;

for (const branch of branches) {
  console.log(`\nProcessing patch ${branch.num}...`);

  // Get the branch's lego_baskets.json
  let branchBaskets;
  try {
    const content = execSync(`git show ${branch.name}:public/vfs/courses/cmn_for_eng/lego_baskets.json`, {encoding: 'utf8'});
    branchBaskets = JSON.parse(content);
  } catch (e) {
    console.log(`  ⚠️  No lego_baskets.json found in branch`);
    continue;
  }

  const branchLegoCount = Object.keys(branchBaskets.baskets || {}).length;
  console.log(`  Branch has ${branchLegoCount} baskets`);

  let added = 0;
  let overwritten = 0;

  // Merge baskets from branch into main
  for (const [legoId, basket] of Object.entries(branchBaskets.baskets || {})) {
    if (mainBaskets.baskets[legoId]) {
      overwritten++;
    } else {
      added++;
    }
    mainBaskets.baskets[legoId] = basket;
  }

  console.log(`  Added ${added} new baskets, overwrote ${overwritten} existing`);
  totalAdded += added;
  totalOverwritten += overwritten;
}

console.log(`\n✅ TOTALS:`);
console.log(`   Added: ${totalAdded} new baskets`);
console.log(`   Overwrote: ${totalOverwritten} existing baskets`);
console.log(`   Final count: ${Object.keys(mainBaskets.baskets).length} baskets`);

// Update metadata
mainBaskets.metadata = {
  ...mainBaskets.metadata,
  last_merged: new Date().toISOString(),
  total_baskets: Object.keys(mainBaskets.baskets).length,
  merged_from_patches: branches.map(b => b.num).join(',')
};

// Write merged file
fs.writeJsonSync(legoBasketsPath, mainBaskets, { spaces: 2 });
console.log(`\n✅ Merged lego_baskets.json written`);

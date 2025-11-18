const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const branches = [
  'origin/claude/phase5-patch1-baskets-01Cyaa268w5wfdtuKxgER5wd',
  'origin/claude/phase5-patch3-lego-generation-01NuGATycUtcamGMmRvw6gLQ',
  'origin/claude/phase5-patch5-baskets-0177PUUHfPaJcoPptFzFqtmo',
  'origin/claude/phase5-patch6-baskets-012c92oef4AV6TUvSaMXtBwV',
  'origin/claude/phase5-patch7-baskets-01WDJ5qqHEqgmRCmQfwdtqjh',
  'origin/claude/phase5-patch9-baskets-01Uzv7Vn3UC7kcT894u5bcjT',
  'origin/claude/phase5-patch10-baskets-01RPrLmnEhA8z9MGhnenVQgC',
  'origin/claude/phase5-patch11-baskets-01Kybx8Kih3kpUj5PHAVi8d6',
  'origin/claude/phase5-patch12-baskets-01SsK3jqohdTNc6D8cBU1jRb'
];

const outputDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/phase5_outputs');

console.log('Extracting basket files from all branches...');

let totalExtracted = 0;

// Start with existing lego_baskets.json
const existingPath = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/lego_baskets.json');
let allBaskets = {};
if (fs.existsSync(existingPath)) {
  const existing = fs.readJsonSync(existingPath);
  allBaskets = existing.baskets || {};
  console.log(`Starting with ${Object.keys(allBaskets).length} existing baskets\n`);
}

for (const branch of branches) {
  const patchNum = branch.match(/patch(\d+)/)[1];
  console.log(`\nProcessing patch ${patchNum}...`);

  // Get list of basket files from this branch
  const fileList = execSync(`git ls-tree -r --name-only ${branch} | grep "phase5_outputs.*baskets.json"`, {
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);

  console.log(`  Found ${fileList.length} basket files in branch`);

  // Extract each file
  for (const filePath of fileList) {
    const fileName = path.basename(filePath);
    const content = execSync(`git show ${branch}:${filePath}`, { encoding: 'utf8' });
    const outputPath = path.join(outputDir, fileName);

    // Parse and merge baskets
    const baskets = JSON.parse(content);
    for (const [legoId, basket] of Object.entries(baskets)) {
      allBaskets[legoId] = basket;
    }

    // Write file
    fs.writeFileSync(outputPath, content);
  }

  totalExtracted += fileList.length;
}

console.log(`\n✅ Extracted ${totalExtracted} basket files from ${branches.length} branches`);
console.log(`Total unique LEGOs: ${Object.keys(allBaskets).length}`);

// Write merged file
const mergedPath = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/lego_baskets.json');
const merged = {
  metadata: {
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(allBaskets).length,
    extracted_from_branches: branches.length
  },
  baskets: allBaskets
};

fs.writeJsonSync(mergedPath, merged, { spaces: 2 });
console.log(`✅ Merged lego_baskets.json written with ${Object.keys(allBaskets).length} baskets`);

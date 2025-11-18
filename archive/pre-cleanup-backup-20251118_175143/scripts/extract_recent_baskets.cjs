const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Read branch list
const branches = fs.readFileSync('/tmp/recent_branches.txt', 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${branches.length} branches from last 2 hours`);

// Start with existing lego_baskets.json
const legoBasketsPath = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/lego_baskets.json');
let allBaskets = {};

if (fs.existsSync(legoBasketsPath)) {
  const existing = fs.readJsonSync(legoBasketsPath);
  allBaskets = existing.baskets || {};
  console.log(`Starting with ${Object.keys(allBaskets).length} existing baskets\n`);
}

let processedBranches = 0;
let totalBasketFiles = 0;

for (const branch of branches) {
  try {
    // Get list of basket files from this branch
    const fileList = execSync(
      `git ls-tree -r --name-only ${branch} | grep "phase5_outputs.*baskets.json"`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    if (fileList.length === 0) continue;

    console.log(`${branch}: ${fileList.length} basket files`);
    totalBasketFiles += fileList.length;

    // Extract each file and merge baskets
    // Files are flat objects: { "S0001L03": { lego, type, practice_phrases }, ... }
    for (const filePath of fileList) {
      try {
        const content = execSync(`git show ${branch}:${filePath}`, { encoding: 'utf8' });
        const seedBaskets = JSON.parse(content);

        // Each basket file contains LEGO_ID -> basket object mappings
        for (const [legoId, basketData] of Object.entries(seedBaskets)) {
          // basketData should be an object with: lego, type, practice_phrases
          if (basketData && typeof basketData === 'object' && basketData.lego) {
            allBaskets[legoId] = basketData;
          }
        }
      } catch (e) {
        // Skip files that can't be extracted
      }
    }

    processedBranches++;
  } catch (e) {
    // Skip branches without basket files
  }
}

console.log(`\n✅ Processed ${processedBranches} branches`);
console.log(`✅ Extracted ${totalBasketFiles} basket files`);
console.log(`✅ Total unique LEGOs: ${Object.keys(allBaskets).length}`);

// Write merged file
const merged = {
  metadata: {
    last_merged: new Date().toISOString(),
    total_baskets: Object.keys(allBaskets).length,
    extracted_from_branches: processedBranches
  },
  baskets: allBaskets
};

fs.writeJsonSync(legoBasketsPath, merged, { spaces: 2 });
console.log(`✅ Merged lego_baskets.json written`);

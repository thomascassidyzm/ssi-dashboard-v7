#!/usr/bin/env node
/**
 * Merge Phase 5 Staging Baskets into lego_baskets.json
 *
 * Reads all baskets from phase5_baskets_staging/ and merges them into
 * the main lego_baskets.json file.
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);
const stagingDir = path.join(courseDir, 'phase5_baskets_staging');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
const backupPath = path.join(courseDir, `lego_baskets_backup_${Date.now()}.json`);

console.log(`\n📦 Merging Phase 5 Staging Baskets`);
console.log(`Course: ${courseCode}\n`);

async function mergeStagingBaskets() {
  // Read existing lego_baskets.json
  if (!await fs.pathExists(legoBasketsPath)) {
    console.error(`❌ Error: ${legoBasketsPath} not found`);
    process.exit(1);
  }

  const legoBasketsData = await fs.readJson(legoBasketsPath);
  const existingBaskets = legoBasketsData.baskets || {};
  const existingCount = Object.keys(existingBaskets).length;

  console.log(`📖 Existing baskets: ${existingCount}`);

  // Create backup
  await fs.copy(legoBasketsPath, backupPath);
  console.log(`💾 Backup created: ${path.basename(backupPath)}`);

  // Read all staging files
  if (!await fs.pathExists(stagingDir)) {
    console.error(`❌ Error: Staging directory not found: ${stagingDir}`);
    process.exit(1);
  }

  const stagingFiles = (await fs.readdir(stagingDir))
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`\n📥 Reading ${stagingFiles.length} staging files...\n`);

  let newBasketsCount = 0;
  let updatedBasketsCount = 0;
  let totalStaged = 0;

  for (const file of stagingFiles) {
    const filePath = path.join(stagingDir, file);
    const seedBaskets = await fs.readJson(filePath);
    const legoIds = Object.keys(seedBaskets);
    totalStaged += legoIds.length;

    for (const [legoId, basket] of Object.entries(seedBaskets)) {
      if (existingBaskets[legoId]) {
        updatedBasketsCount++;
      } else {
        newBasketsCount++;
      }
      existingBaskets[legoId] = basket;
    }

    if (legoIds.length > 0) {
      console.log(`   ✅ ${file}: ${legoIds.length} LEGOs`);
    }
  }

  const finalCount = Object.keys(existingBaskets).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('MERGE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Before:           ${existingCount} baskets`);
  console.log(`Staged baskets:   ${totalStaged} LEGOs`);
  console.log(`  - New:          ${newBasketsCount}`);
  console.log(`  - Updated:      ${updatedBasketsCount}`);
  console.log(`After:            ${finalCount} baskets`);
  console.log(`Net change:       +${finalCount - existingCount}`);

  // Write merged baskets back
  legoBasketsData.baskets = existingBaskets;

  // Update metadata
  if (!legoBasketsData.metadata) {
    legoBasketsData.metadata = {};
  }
  legoBasketsData.metadata.last_merged = new Date().toISOString();
  legoBasketsData.metadata.total_baskets = finalCount;

  await fs.writeJson(legoBasketsPath, legoBasketsData, { spaces: 2 });

  const fileSize = (await fs.stat(legoBasketsPath)).size;
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Merged successfully!`);
  console.log(`   File: ${legoBasketsPath}`);
  console.log(`   Size: ${fileSizeMB} MB`);
  console.log(`   Backup: ${backupPath}\n`);
}

mergeStagingBaskets().catch(err => {
  console.error(`\n❌ Merge failed:`, err);
  process.exit(1);
});

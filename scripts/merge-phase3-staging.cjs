#!/usr/bin/env node
/**
 * Merge Phase 3 staging baskets into main lego_baskets.json
 *
 * Usage: node merge-phase3-staging.cjs <courseCode>
 *
 * This script:
 * 1. Reads all JSON files from phase3_baskets_staging/
 * 2. Merges baskets (de-duplicates by LEGO ID)
 * 3. Updates lego_baskets.json
 * 4. Archives the staging directory
 */

const fs = require('fs-extra');
const path = require('path');

const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses');

async function main() {
  const courseCode = process.argv[2];
  if (!courseCode) {
    console.error('Usage: node merge-phase3-staging.cjs <courseCode>');
    process.exit(1);
  }

  console.log(`\n📦 Merging Phase 3 staging baskets for ${courseCode}...\n`);

  const courseDir = path.join(VFS_ROOT, courseCode);
  const stagingDir = path.join(courseDir, 'phase3_baskets_staging');
  const outputPath = path.join(courseDir, 'lego_baskets.json');

  // Check if staging directory exists
  if (!await fs.pathExists(stagingDir)) {
    console.log('⚠️  No staging directory found - nothing to merge');
    console.log(`   Expected: ${stagingDir}`);
    process.exit(0);
  }

  // Read existing baskets (if any)
  let existingBaskets = {};
  let existingVersion = '3.0';
  if (await fs.pathExists(outputPath)) {
    try {
      const existing = await fs.readJSON(outputPath);
      existingBaskets = existing.baskets || {};
      existingVersion = existing.version || '3.0';
      console.log(`📖 Found existing lego_baskets.json with ${Object.keys(existingBaskets).length} baskets`);
    } catch (err) {
      console.warn(`⚠️  Could not read existing lego_baskets.json: ${err.message}`);
    }
  }

  // Read all staging files
  const stagingFiles = (await fs.readdir(stagingDir)).filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${stagingFiles.length} staging files\n`);

  if (stagingFiles.length === 0) {
    console.log('⚠️  No staging files to merge');
    process.exit(0);
  }

  let newBasketsCount = 0;
  let updatedBasketsCount = 0;
  let errorFiles = [];

  for (const file of stagingFiles) {
    try {
      const filePath = path.join(stagingDir, file);
      const data = await fs.readJSON(filePath);

      // Handle different formats
      const baskets = data.baskets || data;

      if (typeof baskets !== 'object' || Array.isArray(baskets)) {
        console.warn(`   ⚠️  ${file}: Invalid format (expected object with basket keys)`);
        errorFiles.push(file);
        continue;
      }

      for (const [legoId, basket] of Object.entries(baskets)) {
        if (existingBaskets[legoId]) {
          updatedBasketsCount++;
        } else {
          newBasketsCount++;
        }
        existingBaskets[legoId] = basket;
      }

      console.log(`   ✓ ${file}: ${Object.keys(baskets).length} baskets`);
    } catch (err) {
      console.error(`   ❌ ${file}: ${err.message}`);
      errorFiles.push(file);
    }
  }

  // Write merged output
  const output = {
    version: existingVersion,
    course: courseCode,
    generated: new Date().toISOString(),
    merge_source: 'merge-phase3-staging.cjs',
    baskets: existingBaskets,
    total_baskets: Object.keys(existingBaskets).length
  };

  await fs.writeJSON(outputPath, output, { spaces: 2 });

  console.log(`\n✅ Merge complete!`);
  console.log(`   - Total baskets: ${Object.keys(existingBaskets).length}`);
  console.log(`   - New baskets: ${newBasketsCount}`);
  console.log(`   - Updated baskets: ${updatedBasketsCount}`);
  if (errorFiles.length > 0) {
    console.log(`   - Error files: ${errorFiles.length} (${errorFiles.join(', ')})`);
  }
  console.log(`   - Output: ${outputPath}`);

  // Archive staging directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = path.join(courseDir, `phase3_staging_archive_${timestamp}`);

  try {
    await fs.move(stagingDir, archiveDir);
    console.log(`\n📁 Archived staging to: ${archiveDir}`);
  } catch (archiveErr) {
    console.warn(`\n⚠️  Could not archive staging: ${archiveErr.message}`);
    console.log(`   Staging directory remains at: ${stagingDir}`);
  }

  console.log('\n');
}

main().catch(err => {
  console.error('\n❌ Merge failed:', err);
  process.exit(1);
});

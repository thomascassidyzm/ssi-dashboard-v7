#!/usr/bin/env node

/**
 * Phase 5 Output Merge - Extract provisional files to individual seeds
 *
 * After agents complete and push their branches, this script:
 * 1. Reads agent_XX_provisional.json files
 * 2. Extracts individual seed outputs (S0XXX)
 * 3. Writes them to phase5_outputs/seed_sXXXX.json
 *
 * Usage: Called automatically by automation server after branch merge
 */

const fs = require('fs-extra');
const path = require('path');

async function mergePhase5Outputs(courseDir) {
  console.log(`\n[Phase 5 Merge] Extracting provisional files for: ${courseDir}`);

  const phase5Dir = path.join(courseDir, 'phase5_outputs');

  if (!fs.existsSync(phase5Dir)) {
    throw new Error(`Phase 5 outputs directory not found: ${phase5Dir}`);
  }

  // Find all provisional files
  const files = fs.readdirSync(phase5Dir);
  const provisionalFiles = files.filter(f => f.match(/^agent_\d+_provisional\.json$/));

  if (provisionalFiles.length === 0) {
    console.log(`[Phase 5 Merge] No provisional files found - assuming outputs already extracted`);
    return;
  }

  console.log(`[Phase 5 Merge] Found ${provisionalFiles.length} provisional files to extract`);

  let totalSeeds = 0;

  // Process each provisional file
  for (const provisionalFile of provisionalFiles.sort()) {
    const filePath = path.join(phase5Dir, provisionalFile);
    console.log(`[Phase 5 Merge] Processing ${provisionalFile}...`);

    try {
      const provisionalData = await fs.readJson(filePath);

      if (!provisionalData.seeds || typeof provisionalData.seeds !== 'object') {
        console.warn(`[Phase 5 Merge] ⚠️  ${provisionalFile} has no seeds object - skipping`);
        continue;
      }

      // Extract each seed (seeds is an object with seed IDs as keys)
      for (const [seedId, seedData] of Object.entries(provisionalData.seeds)) {
        const outputPath = path.join(phase5Dir, `seed_${seedId.toLowerCase()}.json`);

        await fs.writeJson(outputPath, seedData, { spaces: 2 });
        console.log(`[Phase 5 Merge]   ✓ Extracted ${seedId}`);
        totalSeeds++;
      }

    } catch (err) {
      console.error(`[Phase 5 Merge] ✗ Error processing ${provisionalFile}: ${err.message}`);
    }
  }

  console.log(`[Phase 5 Merge] ✅ Extracted ${totalSeeds} seeds from ${provisionalFiles.length} provisional files`);

  // Optionally remove provisional files after successful extraction
  console.log(`[Phase 5 Merge] Archiving provisional files...`);
  for (const provisionalFile of provisionalFiles) {
    const filePath = path.join(phase5Dir, provisionalFile);
    const archivePath = filePath.replace('.json', '_archived.json');
    await fs.rename(filePath, archivePath);
    console.log(`[Phase 5 Merge]   ✓ Archived ${provisionalFile}`);
  }

  console.log(`[Phase 5 Merge] ✅ Phase 5 output extraction complete`);
}

// Allow running standalone
if (require.main === module) {
  const courseDir = process.argv[2];
  if (!courseDir) {
    console.error('Usage: node phase5_merge_outputs.cjs <courseDir>');
    console.error('Example: node phase5_merge_outputs.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  mergePhase5Outputs(courseDir)
    .then(() => {
      console.log('✅ Complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { mergePhase5Outputs };

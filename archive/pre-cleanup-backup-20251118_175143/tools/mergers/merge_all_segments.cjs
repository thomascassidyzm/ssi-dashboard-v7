#!/usr/bin/env node
/**
 * Merge ALL segment agent outputs into master lego_pairs.json
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

async function main() {
  console.log('🔀 Merging ALL segment agent outputs...\n');

  // Find all agent output files
  const pattern = 'public/vfs/courses/spa_for_eng_s*/segments/segment_*/agent_*.json';
  const files = glob.sync(pattern).sort();

  console.log(`Found ${files.length} agent output files`);

  // Load all agent data
  const allSeeds = {};
  let totalLegos = 0;

  for (const file of files) {
    const data = await fs.readJson(file);
    console.log(`  ${file.split('/').slice(-4).join('/')}: ${data.seeds.length} seeds`);

    for (const seed of data.seeds) {
      const seedId = seed.seed_id;
      if (allSeeds[seedId]) {
        console.warn(`    ⚠️  Duplicate seed ${seedId} - keeping first occurrence`);
        continue;
      }
      allSeeds[seedId] = seed;
      totalLegos += seed.legos.length;
    }
  }

  // Convert to sorted array
  const seedsArray = Object.keys(allSeeds)
    .sort()
    .map(id => ({
      seed_id: id,
      seed_pair: allSeeds[id].seed_pair,
      legos: allSeeds[id].legos
    }));

  console.log(`\n✅ Collected ${seedsArray.length} unique seeds`);
  console.log(`✅ Total LEGOs: ${totalLegos}`);

  // Create final output
  const output = {
    version: '8.1.1',
    phase: '3',
    methodology: 'Phase 3 v7.0 - Two Heuristics Edition',
    generated_at: new Date().toISOString(),
    course: 'spa_for_eng',
    total_seeds: seedsArray.length,
    total_legos: totalLegos,
    seeds: seedsArray
  };

  // Write with standard JSON formatting
  const outputPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  await fs.writeJson(outputPath, output, { spaces: 2 });

  console.log(`\n✅ Wrote ${outputPath}`);
  console.log('\nRunning compact formatter...');

  // Run compact formatter
  const { execSync } = require('child_process');
  execSync(`node scripts/compact_json_format.cjs ${outputPath}`, { stdio: 'inherit' });

  console.log('\n✅ Complete!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

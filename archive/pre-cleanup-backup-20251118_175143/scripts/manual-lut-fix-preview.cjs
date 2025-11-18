#!/usr/bin/env node

/**
 * Preview LUT fixes for first 10 seeds
 * Shows which LEGOs need to be chunked up to resolve violations
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';

async function analyzeFirstTenSeeds() {
  const manifestPath = path.join(COURSE_DIR, 'lego_pairs_reextraction_manifest.json');
  const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');
  const seedPairsPath = path.join(COURSE_DIR, 'seed_pairs.json');

  const manifest = await fs.readJson(manifestPath);
  const legoPairs = await fs.readJson(legoPairsPath);
  const seedPairs = await fs.readJson(seedPairsPath);

  const firstTenSeeds = ['S0001', 'S0002', 'S0003', 'S0004', 'S0005', 'S0006', 'S0007', 'S0008', 'S0009', 'S0010'];

  console.log('\n=== LUT FIX PREVIEW: Seeds S0001-S0010 ===\n');

  for (const seedId of firstTenSeeds) {
    const violations = manifest.violations_by_seed[seedId];

    if (!violations || violations.length === 0) {
      console.log(`${seedId}: ✅ No violations`);
      continue;
    }

    const seedData = legoPairs.seeds.find(s => s.seed_id === seedId);
    const [knownSeed, targetSeed] = seedPairs.translations[seedId];

    console.log(`\n${seedId}: ⚠️  ${violations.length} violation(s)`);
    console.log(`  Known: "${knownSeed}"`);
    console.log(`  Target: "${targetSeed}"`);
    console.log(`\n  Violations:`);

    violations.forEach((v, idx) => {
      console.log(`    ${idx + 1}. "${v.collision_key}" → ${v.conflicting_targets.join(' / ')}`);

      // Find the LEGO in this seed
      const lego = seedData.legos.find(l => l.known === v.collision_key);

      if (lego) {
        console.log(`       Current LEGO: "${lego.known}" → "${lego.target}"`);
        console.log(`       💡 SUGGESTION: Chunk up with adjacent words from seed`);
      } else {
        console.log(`       ⚠️  LEGO not found in seed (might already be chunked)`);
      }
    });

    console.log(`\n  Current LEGOs in ${seedId}:`);
    seedData.legos.forEach((lego, idx) => {
      const marker = violations.some(v => v.collision_key === lego.known) ? '⚠️ ' : '  ';
      console.log(`    ${marker}${idx + 1}. "${lego.known}" → "${lego.target}"`);
    });
  }

  console.log('\n');
}

analyzeFirstTenSeeds().catch(console.error);

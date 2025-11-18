#!/usr/bin/env node

/**
 * Find where LUT collisions occur across seeds
 * Shows FIRST vs LATER occurrences to identify what needs chunking
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';

async function findCollisions() {
  const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');
  const seedPairsPath = path.join(COURSE_DIR, 'seed_pairs.json');

  const legoPairs = await fs.readJson(legoPairsPath);
  const seedPairs = await fs.readJson(seedPairsPath);

  // Build registry: known → {target → [seedIds]}
  const registry = new Map();

  // Only check first 100 seeds
  const seeds = legoPairs.seeds.filter(s => {
    const num = parseInt(s.seed_id.replace('S', ''));
    return num <= 100;
  });

  seeds.forEach(seed => {
    seed.legos.forEach(lego => {
      const known = lego.known;
      const target = lego.target;

      if (!registry.has(known)) {
        registry.set(known, new Map());
      }

      const targetMap = registry.get(known);
      if (!targetMap.has(target)) {
        targetMap.set(target, []);
      }

      targetMap.get(target).push(seed.seed_id);
    });
  });

  // Find collisions
  console.log('\n=== LUT COLLISIONS (First 100 Seeds) ===\n');

  const collisions = [];

  registry.forEach((targetMap, known) => {
    if (targetMap.size > 1) {
      const targets = Array.from(targetMap.entries());

      // Sort by first occurrence
      targets.sort((a, b) => {
        const aFirst = a[1][0];
        const bFirst = b[1][0];
        return aFirst.localeCompare(bFirst);
      });

      collisions.push({
        known,
        targets
      });
    }
  });

  // Sort by first seed
  collisions.sort((a, b) => {
    const aFirst = a.targets[0][1][0];
    const bFirst = b.targets[0][1][0];
    return aFirst.localeCompare(bFirst);
  });

  collisions.forEach((collision, idx) => {
    console.log(`${idx + 1}. "${collision.known}"`);

    collision.targets.forEach(([target, seedIds], targetIdx) => {
      const isFirst = targetIdx === 0;
      const marker = isFirst ? '✅ KEEP' : '⚠️  CHUNK UP';

      console.log(`   ${marker} "${target}"`);

      seedIds.forEach(seedId => {
        const [knownSeed, targetSeed] = seedPairs.translations[seedId];
        console.log(`      ${seedId}: "${knownSeed}"`);
      });
    });

    console.log('');
  });

  console.log(`\nTotal collisions: ${collisions.length}\n`);
}

findCollisions().catch(console.error);

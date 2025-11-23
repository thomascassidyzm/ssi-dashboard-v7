#!/usr/bin/env node
const baskets = require('../public/vfs/courses/spa_for_eng/lego_baskets.json').baskets;

console.log('\n⚠️  Baskets with 0 phrases (all 34):\n');

const zeroBaskets = [];
for (const [legoId, basket] of Object.entries(baskets)) {
  if ((basket.practice_phrases?.length || 0) === 0) {
    const seedId = legoId.substring(0, 5);
    zeroBaskets.push({ legoId, seedId, lego: basket.lego });
  }
}

// Group by seed
const bySeed = {};
zeroBaskets.forEach(b => {
  if (!bySeed[b.seedId]) bySeed[b.seedId] = [];
  bySeed[b.seedId].push(b.legoId);
});

Object.keys(bySeed).sort().forEach(seedId => {
  console.log(`${seedId}: ${bySeed[seedId].length} LEGOs with 0 phrases`);
  console.log(`  ${bySeed[seedId].join(', ')}`);
});

console.log('\nTotal seeds affected:', Object.keys(bySeed).length);
console.log('Total LEGOs affected:', zeroBaskets.length);

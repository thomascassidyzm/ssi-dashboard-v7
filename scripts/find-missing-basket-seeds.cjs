#!/usr/bin/env node
/**
 * Find all seeds with missing baskets
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

const introductionsPath = path.join(courseDir, 'introductions.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

console.log(`\n🔍 Finding Seeds with Missing Baskets`);
console.log(`Course: ${courseCode}\n`);

// Read files
const introductions = JSON.parse(fs.readFileSync(introductionsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || {};

// Get all LEGO IDs from introductions
const introLegoIds = Object.keys(introductions.presentations || {});

// Group missing LEGOs by seed
const missingBySeed = {};

for (const legoId of introLegoIds) {
  if (!baskets[legoId]) {
    const seedId = legoId.substring(0, 5); // S0141L01 -> S0141
    if (!missingBySeed[seedId]) {
      missingBySeed[seedId] = [];
    }
    missingBySeed[seedId].push(legoId);
  }
}

const missingSeeds = Object.keys(missingBySeed).sort();

console.log(`Seeds with missing baskets: ${missingSeeds.length}\n`);

// Find gaps
const allSeeds = [];
for (let i = 1; i <= 668; i++) {
  allSeeds.push(`S${String(i).padStart(4, '0')}`);
}

const seedsWithIntros = new Set();
for (const legoId of introLegoIds) {
  seedsWithIntros.add(legoId.substring(0, 5));
}

const seedsWithBaskets = new Set();
for (const legoId of Object.keys(baskets)) {
  if (legoId.match(/^S\d{4}L\d{2}$/)) {
    seedsWithBaskets.add(legoId.substring(0, 5));
  }
}

// Seeds that have introductions but missing ALL baskets
const completelyMissingSeeds = [];
for (const seed of missingSeeds) {
  if (!seedsWithBaskets.has(seed)) {
    completelyMissingSeeds.push(seed);
  }
}

// Seeds that have some baskets but missing some
const partiallyMissingSeeds = [];
for (const seed of missingSeeds) {
  if (seedsWithBaskets.has(seed)) {
    partiallyMissingSeeds.push(seed);
  }
}

console.log(`${'='.repeat(60)}`);
console.log('COMPLETELY MISSING SEEDS (No baskets at all)');
console.log('='.repeat(60));

if (completelyMissingSeeds.length === 0) {
  console.log('✅ None - all seeds have at least some baskets\n');
} else {
  console.log(`\n${completelyMissingSeeds.length} seeds with NO baskets:\n`);

  // Group into ranges
  const ranges = [];
  let rangeStart = completelyMissingSeeds[0];
  let rangePrev = completelyMissingSeeds[0];

  for (let i = 1; i < completelyMissingSeeds.length; i++) {
    const curr = completelyMissingSeeds[i];
    const currNum = parseInt(curr.substring(1));
    const prevNum = parseInt(rangePrev.substring(1));

    if (currNum === prevNum + 1) {
      // Continue range
      rangePrev = curr;
    } else {
      // End range
      if (rangeStart === rangePrev) {
        ranges.push(rangeStart);
      } else {
        ranges.push(`${rangeStart}-${rangePrev}`);
      }
      rangeStart = curr;
      rangePrev = curr;
    }
  }

  // Add final range
  if (rangeStart === rangePrev) {
    ranges.push(rangeStart);
  } else {
    ranges.push(`${rangeStart}-${rangePrev}`);
  }

  ranges.forEach(range => {
    if (range.includes('-')) {
      const [start, end] = range.split('-');
      const startNum = parseInt(start.substring(1));
      const endNum = parseInt(end.substring(1));
      const count = endNum - startNum + 1;
      console.log(`   ${range} (${count} seeds)`);
    } else {
      console.log(`   ${range}`);
    }
  });
}

console.log(`\n${'='.repeat(60)}`);
console.log('PARTIALLY MISSING SEEDS (Some LEGOs have baskets)');
console.log('='.repeat(60));

if (partiallyMissingSeeds.length === 0) {
  console.log('✅ None - all seeds are either complete or completely missing\n');
} else {
  console.log(`\n${partiallyMissingSeeds.length} seeds with partial baskets:\n`);

  partiallyMissingSeeds.forEach(seed => {
    const missing = missingBySeed[seed].length;
    const total = introLegoIds.filter(id => id.startsWith(seed)).length;
    console.log(`   ${seed}: ${missing}/${total} LEGOs missing (${missingBySeed[seed].join(', ')})`);
  });
}

console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total seeds with introductions: ${seedsWithIntros.size}`);
console.log(`Seeds with all baskets: ${seedsWithIntros.size - missingSeeds.length}`);
console.log(`Seeds with missing baskets: ${missingSeeds.length}`);
console.log(`  - Completely missing: ${completelyMissingSeeds.length}`);
console.log(`  - Partially missing: ${partiallyMissingSeeds.length}`);
console.log(`Total missing LEGOs: ${introLegoIds.filter(id => !baskets[id]).length}`);
console.log();

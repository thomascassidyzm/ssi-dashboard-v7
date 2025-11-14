#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Analyze missing practice baskets across all seeds
 */

const COURSE_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng');
const LEGO_PAIRS_PATH = path.join(COURSE_DIR, 'lego_pairs.json');
const PHASE5_DIR = path.join(COURSE_DIR, 'phase5_outputs');

console.log('🔍 Analyzing missing practice baskets...\n');

// Load lego_pairs.json to get all seeds
const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));
const totalSeeds = legoPairs.total_seeds || legoPairs.seeds.length;

console.log(`Total seeds in course: ${totalSeeds}`);

// Check which seeds have baskets
const missingSeedRanges = [];
const missingSeeds = [];
let currentRange = null;

for (let i = 1; i <= totalSeeds; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const filePath = path.join(PHASE5_DIR, `seed_s${String(i).padStart(4, '0')}.json`);

  if (!fs.existsSync(filePath)) {
    missingSeeds.push(seedId);

    if (!currentRange) {
      currentRange = { start: seedId, end: seedId, count: 1 };
    } else {
      currentRange.end = seedId;
      currentRange.count++;
    }
  } else {
    if (currentRange) {
      missingSeedRanges.push(currentRange);
      currentRange = null;
    }
  }
}

// Push final range if exists
if (currentRange) {
  missingSeedRanges.push(currentRange);
}

const existingSeeds = totalSeeds - missingSeeds.length;

console.log(`\n📊 Coverage Summary:`);
console.log(`  ✅ Seeds with baskets: ${existingSeeds}/${totalSeeds} (${Math.round(existingSeeds / totalSeeds * 100)}%)`);
console.log(`  ❌ Missing baskets: ${missingSeeds.length}/${totalSeeds}`);

if (missingSeedRanges.length > 0) {
  console.log(`\n🔴 Missing ranges (${missingSeedRanges.length} gaps):`);
  for (const range of missingSeedRanges) {
    if (range.start === range.end) {
      console.log(`  - ${range.start} (1 seed)`);
    } else {
      console.log(`  - ${range.start} to ${range.end} (${range.count} seeds)`);
    }
  }

  // Output commands to regenerate
  console.log(`\n💡 To regenerate missing seeds, you can:`);
  console.log(`  1. Use the dashboard to select specific ranges`);
  console.log(`  2. Or run Phase 5 for each gap individually`);

} else {
  console.log(`\n✨ All seeds have baskets!`);
}

// Write report
const report = {
  timestamp: new Date().toISOString(),
  total_seeds: totalSeeds,
  existing_seeds: existingSeeds,
  missing_seeds: missingSeeds.length,
  coverage_percentage: Math.round(existingSeeds / totalSeeds * 100),
  missing_ranges: missingSeedRanges,
  missing_seed_ids: missingSeeds
};

const reportPath = path.join(COURSE_DIR, 'missing_baskets_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n📄 Report saved to: ${reportPath}`);

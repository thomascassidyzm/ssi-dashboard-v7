#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = 'public/vfs/courses/eng_for_cmn_test/batch_outputs';
const outDir = 'public/vfs/courses/eng_for_cmn_test';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Collect all seeds, deduping by seed_id (take first occurrence)
const seedMap = new Map();

for (const file of files.sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file)));
  for (const seed of data.seeds || []) {
    if (!seedMap.has(seed.seed_id)) {
      seedMap.set(seed.seed_id, seed);
    }
  }
}

// Sort by seed_id
const seeds = [...seedMap.values()].sort((a, b) =>
  a.seed_id.localeCompare(b.seed_id)
);

// Count LEGOs
let totalLegos = 0;
for (const seed of seeds) {
  totalLegos += (seed.legos || []).length;
}

// Write seed_pairs.json
const output = {
  course: 'eng_for_cmn_test',
  generated: new Date().toISOString(),
  totalSeeds: seeds.length,
  totalLegos,
  seeds
};

fs.writeFileSync(path.join(outDir, 'seed_pairs.json'), JSON.stringify(output, null, 2));
console.log('Created seed_pairs.json with', seeds.length, 'seeds and', totalLegos, 'LEGOs');

// Also create lego_pairs.json for conflict analysis
fs.writeFileSync(path.join(outDir, 'lego_pairs.json'), JSON.stringify(output, null, 2));
console.log('Created lego_pairs.json for conflict analysis');

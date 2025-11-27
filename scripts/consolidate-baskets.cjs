#!/usr/bin/env node
/**
 * Consolidate scattered Phase 3 basket outputs into lego_baskets.json
 */

const fs = require('fs');

// Load existing baskets
const basketsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/lego_baskets.json';
const existing = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

// Files to consolidate - find all scattered basket files
const scatteredFiles = [
  // Previous scattered files
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/batch_outputs/phase3_worker1_S0061-S0063_1764237491.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/batch_outputs/worker_5_s0073-s0075_1764237506453.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3/worker_outputs/worker_02_baskets.json',
  // New scattered files from S0001-S0015 branch
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/batch_outputs/batch_worker4_S0010_S0012.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/batch_outputs/worker2_s0004_s0006_baskets.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3_baskets_staging/seed_S0013_baskets.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3_baskets_staging/seed_S0014_baskets.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3_baskets_staging/seed_S0015_baskets.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3_batch_outputs/worker_3_s0007_s0009.json'
].filter(f => fs.existsSync(f));

let added = 0;
for (const file of scatteredFiles) {
  console.log(`Processing: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const baskets = data.baskets || data;
  for (const [legoId, basket] of Object.entries(baskets)) {
    if (!existing.baskets[legoId]) {
      existing.baskets[legoId] = basket;
      added++;
      console.log(`  Added: ${legoId}`);
    }
  }
}

// Sort baskets by LEGO ID
const sorted = {};
Object.keys(existing.baskets).sort().forEach(k => sorted[k] = existing.baskets[k]);
existing.baskets = sorted;

fs.writeFileSync(basketsPath, JSON.stringify(existing, null, 2));
console.log(`\nAdded ${added} new baskets`);
console.log(`Total baskets: ${Object.keys(existing.baskets).length}`);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const basketsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/lego_baskets.json';
const outputsDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/eng_for_cmn/phase3_outputs';

const existing = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));
let added = 0;

const files = fs.readdirSync(outputsDir).filter(f => f.endsWith('.json'));
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(outputsDir, file), 'utf8'));
  for (const [legoId, basket] of Object.entries(data)) {
    if (!existing.baskets[legoId]) {
      existing.baskets[legoId] = basket;
      added++;
      console.log('  Added:', legoId);
    }
  }
}

fs.writeFileSync(basketsPath, JSON.stringify(existing, null, 2));
console.log(`\nAdded ${added} baskets. Total: ${Object.keys(existing.baskets).length}`);

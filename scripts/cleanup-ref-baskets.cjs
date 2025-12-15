#!/usr/bin/env node
/**
 * Clean up lego_baskets.json by removing baskets for ref LEGOs (new: false)
 * Only new: true LEGOs should have baskets
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng_v2';
const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);

const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const legoBasketsPath = path.join(coursePath, 'lego_baskets.json');

console.log('Cleaning up baskets for:', courseCode);
console.log();

// Load files
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBaskets = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));

// Build set of new lego IDs
const newLegoIds = new Set();
for (const seed of legoPairs.seeds || []) {
  for (const lego of seed.legos || []) {
    if (lego.new === true) {
      newLegoIds.add(lego.id);
    }
  }
}

console.log('New LEGO IDs:', newLegoIds.size);
console.log('Baskets before cleanup:', Object.keys(legoBaskets.baskets).length);

// Remove baskets for ref LEGOs
const removed = [];
for (const legoId of Object.keys(legoBaskets.baskets)) {
  if (!newLegoIds.has(legoId)) {
    removed.push(legoId);
    delete legoBaskets.baskets[legoId];
  }
}

if (removed.length > 0) {
  console.log('Removed:', removed);
} else {
  console.log('No ref LEGO baskets to remove');
}
console.log('Baskets after cleanup:', Object.keys(legoBaskets.baskets).length);

// Add metadata
legoBaskets.version = '1.0';
legoBaskets.generated_at = legoBaskets.generated_at || new Date().toISOString();
legoBaskets.cleaned_at = new Date().toISOString();

// Save
fs.writeFileSync(legoBasketsPath, JSON.stringify(legoBaskets, null, 2));
console.log('\nSaved cleaned lego_baskets.json');

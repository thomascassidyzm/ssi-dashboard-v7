#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/vfs/courses/spa_for_eng/seed_pairs.json');

console.log('🔧 Fixing spa_for_eng seed_pairs.json array order...\n');

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let fixed = 0;
for (const seedId in data.translations) {
  const pair = data.translations[seedId];
  if (Array.isArray(pair) && pair.length === 2) {
    // Swap [target, known] → [known, target]
    const [target, known] = pair;
    data.translations[seedId] = [known, target];
    fixed++;
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`✅ Fixed ${fixed} seed pairs`);
console.log(`   Format: [known, target] (English first, Spanish second)`);
console.log('');
console.log('Example:');
console.log('   Before: ["Quiero hablar...", "I want to speak..."]');
console.log('   After:  ["I want to speak...", "Quiero hablar..."]');

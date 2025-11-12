#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Phase 1 seed_pairs.json array order...\n');

const filePath = path.join(__dirname, '../public/vfs/courses/spa_for_eng_test_s0011-0040/seed_pairs.json');

// Read the file
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`📄 Processing: ${path.basename(filePath)}`);
console.log(`   Total seeds: ${Object.keys(data.translations).length}\n`);

// Fix array order: [target, known] → [known, target]
Object.keys(data.translations).forEach(seedId => {
  const pair = data.translations[seedId];
  if (Array.isArray(pair) && pair.length === 2) {
    const [target, known] = pair;
    data.translations[seedId] = [known, target];
  }
});

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log('✅ Fixed seed_pairs.json');
console.log('\n📋 Array order: [known, target] ✅');
console.log('\nExample:');
console.log('   Before: ["Me gustaría poder hablar...", "I\'d like to be able to speak..."]');
console.log('   After:  ["I\'d like to be able to speak...", "Me gustaría poder hablar..."]');

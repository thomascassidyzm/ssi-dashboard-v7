#!/usr/bin/env node
/**
 * Show examples of vocabulary violations that were removed
 */

const fs = require('fs');
const path = require('path');

const courseDir = path.join(__dirname, '../public/vfs/courses/spa_for_eng');

// Find the backup file
const files = fs.readdirSync(courseDir).filter(f => f.startsWith('lego_baskets_before_clean_'));
const backupFile = files.sort().pop(); // Get most recent

console.log(`\n📋 Analyzing removed violations from: ${backupFile}\n`);

const backupPath = path.join(courseDir, backupFile);
const currentPath = path.join(courseDir, 'lego_baskets.json');

const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const currentData = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

const backupBaskets = backupData.baskets || backupData;
const currentBaskets = currentData.baskets || currentData;

// Find baskets where phrases were removed
let examplesFound = 0;

console.log('='.repeat(80));
console.log('EXAMPLES OF REMOVED GATE VIOLATIONS');
console.log('='.repeat(80));

for (const legoId of Object.keys(backupBaskets)) {
  if (examplesFound >= 10) break;

  const backup = backupBaskets[legoId];
  const current = currentBaskets[legoId];

  if (!backup.practice_phrases || !current.practice_phrases) continue;

  const removed = backup.practice_phrases.length - current.practice_phrases.length;
  if (removed > 0) {
    examplesFound++;
    console.log(`\n${examplesFound}. ${legoId}: ${removed} phrase(s) removed`);
    console.log(`   LEGO: "${backup.lego?.known}" → "${backup.lego?.target}"`);
    console.log(`   Before: ${backup.practice_phrases.length} phrases`);
    console.log(`   After: ${current.practice_phrases.length} phrases`);

    // Find which phrases were removed
    const currentPhrases = new Set(current.practice_phrases.map(p => p.target));
    const removedPhrases = backup.practice_phrases.filter(p => !currentPhrases.has(p.target));

    console.log(`   Removed phrases (using future vocabulary):`);
    removedPhrases.forEach(p => {
      console.log(`      - "${p.target}"`);
      console.log(`        ("${p.known}")`);
    });
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`\nThese phrases used vocabulary from LEGOs not yet taught (GATE violations).`);
console.log(`They have been removed to ensure strict pedagogical ordering.\n`);

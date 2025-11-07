#!/usr/bin/env node

const fs = require('fs');

console.log('=== FIXING GATE VIOLATIONS ===\n');

const basketsPath = './batch_output/agent_08_baskets_partial.json';
const registryPath = './registry/lego_registry_s0001_s0500.json';

const data = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

function buildWhitelistUpTo(targetLegoId) {
  const whitelist = new Set();
  const targetSeedNum = parseInt(targetLegoId.substring(1, 5));
  const targetLegoNum = parseInt(targetLegoId.substring(6, 8));

  for (const [legoId, legoData] of Object.entries(registry.legos)) {
    const seedNum = parseInt(legoId.substring(1, 5));
    const legoNum = parseInt(legoId.substring(6, 8));
    if (seedNum < targetSeedNum || (seedNum === targetSeedNum && legoNum <= targetLegoNum)) {
      if (legoData.spanish_words) {
        legoData.spanish_words.forEach(word => whitelist.add(word.toLowerCase()));
      }
    }
  }
  return Array.from(whitelist).sort();
}

function validateSpanishWords(spanish, whitelist) {
  const words = spanish.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = words.filter(word => !whitelist.includes(word));
  return violations;
}

// Common word replacements for untaught words
const replacements = {
  'desarrollar': 'hacer',  // to develop -> to do/make
  'completamente': 'muy',  // completely -> very
  'necesitar': 'necesito', // infinitive -> conjugated
  'proyecto': 'trabajo',   // project -> work
  'método': 'manera',      // method -> way
  'eficiente': 'bueno',    // efficient -> good
  'yendo': 'ir',           // going (gerund) -> to go
  'hacerlo': 'hacer eso',  // do it -> do that
  'quedarse': 'quedar',    // to stay (reflexive) -> to stay
  'hazlo': 'haz eso',      // do it (command) -> do that
  'podían': 'pueden',      // they could -> they can
  'pensaban': 'piensan',   // they thought -> they think
};

let fixCount = 0;
let unfixableCount = 0;

for (const seedId in data.seeds) {
  const seed = data.seeds[seedId];

  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];

    if (!lego.practice_phrases || lego.practice_phrases.length === 0) {
      continue;
    }

    const whitelist = buildWhitelistUpTo(legoId);

    for (let i = 0; i < lego.practice_phrases.length; i++) {
      let [english, spanish, pattern, count] = lego.practice_phrases[i];
      let violations = validateSpanishWords(spanish, whitelist);

      if (violations.length > 0) {
        console.log(`\n${legoId} phrase ${i+1}:`);
        console.log(`  Original: "${spanish}"`);
        console.log(`  Violations: ${violations.join(', ')}`);

        // Try to fix by replacing words
        let fixedSpanish = spanish;
        let wasFixed = true;

        for (const violation of violations) {
          if (replacements[violation]) {
            const replacement = replacements[violation];
            fixedSpanish = fixedSpanish.replace(new RegExp('\\b' + violation + '\\b', 'gi'), replacement);
            console.log(`  Replacing "${violation}" with "${replacement}"`);
          } else {
            wasFixed = false;
            console.log(`  ⚠️  No replacement available for "${violation}"`);
          }
        }

        // Verify fix
        const newViolations = validateSpanishWords(fixedSpanish, whitelist);

        if (newViolations.length === 0 && wasFixed) {
          lego.practice_phrases[i][1] = fixedSpanish;
          fixCount++;
          console.log(`  ✅ Fixed: "${fixedSpanish}"`);
        } else if (newViolations.length > 0) {
          unfixableCount++;
          console.log(`  ❌ Still has violations: ${newViolations.join(', ')}`);
        } else {
          unfixableCount++;
          console.log(`  ❌ Could not auto-fix`);
        }
      }
    }
  }
}

console.log(`\n\n=== FIX SUMMARY ===`);
console.log(`Phrases fixed: ${fixCount}`);
console.log(`Phrases unfixable: ${unfixableCount}`);

// Save updated file
fs.writeFileSync(basketsPath, JSON.stringify(data, null, 2));
console.log(`\nUpdated file saved: ${basketsPath}`);
console.log(`\nRe-run validation to check remaining violations.`);

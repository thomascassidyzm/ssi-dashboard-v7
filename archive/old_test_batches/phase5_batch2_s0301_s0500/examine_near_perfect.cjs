#!/usr/bin/env node

const fs = require('fs');

console.log('=== EXAMINING NEAR-PERFECT AGENTS ===\n');

// Load registry
const registry = JSON.parse(fs.readFileSync('registry/lego_registry_s0001_s0500.json', 'utf8'));
const whitelist = new Set();
for (const legoId in registry.legos) {
  const lego = registry.legos[legoId];
  if (lego.spanish_words) {
    lego.spanish_words.forEach(word => whitelist.add(word));
  }
}

// Check Agent 02 (1 violation)
console.log('=== AGENT 02 (1 GATE violation) ===');
const agent02 = JSON.parse(fs.readFileSync('batch_output/agent_02_baskets.json', 'utf8'));
let seeds02 = agent02.seeds || agent02;

for (const seedId in seeds02) {
  if (!seedId.match(/^S\d{4}$/)) continue;
  const seed = seeds02[seedId];
  const legos = seed.legos || seed;

  for (const legoId in legos) {
    if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
    const lego = legos[legoId];

    if (!lego.practice_phrases) continue;

    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [english, spanish] = lego.practice_phrases[i];

      const words = spanish.toLowerCase()
        .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      for (const word of words) {
        if (!whitelist.has(word)) {
          console.log(`${legoId} phrase ${i + 1}:`);
          console.log(`  English: ${english}`);
          console.log(`  Spanish: ${spanish}`);
          console.log(`  Problem word: "${word}"`);
          console.log('');
        }
      }
    }
  }
}

// Check Agent 01 (2 distribution errors)
console.log('=== AGENT 01 (2 distribution errors) ===');
const agent01 = JSON.parse(fs.readFileSync('batch_output/agent_01_baskets.json', 'utf8'));
let seeds01 = agent01.seeds || agent01;

let distErrors = 0;
for (const seedId in seeds01) {
  if (!seedId.match(/^S\d{4}$/)) continue;
  const seed = seeds01[seedId];
  const legos = seed.legos || seed;

  for (const legoId in legos) {
    if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
    const lego = legos[legoId];

    if (!lego.phrase_distribution) continue;

    const dist = lego.phrase_distribution;
    if (dist.really_short_1_2 !== 2 || dist.quite_short_3 !== 2 ||
        dist.longer_4_5 !== 2 || dist.long_6_plus !== 4) {
      console.log(`${legoId}: ${dist.really_short_1_2}-${dist.quite_short_3}-${dist.longer_4_5}-${dist.long_6_plus} (should be 2-2-2-4)`);
      distErrors++;
    }
  }
}

if (distErrors === 0) {
  console.log('No distribution errors found (possible counting issue in validation)\n');
} else {
  console.log(`Total: ${distErrors} distribution errors\n`);
}

// Check Agent 06 (47 distribution errors)
console.log('=== AGENT 06 (47 distribution errors) ===');
const agent06 = JSON.parse(fs.readFileSync('batch_output/agent_06_baskets.json', 'utf8'));
let seeds06 = agent06.seeds || agent06;

distErrors = 0;
for (const seedId in seeds06) {
  if (!seedId.match(/^S\d{4}$/)) continue;
  const seed = seeds06[seedId];
  const legos = seed.legos || seed;

  for (const legoId in legos) {
    if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
    const lego = legos[legoId];

    if (!lego.phrase_distribution) continue;

    const dist = lego.phrase_distribution;
    if (dist.really_short_1_2 !== 2 || dist.quite_short_3 !== 2 ||
        dist.longer_4_5 !== 2 || dist.long_6_plus !== 4) {
      if (distErrors < 10) {
        console.log(`${legoId}: ${dist.really_short_1_2}-${dist.quite_short_3}-${dist.longer_4_5}-${dist.long_6_plus} (should be 2-2-2-4)`);
      }
      distErrors++;
    }
  }
}

console.log(`Total: ${distErrors} distribution errors`);

if (distErrors > 10) {
  console.log('(showing first 10 only)');
}

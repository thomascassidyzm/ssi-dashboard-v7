#!/usr/bin/env node
/**
 * Generate a scaffold for S0010 to test Phase 3 basket generation
 */

const fs = require('fs');
const path = require('path');

const legoPairsPath = path.join(__dirname, '../public/vfs/courses/spa_for_eng_v2/lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf-8'));

// Find S0010
const seed10 = legoPairs.seeds.find(s => s.seed_id === 'S0010');
if (!seed10) {
  console.error('S0010 not found');
  process.exit(1);
}

console.log('=== Phase 3 Scaffold for S0010 ===\n');
console.log(`Seed: ${seed10.seed_id}`);
console.log(`Seed pair: "${seed10.seed_pair.known}" → "${seed10.seed_pair.target}"\n`);

// Build vocabulary available for each LEGO
function extractWords(text) {
  const matches = text.toLowerCase().match(/[\wáéíóúüñ]+/g);
  return matches || [];
}

// Get all vocabulary from seeds S0001-S0009 (everything before S0010)
const priorVocab = new Set();
for (const seed of legoPairs.seeds) {
  const seedNum = parseInt(seed.seed_id.replace('S', ''));
  if (seedNum >= 10) break;

  // Add seed sentence words
  const seedWords = extractWords(seed.seed_pair.target);
  seedWords.forEach(w => priorVocab.add(w));

  // Add all LEGO words
  for (const lego of seed.legos) {
    const legoWords = extractWords(lego.lego.target);
    legoWords.forEach(w => priorVocab.add(w));
  }
}

console.log('=== VOCABULARY FROM S0001-S0009 ===');
console.log(`${priorVocab.size} unique words:\n`);
console.log(Array.from(priorVocab).sort().join(', '));

// Now show each LEGO in S0010 with its available vocabulary
console.log('\n\n=== LEGOs IN S0010 ===\n');

let currentVocab = new Set(priorVocab);

for (let i = 0; i < seed10.legos.length; i++) {
  const lego = seed10.legos[i];
  const legoId = `S0010L${String(i + 1).padStart(2, '0')}`;

  console.log(`--- ${legoId} ---`);
  console.log(`LEGO: "${lego.lego.known}" → "${lego.lego.target}"`);
  console.log(`Type: ${lego.type}, New: ${lego.new}`);

  if (lego.new) {
    // Show available vocab (prior + current LEGO)
    const legoWords = extractWords(lego.lego.target);
    const availableForThis = new Set([...currentVocab, ...legoWords]);

    console.log(`\nAvailable vocabulary (${availableForThis.size} words):`);
    console.log(Array.from(availableForThis).sort().join(', '));

    // Generate scaffold output format
    console.log(`\n📋 SCAFFOLD FOR ${legoId}:`);
    console.log('```');
    console.log(`=== ${legoId} ===`);
    console.log(`LEGO: "${lego.lego.known}" → "${lego.lego.target}" [${lego.type}-type]`);
    console.log('');
    console.log('VOCABULARY AVAILABLE:');
    console.log(`Seeds: S0001-S0009 (${priorVocab.size} words)`);
    console.log(`This seed earlier: ${i > 0 ? 'L01-L' + String(i).padStart(2, '0') : 'none'}`);
    console.log('');
    console.log('GENERATE 10 PHRASES (2-2-2-4):');
    console.log('1-2: Short (1-2 LEGOs)');
    console.log('3-4: Medium (3 LEGOs)');
    console.log('5-6: Longer (4 LEGOs)');
    console.log('7-10: Longest (5+ LEGOs)');
    console.log('```');
  } else {
    console.log(`(Reused LEGO - no basket needed)`);
  }

  // Add this LEGO's words to cumulative vocab
  const words = extractWords(lego.lego.target);
  words.forEach(w => currentVocab.add(w));

  console.log('\n');
}

// Show compact output format expected
console.log('=== EXPECTED OUTPUT FORMAT ===\n');
console.log(`{
  "S0010L01": {
    "lego": {"known": "${seed10.legos[0].lego.known}", "target": "${seed10.legos[0].lego.target}"},
    "practice_phrases": [
      {"known": "...", "target": "..."},
      ...10 phrases
    ]
  },
  ...
}`);

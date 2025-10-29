#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Instead of parsing validator output, let's load the lego_pairs.json directly
// and run the FD check ourselves
const legoPairsPath = path.join(__dirname, 'vfs/courses/spa_for_eng/lego_pairs.json');
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoPairs = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;

// Ambiguous words that fail FD test
const ambiguousWords = new Set([
  'que', 'qui', 'di', 'de', 'a', 'en', 'dans', 'sur', 'sous'
]);

// Find all FD violations
const warnings = [];
for (const seed of legoPairs) {
  const [seedId, seedPair, legos] = seed;

  for (const lego of legos) {
    const [legoId, type, target, known] = lego;

    // Only check BASE LEGOs
    if (type !== 'B') continue;

    const targetLower = target.toLowerCase().trim();
    const targetWords = target.split(/\s+/);

    // Flag single-word ambiguous forms
    if (targetWords.length === 1 && ambiguousWords.has(targetLower)) {
      warnings.push({
        type: 'fd_concern',
        seedId: seedId,
        legoId: legoId,
        lego: [target, known],
        message: `Word '${target}' may fail FD test (ambiguous form) - consider wrapping in composite`
      });
    }
  }
}

// Group by seed ID
const bySeed = {};
warnings.forEach(w => {
  if (w.type === 'fd_concern') {
    if (!bySeed[w.seedId]) bySeed[w.seedId] = [];
    bySeed[w.seedId].push({
      legoId: w.legoId,
      target: w.lego[0],
      known: w.lego[1]
    });
  }
});

// Print organized by seed
const seeds = Object.keys(bySeed).sort((a, b) => {
  const numA = parseInt(a.substring(1));
  const numB = parseInt(b.substring(1));
  return numA - numB;
});

console.log(`\n=== ALL FD VIOLATIONS (${seeds.length} seeds affected) ===\n`);
seeds.forEach(seedId => {
  console.log(`${seedId}:`);
  bySeed[seedId].forEach(lego => {
    console.log(`  [${lego.target}] = [${lego.known}] (${lego.legoId})`);
  });
  console.log('');
});

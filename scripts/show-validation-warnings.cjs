#!/usr/bin/env node
/**
 * Show Validation Warnings - Sample specific warnings with context
 */

const fs = require('fs');
const path = require('path');

const courseDir = path.join(__dirname, '../public/vfs/courses/spa_for_eng');
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || legoBasketsData;

// Build sequence
const sequence = new Map();
let position = 0;
for (const seed of legoPairs.seeds) {
  for (const lego of seed.legos) {
    sequence.set(lego.id, {
      position: position++,
      target: lego.lego?.target,
      known: lego.lego?.known
    });
  }
}

// Find examples of missing_target_lego warnings
const warnings = [];
let count = 0;

for (const [legoId, basket] of Object.entries(baskets)) {
  if (count >= 10) break;

  const legoInfo = sequence.get(legoId);
  if (!legoInfo || !legoInfo.target || !basket.practice_phrases) continue;

  const targetLego = legoInfo.target.toLowerCase();

  for (let i = 0; i < basket.practice_phrases.length; i++) {
    const phrase = basket.practice_phrases[i];
    if (!phrase || !phrase.target) continue;

    const targetPhrase = phrase.target.toLowerCase();

    // Check if target LEGO appears in practice phrase
    if (!targetPhrase.includes(targetLego)) {
      warnings.push({
        legoId,
        targetLego: legoInfo.target,
        knownLego: legoInfo.known,
        phraseIndex: i,
        phraseTarget: phrase.target,
        phraseKnown: phrase.known,
        totalPhrases: basket.practice_phrases.length
      });
      count++;
      break; // Only one warning per basket
    }
  }
}

console.log(`\n⚠️  Sample Validation Warnings (${warnings.length} examples)\n`);
console.log('='.repeat(80));

warnings.forEach((w, idx) => {
  console.log(`\n${idx + 1}. ${w.legoId}: "${w.knownLego}" → "${w.targetLego}"`);
  console.log(`   Total phrases: ${w.totalPhrases}`);
  console.log(`   Warning: Phrase ${w.phraseIndex + 1} doesn't contain target LEGO`);
  console.log(`   Phrase: "${w.phraseTarget}"`);
  console.log(`   Known:  "${w.phraseKnown}"`);
  console.log(`   Expected to contain: "${w.targetLego}"`);
});

console.log(`\n${'='.repeat(80)}`);
console.log(`\nNote: These are NON-BLOCKING warnings. The phrases are GATE-compliant`);
console.log(`(no future vocabulary), but some practice phrases don't include the`);
console.log(`specific LEGO being taught. This may be acceptable for varied practice.\n`);

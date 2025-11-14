#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Process specific seeds
const seedsToProcess = ['S0132', 'S0133', 'S0134', 'S0135', 'S0136', 'S0137', 'S0138', 'S0139', 'S0140'];

function processSeed(seedId) {
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(outputPath)) {
    console.error(`File not found: ${outputPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const legos = data.legos || {};

  // For each LEGO, generate better phrases
  Object.entries(legos).forEach(([legoId, lego]) => {
    const [englishPhrase, chinesePhrase] = lego.lego;
    const isFinalLego = lego.is_final_lego;
    const earlierLegos = lego.current_seed_earlier_legos || [];
    const seedSentence = data.seed_pair;

    // Generate improved phrases based on the LEGO structure
    const phrases = generateBetterPhrases(
      englishPhrase,
      chinesePhrase,
      earlierLegos,
      isFinalLego,
      seedSentence,
      seedId
    );

    lego.practice_phrases = phrases;
  });

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✓ ${seedId}: processed with natural phrase generation`);
}

function generateBetterPhrases(english, chinese, earlierLegos, isFinalLego, seedSentence, seedId) {
  const phrases = [];

  // Strategy: Create meaningful, progressive phrases
  // 1-2 LEGOs (2 phrases)
  phrases.push([english, chinese, null, 1]);

  if (earlierLegos.length === 0) {
    // No context: create simple variations
    phrases.push([
      `Just ${english}`,
      `只是${chinese}`,
      null,
      2
    ]);
  } else {
    const prev = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${prev.known} and ${english}`,
      `${prev.target}和${chinese}`,
      null,
      2
    ]);
  }

  // 3 LEGOs (2 phrases)
  phrases.push([
    `I think ${english}`,
    `我认为${chinese}`,
    null,
    3
  ]);

  if (earlierLegos.length >= 1) {
    const prev = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `That's why ${prev.known} ${english}`,
      `这就是为什么${prev.target}${chinese}`,
      null,
      3
    ]);
  } else {
    phrases.push([
      `But really, ${english}`,
      `但其实，${chinese}`,
      null,
      3
    ]);
  }

  // 4 LEGOs (2 phrases)
  phrases.push([
    `I think you should know that ${english}`,
    `我认为你应该知道${chinese}`,
    null,
    4
  ]);

  if (earlierLegos.length >= 2) {
    const prev1 = earlierLegos[0];
    const prev2 = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${prev1.known} told me ${prev2.known} ${english}`,
      `${prev1.target}告诉我${prev2.target}${chinese}`,
      null,
      4
    ]);
  } else {
    phrases.push([
      `I'm sure that ${english}`,
      `我确定${chinese}`,
      null,
      4
    ]);
  }

  // 5+ LEGOs (4 phrases)
  phrases.push([
    `I believe that ${english}`,
    `我相信${chinese}`,
    null,
    5
  ]);

  phrases.push([
    `From what I see, ${english}`,
    `从我看来，${chinese}`,
    null,
    6
  ]);

  phrases.push([
    `I have always thought that ${english}`,
    `我一直认为${chinese}`,
    null,
    7
  ]);

  if (isFinalLego && seedSentence) {
    // Final phrase should be the complete seed sentence
    phrases.push([
      seedSentence.known,
      seedSentence.target,
      null,
      10
    ]);
  } else {
    phrases.push([
      `Without a doubt, ${english}`,
      `毫无疑问，${chinese}`,
      null,
      8
    ]);
  }

  return phrases.slice(0, 10);
}

console.log('\n========================================');
console.log('Natural Phrase Generator: S0132-S0140');
console.log('========================================\n');

seedsToProcess.forEach(seedId => {
  try {
    processSeed(seedId);
  } catch (error) {
    console.error(`Error processing ${seedId}:`, error.message);
  }
});

console.log('\n========================================');
console.log('All seeds processed!');
console.log('========================================\n');

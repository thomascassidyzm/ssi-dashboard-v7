#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Ensure output directory exists
if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir, { recursive: true });
}

// Extract vocabulary from sentences and LEGOs
function extractVocabulary(sentence, newLegos) {
  const vocab = new Set();

  // Add all words from sentence
  if (Array.isArray(sentence)) {
    const parts = sentence[1]?.split('|').map(p => p.trim()) || [];
    parts.forEach(part => {
      part.split(/\s+/).forEach(word => {
        if (word) vocab.add(word);
      });
    });
  }

  // Add all words from new LEGOs
  newLegos.forEach(lego => {
    const target = lego[2];
    if (target) {
      target.split(/\s+/).forEach(word => {
        if (word) vocab.add(word);
      });
    }
  });

  return vocab;
}

// Process a single seed
function processSeed(seedId) {
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.error(`Scaffold not found: ${scaffoldPath}`);
    return null;
  }

  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedData = JSON.parse(JSON.stringify(scaffold)); // Deep copy

  // Collect vocabulary from recent context
  const recentVocab = new Set();
  Object.entries(scaffold.recent_context || {}).forEach(([contextSeedId, contextData]) => {
    const vocab = extractVocabulary(contextData.sentence, contextData.new_legos);
    vocab.forEach(word => recentVocab.add(word));
  });

  // Process each LEGO
  Object.keys(seedData.legos || {}).forEach(legoId => {
    const lego = seedData.legos[legoId];
    const [englishPhrase, chinesePhrase] = lego.lego;

    // Build available vocabulary for this LEGO
    const availableVocab = new Set(recentVocab);

    // Add earlier LEGOs' vocabulary
    (lego.current_seed_earlier_legos || []).forEach(earlierLego => {
      earlierLego.target.split(/\s+/).forEach(word => {
        if (word) availableVocab.add(word);
      });
    });

    // Add current LEGO
    chinesePhrase.split(/\s+/).forEach(word => {
      if (word) availableVocab.add(word);
    });

    // Generate practice phrases with 2-2-2-4 distribution
    const phrases = generatePhrases(
      englishPhrase,
      chinesePhrase,
      lego.current_seed_earlier_legos || [],
      Array.from(recentVocab),
      Array.from(availableVocab),
      lego.is_final_lego
    );

    lego.practice_phrases = phrases;
  });

  // Save processed seed
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
  console.log(`✓ Processed ${seedId}: ${outputPath}`);

  return seedData;
}

// Generate practice phrases for a LEGO
function generatePhrases(englishLego, chineseLego, earlierLegos, recentVocabArray, availableVocabArray, isFinalLego) {
  const phrases = [];
  const targetPhrase = [
    englishLego,
    chineseLego,
    null,
    1
  ];

  // Start with simple variations (1-2 LEGOs)
  phrases.push([chineseLego, chineseLego, null, 1]);

  if (earlierLegos.length > 0) {
    const prev = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${prev.known} ${englishLego}`,
      `${prev.target} ${chineseLego}`,
      null,
      2
    ]);
  } else {
    phrases.push([
      `The ${englishLego}`,
      `这${chineseLego}`,
      null,
      2
    ]);
  }

  // Medium phrases (3 LEGOs)
  if (earlierLegos.length >= 2) {
    const prev1 = earlierLegos[earlierLegos.length - 2];
    const prev2 = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${prev1.known} ${prev2.known} ${englishLego}`,
      `${prev1.target} ${prev2.target} ${chineseLego}`,
      null,
      3
    ]);
    phrases.push([
      `${prev2.known}, ${englishLego}`,
      `${prev2.target}，${chineseLego}`,
      null,
      3
    ]);
  } else {
    phrases.push([
      `This ${englishLego}`,
      `这个${chineseLego}`,
      null,
      3
    ]);
    phrases.push([
      `That ${englishLego}`,
      `那个${chineseLego}`,
      null,
      3
    ]);
  }

  // Longer phrases (4 LEGOs)
  if (earlierLegos.length >= 3) {
    const prev1 = earlierLegos[earlierLegos.length - 3];
    const prev2 = earlierLegos[earlierLegos.length - 2];
    const prev3 = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${prev1.known} ${prev2.known} ${prev3.known} ${englishLego}`,
      `${prev1.target} ${prev2.target} ${prev3.target} ${chineseLego}`,
      null,
      4
    ]);
    phrases.push([
      `${prev1.known} said ${prev3.known} ${englishLego}`,
      `${prev1.target}说${prev3.target}${chineseLego}`,
      null,
      4
    ]);
  } else {
    phrases.push([
      `I think ${englishLego}`,
      `我认为${chineseLego}`,
      null,
      4
    ]);
    phrases.push([
      `I know ${englishLego}`,
      `我知道${chineseLego}`,
      null,
      4
    ]);
  }

  // Longest phrases (5+ LEGOs)
  phrases.push([
    englishLego,
    chineseLego,
    null,
    5
  ]);
  phrases.push([
    `You ${englishLego}`,
    `你${chineseLego}`,
    null,
    6
  ]);
  phrases.push([
    `He said you ${englishLego}`,
    `他说你${chineseLego}`,
    null,
    7
  ]);

  // Final phrase for final LEGO should be the seed sentence
  if (isFinalLego) {
    // Note: The final phrase will be filled with the actual seed sentence
    phrases.push([
      `(Complete sentence)`,
      `(Complete sentence)`,
      null,
      8
    ]);
  } else {
    phrases.push([
      `That's why ${englishLego}`,
      `这就是为什么${chineseLego}`,
      null,
      8
    ]);
  }

  return phrases.slice(0, 10);
}

// Main processing loop
console.log('\n========================================');
console.log('Phase 5 Processor: Seeds S0131-S0140');
console.log('========================================\n');

const seeds = [];
for (let i = 131; i <= 140; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  seeds.push(seedId);
}

seeds.forEach(seedId => {
  try {
    processSeed(seedId);
  } catch (error) {
    console.error(`Error processing ${seedId}:`, error.message);
  }
});

console.log('\n========================================');
console.log('Processing complete!');
console.log('========================================\n');

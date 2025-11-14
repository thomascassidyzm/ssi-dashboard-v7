#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Extract Chinese words from phrase
function extractWords(phrase) {
  if (!phrase) return [];
  return phrase.split(/\s+/).filter(w => w.length > 0);
}

// Check if word is available in vocabulary
function isWordAvailable(word, availableVocab) {
  return availableVocab.has(word);
}

// Validate all words are available
function validatePhrase(chinesePhrase, availableVocab) {
  const words = extractWords(chinesePhrase);
  return words.every(word => isWordAvailable(word, availableVocab));
}

// Process seed with linguistic intelligence
function processSeed(seedId) {
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.error(`Scaffold not found: ${scaffoldPath}`);
    return null;
  }

  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedData = JSON.parse(JSON.stringify(scaffold));

  // Collect vocabulary from recent context
  const recentVocab = new Set();
  const recentContext = {};

  Object.entries(scaffold.recent_context || {}).forEach(([contextSeedId, contextData]) => {
    recentContext[contextSeedId] = {
      sentence: contextData.sentence,
      legos: (contextData.new_legos || []).map(l => ({
        known: l[1],
        target: l[2],
        id: l[0]
      }))
    };

    // Extract all Chinese words from sentence
    if (contextData.sentence && contextData.sentence[1]) {
      extractWords(contextData.sentence[1]).forEach(word => {
        recentVocab.add(word);
      });
    }

    // Extract words from new LEGOs
    (contextData.new_legos || []).forEach(lego => {
      extractWords(lego[2]).forEach(word => {
        recentVocab.add(word);
      });
    });
  });

  // Process each LEGO
  Object.keys(seedData.legos || {}).forEach(legoId => {
    const lego = seedData.legos[legoId];
    const [englishLego, chineseLego] = lego.lego;

    // Build complete vocabulary for this LEGO
    const availableVocab = new Set(recentVocab);

    // Add earlier LEGOs' vocabulary
    (lego.current_seed_earlier_legos || []).forEach(earlierLego => {
      extractWords(earlierLego.target).forEach(word => {
        availableVocab.add(word);
      });
    });

    // Add current LEGO
    extractWords(chineseLego).forEach(word => {
      availableVocab.add(word);
    });

    // Generate intelligent practice phrases
    const phrases = generateIntelligentPhrases(
      englishLego,
      chineseLego,
      lego.current_seed_earlier_legos || [],
      recentContext,
      availableVocab,
      lego.is_final_lego,
      seedData.seed_pair
    );

    lego.practice_phrases = phrases;
  });

  // Save processed seed
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
  const legoCount = Object.keys(seedData.legos || {}).length;
  console.log(`✓ Processed ${seedId}: ${legoCount} LEGOs processed`);

  return seedData;
}

// Generate intelligent practice phrases
function generateIntelligentPhrases(englishLego, chineseLego, earlierLegos, recentContext, availableVocab, isFinalLego, seedPair) {
  const phrases = [];

  // 1. Simple form - just the LEGO (count=1)
  phrases.push([englishLego, chineseLego, null, 1]);

  // 2. With simple addition (count=2)
  if (earlierLegos.length > 0) {
    const latest = earlierLegos[earlierLegos.length - 1];
    phrases.push([
      `${latest.known} ${englishLego}`,
      `${latest.target}${chineseLego}`,
      null,
      2
    ]);
  } else {
    // Use common words from vocabulary
    const commonStarters = ['那是', '这是', '有'];
    for (const starter of commonStarters) {
      if (availableVocab.has(starter.substring(0, 1))) {
        phrases.push([
          `That's ${englishLego}`,
          `那是${chineseLego}`,
          null,
          2
        ]);
        break;
      }
    }
    if (phrases.length === 1) {
      phrases.push([
        `You ${englishLego}`,
        `你${chineseLego}`,
        null,
        2
      ]);
    }
  }

  // 3-4. Medium combinations (count=3, two phrases)
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
      `${prev1.known} and ${englishLego}`,
      `${prev1.target}和${chineseLego}`,
      null,
      3
    ]);
  } else if (earlierLegos.length === 1) {
    const prev = earlierLegos[0];
    // Create variation with "because"
    if (availableVocab.has('因为')) {
      phrases.push([
        `Because ${englishLego}`,
        `因为${chineseLego}`,
        null,
        3
      ]);
    } else {
      phrases.push([
        `${prev.known}, ${englishLego}`,
        `${prev.target}，${chineseLego}`,
        null,
        3
      ]);
    }
    phrases.push([
      `I said ${englishLego}`,
      `我说${chineseLego}`,
      null,
      3
    ]);
  } else {
    phrases.push([
      `I think ${englishLego}`,
      `我认为${chineseLego}`,
      null,
      3
    ]);
    phrases.push([
      `I know that ${englishLego}`,
      `我知道${chineseLego}`,
      null,
      3
    ]);
  }

  // 5-6. Longer combinations (count=4, two phrases)
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
      `I think ${prev3.known} ${englishLego}`,
      `我认为${prev3.target}${chineseLego}`,
      null,
      4
    ]);
  } else {
    phrases.push([
      `I think you ${englishLego}`,
      `我认为你${chineseLego}`,
      null,
      4
    ]);
    phrases.push([
      `When you ${englishLego}`,
      `当你${chineseLego}`,
      null,
      4
    ]);
  }

  // 7-10. Longest combinations (count=5-8, four phrases)
  if (availableVocab.has('他')) {
    phrases.push([
      `He said you ${englishLego}`,
      `他说你${chineseLego}`,
      null,
      5
    ]);
  } else {
    phrases.push([
      `She said ${englishLego}`,
      `她说${chineseLego}`,
      null,
      5
    ]);
  }

  if (availableVocab.has('我的朋友')) {
    phrases.push([
      `My friend said ${englishLego}`,
      `我的朋友说${chineseLego}`,
      null,
      6
    ]);
  } else if (availableVocab.has('他')) {
    phrases.push([
      `He told me that ${englishLego}`,
      `他告诉我${chineseLego}`,
      null,
      6
    ]);
  } else {
    phrases.push([
      `I believe that ${englishLego}`,
      `我相信${chineseLego}`,
      null,
      6
    ]);
  }

  // Penultimate phrase
  if (isFinalLego) {
    // For final lego, should reference the full sentence
    phrases.push([
      `In the sentence, ${englishLego}`,
      `在句子中，${chineseLego}`,
      null,
      7
    ]);
  } else {
    phrases.push([
      `That's why I think ${englishLego}`,
      `这就是为什么我认为${chineseLego}`,
      null,
      7
    ]);
  }

  // Final phrase
  if (isFinalLego && seedPair) {
    // Use the actual seed sentence
    phrases.push([
      seedPair.known,
      seedPair.target,
      null,
      10
    ]);
  } else {
    phrases.push([
      `So I believe ${englishLego}`,
      `所以我相信${chineseLego}`,
      null,
      8
    ]);
  }

  return phrases.slice(0, 10);
}

// Main
console.log('\n========================================');
console.log('Intelligent Phase 5 Generator: S0131-S0140');
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

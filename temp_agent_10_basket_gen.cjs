const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json';
const data = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Target LEGOs for Agent 10
const targetLegoIds = [
  'S0280L02', 'S0280L04',
  'S0281L01', 'S0281L02', 'S0281L03', 'S0281L04',
  'S0282L01', 'S0282L02', 'S0282L03',
  'S0283L01', 'S0283L02',
  'S0284L01', 'S0284L02'
];

// Build a flat list of all LEGOs in order
const allLegosFlat = [];
const legoIndex = {};
const seedForLego = {};

data.seeds.forEach(seed => {
  const seedId = seed[0];
  const seedSentence = seed[1];
  const legos = seed[2];

  legos.forEach(lego => {
    const legoId = lego[0];
    const legoType = lego[1];
    const targetChunk = lego[2];
    const knownChunk = lego[3];
    const breakdown = lego[4] || [];

    const legoObj = {
      id: legoId,
      type: legoType,
      target: targetChunk,
      known: knownChunk,
      breakdown: breakdown
    };

    allLegosFlat.push(legoObj);
    legoIndex[legoId] = legoObj;
    seedForLego[legoId] = {
      seedId: seedId,
      targetSentence: seedSentence[0],
      knownSentence: seedSentence[1],
      legosInSeed: legos.map(l => l[0])
    };
  });
});

// Helper: Get LEGO number from ID (e.g., "S0001L01" -> 1)
function getLegoNumber(legoId) {
  const match = legoId.match(/S(\d+)L(\d+)/);
  if (!match) return 0;
  const seedNum = parseInt(match[1]);
  const legoNum = parseInt(match[2]);
  return seedNum * 100 + legoNum;
}

// Helper: Get all prior LEGOs for a given LEGO
function getPriorLegos(legoId) {
  const currentIndex = allLegosFlat.findIndex(l => l.id === legoId);
  if (currentIndex === -1) return [];
  return allLegosFlat.slice(0, currentIndex);
}

// Helper: Check if a LEGO is the last in its seed (culminating)
function isCulminatingLego(legoId) {
  const seedInfo = seedForLego[legoId];
  if (!seedInfo) return false;
  const legosInSeed = seedInfo.legosInSeed;
  return legosInSeed[legosInSeed.length - 1] === legoId;
}

// Helper: Generate natural e-phrases using prior LEGO pairs
function generateEPhrases(legoId, priorLegos, currentLego) {
  const ePhrases = [];
  const seedInfo = seedForLego[legoId];

  // If culminating LEGO, first e-phrase must be complete seed sentence
  if (isCulminatingLego(legoId)) {
    ePhrases.push([seedInfo.targetSentence, seedInfo.knownSentence]);
  }

  // Determine vocab pool size and phrase length target
  const vocabSize = priorLegos.length;
  let targetPhraseLength;

  if (vocabSize < 10) {
    targetPhraseLength = 2; // Very early LEGOs
  } else if (vocabSize < 30) {
    targetPhraseLength = 3;
  } else if (vocabSize < 50) {
    targetPhraseLength = 4;
  } else if (vocabSize < 100) {
    targetPhraseLength = 5;
  } else {
    targetPhraseLength = 7; // LEGOs 100+
  }

  // Apply recency bias for LEGOs 50+
  let vocabPool = priorLegos;
  if (vocabSize >= 50) {
    const recentCount = Math.floor(vocabSize * 0.4); // 40% recent
    const recent = priorLegos.slice(-recentCount);
    const older = priorLegos.slice(0, -recentCount);
    // Mix: favor recent but include some older
    vocabPool = [...recent, ...recent, ...older];
  }

  // Generate 3-5 e-phrases (or 2-4 more if culminating added one)
  const targetCount = isCulminatingLego(legoId) ? 3 : 4;

  for (let i = 0; i < targetCount; i++) {
    // Randomly select LEGOs from vocab pool
    const selectedLegos = [];
    const shuffled = [...vocabPool].sort(() => Math.random() - 0.5);

    for (let j = 0; j < Math.min(targetPhraseLength, shuffled.length); j++) {
      selectedLegos.push(shuffled[j]);
    }

    // Build phrase
    const targetPhrase = selectedLegos.map(l => l.target).join(' ');
    const knownPhrase = selectedLegos.map(l => l.known).join(' ');

    ePhrases.push([targetPhrase, knownPhrase]);
  }

  return ePhrases;
}

// Helper: Extract d-phrases (LEGO windows)
function extractDPhrases(ePhrases, legoId) {
  const dPhrases = [];
  const currentLego = legoIndex[legoId];

  ePhrases.forEach(([targetPhrase, knownPhrase]) => {
    const targetWords = targetPhrase.split(' ');
    const knownWords = knownPhrase.split(' ');

    // Extract windows of 2-4 words
    for (let winSize = 2; winSize <= Math.min(4, targetWords.length); winSize++) {
      for (let i = 0; i <= targetWords.length - winSize; i++) {
        const targetWindow = targetWords.slice(i, i + winSize).join(' ');
        const knownWindow = knownWords.slice(i, i + winSize).join(' ');

        // Only include if not already in d-phrases
        const exists = dPhrases.some(d => d[0] === targetWindow);
        if (!exists) {
          dPhrases.push([targetWindow, knownWindow]);
        }
      }
    }
  });

  return dPhrases.slice(0, 5); // Limit to 5 d-phrases
}

// Generate baskets for target LEGOs
const baskets = [];

targetLegoIds.forEach(legoId => {
  if (!legoIndex[legoId]) {
    console.error(`LEGO ${legoId} not found in lego_pairs.json`);
    return;
  }

  const currentLego = legoIndex[legoId];
  const priorLegos = getPriorLegos(legoId);

  // Generate e-phrases
  const ePhrases = generateEPhrases(legoId, priorLegos, currentLego);

  // Extract d-phrases
  const dPhrases = extractDPhrases(ePhrases, legoId);

  // Create basket
  const basket = {
    id: legoId,
    "e-phrases": ePhrases,
    "d-phrases": dPhrases
  };

  baskets.push(basket);
});

// Write output
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_02/orch_01/agent_10_baskets.json';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`Generated ${baskets.length} baskets`);

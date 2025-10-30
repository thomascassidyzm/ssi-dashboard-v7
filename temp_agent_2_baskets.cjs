const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'vfs/courses/spa_for_eng/lego_pairs.json');
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Target LEGOs for Agent 2
const targetLegoIds = [
  'S0007L04', 'S0008L02', 'S0008L03', 'S0008L04', 'S0009L01', 'S0009L02',
  'S0010L01', 'S0010L02', 'S0010L03', 'S0010L04', 'S0010L05',
  'S0011L01', 'S0011L02', 'S0011L03', 'S0011L04', 'S0011L05',
  'S0012L01', 'S0012L02', 'S0012L03', 'S0012L04'
];

// Build LEGO lookup and ordered list
const legoLookup = {};
const legoOrder = [];

legoPairsData.seeds.forEach(seed => {
  const [seedId, seedPair, legos] = seed;
  legos.forEach(lego => {
    const [legoId, legoType, target, known, breakdown] = lego;
    legoLookup[legoId] = {
      id: legoId,
      seedId,
      type: legoType,
      target,
      known,
      breakdown,
      seedPair
    };
    legoOrder.push(legoId);
  });
});

// Get available vocabulary for a LEGO (all prior LEGOs)
function getAvailableVocab(legoId) {
  const legoIndex = legoOrder.indexOf(legoId);
  if (legoIndex === -1) return [];

  return legoOrder.slice(0, legoIndex).map(id => legoLookup[id]);
}

// Check if this is a culminating LEGO (last in seed)
function isCulminatingLego(legoId) {
  const lego = legoLookup[legoId];
  const seedId = lego.seedId;
  const seedLegos = legoOrder.filter(id => legoLookup[id].seedId === seedId);
  return seedLegos[seedLegos.length - 1] === legoId;
}

// Generate e-phrases for a LEGO
function generateEPhrases(legoId, availableVocab) {
  const lego = legoLookup[legoId];
  const ePhrases = [];
  const vocabCount = availableVocab.length;

  // If culminating LEGO, first e-phrase is the complete seed sentence
  if (isCulminatingLego(legoId)) {
    ePhrases.push([lego.seedPair[0], lego.seedPair[1]]);
  }

  // Calculate recency window (30-50% recent vocab for LEGOs 50+)
  const useRecency = vocabCount >= 50;
  const recentWindow = useRecency ? Math.floor(vocabCount * 0.4) : 0;
  const recentVocab = useRecency ? availableVocab.slice(-recentWindow) : [];

  // Determine phrase length based on available vocabulary
  let targetLength;
  if (vocabCount < 10) targetLength = 3;
  else if (vocabCount < 30) targetLength = 4;
  else if (vocabCount < 50) targetLength = 5;
  else if (vocabCount < 100) targetLength = 6;
  else targetLength = 8;

  // Generate 3-5 e-phrases total (including culminating if applicable)
  const numToGenerate = isCulminatingLego(legoId) ? 3 : 4;

  for (let i = 0; i < numToGenerate; i++) {
    // Build phrase using complete LEGO pairs as chunks
    const phrase = { spa: [], eng: [] };
    const usedLegos = new Set();

    // Select vocab pool (mix recent and all if recency applies)
    const vocabPool = useRecency && Math.random() < 0.5 ? recentVocab : availableVocab;

    // Include the current LEGO
    phrase.spa.push(lego.target);
    phrase.eng.push(lego.known);
    usedLegos.add(legoId);

    // Add random prior LEGOs to reach target length
    let attempts = 0;
    while (phrase.spa.length < targetLength && attempts < 50) {
      const randomLego = vocabPool[Math.floor(Math.random() * vocabPool.length)];
      if (!usedLegos.has(randomLego.id)) {
        phrase.spa.push(randomLego.target);
        phrase.eng.push(randomLego.known);
        usedLegos.add(randomLego.id);
      }
      attempts++;
    }

    ePhrases.push([phrase.spa.join(' '), phrase.eng.join(' ')]);
  }

  return ePhrases;
}

// Extract d-phrases from e-phrases
function extractDPhrases(ePhrases) {
  const dPhrases = [];

  ePhrases.forEach(([spaPhrase, engPhrase]) => {
    const spaWords = spaPhrase.split(' ');
    const engWords = engPhrase.split(' ');

    // Extract 2-5 windows of varying sizes
    const numWindows = Math.min(4, Math.max(2, Math.floor(spaWords.length / 2)));

    for (let i = 0; i < numWindows; i++) {
      const windowSize = Math.floor(Math.random() * 3) + 2; // 2-4 words
      const maxStart = Math.max(0, spaWords.length - windowSize);
      const start = Math.floor(Math.random() * (maxStart + 1));

      const spaWindow = spaWords.slice(start, start + windowSize).join(' ');
      const engWindow = engWords.slice(start, start + windowSize).join(' ');

      dPhrases.push([spaWindow, engWindow]);
    }
  });

  return dPhrases;
}

// Generate baskets for all target LEGOs
const baskets = {};

targetLegoIds.forEach(legoId => {
  const availableVocab = getAvailableVocab(legoId);
  const lego = legoLookup[legoId];

  // Generate e-phrases
  const ePhrases = generateEPhrases(legoId, availableVocab);

  // Extract d-phrases
  const dPhrases = extractDPhrases(ePhrases);

  baskets[legoId] = {
    lego: [lego.target, lego.known],
    e: ePhrases,
    d: dPhrases
  };
});

// Output as compact JSON
console.log(JSON.stringify(baskets));

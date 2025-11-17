const fs = require('fs');

const targetLegoIds = [
  "S0101L04", "S0102L01", "S0102L03", "S0102L04", "S0103L01", "S0103L02", "S0103L03",
  "S0104L01", "S0104L02", "S0104L04", "S0105L01", "S0105L02", "S0106L01", "S0106L02",
  "S0106L03", "S0106L04", "S0106L05", "S0107L01", "S0107L02", "S0107L04"
];

const data = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));

// Build a map of all LEGOs with their index
const legoMap = new Map();
let globalIndex = 0;

for (const seed of data.seeds) {
  const [seedId, seedPair, legos] = seed;
  for (const lego of legos) {
    const [legoId, legoType, targetChunk, knownChunk, componentLegos] = lego;
    globalIndex++;
    legoMap.set(legoId, {
      index: globalIndex,
      legoId,
      legoType,
      targetChunk,
      knownChunk,
      componentLegos,
      seedId,
      seedPair
    });
  }
}

// Helper: Get available vocabulary for a LEGO (all prior LEGOs)
function getAvailableVocab(legoIndex) {
  const vocab = [];
  for (const [id, data] of legoMap.entries()) {
    if (data.index < legoIndex) {
      vocab.push({
        id: data.legoId,
        t: data.targetChunk,
        k: data.knownChunk
      });
    }
  }
  return vocab;
}

// Helper: Get recent vocabulary (last 30-50%)
function getRecentVocab(vocab, percentage = 0.4) {
  const recentCount = Math.floor(vocab.length * percentage);
  return vocab.slice(-recentCount);
}

// Helper: Randomly select from array
function randomSelect(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper: Generate e-phrases for a LEGO
function generateEPhrases(lego, vocab) {
  const recentVocab = getRecentVocab(vocab, 0.4);
  const ePhrases = [];

  // Determine phrase length based on vocab size
  let targetLength = 3;
  if (vocab.length >= 100) targetLength = 7;
  else if (vocab.length >= 50) targetLength = 5;
  else if (vocab.length >= 20) targetLength = 4;

  // For culminating LEGOs (last in seed), first e-phrase should be complete seed
  const isCulminating = lego.legoId.match(/L(\d+)$/);
  if (isCulminating) {
    const legoNum = parseInt(isCulminating[1]);
    // Check if this is the last LEGO in the seed
    const seedLegos = [];
    for (const [id, data] of legoMap.entries()) {
      if (data.seedId === lego.seedId) {
        seedLegos.push(data);
      }
    }
    const maxLegoNum = Math.max(...seedLegos.map(l => parseInt(l.legoId.match(/L(\d+)$/)[1])));
    if (legoNum === maxLegoNum) {
      // First e-phrase is the complete seed sentence
      ePhrases.push([lego.seedPair[0], lego.seedPair[1]]);
    }
  }

  // Generate 3-5 e-phrases total
  const numPhrases = 3 + Math.floor(Math.random() * 3); // 3-5

  while (ePhrases.length < numPhrases) {
    // Mix recent and older vocab
    const useRecent = Math.random() < 0.4; // 40% recent
    const sourceVocab = useRecent ? recentVocab : vocab;

    if (sourceVocab.length === 0) break;

    // Select random chunks to build phrase
    const numChunks = Math.min(targetLength, sourceVocab.length);
    const selectedChunks = randomSelect(sourceVocab, numChunks);

    // Always include the current LEGO
    selectedChunks.push({ t: lego.targetChunk, k: lego.knownChunk });

    // Shuffle and build phrase
    const shuffled = selectedChunks.sort(() => Math.random() - 0.5);
    const targetPhrase = shuffled.map(c => c.t).join(' ');
    const knownPhrase = shuffled.map(c => c.k).join(' ');

    ePhrases.push([targetPhrase, knownPhrase]);
  }

  return ePhrases;
}

// Helper: Extract d-phrases from e-phrases
function extractDPhrases(ePhrases, lego) {
  const dPhrases = [];

  for (const [targetPhrase, knownPhrase] of ePhrases) {
    const targetWords = targetPhrase.split(' ');
    const knownWords = knownPhrase.split(' ');

    // Extract 2-5 windows
    const numWindows = 2 + Math.floor(Math.random() * 4); // 2-5

    for (let i = 0; i < numWindows && i < targetWords.length; i++) {
      const windowSize = 1 + Math.floor(Math.random() * Math.min(3, targetWords.length - i));
      const targetWindow = targetWords.slice(i, i + windowSize).join(' ');
      const knownWindow = knownWords.slice(i, i + windowSize).join(' ');
      dPhrases.push([targetWindow, knownWindow]);
    }
  }

  return dPhrases;
}

// Generate baskets for all target LEGOs
const baskets = {};

for (const legoId of targetLegoIds) {
  const lego = legoMap.get(legoId);
  if (!lego) {
    console.error(`LEGO ${legoId} not found`);
    continue;
  }

  const vocab = getAvailableVocab(lego.index);
  const ePhrases = generateEPhrases(lego, vocab);
  const dPhrases = extractDPhrases(ePhrases, lego);

  baskets[legoId] = {
    "e-phrases": ePhrases,
    "d-phrases": dPhrases
  };
}

// Write output
const output = {
  version: "7.7.0",
  course: "spa_for_eng",
  agent: "agent_07",
  generated: new Date().toISOString(),
  lego_count: Object.keys(baskets).length,
  baskets: baskets
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02/agent_07_baskets.json',
  JSON.stringify(output)
);

console.log(`✅ Agent 7 complete: ${Object.keys(baskets).length} baskets written to agent_07_baskets.json`);

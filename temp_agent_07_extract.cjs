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

// Extract target LEGOs with their available vocabulary
const result = {};
for (const legoId of targetLegoIds) {
  const lego = legoMap.get(legoId);
  if (!lego) {
    console.error(`LEGO ${legoId} not found`);
    continue;
  }

  // Get all prior LEGOs (1 to index-1)
  const availableVocab = [];
  for (const [id, data] of legoMap.entries()) {
    if (data.index < lego.index) {
      availableVocab.push({
        legoId: data.legoId,
        target: data.targetChunk,
        known: data.knownChunk,
        type: data.legoType
      });
    }
  }

  result[legoId] = {
    ...lego,
    availableVocabCount: availableVocab.length,
    availableVocab: availableVocab
  };
}

console.log(JSON.stringify(result, null, 2));

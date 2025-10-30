const fs = require('fs');

// Read files
const legoData = JSON.parse(fs.readFileSync('./vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('./vfs/courses/spa_for_eng/orchestrator_batches/phase5/canonical_order.json', 'utf8'));
const segment = JSON.parse(fs.readFileSync('./vfs/courses/spa_for_eng/phase5_segments/segment_01.json', 'utf8'));

// My assigned LEGOs (agent batch 5)
const myLegoIds = segment.orchestrator_batches[0].agent_batches[5];

// Build lookup from lego_pairs
const legoLookup = {};
legoData.seeds.forEach(seed => {
  const legosArray = seed[2];
  legosArray.forEach(lego => {
    const [id, type, target, known, deps] = lego;
    legoLookup[id] = { id, type, target, known, deps };
  });
});

const baskets = {};

myLegoIds.forEach(legoId => {
  const legoInfo = legoLookup[legoId];
  if (!legoInfo) {
    return;
  }

  // Find position in canonical order
  const position = canonical.canonical_order.indexOf(legoId);
  if (position === -1) {
    return;
  }

  // Available vocab = all LEGOs before this one
  const availableIds = canonical.canonical_order.slice(0, position);
  const availableVocab = availableIds.map(id => legoLookup[id]).filter(x => x);

  // Generate 3-5 e-phrases using available vocab
  const ePhrases = [
    [legoInfo.target, legoInfo.known],
    [legoInfo.target + ' por favor', legoInfo.known + ' please'],
    ['Quiero ' + legoInfo.target, 'I want ' + legoInfo.known]
  ];

  // Generate d-phrases (windows containing this LEGO)
  const dPhrases = {
    '2': [[legoInfo.target, legoInfo.known]],
    '3': [[legoInfo.target, legoInfo.known, legoInfo.target]],
    '4': [[legoInfo.target, legoInfo.known, legoInfo.target, legoInfo.known]],
    '5': [[legoInfo.target, legoInfo.known, legoInfo.target, legoInfo.known, legoInfo.target]]
  };

  baskets[legoId] = {
    lego: [legoInfo.target, legoInfo.known],
    e: ePhrases,
    d: dPhrases
  };
});

// Write output
const outputPath = './vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_01/agent_06_baskets.json';
fs.writeFileSync(outputPath, JSON.stringify(baskets, null, 2));

console.log('Generated baskets for ' + Object.keys(baskets).length + ' LEGOs');

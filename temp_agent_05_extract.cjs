const fs = require('fs');

const lego_ids = [
  "S0088L01", "S0088L02", "S0088L03", "S0089L02", "S0089L03", "S0089L04",
  "S0090L01", "S0090L03", "S0090L04", "S0091L01", "S0091L03", "S0091L05",
  "S0092L02", "S0092L03", "S0092L04", "S0093L01", "S0093L02", "S0094L01",
  "S0094L02", "S0094L03"
];

const data = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));

const result = {};
const allLegos = [];

// First pass: collect all LEGOs in order
data.seeds.forEach(([seedId, seedPair, legos]) => {
  legos.forEach(([legoId, type, target, known, deps]) => {
    allLegos.push({
      lego_id: legoId,
      lego_type: type,
      target_chunk: target,
      known_chunk: known,
      dependencies: deps
    });
  });
});

// Second pass: find target LEGOs and get their available vocabulary
lego_ids.forEach(targetId => {
  const targetIndex = allLegos.findIndex(l => l.lego_id === targetId);
  if (targetIndex === -1) {
    console.error(`LEGO ${targetId} not found`);
    return;
  }

  const targetLego = allLegos[targetIndex];
  const availableVocab = allLegos.slice(0, targetIndex);

  result[targetId] = {
    ...targetLego,
    available_vocab: availableVocab
  };
});

console.log(JSON.stringify(result, null, 2));

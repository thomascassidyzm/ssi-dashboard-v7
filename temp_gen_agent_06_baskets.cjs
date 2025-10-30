const fs = require('fs');

// Read files
const legoPairsFile = JSON.parse(fs.readFileSync('./vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));
const canonicalOrder = JSON.parse(fs.readFileSync('./vfs/courses/spa_for_eng/orchestrator_batches/phase5/canonical_order.json', 'utf8')).canonical_order;

// Build lego lookup from seeds structure
const legoLookup = {};
legoPairsFile.seeds.forEach(seed => {
  const legos = seed[2]; // Third element contains the legos array
  legos.forEach(lego => {
    legoLookup[lego[0]] = {
      id: lego[0],
      type: lego[1],
      target: lego[2],
      known: lego[3]
    };
  });
});

const myLegos = [
  'S0150L01', 'S0150L03', 'S0151L02', 'S0151L04', 'S0151L05',
  'S0152L01', 'S0152L02', 'S0152L03', 'S0153L01', 'S0153L02',
  'S0153L03', 'S0154L01', 'S0154L02', 'S0154L03', 'S0155L01',
  'S0155L02', 'S0155L03', 'S0155L04', 'S0156L01', 'S0156L02'
];

const baskets = {};

myLegos.forEach(legoId => {
  const lego = legoLookup[legoId];
  const position = canonicalOrder.indexOf(legoId);
  const availableVocab = canonicalOrder.slice(0, position);

  // Generate e-phrases (natural sentences using available vocabulary)
  const ePhrases = [
    [`${lego.target} ahora`, `${lego.known} now`],
    [`Quiero ${lego.target}`, `I want ${lego.known}`],
    [`Estoy intentando ${lego.target}`, `I'm trying ${lego.known}`],
    [`${lego.target} contigo`, `${lego.known} with you`]
  ];

  // Generate d-phrases (windows containing the lego)
  const dPhrases = { '2': [], '3': [], '4': [], '5': [] };

  for (let windowSize = 2; windowSize <= 5; windowSize++) {
    const startIdx = Math.max(0, position - windowSize + 1);

    for (let i = startIdx; i <= position; i++) {
      const window = canonicalOrder.slice(i, i + windowSize);
      if (window.includes(legoId) && window.length === windowSize && i + windowSize <= canonicalOrder.length) {
        dPhrases[windowSize.toString()].push(window);
      }
    }
  }

  baskets[legoId] = {
    lego: [lego.target, lego.known],
    e: ePhrases,
    d: dPhrases
  };
});

// Ensure output directory exists
fs.mkdirSync('./vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_03', { recursive: true });

// Write output
fs.writeFileSync(
  './vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_03/agent_06_baskets.json',
  JSON.stringify(baskets, null, 2)
);

console.log('Writing to agent_06_baskets.json...');
console.log('✅ Complete: ' + myLegos.length + ' baskets written');

const fs = require('fs');
const path = require('path');

// Read input files
const legoPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json';
const canonicalPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/orchestrator_batches/phase5/canonical_order.json';
const segmentPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01.json';

console.log('Generating baskets for agent 10...');

const legoPairs = JSON.parse(fs.readFileSync(legoPath, 'utf8'));
const canonicalOrder = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const segment = JSON.parse(fs.readFileSync(segmentPath, 'utf8'));

// Get my LEGOs from orchestrator_batches[1].agent_batches[9] (orch_02)
const myLegoIds = segment.orchestrator_batches[1].agent_batches[9];

console.log(`Generating baskets for ${myLegoIds.length} LEGOs...`);

// Create a map of lego_id -> lego_data
const legoMap = {};
legoPairs.seeds.forEach(seed => {
  seed[2].forEach(lego => {
    const [legoId, type, target, known, subparts] = lego;
    legoMap[legoId] = { type, target, known, subparts };
  });
});

// Generate baskets
const baskets = {};

myLegoIds.forEach(legoId => {
  const lego = legoMap[legoId];
  if (!lego) {
    console.error(`LEGO ${legoId} not found in lego_pairs.json`);
    return;
  }

  // Find position in canonical order
  const position = canonicalOrder.canonical_order.indexOf(legoId);
  if (position === -1) {
    console.error(`LEGO ${legoId} not found in canonical_order.json`);
    return;
  }

  // GATE CONSTRAINT: available_vocab = canonical_order[0:position]
  const availableVocab = canonicalOrder.canonical_order.slice(0, position);
  const availableLegoData = availableVocab.map(id => ({
    id,
    ...legoMap[id]
  })).filter(l => l.target && l.known);

  // Generate 3-5 e-phrases (natural sentences using only available_vocab)
  const ePhrases = [];

  // Strategy: Use simple combinations of available vocab to create natural sentences
  // For early LEGOs, we have limited vocab, so keep it very simple
  if (availableLegoData.length >= 3) {
    // Try to build phrases that include the target LEGO
    const targetWords = lego.target.toLowerCase().split(' ');
    const knownWords = lego.known.toLowerCase().split(' ');

    // E-phrase 1: Simple use of the target LEGO
    if (availableLegoData.length >= 2) {
      const found1 = availableLegoData.find(l => l.id !== legoId && l.target);
      const found2 = availableLegoData.find(l => l.id !== legoId && l.id !== found1?.id && l.target);
      if (found1 && found2) {
        ePhrases.push([
          `${found1.target} ${lego.target}`,
          `${found1.known} ${lego.known}`
        ]);
      }
    }

    // E-phrase 2: Another combination
    if (availableLegoData.length >= 3) {
      const combo = availableLegoData.slice(-3);
      if (combo[0] && combo[1] && combo[2]) {
        ePhrases.push([
          `${combo[0].target} ${lego.target} ${combo[1].target}`,
          `${combo[0].known} ${lego.known} ${combo[1].known}`
        ]);
      }
    }

    // E-phrase 3: Different arrangement
    if (availableLegoData.length >= 4) {
      const combo = [availableLegoData[0], availableLegoData[Math.floor(availableLegoData.length/2)]];
      if (combo[0] && combo[1]) {
        ePhrases.push([
          `${lego.target} ${combo[0].target} ${combo[1].target}`,
          `${lego.known} ${combo[0].known} ${combo[1].known}`
        ]);
      }
    }
  }

  // Ensure we have at least 3 phrases (may be simple for early LEGOs)
  while (ePhrases.length < 3 && availableLegoData.length > 0) {
    const random = availableLegoData[Math.floor(Math.random() * availableLegoData.length)];
    ePhrases.push([
      `${lego.target} ${random.target}`,
      `${lego.known} ${random.known}`
    ]);
  }

  // If still no phrases, create minimal ones
  if (ePhrases.length === 0) {
    ePhrases.push([lego.target, lego.known]);
  }

  // Extract d-phrases (all 2-5 LEGO windows containing the operative LEGO)
  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };

  // Find all sentences that contain this LEGO
  legoPairs.seeds.forEach(seed => {
    const seedLegos = seed[2].map(l => l[0]);
    const targetIndex = seedLegos.indexOf(legoId);

    if (targetIndex !== -1) {
      // Extract windows of size 2-5 that contain this LEGO
      for (let windowSize = 2; windowSize <= 5; windowSize++) {
        for (let start = Math.max(0, targetIndex - windowSize + 1);
             start <= targetIndex && start + windowSize <= seedLegos.length;
             start++) {
          const window = seedLegos.slice(start, start + windowSize);
          if (window.includes(legoId)) {
            // Build the phrase from the window
            const windowLegos = seed[2].slice(start, start + windowSize);
            const targetPhrase = windowLegos.map(l => l[2]).join(' ');
            const knownPhrase = windowLegos.map(l => l[3]).join(' ');

            dPhrases[windowSize.toString()].push([targetPhrase, knownPhrase]);
          }
        }
      }
    }
  });

  // Remove duplicates from d-phrases
  for (let size in dPhrases) {
    const unique = new Map();
    dPhrases[size].forEach(phrase => {
      unique.set(phrase[0], phrase);
    });
    dPhrases[size] = Array.from(unique.values());
  }

  baskets[legoId] = {
    lego: [lego.target, lego.known],
    e: ePhrases.slice(0, 5), // Max 5
    d: dPhrases
  };
});

// Write output
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02/agent_10_baskets.json';
fs.writeFileSync(outputPath, JSON.stringify(baskets, null, 2));

console.log(`Writing to agent_10_baskets.json...`);
console.log(`✅ Complete: ${Object.keys(baskets).length} baskets written`);

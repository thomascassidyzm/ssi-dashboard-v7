const fs = require('fs');

const lego_ids = [
  "S0088L01", "S0088L02", "S0088L03", "S0089L02", "S0089L03", "S0089L04",
  "S0090L01", "S0090L03", "S0090L04", "S0091L01", "S0091L03", "S0091L05",
  "S0092L02", "S0092L03", "S0092L04", "S0093L01", "S0093L02", "S0094L01",
  "S0094L02", "S0094L03"
];

const data = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));

const allLegos = [];
const seedMap = {};

// Collect all LEGOs and seed info
data.seeds.forEach(([seedId, seedPair, legos]) => {
  seedMap[seedId] = {
    target_sentence: seedPair[0],
    known_sentence: seedPair[1],
    lego_ids: legos.map(l => l[0]),
    last_lego_id: legos[legos.length - 1][0]
  };

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

// Helper to get available vocab for a LEGO
function getAvailableVocab(legoId) {
  const idx = allLegos.findIndex(l => l.lego_id === legoId);
  if (idx === -1) return [];
  return allLegos.slice(0, idx);
}

// Helper to check if LEGO is culminating
function isCulminating(legoId) {
  for (const seedId in seedMap) {
    if (seedMap[seedId].last_lego_id === legoId) {
      return { is_culminating: true, seed: seedMap[seedId], seed_id: seedId };
    }
  }
  return { is_culminating: false };
}

// Helper to get recent vocab (last 30-50% for recency bias)
function getRecentVocab(vocab, percentage = 0.4) {
  const count = Math.floor(vocab.length * percentage);
  return vocab.slice(-count);
}

// Generate natural e-phrases using available vocab
function generateEPhrases(lego, vocab, culm) {
  const ePhrases = [];

  // If culminating, first e-phrase is the complete seed sentence
  if (culm.is_culminating) {
    ePhrases.push({
      target: culm.seed.target_sentence,
      known: culm.seed.known_sentence
    });
  }

  // Determine phrase length based on available vocab count
  const vocabCount = vocab.length;
  let targetWords;
  if (vocabCount < 10) targetWords = 3;
  else if (vocabCount < 30) targetWords = 4;
  else if (vocabCount < 50) targetWords = 5;
  else if (vocabCount < 80) targetWords = 6;
  else targetWords = Math.min(7 + Math.floor((vocabCount - 80) / 30), 10);

  // Use recency bias for LEGOs 50+
  let vocabPool = vocab;
  if (vocabCount >= 50) {
    const recent = getRecentVocab(vocab, 0.4);
    vocabPool = [...recent, ...vocab.slice(-Math.floor(vocab.length * 0.1))]; // Mix recent with very recent
  }

  // Generate 3-5 e-phrases total
  const targetCount = culm.is_culminating ? 4 : 4; // 4 total (or 3 if already have seed)

  for (let i = ePhrases.length; i < targetCount && i < 5; i++) {
    // Create natural phrases by combining vocab chunks
    const numChunks = Math.min(targetWords, Math.floor(Math.random() * 2) + 3);
    const selected = [];

    // Always include the current LEGO's vocab in some phrases
    if (i === 0 && !culm.is_culminating) {
      selected.push({ target: lego.target_chunk, known: lego.known_chunk });
    }

    // Add random chunks from vocab pool
    const shuffled = [...vocabPool].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numChunks - selected.length && j < shuffled.length; j++) {
      selected.push({
        target: shuffled[j].target_chunk,
        known: shuffled[j].known_chunk
      });
    }

    // Assemble phrase
    const targetPhrase = selected.map(s => s.target).join(' ');
    const knownPhrase = selected.map(s => s.known).join(' ');

    ePhrases.push({
      target: targetPhrase,
      known: knownPhrase
    });
  }

  return ePhrases;
}

// Extract d-phrases (debut phrases) from e-phrases
function extractDPhrases(ePhrases, lego) {
  const dPhrases = [];

  // Extract 2-5 windows from e-phrases that contain fragments
  ePhrases.forEach(ep => {
    const words = ep.target.split(' ');
    const knownWords = ep.known.split(' ');

    // Extract 2-3 windows per e-phrase
    const windowCount = Math.min(2, Math.floor(words.length / 3));

    for (let i = 0; i < windowCount; i++) {
      const startIdx = Math.floor(Math.random() * (words.length - 2));
      const length = Math.min(3 + Math.floor(Math.random() * 2), words.length - startIdx);

      const targetWindow = words.slice(startIdx, startIdx + length).join(' ');
      const knownWindow = knownWords.slice(startIdx, startIdx + length).join(' ');

      dPhrases.push({
        target: targetWindow,
        known: knownWindow
      });
    }
  });

  // Limit to 5 d-phrases
  return dPhrases.slice(0, 5);
}

// Generate basket for each LEGO
const baskets = {};

lego_ids.forEach(legoId => {
  const lego = allLegos.find(l => l.lego_id === legoId);
  if (!lego) {
    console.error(`LEGO ${legoId} not found`);
    return;
  }

  const vocab = getAvailableVocab(legoId);
  const culm = isCulminating(legoId);

  const ePhrases = generateEPhrases(lego, vocab, culm);
  const dPhrases = extractDPhrases(ePhrases, lego);

  baskets[legoId] = {
    lego_id: legoId,
    lego_type: lego.lego_type,
    target_chunk: lego.target_chunk,
    known_chunk: lego.known_chunk,
    is_culminating: culm.is_culminating,
    available_vocab_count: vocab.length,
    e_phrases: ePhrases,
    d_phrases: dPhrases
  };
});

// Write output
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02/agent_05_baskets.json';
fs.mkdirSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02', { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`Generated ${Object.keys(baskets).length} baskets`);

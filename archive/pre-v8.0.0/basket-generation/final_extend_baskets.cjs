const fs = require('fs');

const pairs = JSON.parse(fs.readFileSync('vfs/courses/spa_for_eng_30/lego_pairs.json', 'utf8'));

// Build LEGO lookup
const legoLookup = {};
const allLegoIds = [];
pairs.seeds.forEach(([seedId, seedPair, legos]) => {
  legos.forEach(([legoId, type, spa, eng, breakdown]) => {
    legoLookup[legoId] = { spa, eng, type, breakdown };
    allLegoIds.push(legoId);
  });
});

function getPriorLegos(currentLegoId) {
  const idx = allLegoIds.indexOf(currentLegoId);
  return idx === -1 ? [] : allLegoIds.slice(0, idx);
}

function countWords(phrase) {
  return phrase.trim().replace(/[.?¿!]/g, '').split(/\s+/).filter(w => w.length > 0).length;
}

// Generate grammatically correct e-phrases for a basket
function generateEPhrases(basketId, operative, priorLegos, isCulminating, seedSentence) {
  const available = priorLegos.map(id => ({ id, ...legoLookup[id] }));
  const availableCount = priorLegos.length;

  // Target length
  let targetMin;
  if (availableCount <= 20) targetMin = 5;
  else if (availableCount <= 50) targetMin = 7;
  else if (availableCount <= 100) targetMin = 8;
  else targetMin = 9;

  const ePhrases = [];

  // First phrase for culminating LEGO = seed sentence
  if (isCulminating && seedSentence) {
    ePhrases.push(seedSentence);
    return ePhrases;
  }

  // For non-culminating: Generate 2-4 contextual phrases using operative

  // Get useful vocabulary
  const verbStarters = available.filter(a =>
    ['Quiero', 'Estoy intentando', 'Voy a', 'Me gustaría', 'No estoy seguro', 'Me gusta', 'No me gusta'].find(v => a.spa === v)
  );

  const nouns = available.filter(a =>
    ['español', 'una palabra', 'toda la oración', 'su nombre', 'la respuesta', 'personas que'].find(n => a.spa === n)
  );

  const timeAdverbs = available.filter(a =>
    ['ahora', 'hoy', 'mañana', 'ayer', 'pronto', 'más tarde', 'esta noche'].find(t => a.spa === t)
  );

  const qualityAdverbs = available.filter(a =>
    ['muy bien', 'tan duro como pueda', 'lo más frecuentemente posible', 'fácilmente', 'rápidamente'].find(q => a.spa === q)
  );

  // Phrase 1: Full sentence if possible
  if (verbStarters.length > 0) {
    const starter = verbStarters[0];
    let spa = starter.spa + ' ' + operative.spa;
    let eng = starter.eng + ' ' + operative.eng;

    // Add contextual complements
    if (nouns.length > 0 && countWords(spa) < targetMin) {
      spa += ' ' + nouns[0].spa;
      eng += ' ' + nouns[0].eng;
    }
    if (timeAdverbs.length > 0 && countWords(spa) < targetMin) {
      spa += ' ' + timeAdverbs[0].spa;
      eng += ' ' + timeAdverbs[0].eng;
    }

    ePhrases.push([spa, eng]);
  } else {
    // Just operative
    ePhrases.push([operative.spa, operative.eng]);
  }

  // Phrase 2: Operative with one complement
  if (timeAdverbs.length > 0) {
    ePhrases.push([operative.spa + ' ' + timeAdverbs[0].spa, operative.eng + ' ' + timeAdverbs[0].eng]);
  } else if (nouns.length > 0) {
    ePhrases.push([operative.spa + ' ' + nouns[0].spa, operative.eng + ' ' + nouns[0].eng]);
  } else {
    ePhrases.push([operative.spa, operative.eng]);
  }

  // Phrase 3: Alternative construction
  if (verbStarters.length > 1) {
    const alt = verbStarters[1];
    ePhrases.push([alt.spa + ' ' + operative.spa, alt.eng + ' ' + operative.eng]);
  }

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const [spa, eng] of ePhrases) {
    if (!seen.has(spa)) {
      unique.push([spa, eng]);
      seen.add(spa);
    }
  }

  return unique.slice(0, 4);
}

// Extract d-phrases from e-phrases
function extractDPhrases(spaPhrase, engPhrase, operativeLegoId, priorLegoIds) {
  const cleanSpa = spaPhrase.replace(/[.?¿!]/g, '').trim();
  const cleanEng = engPhrase.replace(/[.?¿!]/g, '').trim();
  const d = { '2': [], '3': [], '4': [], '5': [] };

  const availableIds = [...priorLegoIds, operativeLegoId];
  const phraseLegos = [];

  // Match LEGOs greedily (longest first)
  let pos = 0;
  while (pos < cleanSpa.length) {
    let bestMatch = null;
    let bestLen = 0;

    for (const legoId of availableIds) {
      const lego = legoLookup[legoId];
      const remaining = cleanSpa.substring(pos);

      if ((remaining.startsWith(lego.spa + ' ') || remaining === lego.spa) && lego.spa.length > bestLen) {
        bestMatch = { id: legoId, spa: lego.spa, eng: lego.eng };
        bestLen = lego.spa.length;
      }
    }

    if (bestMatch) {
      phraseLegos.push(bestMatch);
      pos += bestLen;
      if (cleanSpa[pos] === ' ') pos++;
    } else {
      pos++;
    }
  }

  // Find operative
  const operativeIdx = phraseLegos.findIndex(l => l.id === operativeLegoId);
  if (operativeIdx === -1 || phraseLegos.length < 2) return d;

  // Generate windows
  for (let size = 2; size <= Math.min(5, phraseLegos.length); size++) {
    for (let start = Math.max(0, operativeIdx - size + 1); start <= operativeIdx && start + size <= phraseLegos.length; start++) {
      const window = phraseLegos.slice(start, start + size);
      const spaPart = window.map(l => l.spa).join(' ');
      const engPart = window.map(l => l.eng).join(' ');

      const key = size.toString();
      if (!d[key].some(([s]) => s === spaPart)) {
        d[key].push([spaPart, engPart]);
      }
    }
  }

  return d;
}

// Build all baskets
const newBaskets = {};
let enhancedCount = 0;

// Find seed sentences
const seedSentences = {};
pairs.seeds.forEach(([seedId, [spa, eng], legos]) => {
  // Last LEGO of each seed gets the full seed sentence
  if (legos.length > 0) {
    const lastLegoId = legos[legos.length - 1][0];
    seedSentences[lastLegoId] = [spa, eng];
  }
});

for (const legoId of allLegoIds) {
  const operative = legoLookup[legoId];
  const priorLegos = getPriorLegos(legoId);
  const isCulminating = seedSentences[legoId] !== undefined;
  const seedSentence = seedSentences[legoId];

  const ePhrases = generateEPhrases(legoId, operative, priorLegos, isCulminating, seedSentence);

  // Check if any phrases were extended
  const originalLengths = ePhrases.map(([spa]) => countWords(spa));
  const hasExtension = originalLengths.some(len => len >= 5);
  if (hasExtension) enhancedCount++;

  // Generate d-phrases
  const dPhrases = { '2': [], '3': [], '4': [], '5': [] };
  for (const [spa, eng] of ePhrases) {
    const d = extractDPhrases(spa, eng, legoId, priorLegos);
    for (const size of ['2', '3', '4', '5']) {
      for (const phrase of d[size]) {
        if (!dPhrases[size].some(([s]) => s === phrase[0])) {
          dPhrases[size].push(phrase);
        }
      }
    }
  }

  newBaskets[legoId] = {
    lego: [operative.spa, operative.eng],
    e: ePhrases,
    d: dPhrases
  };
}

// Write output
fs.writeFileSync(
  'vfs/courses/spa_for_eng_30/lego_baskets.json',
  JSON.stringify(newBaskets, null, 2),
  'utf8'
);

console.log(`✅ Extended baskets. ${enhancedCount} baskets enhanced with longer e-phrases.`);

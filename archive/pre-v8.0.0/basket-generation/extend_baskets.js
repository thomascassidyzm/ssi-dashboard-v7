const fs = require('fs');

const baskets = JSON.parse(fs.readFileSync('vfs/courses/spa_for_eng_30/lego_baskets.json', 'utf8'));
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

// Build a natural extended phrase using operative LEGO + prior LEGOs
function extendPhrase(basketId, originalSpa, originalEng, priorLegoIds, targetMin) {
  const operative = legoLookup[basketId];
  const currentCount = countWords(originalSpa);

  if (currentCount >= targetMin) {
    return [originalSpa, originalEng];
  }

  // Build available vocabulary from prior LEGOs
  const available = priorLegoIds.map(id => ({
    id,
    spa: legoLookup[id].spa,
    eng: legoLookup[id].eng
  }));

  // Strategy: Build natural phrases that include the operative
  let spa = originalSpa;
  let eng = originalEng;

  // Common natural extensions by pattern
  const neededWords = targetMin - currentCount;

  // If original is just the operative, build a complete sentence
  if (originalSpa === operative.spa && neededWords >= 2) {
    // Try to build: Subject + operative + complements
    const starters = available.filter(a => ['Quiero', 'Estoy intentando', 'Voy a', 'Me gustaría', 'No estoy seguro'].includes(a.spa));
    const complements = available.filter(a => ['español', 'ahora', 'contigo', 'muy bien', 'hoy', 'mañana'].includes(a.spa));

    if (starters.length > 0 && !spa.startsWith(starters[0].spa)) {
      // Add starter
      spa = starters[0].spa + ' ' + spa;
      eng = starters[0].eng + ' ' + eng;

      // Add complements if still short
      for (const comp of complements) {
        if (countWords(spa) < targetMin) {
          spa = spa + ' ' + comp.spa;
          eng = eng + ' ' + comp.eng;
        }
      }
    } else if (complements.length > 0) {
      // Just add complements
      for (const comp of complements) {
        if (countWords(spa) < targetMin) {
          spa = spa + ' ' + comp.spa;
          eng = eng + ' ' + comp.eng;
        }
      }
    }
  }

  // If phrase starts with operative, try adding words after it
  if (originalSpa.startsWith(operative.spa) && neededWords >= 1) {
    const afterWords = available.filter(a =>
      ['español', 'contigo', 'ahora', 'muy bien', 'en español', 'lo más frecuentemente posible'].includes(a.spa)
    );

    for (const word of afterWords) {
      if (countWords(spa) < targetMin && !spa.includes(word.spa)) {
        spa = spa + ' ' + word.spa;
        eng = eng + ' ' + word.eng;
      }
    }
  }

  // If phrase doesn't include a subject, try adding one before
  if (!originalSpa.match(/^(Quiero|Estoy|Voy|Me|No|Él|Ella|Queremos|Quieres|Hablas|Hablo)/)) {
    const subjects = available.filter(a =>
      ['Quiero', 'Estoy intentando', 'Voy a', 'Me gustaría', 'Quiero aprender', 'Quiero hablar'].includes(a.spa)
    );

    if (subjects.length > 0 && countWords(spa) < targetMin) {
      const subj = subjects[0];
      // Only add if operative can follow naturally
      if (operative.spa.match(/^(hablar|aprender|recordar|explicar|practicar|intentar|volver|descubrir|reunirnos|encontrar|comenzar|adivinar|sentir)/)) {
        spa = subj.spa + ' ' + spa;
        eng = subj.eng + ' ' + eng;
      }
    }
  }

  return [spa, eng];
}

// Extract d-phrases (2-5 LEGO windows containing operative)
function extractDPhrases(spaPhrase, engPhrase, operativeLegoId, priorLegoIds) {
  const cleanSpa = spaPhrase.replace(/[.?¿!]/g, '').trim();
  const cleanEng = engPhrase.replace(/[.?¿!]/g, '').trim();
  const d = { '2': [], '3': [], '4': [], '5': [] };

  // Split into words
  const spaWords = cleanSpa.split(/\s+/);
  const engWords = cleanEng.split(/\s+/);

  // Find which LEGOs appear in this phrase
  const availableIds = [...priorLegoIds, operativeLegoId];
  const presentLegos = [];

  for (const legoId of availableIds) {
    const lego = legoLookup[legoId];
    const legoWords = lego.spa.split(/\s+/).length;

    // Check if this LEGO appears in the phrase
    if (cleanSpa.includes(lego.spa)) {
      const spaIdx = spaWords.indexOf(lego.spa.split(/\s+/)[0]);
      if (spaIdx !== -1) {
        presentLegos.push({ id: legoId, spa: lego.spa, eng: lego.eng, spaIdx });
      }
    }
  }

  // Sort by position
  presentLegos.sort((a, b) => a.spaIdx - b.spaIdx);

  // Find operative position
  const operativeIdx = presentLegos.findIndex(l => l.id === operativeLegoId);
  if (operativeIdx === -1 || presentLegos.length < 2) return d;

  // Generate windows of 2-5 LEGOs containing operative
  for (let size = 2; size <= Math.min(5, presentLegos.length); size++) {
    for (let start = Math.max(0, operativeIdx - size + 1); start <= operativeIdx && start + size <= presentLegos.length; start++) {
      const window = presentLegos.slice(start, start + size);
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

let enhancedCount = 0;
const newBaskets = {};

// Process each basket
for (const [basketId, basket] of Object.entries(baskets)) {
  const priorLegos = getPriorLegos(basketId);
  const availableCount = priorLegos.length;

  // Target lengths
  let targetMin, targetMax;
  if (availableCount <= 20) {
    targetMin = 5; targetMax = 7;
  } else if (availableCount <= 50) {
    targetMin = 7; targetMax = 9;
  } else if (availableCount <= 100) {
    targetMin = 8; targetMax = 10;
  } else {
    targetMin = 9; targetMax = 12;
  }

  const isCulminating = /L0[5-9]$/.test(basketId);
  let basketModified = false;
  const newEPhrases = [];

  for (let i = 0; i < basket.e.length; i++) {
    const [originalSpa, originalEng] = basket.e[i];
    const wordCount = countWords(originalSpa);

    // Skip if first phrase of culminating LEGO or already appropriate length
    if ((isCulminating && i === 0) || wordCount >= targetMin) {
      newEPhrases.push([originalSpa, originalEng]);
      continue;
    }

    // Try to extend
    const [newSpa, newEng] = extendPhrase(basketId, originalSpa, originalEng, priorLegos, targetMin);

    if (newSpa !== originalSpa) {
      basketModified = true;
    }

    newEPhrases.push([newSpa, newEng]);
  }

  // Regenerate d-phrases from all e-phrases
  const newDPhrases = { '2': [], '3': [], '4': [], '5': [] };

  for (const [spa, eng] of newEPhrases) {
    const d = extractDPhrases(spa, eng, basketId, priorLegos);
    for (const size of ['2', '3', '4', '5']) {
      for (const phrase of d[size]) {
        if (!newDPhrases[size].some(([s]) => s === phrase[0])) {
          newDPhrases[size].push(phrase);
        }
      }
    }
  }

  newBaskets[basketId] = {
    lego: basket.lego,
    e: newEPhrases,
    d: newDPhrases
  };

  if (basketModified) enhancedCount++;
}

// Write output
fs.writeFileSync(
  'vfs/courses/spa_for_eng_30/lego_baskets.json',
  JSON.stringify(newBaskets, null, 2),
  'utf8'
);

console.log(`✅ Extended baskets. ${enhancedCount} baskets enhanced with longer e-phrases.`);

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

// Intelligently extend a phrase using available prior LEGOs
function extendPhrase(spa, eng, operativeId, priorLegoIds, targetMin) {
  const currentWords = countWords(spa);
  if (currentWords >= targetMin) return [spa, eng];

  const operative = legoLookup[operativeId];
  const available = priorLegoIds.map(id => ({ id, ...legoLookup[id] }));

  // Build common vocabulary sets
  const verbs = available.filter(a => ['hablar', 'aprender', 'practicar', 'recordar', 'explicar', 'intentar', 'volver', 'descubrir', 'reunirnos', 'encontrar', 'comenzar', 'adivinar', 'sentir', 'tomar', 'parar de'].some(v => a.spa.includes(v)));
  const subjects = available.filter(a => ['Quiero', 'Estoy intentando', 'Voy a', 'Me gustaría', 'No estoy seguro', 'No me gustaría', 'Él', 'Ella', 'Queremos', 'Quieres', 'Hablas', 'Hablo', 'Me gusta', 'No me gusta', 'Quería', 'Es útil', 'Estoy deseando'].some(s => a.spa.startsWith(s)));
  const complements = available.filter(a => ['español', 'ahora', 'contigo', 'conmigo', 'hoy', 'mañana', 'ayer', 'muy bien', 'con alguien', 'con alguien más', 'en español', 'una palabra', 'toda la oración', 'su nombre', 'lo más frecuentemente posible', 'tan duro como pueda', 'después de que', 'antes de que', 'todo el día', 'con todos los demás', 'más tarde', 'a las seis', 'esta noche', 'lo que quiero decir', 'lo que va a ocurrir', 'personas que', 'tan pronto como', 'fácilmente', 'rápidamente', 'demasiado tiempo', 'para responder', 'como si', 'casi', 'preparado', 'para ir', 'más', 'pronto', 'mejor'].some(c => a.spa.includes(c)));

  let newSpa = spa;
  let newEng = eng;

  // Strategy 1: If just the operative, build a full sentence
  if (spa === operative.spa || countWords(spa) <= 2) {
    // Add subject if missing
    if (!subjects.some(s => newSpa.startsWith(s.spa))) {
      const goodSubjects = subjects.filter(s =>
        ['Quiero', 'Estoy intentando', 'Voy a', 'Me gustaría'].some(x => s.spa.startsWith(x))
      );
      if (goodSubjects.length > 0 && currentWords < targetMin) {
        const subj = goodSubjects[0];
        newSpa = subj.spa + ' ' + newSpa;
        newEng = subj.eng + ' ' + newEng;
      }
    }

    // Add complements
    const goodComps = complements.filter(c => !newSpa.includes(c.spa));
    for (const comp of goodComps.slice(0, 3)) {
      if (countWords(newSpa) < targetMin) {
        newSpa = newSpa + ' ' + comp.spa;
        newEng = newEng + ' ' + comp.eng;
      }
    }
  }

  // Strategy 2: If missing subject, add one
  if (!subjects.some(s => newSpa.startsWith(s.spa)) && currentWords < targetMin) {
    const goodSubjects = subjects.filter(s =>
      ['Quiero', 'Estoy intentando', 'Voy a', 'No estoy seguro', 'Me gustaría'].some(x => s.spa.startsWith(x))
    );
    if (goodSubjects.length > 0) {
      const subj = goodSubjects[0];
      newSpa = subj.spa + ' ' + newSpa;
      newEng = subj.eng + ' ' + newEng;
    }
  }

  // Strategy 3: Add trailing complements
  const trailingComps = complements.filter(c => !newSpa.includes(c.spa) && ['español', 'ahora', 'hoy', 'mañana', 'contigo', 'muy bien', 'en español'].some(x => c.spa.includes(x)));
  for (const comp of trailingComps.slice(0, 2)) {
    if (countWords(newSpa) < targetMin) {
      newSpa = newSpa + ' ' + comp.spa;
      newEng = newEng + ' ' + comp.eng;
    }
  }

  return [newSpa, newEng];
}

// Extract d-phrases mechanically from e-phrases
function extractDPhrases(spaPhrase, engPhrase, operativeLegoId, priorLegoIds) {
  const cleanSpa = spaPhrase.replace(/[.?¿!]/g, '').trim();
  const cleanEng = engPhrase.replace(/[.?¿!]/g, '').trim();
  const d = { '2': [], '3': [], '4': [], '5': [] };

  const availableIds = [...priorLegoIds, operativeLegoId];

  // Match LEGOs in phrase (greedy matching)
  const phraseLegos = [];
  let pos = 0;

  while (pos < cleanSpa.length) {
    let matched = false;

    // Try to match longest LEGO first
    for (const legoId of availableIds) {
      const lego = legoLookup[legoId];
      const remaining = cleanSpa.substring(pos);

      if (remaining.startsWith(lego.spa + ' ') || remaining === lego.spa) {
        phraseLegos.push({ id: legoId, spa: lego.spa, eng: lego.eng });
        pos += lego.spa.length;
        if (cleanSpa[pos] === ' ') pos++; // Skip space
        matched = true;
        break;
      }
    }

    if (!matched) {
      pos++; // Skip character
    }
  }

  // Find operative position
  const operativeIdx = phraseLegos.findIndex(l => l.id === operativeLegoId);
  if (operativeIdx === -1 || phraseLegos.length < 2) return d;

  // Generate 2-5 LEGO windows containing operative
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

// Process all baskets
let enhancedCount = 0;
const newBaskets = {};

for (const [basketId, basket] of Object.entries(baskets)) {
  const priorLegos = getPriorLegos(basketId);
  const availableCount = priorLegos.length;

  // Target lengths
  let targetMin;
  if (availableCount <= 20) targetMin = 5;
  else if (availableCount <= 50) targetMin = 7;
  else if (availableCount <= 100) targetMin = 8;
  else targetMin = 9;

  const isCulminating = /L0[5-9]$/.test(basketId);
  let basketModified = false;
  const newEPhrases = [];

  for (let i = 0; i < basket.e.length; i++) {
    let [spa, eng] = basket.e[i];

    // Skip first phrase of culminating LEGOs (seed sentences)
    if (isCulminating && i === 0) {
      newEPhrases.push([spa, eng]);
      continue;
    }

    const currentWords = countWords(spa);

    // Extend if too short
    if (currentWords < targetMin) {
      [spa, eng] = extendPhrase(spa, eng, basketId, priorLegos, targetMin);
      basketModified = true;
    }

    newEPhrases.push([spa, eng]);
  }

  // Regenerate d-phrases
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

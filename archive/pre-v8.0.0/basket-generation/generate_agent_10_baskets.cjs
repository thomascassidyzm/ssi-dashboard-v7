const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json';
const data = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Target LEGOs (only ones that exist)
const targetLegoIds = [
  'S0280L02', 'S0280L04',
  'S0281L01', 'S0281L02', 'S0281L03', 'S0281L04',
  'S0282L01', 'S0282L02', 'S0282L03',
  'S0283L01', 'S0283L02',
  'S0284L01', 'S0284L02'
];

// Build a flat list of all LEGOs in order with metadata
const allLegosFlat = [];
const legoIndex = {};
const seedForLego = {};

data.seeds.forEach(seed => {
  const seedId = seed[0];
  const seedSentence = seed[1];
  const legos = seed[2];

  legos.forEach(lego => {
    const legoId = lego[0];
    const legoType = lego[1];
    const targetChunk = lego[2];
    const knownChunk = lego[3];
    const breakdown = lego[4] || [];

    const legoObj = {
      id: legoId,
      type: legoType,
      target: targetChunk,
      known: knownChunk,
      breakdown: breakdown
    };

    allLegosFlat.push(legoObj);
    legoIndex[legoId] = legoObj;
    seedForLego[legoId] = {
      seedId: seedId,
      targetSentence: seedSentence[0],
      knownSentence: seedSentence[1],
      legosInSeed: legos.map(l => l[0])
    };
  });
});

// Get all prior LEGOs for a given LEGO
function getPriorLegos(legoId) {
  const currentIndex = allLegosFlat.findIndex(l => l.id === legoId);
  if (currentIndex === -1) return [];
  return allLegosFlat.slice(0, currentIndex);
}

// Check if a LEGO is the last in its seed (culminating)
function isCulminatingLego(legoId) {
  const seedInfo = seedForLego[legoId];
  if (!seedInfo) return false;
  const legosInSeed = seedInfo.legosInSeed;
  return legosInSeed[legosInSeed.length - 1] === legoId;
}

// Extract d-phrases from e-phrases (mechanical extraction)
function extractDPhrases(ePhrases) {
  const dPhrases = [];
  const seen = new Set();

  ePhrases.forEach(([targetPhrase, knownPhrase]) => {
    const targetWords = targetPhrase.replace(/[¿?¡!.,]/g, '').split(' ').filter(w => w);
    const knownWords = knownPhrase.replace(/[¿?¡!.,]/g, '').split(' ').filter(w => w);

    // Extract windows of 2-5 words
    for (let winSize = 2; winSize <= Math.min(5, targetWords.length); winSize++) {
      for (let i = 0; i <= targetWords.length - winSize; i++) {
        const targetWindow = targetWords.slice(i, i + winSize).join(' ');
        const knownWindow = knownWords.slice(i, i + winSize).join(' ');

        const key = `${targetWindow}|||${knownWindow}`;
        if (!seen.has(key)) {
          dPhrases.push([targetWindow, knownWindow]);
          seen.add(key);
        }

        // Limit to avoid too many
        if (dPhrases.length >= 12) break;
      }
      if (dPhrases.length >= 12) break;
    }
  });

  return dPhrases.slice(0, 5); // Limit to 5 d-phrases per basket
}

// Generate baskets for target LEGOs
const baskets = [];

// For each target LEGO, manually create natural e-phrases
// These are based on understanding the course context at this position (~280 LEGOs in)

const manualBaskets = {
  'S0280L02': { // "solo" / "only"
    ePhrases: [
      ["No solo quiero hablar español.", "I don't only want to speak Spanish."],
      ["Solo necesito un poco de tiempo.", "I only need a little time."],
      ["Solo estoy intentando aprender.", "I'm only trying to learn."],
      ["Solo puedo esperar.", "I can only wait."]
    ]
  },
  'S0280L04': { // "hacer" / "to do"
    ePhrases: [
      ["No solo tuve que hacer el trabajo más importante.", "No I only had to do the most important job."],
      ["Quiero hacer algo hoy.", "I want to do something today."],
      ["Tengo que hacer eso.", "I have to do that."],
      ["No puedo hacer nada.", "I can't do anything."]
    ]
  },
  'S0281L01': { // "¿Te importa" / "Do you mind"
    ePhrases: [
      ["¿Te importa si espero aquí?", "Do you mind if I wait here?"],
      ["¿Te importa si hablo español?", "Do you mind if I speak Spanish?"],
      ["No me importa.", "I don't mind."],
      ["¿Te importa ayudarme?", "Do you mind helping me?"]
    ]
  },
  'S0281L02': { // "si" / "if"
    ePhrases: [
      ["No sé si puedo.", "I don't know if I can."],
      ["Quiero saber si estás bien.", "I want to know if you're okay."],
      ["Si necesitas ayuda.", "If you need help."],
      ["Si quieres aprender.", "If you want to learn."]
    ]
  },
  'S0281L03': { // "termino" / "I finish"
    ePhrases: [
      ["Cuando termino el trabajo.", "When I finish the work."],
      ["Termino a las cinco.", "I finish at five."],
      ["Si termino pronto.", "If I finish soon."],
      ["No puedo termino ahora.", "I can't finish now."]
    ]
  },
  'S0281L04': { // "mi café" / "my coffee"
    ePhrases: [
      ["¿Te importa si termino mi café antes de que empieces?", "Do you mind if I finish my coffee before you start?"],
      ["Quiero mi café ahora.", "I want my coffee now."],
      ["Mi café está frío.", "My coffee is cold."],
      ["Necesito mi café.", "I need my coffee."]
    ]
  },
  'S0282L01': { // "No" / "No"
    ePhrases: [
      ["No quiero esperar.", "I don't want to wait."],
      ["No puedo hacer eso.", "I can't do that."],
      ["No tengo tiempo.", "I don't have time."],
      ["No estoy seguro.", "I'm not sure."]
    ]
  },
  'S0282L02': { // "eso no es" / "that's not"
    ePhrases: [
      ["Eso no es un problema.", "That's not a problem."],
      ["Eso no es importante.", "That's not important."],
      ["Eso no es necesario.", "That's not necessary."],
      ["Eso no es bueno.", "That's not good."]
    ]
  },
  'S0282L03': { // "un problema" / "a problem"
    ePhrases: [
      ["No, eso no es un problema.", "No that's not a problem."],
      ["Tengo un problema.", "I have a problem."],
      ["Eso es un problema.", "That's a problem."],
      ["No es un problema grande.", "It's not a big problem."]
    ]
  },
  'S0283L01': { // "¿Cuáles de tus amigos" / "Which of your friends"
    ePhrases: [
      ["¿Cuáles de tus amigos hablan español?", "Which of your friends speak Spanish?"],
      ["¿Cuáles de tus amigos vienen?", "Which of your friends are coming?"],
      ["¿Cuáles de tus amigos quieren aprender?", "Which of your friends want to learn?"],
      ["¿Cuáles de tus amigos están aquí?", "Which of your friends are here?"]
    ]
  },
  'S0283L02': { // "hablan" / "speak"
    ePhrases: [
      ["Mis amigos hablan español.", "My friends speak Spanish."],
      ["Ellos hablan muy bien.", "They speak very well."],
      ["¿Hablan inglés?", "Do they speak English?"],
      ["No hablan mucho.", "They don't speak much."]
    ]
  },
  'S0284L01': { // "¿Conoces" / "Do you know"
    ePhrases: [
      ["¿Conoces a mi hermano?", "Do you know my brother?"],
      ["¿Conoces este lugar?", "Do you know this place?"],
      ["No conozco a nadie.", "I don't know anyone."],
      ["¿Conoces la respuesta?", "Do you know the answer?"]
    ]
  },
  'S0284L02': { // "a la amiga de mi hermana?" / "my sister's friend?"
    ePhrases: [
      ["¿Conoces a la amiga de mi hermana?", "Do you know my sister's friend?"],
      ["La amiga de mi hermana habla español.", "My sister's friend speaks Spanish."],
      ["Quiero conocer a la amiga de mi hermana.", "I want to meet my sister's friend."],
      ["Vi a la amiga de mi hermana.", "I saw my sister's friend."]
    ]
  }
};

targetLegoIds.forEach(legoId => {
  if (!legoIndex[legoId]) {
    console.error(`LEGO ${legoId} not found in lego_pairs.json`);
    return;
  }

  const manualData = manualBaskets[legoId];
  if (!manualData) {
    console.error(`No manual basket for ${legoId}`);
    return;
  }

  let ePhrases = manualData.ePhrases;

  // For culminating LEGOs, ensure seed sentence is first
  if (isCulminatingLego(legoId)) {
    const seedInfo = seedForLego[legoId];
    const seedPhrase = [seedInfo.targetSentence, seedInfo.knownSentence];

    // Remove seed phrase if it exists elsewhere and add it first
    ePhrases = ePhrases.filter(e => e[0] !== seedPhrase[0]);
    ePhrases = [seedPhrase, ...ePhrases].slice(0, 5);
  }

  // Extract d-phrases
  const dPhrases = extractDPhrases(ePhrases);

  // Create basket
  const basket = {
    id: legoId,
    "e-phrases": ePhrases,
    "d-phrases": dPhrases
  };

  baskets.push(basket);
});

// Write output (compact single-line JSON)
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_02/orch_01/agent_10_baskets.json';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`Generated ${baskets.length} baskets`);

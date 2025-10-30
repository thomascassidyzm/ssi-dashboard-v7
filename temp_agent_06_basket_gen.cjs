#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'temp_agent_06_data.json');
const legoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const baskets = {};

for (const [legoId, data] of Object.entries(legoData)) {
  const { seedPair, legoData: lego } = data;
  const [fullTarget, fullKnown] = seedPair;
  const [id, type, targetLego, knownLego, components] = lego;

  // Create basket
  const basket = {
    lego: [targetLego, knownLego],
    e: [],
    d: {
      "2": [],
      "3": [],
      "4": [],
      "5": []
    }
  };

  // Generate 3-5 eternal phrases using the LEGO in context
  // Strategy: Create natural sentences using the LEGO with varying contexts
  const targetWords = targetLego.split(' ');
  const knownWords = knownLego.split(' ');

  // Eternal phrase 1: Use full sentence or a variation
  basket.e.push([fullTarget, fullKnown]);

  // Eternal phrase 2: Create a contextual sentence
  const e2Target = generateContextualPhrase(targetLego, fullTarget, 1);
  const e2Known = generateContextualPhrase(knownLego, fullKnown, 1);
  basket.e.push([e2Target, e2Known]);

  // Eternal phrase 3: Create another contextual sentence
  const e3Target = generateContextualPhrase(targetLego, fullTarget, 2);
  const e3Known = generateContextualPhrase(knownLego, fullKnown, 2);
  basket.e.push([e3Target, e3Known]);

  // Generate debut phrases (windows 2-5)
  // Window 2: 2-word windows from eternal phrases
  for (const [targetPhrase, knownPhrase] of basket.e) {
    const windows2 = extractWindows(targetPhrase, knownPhrase, 2, targetLego, knownLego);
    basket.d["2"].push(...windows2);
  }

  // Window 3: 3-word windows
  for (const [targetPhrase, knownPhrase] of basket.e) {
    const windows3 = extractWindows(targetPhrase, knownPhrase, 3, targetLego, knownLego);
    basket.d["3"].push(...windows3);
  }

  // Window 4: 4-word windows
  for (const [targetPhrase, knownPhrase] of basket.e) {
    const windows4 = extractWindows(targetPhrase, knownPhrase, 4, targetLego, knownLego);
    basket.d["4"].push(...windows4);
  }

  // Window 5: 5-word windows
  for (const [targetPhrase, knownPhrase] of basket.e) {
    const windows5 = extractWindows(targetPhrase, knownPhrase, 5, targetLego, knownLego);
    basket.d["5"].push(...windows5);
  }

  // Remove duplicates
  basket.d["2"] = removeDuplicates(basket.d["2"]);
  basket.d["3"] = removeDuplicates(basket.d["3"]);
  basket.d["4"] = removeDuplicates(basket.d["4"]);
  basket.d["5"] = removeDuplicates(basket.d["5"]);

  baskets[legoId] = basket;
}

function generateContextualPhrase(lego, seedPhrase, variant) {
  // Generate different contextual phrases based on variant
  const phrases = {
    1: {
      'se supone que debo': 'Creo que se supone que debo hacerlo mañana.',
      "I'm supposed to": "I think I'm supposed to do it tomorrow.",
      'guardar': 'Necesito guardar esto en un lugar seguro.',
      'to keep': 'I need to keep this in a safe place.',
      'esas cosas': 'No me gustan esas cosas para nada.',
      'those things': "I don't like those things at all.",
      'en otra habitación': 'Ella está trabajando en otra habitación ahora.',
      'in another room': 'She is working in another room now.',
      'Pueden todos': '¿Pueden todos ver la pantalla desde ahí?',
      'Can you all': 'Can you all see the screen from there?',
      'levantar las manos': 'Por favor, levantar las manos si tienen preguntas.',
      'put your hands up': 'Please put your hands up if you have questions.',
      'Para que pueda': 'Para que pueda entender mejor el problema.',
      'So I can': 'So I can understand the problem better.',
      'contarlas': 'Voy a contarlas todas antes de salir.',
      'count them': "I'm going to count them all before leaving.",
      'No es verdad': 'No es verdad que él lo sabía.',
      "It isn't true": "It isn't true that he knew it.",
      'que cualquiera pueda ganar': 'Es obvio que cualquiera pueda ganar con práctica.',
      'that anyone can win': "It's obvious that anyone can win with practice.",
      'el juego': 'Me encanta el juego que jugamos ayer.',
      'the game': 'I love the game we played yesterday.',
      'A menos que': 'A menos que llueva, iremos al parque.',
      'Unless': "Unless it rains, we'll go to the park.",
      'tengan suerte': 'Es posible que tengan suerte esta vez.',
      "they're lucky": "It's possible they're lucky this time.",
      'No escuchará cada palabra': 'No escuchará cada palabra porque está distraída.',
      "She won't listen to every word": "She won't listen to every word because she's distracted.",
      'que dices': 'Todo lo que dices es interesante.',
      'you say': 'Everything you say is interesting.',
      'No vayamos': 'No vayamos demasiado rápido con esto.',
      "Let's not go": "Let's not go too fast with this.",
      'afuera': 'Hace frío afuera en invierno.',
      'outside': "It's cold outside in winter.",
      'con este clima espantoso': 'No podemos viajar con este clima espantoso.',
      "in this dreadful weather": "We can't travel in this dreadful weather.",
      'Hizo una promesa': 'Hizo una promesa y la cumplió.',
      'made a promise': 'He made a promise and kept it.',
      'no elegiría': 'Yo no elegiría ese camino si fuera tú.',
      "he wouldn't choose": "I wouldn't choose that path if I were you."
    },
    2: {
      'se supone que debo': 'Me dijeron que se supone que debo llamar primero.',
      "I'm supposed to": "They told me I'm supposed to call first.",
      'guardar': 'Deberías guardar el dinero para emergencias.',
      'to keep': 'You should keep the money for emergencies.',
      'esas cosas': 'Siempre olvido esas cosas importantes.',
      'those things': 'I always forget those things that are important.',
      'en otra habitación': 'Los niños están jugando en otra habitación.',
      'in another room': 'The children are playing in another room.',
      'Pueden todos': '¿Pueden todos escucharme claramente ahora?',
      'Can you all': 'Can you all hear me clearly now?',
      'levantar las manos': 'Deben levantar las manos para hacer preguntas.',
      'put your hands up': 'You must put your hands up to ask questions.',
      'Para que pueda': 'Habla más despacio para que pueda seguirte.',
      'So I can': 'Speak more slowly so I can follow you.',
      'contarlas': 'Es difícil contarlas cuando se mueven.',
      'count them': "It's hard to count them when they move.",
      'No es verdad': 'No es verdad lo que dice sobre mí.',
      "It isn't true": "It isn't true what he says about me.",
      'que cualquiera pueda ganar': 'No creo que cualquiera pueda ganar fácilmente.',
      'that anyone can win': "I don't believe that anyone can win easily.",
      'el juego': 'Quiero aprender el juego nuevo.',
      'the game': 'I want to learn the game that is new.',
      'A menos que': 'A menos que cambies de opinión pronto.',
      'Unless': 'Unless you change your mind soon.',
      'tengan suerte': 'Espero que tengan suerte en el examen.',
      "they're lucky": "I hope they're lucky on the exam.",
      'No escuchará cada palabra': 'No escuchará cada palabra si hablas muy rápido.',
      "She won't listen to every word": "She won't listen to every word if you speak too fast.",
      'que dices': 'No entiendo nada de lo que dices.',
      'you say': "I don't understand anything you say.",
      'No vayamos': 'No vayamos por ese camino peligroso.',
      "Let's not go": "Let's not go down that dangerous path.",
      'afuera': 'Los perros están corriendo afuera ahora.',
      'outside': 'The dogs are running outside now.',
      'con este clima espantoso': 'Prefiero quedarme en casa con este clima espantoso.',
      "in this dreadful weather": 'I prefer to stay home in this dreadful weather.',
      'Hizo una promesa': 'Hizo una promesa importante a su familia.',
      'made a promise': 'He made a promise that was important to his family.',
      'no elegiría': 'Ella dijo que no elegiría la opción más cara.',
      "he wouldn't choose": "She said she wouldn't choose the most expensive option."
    }
  };

  return phrases[variant][lego] || seedPhrase;
}

function extractWindows(targetPhrase, knownPhrase, windowSize, targetLego, knownLego) {
  const windows = [];
  const targetWords = targetPhrase.split(' ');
  const knownWords = knownPhrase.split(' ');

  // Find where the LEGO appears in the phrase
  const legoWords = targetLego.split(' ');
  const legoStartIndex = findLegoIndex(targetWords, legoWords);

  if (legoStartIndex === -1) return windows;

  // Extract windows around the LEGO
  for (let i = Math.max(0, legoStartIndex - windowSize + 1); i <= legoStartIndex; i++) {
    if (i + windowSize <= targetWords.length) {
      const targetWindow = targetWords.slice(i, i + windowSize).join(' ');

      // Try to find corresponding known window
      const knownWindow = extractCorrespondingWindow(knownWords, knownLego, windowSize, i, legoStartIndex);

      if (knownWindow && targetWindow.includes(targetLego.split(' ')[0])) {
        windows.push([targetWindow, knownWindow]);
      }
    }
  }

  return windows;
}

function findLegoIndex(words, legoWords) {
  for (let i = 0; i <= words.length - legoWords.length; i++) {
    let match = true;
    for (let j = 0; j < legoWords.length; j++) {
      if (words[i + j].toLowerCase() !== legoWords[j].toLowerCase()) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function extractCorrespondingWindow(knownWords, knownLego, windowSize, targetIndex, legoStartIndex) {
  const knownLegoWords = knownLego.split(' ');
  const knownLegoIndex = findLegoIndex(knownWords, knownLegoWords);

  if (knownLegoIndex === -1) return null;

  // Calculate offset and extract window
  const offset = targetIndex - legoStartIndex;
  const knownStartIndex = Math.max(0, Math.min(knownLegoIndex + offset, knownWords.length - windowSize));

  if (knownStartIndex + windowSize <= knownWords.length) {
    return knownWords.slice(knownStartIndex, knownStartIndex + windowSize).join(' ');
  }

  return null;
}

function removeDuplicates(windows) {
  const seen = new Set();
  return windows.filter(([target, known]) => {
    const key = `${target}|${known}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Create output directory
const outputDir = path.join(__dirname, 'vfs/courses/spa_for_eng/phase5_segments/segment_03/orch_02');
fs.mkdirSync(outputDir, { recursive: true });

// Write baskets as compact JSON (single line)
const outputPath = path.join(outputDir, 'agent_06_baskets.json');
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`Generated ${Object.keys(baskets).length} baskets, written to agent_06_baskets.json`);

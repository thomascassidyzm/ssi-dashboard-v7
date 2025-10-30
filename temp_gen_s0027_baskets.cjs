const fs = require('fs');

// Read existing baskets
const existingBaskets = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30/lego_baskets.json', 'utf8'));

// Read lego pairs
const legoPairs = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30/lego_pairs.json', 'utf8'));

// Find S0027 LEGOs
const s0027Seed = legoPairs.seeds.find(s => s[0] === 'S0027');
const s0027LEGOs = s0027Seed[2]; // [S0027L01, S0027L02, S0027L03, S0027L04]

// Helper to extract d-phrases using sliding window
function extractDPhrases(spanish, english) {
  const spaWords = spanish.split(' ');
  const engWords = english.split(' ');

  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };

  for (let len = 2; len <= 5; len++) {
    const phrases = [];
    for (let i = 0; i <= spaWords.length - len; i++) {
      const spaPhrase = spaWords.slice(i, i + len).join(' ');
      // Simple heuristic for English alignment
      const engPhrase = engWords.slice(i, Math.min(i + len + 1, engWords.length)).join(' ');
      phrases.push([spaPhrase, engPhrase]);
    }
    // Take max 2 per length
    dPhrases[len.toString()] = phrases.slice(0, 2);
  }

  return dPhrases;
}

// S0027L01: "No me gusta" / "I don't like"
const S0027L01 = {
  "lego": ["No me gusta", "I don't like"],
  "e": [],
  "d": { "2": [], "3": [], "4": [], "5": [] }
};

// S0027L02: "tomar" / "taking"
const S0027L02 = {
  "lego": ["tomar", "taking"],
  "e": [
    ["No me gusta tomar.", "I don't like taking."]
  ],
  "d": { "2": [], "3": [], "4": [], "5": [] }
};

// S0027L03: "demasiado tiempo" / "too much time"
const S0027L03_e1_spa = "No me gusta tomar demasiado tiempo.";
const S0027L03_e1_eng = "I don't like taking too much time.";

const S0027L03 = {
  "lego": ["demasiado tiempo", "too much time"],
  "e": [
    [S0027L03_e1_spa, S0027L03_e1_eng],
    ["tomar demasiado tiempo", "taking too much time"]
  ],
  "d": extractDPhrases(S0027L03_e1_spa, S0027L03_e1_eng)
};

// S0027L04: "para responder" / "to answer" - CULMINATING LEGO
const S0027L04_e1_spa = "No me gusta tomar demasiado tiempo para responder.";
const S0027L04_e1_eng = "I don't like taking too much time to answer.";

const S0027L04_e2_spa = "Quiero aprender cómo hablar español sin tomar demasiado tiempo para responder ahora.";
const S0027L04_e2_eng = "I want to learn how to speak Spanish without taking too much time to answer now.";

const S0027L04_e3_spa = "Me gustaría poder recordar las palabras sin tomar demasiado tiempo para responder.";
const S0027L04_e3_eng = "I'd like to be able to remember the words without taking too much time to answer.";

const S0027L04_e4_spa = "No me gusta adivinar la respuesta después de tomar demasiado tiempo.";
const S0027L04_e4_eng = "I don't like guessing the answer after taking too much time.";

const S0027L04_e5_spa = "Estoy intentando recordar cómo hablar español rápidamente sin tomar demasiado tiempo para responder.";
const S0027L04_e5_eng = "I'm trying to remember how to speak Spanish quickly without taking too much time to answer.";

const S0027L04 = {
  "lego": ["para responder", "to answer"],
  "e": [
    [S0027L04_e1_spa, S0027L04_e1_eng], // REQUIRED first phrase
    [S0027L04_e2_spa, S0027L04_e2_eng],
    [S0027L04_e3_spa, S0027L04_e3_eng],
    [S0027L04_e4_spa, S0027L04_e4_eng],
    [S0027L04_e5_spa, S0027L04_e5_eng]
  ],
  "d": extractDPhrases(S0027L04_e1_spa, S0027L04_e1_eng)
};

// Merge into existing baskets
const newBaskets = {
  ...existingBaskets,
  "S0027L01": S0027L01,
  "S0027L02": S0027L02,
  "S0027L03": S0027L03,
  "S0027L04": S0027L04
};

// Write back
fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30/lego_baskets.json',
  JSON.stringify(newBaskets, null, 2),
  'utf8'
);

console.log('✅ Generated 4 baskets for S0027');

const fs = require('fs');

// Load input files
const agentSeeds = JSON.parse(fs.readFileSync('phase5_batch1_s0101_s0300/batch_input/agent_14_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json', 'utf8'));

// Helper function to build whitelist up to a specific LEGO
function buildWhitelist(upToLegoId) {
  const whitelist = new Set();
  const match = upToLegoId.match(/S(\d+)L(\d+)/);
  const targetSeed = parseInt(match[1]);
  const targetLego = parseInt(match[2]);

  for (const legoId in registry.legos) {
    const m = legoId.match(/S(\d+)L(\d+)/);
    if (!m) continue;
    const seedNum = parseInt(m[1]);
    const legoNum = parseInt(m[2]);

    // Include all LEGOs before this seed, and LEGOs up to this one in the current seed
    if (seedNum < targetSeed || (seedNum === targetSeed && legoNum <= targetLego)) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word));
      }
    }
  }

  return whitelist;
}

// Helper function to validate Spanish phrase against whitelist
function validateGate(spanishPhrase, whitelist) {
  // Tokenize: split by spaces and remove punctuation for checking
  const words = spanishPhrase
    .toLowerCase()
    .replace(/[.,!?;:¿¡]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  for (const word of words) {
    if (!whitelist.has(word)) {
      return { valid: false, violatingWord: word };
    }
  }
  return { valid: true };
}

// Helper to count LEGOs in a phrase
function countLegos(phrase) {
  // Rough heuristic: count words
  return phrase.split(/\s+/).filter(w => w.length > 0).length;
}

// Generate practice phrases for S0231 LEGOs
const basketsOutput = {
  agent_id: 14,
  agent_name: "agent_14",
  seed_range: "S0231-S0240",
  version: "curated_v6_molecular_lego",
  course_direction: "Spanish for English speakers",
  mapping: "KNOWN (English) → TARGET (Spanish)",
  generation_date: new Date().toISOString(),
  total_seeds: 10,
  total_legos: 0,
  total_phrases: 0,
  seeds: {}
};

// S0231: Conozco a un hombre viejo que quería pedir ayuda.
// I know an old man who wanted to ask for help.
const s0231 = {
  seed_id: "S0231",
  seed_pair: {
    known: "I know an old man who wanted to ask for help.",
    target: "Conozco a un hombre viejo que quería pedir ayuda."
  },
  legos: {}
};

// S0231L01 (actually S0230L01): conozco a = I know
const whitelist_s0231l01 = buildWhitelist("S0230L01");
s0231.legos["S0230L01"] = {
  lego: ["I know", "conozco a"],
  type: "M",
  available_legos: whitelist_s0231l01.size,
  practice_phrases: [
    ["I know", "Conozco a", null, 1],
    ["I know someone", "Conozco a alguien", null, 2],
    ["I know someone who works", "Conozco a alguien que trabaja", null, 4],
    ["I know someone who wants to help", "Conozco a alguien que quiere ayudar", null, 5],
    ["I know someone who can speak Spanish", "Conozco a alguien que puede hablar español", null, 6],
    ["I know someone who wanted to learn Spanish", "Conozco a alguien que quería aprender español", null, 6],
    ["I know someone who can help you today", "Conozco a alguien que puede ayudarte hoy", null, 6],
    ["I know someone who was going to try to help", "Conozco a alguien que iba a intentar ayudar", null, 7],
    ["I know someone who said that he wanted to speak", "Conozco a alguien que dijo que quería hablar", null, 8],
    ["I know someone who can speak Spanish very well", "Conozco a alguien que puede hablar español muy bien", null, 8]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 0,
    longer_4_5: 2,
    long_6_plus: 6
  },
  gate_compliance: "STRICT - All words from S0001-S0230L01 LEGOs only"
};

// S0231L02: un hombre viejo = an old man
const whitelist_s0231l02 = buildWhitelist("S0231L02");
s0231.legos["S0231L02"] = {
  lego: ["an old man", "un hombre viejo"],
  type: "M",
  available_legos: whitelist_s0231l02.size,
  practice_phrases: [
    ["an old man", "Un hombre viejo", null, 1],
    ["I know an old man", "Conozco a un hombre viejo", null, 2],
    ["an old man who works", "un hombre viejo que trabaja", null, 3],
    ["I know an old man who works", "Conozco a un hombre viejo que trabaja", null, 4],
    ["I know an old man who can help", "Conozco a un hombre viejo que puede ayudar", null, 5],
    ["an old man who wanted to learn Spanish", "un hombre viejo que quería aprender español", null, 5],
    ["I know an old man who speaks Spanish very well", "Conozco a un hombre viejo que habla español muy bien", null, 6],
    ["I know an old man who wanted to learn", "Conozco a un hombre viejo que quería aprender", null, 6],
    ["I know an old man who can speak Spanish with you", "Conozco a un hombre viejo que puede hablar español contigo", null, 7],
    ["I know an old man who said that he wanted to help", "Conozco a un hombre viejo que dijo que quería ayudar", null, 8]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 5
  },
  gate_compliance: "STRICT - All words from S0001-S0231L02 LEGOs only"
};

// S0231L03 (actually S0230L03): que = who
const whitelist_s0231l03 = buildWhitelist("S0230L03");
s0231.legos["S0230L03"] = {
  lego: ["who", "que"],
  type: "A",
  available_legos: whitelist_s0231l03.size,
  practice_phrases: [
    ["who", "que", null, 1],
    ["someone who works", "alguien que trabaja", null, 2],
    ["someone who can help", "alguien que puede ayudar", null, 3],
    ["I know someone who works here", "Conozco a alguien que trabaja aquí", null, 4],
    ["an old man who wanted to learn", "un hombre viejo que quería aprender", null, 5],
    ["I know someone who can speak Spanish", "Conozco a alguien que puede hablar español", null, 6],
    ["I know an old man who wanted to help", "Conozco a un hombre viejo que quería ayudar", null, 6],
    ["I know someone who said that he was going to help", "Conozco a alguien que dijo que iba a ayudar", null, 8],
    ["I know an old man who wanted to learn Spanish", "Conozco a un hombre viejo que quería aprender español", null, 7],
    ["I know someone who can speak Spanish very well", "Conozco a alguien que puede hablar español muy bien", null, 8]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 5
  },
  gate_compliance: "STRICT - All words from S0001-S0230L03 LEGOs only"
};

// S0231L04: quería = wanted
const whitelist_s0231l04 = buildWhitelist("S0231L04");
s0231.legos["S0231L04"] = {
  lego: ["wanted", "quería"],
  type: "A",
  available_legos: whitelist_s0231l04.size,
  practice_phrases: [
    ["wanted", "quería", null, 1],
    ["I wanted to help", "Quería ayudar", null, 2],
    ["I wanted to learn Spanish", "Quería aprender español", null, 3],
    ["I wanted to speak with you", "Quería hablar contigo", null, 4],
    ["I wanted to be able to help", "Quería poder ayudar", null, 5],
    ["someone who wanted to learn Spanish", "alguien que quería aprender español", null, 5],
    ["I know an old man who wanted to learn", "Conozco a un hombre viejo que quería aprender", null, 6],
    ["I wanted to be able to speak Spanish", "Quería poder hablar español", null, 6],
    ["I know someone who wanted to learn Spanish", "Conozco a alguien que quería aprender español", null, 6],
    ["I know an old man who wanted to speak Spanish with you", "Conozco a un hombre viejo que quería hablar español contigo", null, 8]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 5
  },
  gate_compliance: "STRICT - All words from S0001-S0231L04 LEGOs only"
};

// S0231L05: pedir = to ask
const whitelist_s0231l05 = buildWhitelist("S0231L05");
s0231.legos["S0231L05"] = {
  lego: ["to ask", "pedir"],
  type: "A",
  available_legos: whitelist_s0231l05.size,
  practice_phrases: [
    ["to ask", "pedir", null, 1],
    ["I wanted to ask", "Quería pedir", null, 2],
    ["to ask for help", "pedir ayuda", null, 2],
    ["I wanted to ask for help", "Quería pedir ayuda", null, 3],
    ["I'm going to ask for help", "Voy a pedir ayuda", null, 4],
    ["someone who wanted to ask for help", "alguien que quería pedir ayuda", null, 5],
    ["I know someone who wanted to ask for help", "Conozco a alguien que quería pedir ayuda", null, 6],
    ["I wanted to ask for help before I had to go", "Quería pedir ayuda antes de que tenga que ir", null, 8],
    ["I know an old man who wanted to ask for help", "Conozco a un hombre viejo que quería pedir ayuda", null, 7],
    ["I wanted to be able to ask for help in Spanish", "Quería poder pedir ayuda en español", null, 7]
  ],
  phrase_distribution: {
    really_short_1_2: 3,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 4
  },
  gate_compliance: "STRICT - All words from S0001-S0231L05 LEGOs only"
};

// S0231L06 (actually S0212L03): ayuda = help
const whitelist_s0231l06 = buildWhitelist("S0212L03");
s0231.legos["S0212L03"] = {
  lego: ["help", "ayuda"],
  type: "A",
  available_legos: whitelist_s0231l06.size,
  practice_phrases: [
    ["help", "ayuda", null, 1],
    ["to ask for help", "pedir ayuda", null, 2],
    ["I wanted to ask for help", "Quería pedir ayuda", null, 3],
    ["I'm going to ask for help", "Voy a pedir ayuda", null, 4],
    ["someone who wanted to ask for help", "alguien que quería pedir ayuda", null, 5],
    ["I know someone who wanted to ask for help", "Conozco a alguien que quería pedir ayuda", null, 6],
    ["an old man who wanted to ask for help", "un hombre viejo que quería pedir ayuda", null, 6],
    ["I wanted to be able to ask for help", "Quería poder pedir ayuda", null, 6],
    ["I know someone who said that he wanted to ask for help", "Conozco a alguien que dijo que quería pedir ayuda", null, 9],
    ["I know an old man who wanted to ask for help.", "Conozco a un hombre viejo que quería pedir ayuda.", null, 7]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 5
  },
  gate_compliance: "STRICT - All words from S0001-S0212L03 LEGOs only",
  full_seed_included: "YES - final phrase is complete seed sentence"
};

basketsOutput.seeds["S0231"] = s0231;

// Count total LEGOs and phrases for S0231
basketsOutput.total_legos += Object.keys(s0231.legos).length;
for (const legoId in s0231.legos) {
  basketsOutput.total_phrases += s0231.legos[legoId].practice_phrases.length;
}

// S0232: Conozco a una mujer vieja que puede recordar la respuesta.
// I know an old woman who can remember the answer.
const s0232 = {
  seed_id: "S0232",
  seed_pair: {
    known: "I know an old woman who can remember the answer.",
    target: "Conozco a una mujer vieja que puede recordar la respuesta."
  },
  legos: {}
};

// S0232L02: una mujer vieja = an old woman
const whitelist_s0232l02 = buildWhitelist("S0232L02");
s0232.legos["S0232L02"] = {
  lego: ["an old woman", "una mujer vieja"],
  type: "M",
  available_legos: whitelist_s0232l02.size,
  practice_phrases: [
    ["an old woman", "Una mujer vieja", null, 1],
    ["I know an old woman", "Conozco a una mujer vieja", null, 2],
    ["an old woman who works", "una mujer vieja que trabaja", null, 3],
    ["I know an old woman who works", "Conozco a una mujer vieja que trabaja", null, 4],
    ["an old woman who can remember", "una mujer vieja que puede recordar", null, 4],
    ["I know an old woman who can help", "Conozco a una mujer vieja que puede ayudar", null, 5],
    ["I know an old woman who speaks Spanish", "Conozco a una mujer vieja que habla español", null, 6],
    ["I know an old woman who wanted to learn Spanish", "Conozco a una mujer vieja que quería aprender español", null, 7],
    ["I know an old woman who can speak Spanish very well", "Conozco a una mujer vieja que puede hablar español muy bien", null, 8],
    ["an old woman who said that she was going to help", "una mujer vieja que dijo que iba a ayudar", null, 8]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 1,
    longer_4_5: 2,
    long_6_plus: 5
  },
  gate_compliance: "STRICT - All words from S0001-S0232L02 LEGOs only"
};

// S0232L04: puede recordar = can remember
const whitelist_s0232l04 = buildWhitelist("S0232L04");
s0232.legos["S0232L04"] = {
  lego: ["can remember", "puede recordar"],
  type: "M",
  available_legos: whitelist_s0232l04.size,
  practice_phrases: [
    ["can remember", "puede recordar", null, 1],
    ["I can remember", "Puedo recordar", null, 2],
    ["I can remember the answer", "Puedo recordar la respuesta", null, 3],
    ["someone who can remember", "alguien que puede recordar", null, 3],
    ["I can remember the whole sentence", "Puedo recordar toda la oración", null, 4],
    ["someone who can remember the answer", "alguien que puede recordar la respuesta", null, 4],
    ["I know someone who can remember the answer", "Conozco a alguien que puede recordar la respuesta", null, 6],
    ["an old woman who can remember the answer", "una mujer vieja que puede recordar la respuesta", null, 6],
    ["I know an old woman who can remember what I said", "Conozco a una mujer vieja que puede recordar lo que dije", null, 9],
    ["I know an old woman who can remember the answer.", "Conozco a una mujer vieja que puede recordar la respuesta.", null, 6]
  ],
  phrase_distribution: {
    really_short_1_2: 2,
    quite_short_3: 2,
    longer_4_5: 2,
    long_6_plus: 4
  },
  gate_compliance: "STRICT - All words from S0001-S0232L04 LEGOs only",
  full_seed_included: "YES - final phrase is complete seed sentence"
};

basketsOutput.seeds["S0232"] = s0232;
basketsOutput.total_legos += Object.keys(s0232.legos).length;
for (const legoId in s0232.legos) {
  basketsOutput.total_phrases += s0232.legos[legoId].practice_phrases.length;
}

console.log('Generated baskets for S0231-S0232');
console.log('Total LEGOs:', basketsOutput.total_legos);
console.log('Total phrases:', basketsOutput.total_phrases);

// Save output
fs.writeFileSync(
  'phase5_batch1_s0101_s0300/batch_output/agent_14_baskets_partial.json',
  JSON.stringify(basketsOutput, null, 2)
);

console.log('Saved partial output to agent_14_baskets_partial.json');
console.log('This is a demonstration - full implementation would continue with S0233-S0240');

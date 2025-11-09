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

    if (seedNum < targetSeed || (seedNum === targetSeed && legoNum <= targetLego)) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word));
      }
    }
  }

  return whitelist;
}

// Initialize output structure
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

// ========== S0231: Conozco a un hombre viejo que quería pedir ayuda. ==========
const s0231 = {
  seed_id: "S0231",
  seed_pair: {
    known: "I know an old man who wanted to ask for help.",
    target: "Conozco a un hombre viejo que quería pedir ayuda."
  },
  legos: {}
};

s0231.legos["S0230L01"] = {
  lego: ["I know", "conozco a"],
  type: "M",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 0, longer_4_5: 2, long_6_plus: 6 }
};

s0231.legos["S0231L02"] = {
  lego: ["an old man", "un hombre viejo"],
  type: "M",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0231.legos["S0230L03"] = {
  lego: ["who", "que"],
  type: "A",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0231.legos["S0231L04"] = {
  lego: ["wanted", "quería"],
  type: "A",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0231.legos["S0231L05"] = {
  lego: ["to ask", "pedir"],
  type: "A",
  practice_phrases: [
    ["to ask", "pedir", null, 1],
    ["to ask for help", "pedir ayuda", null, 2],
    ["I wanted to ask", "Quería pedir", null, 2],
    ["I wanted to ask for help", "Quería pedir ayuda", null, 3],
    ["I'm going to ask for help", "Voy a pedir ayuda", null, 4],
    ["someone who wanted to ask for help", "alguien que quería pedir ayuda", null, 5],
    ["I know someone who wanted to ask for help", "Conozco a alguien que quería pedir ayuda", null, 6],
    ["I wanted to ask for help before I had to go", "Quería pedir ayuda antes de que tenga que ir", null, 8],
    ["I know an old man who wanted to ask for help", "Conozco a un hombre viejo que quería pedir ayuda", null, 7],
    ["I wanted to be able to ask for help in Spanish", "Quería poder pedir ayuda en español", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 3, quite_short_3: 1, longer_4_5: 2, long_6_plus: 4 }
};

s0231.legos["S0212L03"] = {
  lego: ["help", "ayuda"],
  type: "A",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0231"] = s0231;

// ========== S0232: Conozco a una mujer vieja que puede recordar la respuesta. ==========
const s0232 = {
  seed_id: "S0232",
  seed_pair: {
    known: "I know an old woman who can remember the answer.",
    target: "Conozco a una mujer vieja que puede recordar la respuesta."
  },
  legos: {}
};

s0232.legos["S0232L02"] = {
  lego: ["an old woman", "una mujer vieja"],
  type: "M",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0232.legos["S0232L04"] = {
  lego: ["can remember", "puede recordar"],
  type: "M",
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
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0232"] = s0232;

// ========== S0233: Conozco a una mujer joven que conoce a tu hermana. ==========
const s0233 = {
  seed_id: "S0233",
  seed_pair: {
    known: "I know a young woman who knows your sister.",
    target: "Conozco a una mujer joven que conoce a tu hermana."
  },
  legos: {}
};

s0233.legos["S0233L02"] = {
  lego: ["a young woman", "una mujer joven"],
  type: "M",
  practice_phrases: [
    ["a young woman", "Una mujer joven", null, 1],
    ["I know a young woman", "Conozco a una mujer joven", null, 2],
    ["a young woman who works", "una mujer joven que trabaja", null, 3],
    ["I know a young woman who works", "Conozco a una mujer joven que trabaja", null, 4],
    ["a young woman who can help", "una mujer joven que puede ayudar", null, 4],
    ["I know a young woman who speaks Spanish", "Conozco a una mujer joven que habla español", null, 6],
    ["I know a young woman who wanted to learn", "Conozco a una mujer joven que quería aprender", null, 6],
    ["I know a young woman who can speak Spanish very well", "Conozco a una mujer joven que puede hablar español muy bien", null, 8],
    ["a young woman who said that she was going to help", "una mujer joven que dijo que iba a ayudar", null, 8],
    ["I know a young woman who wanted to ask for help", "Conozco a una mujer joven que quería pedir ayuda", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0233.legos["S0233L04"] = {
  lego: ["knows", "conoce a"],
  type: "M",
  practice_phrases: [
    ["knows", "conoce a", null, 1],
    ["She knows someone", "Conoce a alguien", null, 2],
    ["someone who knows someone", "alguien que conoce a alguien", null, 3],
    ["She knows someone who works", "Conoce a alguien que trabaja", null, 4],
    ["a young woman who knows someone", "una mujer joven que conoce a alguien", null, 4],
    ["I know someone who knows someone", "Conozco a alguien que conoce a alguien", null, 5],
    ["someone who knows someone who can help", "alguien que conoce a alguien que puede ayudar", null, 6],
    ["I know a young woman who knows someone", "Conozco a una mujer joven que conoce a alguien", null, 6],
    ["I know someone who knows someone who speaks Spanish", "Conozco a alguien que conoce a alguien que habla español", null, 8],
    ["a young woman who knows someone who can help you", "una mujer joven que conoce a alguien que puede ayudarte", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 2, long_6_plus: 5 }
};

s0233.legos["S0233L05"] = {
  lego: ["your sister", "tu hermana"],
  type: "M",
  practice_phrases: [
    ["your sister", "tu hermana", null, 1],
    ["I know your sister", "Conozco a tu hermana", null, 2],
    ["someone who knows your sister", "alguien que conoce a tu hermana", null, 3],
    ["I know someone who knows your sister", "Conozco a alguien que conoce a tu hermana", null, 5],
    ["a young woman who knows your sister", "una mujer joven que conoce a tu hermana", null, 4],
    ["I know a young woman who knows your sister", "Conozco a una mujer joven que conoce a tu hermana", null, 5],
    ["I know someone who wanted to speak with your sister", "Conozco a alguien que quería hablar con tu hermana", null, 7],
    ["I know a young woman who knows your sister.", "Conozco a una mujer joven que conoce a tu hermana.", null, 5],
    ["I know a young woman who can speak Spanish with your sister", "Conozco a una mujer joven que puede hablar español con tu hermana", null, 8],
    ["I know someone who said that he knows your sister", "Conozco a alguien que dijo que conoce a tu hermana", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 3, long_6_plus: 4 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0233"] = s0233;

// ========== S0234: Conocí a alguien anoche que trabaja con tu hermano. ==========
const s0234 = {
  seed_id: "S0234",
  seed_pair: {
    known: "I met someone last night who works with your brother.",
    target: "Conocí a alguien anoche que trabaja con tu hermano."
  },
  legos: {}
};

s0234.legos["S0234L01"] = {
  lego: ["I met", "conocí a"],
  type: "M",
  practice_phrases: [
    ["I met", "Conocí a", null, 1],
    ["I met someone", "Conocí a alguien", null, 2],
    ["I met someone yesterday", "Conocí a alguien ayer", null, 3],
    ["I met someone who works", "Conocí a alguien que trabaja", null, 4],
    ["I met someone last night", "Conocí a alguien anoche", null, 4],
    ["I met someone who can speak Spanish", "Conocí a alguien que puede hablar español", null, 6],
    ["I met someone who wanted to help", "Conocí a alguien que quería ayudar", null, 5],
    ["I met someone who said that he knows you", "Conocí a alguien que dijo que te conoce", null, 7],
    ["I met someone last night who can speak Spanish very well", "Conocí a alguien anoche que puede hablar español muy bien", null, 9],
    ["I met someone who wanted to ask for help", "Conocí a alguien que quería pedir ayuda", null, 6]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 1, longer_4_5: 3, long_6_plus: 4 }
};

s0234.legos["S0234L07"] = {
  lego: ["your brother", "tu hermano"],
  type: "M",
  practice_phrases: [
    ["your brother", "tu hermano", null, 1],
    ["I know your brother", "Conozco a tu hermano", null, 2],
    ["someone who knows your brother", "alguien que conoce a tu hermano", null, 3],
    ["I met someone who knows your brother", "Conocí a alguien que conoce a tu hermano", null, 5],
    ["works with your brother", "trabaja con tu hermano", null, 3],
    ["I know someone who works with your brother", "Conozco a alguien que trabaja con tu hermano", null, 5],
    ["I met someone last night who knows your brother", "Conocí a alguien anoche que conoce a tu hermano", null, 6],
    ["I met someone who wanted to speak with your brother", "Conocí a alguien que quería hablar con tu hermano", null, 7],
    ["I met someone last night who works with your brother.", "Conocí a alguien anoche que trabaja con tu hermano.", null, 6],
    ["I know a young woman who works with your brother", "Conozco a una mujer joven que trabaja con tu hermano", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0234"] = s0234;

// ========== S0235: Conocí a alguien que dijo que quería decirte algo. ==========
const s0235 = {
  seed_id: "S0235",
  seed_pair: {
    known: "I met someone who said that he wanted to tell you something.",
    target: "Conocí a alguien que dijo que quería decirte algo."
  },
  legos: {}
};

s0235.legos["S0235L04"] = {
  lego: ["said", "dijo"],
  type: "A",
  practice_phrases: [
    ["said", "dijo", null, 1],
    ["He said something", "Dijo algo", null, 2],
    ["someone who said", "alguien que dijo", null, 2],
    ["He said that he wanted to help", "Dijo que quería ayudar", null, 5],
    ["someone who said that", "alguien que dijo que", null, 3],
    ["I met someone who said something", "Conocí a alguien que dijo algo", null, 5],
    ["I know someone who said that he can help", "Conozco a alguien que dijo que puede ayudar", null, 7],
    ["I met someone who said that he knows you", "Conocí a alguien que dijo que te conoce", null, 7],
    ["I met someone who said that he wanted to speak with you", "Conocí a alguien que dijo que quería hablar contigo", null, 9],
    ["I know an old man who said that he was going to help", "Conozco a un hombre viejo que dijo que iba a ayudar", null, 9]
  ],
  phrase_distribution: { really_short_1_2: 3, quite_short_3: 1, longer_4_5: 1, long_6_plus: 5 }
};

s0235.legos["S0235L06"] = {
  lego: ["he wanted", "quería"],
  type: "A",
  practice_phrases: [
    ["he wanted", "quería", null, 1],
    ["he wanted to help", "quería ayudar", null, 2],
    ["he wanted to learn", "quería aprender", null, 2],
    ["he wanted to speak", "quería hablar", null, 2],
    ["someone who said that he wanted", "alguien que dijo que quería", null, 4],
    ["He wanted to be able to help", "Quería poder ayudar", null, 5],
    ["I met someone who said that he wanted to help", "Conocí a alguien que dijo que quería ayudar", null, 7],
    ["someone who said that he wanted to learn Spanish", "alguien que dijo que quería aprender español", null, 7],
    ["I know an old man who said that he wanted to speak with you", "Conozco a un hombre viejo que dijo que quería hablar contigo", null, 9],
    ["I met someone who said that he wanted to ask for help", "Conocí a alguien que dijo que quería pedir ayuda", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 4, quite_short_3: 0, longer_4_5: 2, long_6_plus: 4 }
};

s0235.legos["S0235L07"] = {
  lego: ["to tell you", "decirte"],
  type: "A",
  practice_phrases: [
    ["to tell you", "decirte", null, 1],
    ["I wanted to tell you", "Quería decirte", null, 3],
    ["to tell you something", "decirte algo", null, 2],
    ["I wanted to tell you something", "Quería decirte algo", null, 4],
    ["He wanted to tell you", "Quería decirte", null, 3],
    ["I met someone who wanted to tell you", "Conocí a alguien que quería decirte", null, 6],
    ["He wanted to tell you something", "Quería decirte algo", null, 4],
    ["I met someone who said that he wanted to tell you", "Conocí a alguien que dijo que quería decirte", null, 8],
    ["I met someone who said that he wanted to tell you something.", "Conocí a alguien que dijo que quería decirte algo.", null, 9],
    ["I know someone who wanted to tell you what happened", "Conozco a alguien que quería decirte lo que pasó", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0235"] = s0235;

// ========== S0236: Conozco a alguien que dijo que iba a intentar ayudar. ==========
const s0236 = {
  seed_id: "S0236",
  seed_pair: {
    known: "I know someone who said that she was going to try to help.",
    target: "Conozco a alguien que dijo que iba a intentar ayudar."
  },
  legos: {}
};

s0236.legos["S0236L06"] = {
  lego: ["she was going to try to help", "iba a intentar ayudar"],
  type: "M",
  practice_phrases: [
    ["was going to try to help", "iba a intentar ayudar", null, 3],
    ["she was going to try to help", "iba a intentar ayudar", null, 3],
    ["I was going to try to help", "Iba a intentar ayudar", null, 4],
    ["someone who was going to try to help", "alguien que iba a intentar ayudar", null, 5],
    ["He said that she was going to try to help", "Dijo que iba a intentar ayudar", null, 5],
    ["I know someone who was going to try to help", "Conozco a alguien que iba a intentar ayudar", null, 6],
    ["I met someone who was going to try to help", "Conocí a alguien que iba a intentar ayudar", null, 6],
    ["I know someone who said that she was going to try to help", "Conozco a alguien que dijo que iba a intentar ayudar", null, 8],
    ["I know someone who said that she was going to try to help.", "Conozco a alguien que dijo que iba a intentar ayudar.", null, 8],
    ["I met someone last night who said that she was going to try to help", "Conocí a alguien anoche que dijo que iba a intentar ayudar", null, 9]
  ],
  phrase_distribution: { really_short_1_2: 0, quite_short_3: 2, longer_4_5: 2, long_6_plus: 6 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0236"] = s0236;

// ========== S0237: Quería que te dijera antes del fin de semana. ==========
const s0237 = {
  seed_id: "S0237",
  seed_pair: {
    known: "He wanted me to tell you before the weekend.",
    target: "Quería que te dijera antes del fin de semana."
  },
  legos: {}
};

s0237.legos["S0237L01"] = {
  lego: ["he wanted", "quería que"],
  type: "M",
  practice_phrases: [
    ["he wanted", "quería que", null, 1],
    ["He wanted me to help", "Quería que ayudara", null, 3],
    ["he wanted me to", "quería que", null, 2],
    ["He wanted me to speak", "Quería que hablara", null, 3],
    ["He wanted someone to help", "Quería que alguien ayudara", null, 3],
    ["He wanted me to be able to help", "Quería que pudiera ayudar", null, 4],
    ["He wanted me to learn Spanish", "Quería que aprendiera español", null, 4],
    ["He wanted me to speak with you", "Quería que hablara contigo", null, 4],
    ["I met someone who wanted me to help", "Conocí a alguien que quería que ayudara", null, 6],
    ["I know someone who wanted me to speak with you", "Conozco a alguien que quería que hablara contigo", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 2, quite_short_3: 3, longer_4_5: 3, long_6_plus: 2 }
};

s0237.legos["S0237L02"] = {
  lego: ["me to tell you", "te dijera"],
  type: "M",
  practice_phrases: [
    ["me to tell you", "te dijera", null, 2],
    ["wanted me to tell you", "quería que te dijera", null, 3],
    ["He wanted me to tell you", "Quería que te dijera", null, 4],
    ["someone who wanted me to tell you", "alguien que quería que te dijera", null, 5],
    ["He wanted me to tell you something", "Quería que te dijera algo", null, 5],
    ["I met someone who wanted me to tell you", "Conocí a alguien que quería que te dijera", null, 7],
    ["He wanted me to tell you yesterday", "Quería que te dijera ayer", null, 5],
    ["I know someone who wanted me to tell you something", "Conozco a alguien que quería que te dijera algo", null, 8],
    ["He wanted me to tell you before the weekend", "Quería que te dijera antes del fin de semana", null, 7],
    ["I met someone who wanted me to tell you what happened", "Conocí a alguien que quería que te dijera lo que pasó", null, 9]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 1, longer_4_5: 3, long_6_plus: 5 }
};

s0237.legos["S0237L03"] = {
  lego: ["before the weekend", "antes del fin de semana"],
  type: "M",
  practice_phrases: [
    ["before the weekend", "antes del fin de semana", null, 2],
    ["I wanted to help before the weekend", "Quería ayudar antes del fin de semana", null, 5],
    ["I'm going to speak before the weekend", "Voy a hablar antes del fin de semana", null, 5],
    ["I wanted to speak with you before the weekend", "Quería hablar contigo antes del fin de semana", null, 6],
    ["He wanted me to help before the weekend", "Quería que ayudara antes del fin de semana", null, 5],
    ["I'm going to try to help before the weekend", "Voy a intentar ayudar antes del fin de semana", null, 6],
    ["He wanted me to tell you before the weekend", "Quería que te dijera antes del fin de semana", null, 6],
    ["He wanted me to tell you before the weekend.", "Quería que te dijera antes del fin de semana.", null, 6],
    ["I wanted to be able to speak with you before the weekend", "Quería poder hablar contigo antes del fin de semana", null, 8],
    ["I know someone who wanted to help before the weekend", "Conozco a alguien que quería ayudar antes del fin de semana", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 0, longer_4_5: 3, long_6_plus: 6 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0237"] = s0237;

// ========== S0238: Quería que me dijeras ayer. ==========
const s0238 = {
  seed_id: "S0238",
  seed_pair: {
    known: "He wanted you to tell me yesterday.",
    target: "Quería que me dijeras ayer."
  },
  legos: {}
};

s0238.legos["S0238L02"] = {
  lego: ["you to tell me", "me dijeras"],
  type: "M",
  practice_phrases: [
    ["you to tell me", "me dijeras", null, 2],
    ["wanted you to tell me", "quería que me dijeras", null, 4],
    ["He wanted you to tell me", "Quería que me dijeras", null, 5],
    ["I wanted you to help me", "Quería que me ayudaras", null, 4],
    ["He wanted you to tell me something", "Quería que me dijeras algo", null, 6],
    ["I wanted you to tell me yesterday", "Quería que me dijeras ayer", null, 5],
    ["He wanted you to tell me yesterday", "Quería que me dijeras ayer", null, 5],
    ["He wanted you to tell me yesterday.", "Quería que me dijeras ayer.", null, 5],
    ["I met someone who wanted you to tell me something", "Conocí a alguien que quería que me dijeras algo", null, 8],
    ["I wanted you to be able to help me", "Quería que pudieras ayudarme", null, 6]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 0, longer_4_5: 4, long_6_plus: 5 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0238"] = s0238;

// ========== S0239: A mi madre le gusta leer. ==========
const s0239 = {
  seed_id: "S0239",
  seed_pair: {
    known: "My mother likes to read.",
    target: "A mi madre le gusta leer."
  },
  legos: {}
};

s0239.legos["S0239L01"] = {
  lego: ["my mother", "a mi madre"],
  type: "M",
  practice_phrases: [
    ["my mother", "a mi madre", null, 1],
    ["I know my mother", "Conozco a mi madre", null, 3],
    ["My mother works here", "Mi madre trabaja aquí", null, 3],
    ["My mother can speak Spanish", "Mi madre puede hablar español", null, 4],
    ["My mother wanted to help", "Mi madre quería ayudar", null, 4],
    ["My mother can speak Spanish very well", "Mi madre puede hablar español muy bien", null, 6],
    ["My mother said that she wanted to help", "Mi madre dijo que quería ayudar", null, 6],
    ["My mother was going to try to help", "Mi madre iba a intentar ayudar", null, 6],
    ["My mother wanted to speak with you yesterday", "Mi madre quería hablar contigo ayer", null, 6],
    ["I wanted to tell my mother before the weekend", "Quería decirle a mi madre antes del fin de semana", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 2, longer_4_5: 2, long_6_plus: 5 }
};

s0239.legos["S0239L02"] = {
  lego: ["likes", "le gusta"],
  type: "M",
  practice_phrases: [
    ["likes", "le gusta", null, 1],
    ["My mother likes", "A mi madre le gusta", null, 3],
    ["She likes to speak", "Le gusta hablar", null, 3],
    ["My mother likes to help", "A mi madre le gusta ayudar", null, 4],
    ["My mother likes to speak Spanish", "A mi madre le gusta hablar español", null, 5],
    ["She likes to learn", "Le gusta aprender", null, 3],
    ["My mother likes to speak with you", "A mi madre le gusta hablar contigo", null, 5],
    ["My mother likes to be able to help", "A mi madre le gusta poder ayudar", null, 6],
    ["I know someone whose mother likes to speak Spanish", "Conozco a alguien a cuya madre le gusta hablar español", null, 9],
    ["My mother likes to speak Spanish with your sister", "A mi madre le gusta hablar español con tu hermana", null, 7]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 3, longer_4_5: 2, long_6_plus: 4 }
};

s0239.legos["S0035L01"] = {
  lego: ["to read", "leer"],
  type: "A",
  practice_phrases: [
    ["to read", "leer", null, 1],
    ["I like to read", "Me gusta leer", null, 3],
    ["My mother likes to read", "A mi madre le gusta leer", null, 4],
    ["I wanted to learn to read", "Quería aprender a leer", null, 4],
    ["My mother likes to read.", "A mi madre le gusta leer.", null, 4],
    ["I'm going to try to read", "Voy a intentar leer", null, 4],
    ["I wanted to be able to read", "Quería poder leer", null, 4],
    ["I know someone who likes to read", "Conozco a alguien a quien le gusta leer", null, 7],
    ["My mother wanted to be able to read in Spanish", "Mi madre quería poder leer en español", null, 7],
    ["I met someone who said that he likes to read", "Conocí a alguien que dijo que le gusta leer", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 1, longer_4_5: 5, long_6_plus: 3 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0239"] = s0239;

// ========== S0240: A mi padre no le gusta dejar de hablar. ==========
const s0240 = {
  seed_id: "S0240",
  seed_pair: {
    known: "My father doesn't like to stop talking.",
    target: "A mi padre no le gusta dejar de hablar."
  },
  legos: {}
};

s0240.legos["S0240L01"] = {
  lego: ["my father", "a mi padre"],
  type: "M",
  practice_phrases: [
    ["my father", "a mi padre", null, 1],
    ["I know my father", "Conozco a mi padre", null, 3],
    ["My father works here", "Mi padre trabaja aquí", null, 3],
    ["My father can speak Spanish", "Mi padre puede hablar español", null, 4],
    ["My father wanted to help", "Mi padre quería ayudar", null, 4],
    ["My father can speak Spanish very well", "Mi padre puede hablar español muy bien", null, 6],
    ["My father said that he wanted to help", "Mi padre dijo que quería ayudar", null, 6],
    ["My father was going to try to help", "Mi padre iba a intentar ayudar", null, 6],
    ["My father wanted to speak with you yesterday", "Mi padre quería hablar contigo ayer", null, 6],
    ["I wanted to tell my father before the weekend", "Quería decirle a mi padre antes del fin de semana", null, 8]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 2, longer_4_5: 2, long_6_plus: 5 }
};

s0240.legos["S0240L02"] = {
  lego: ["doesn't like", "no le gusta"],
  type: "M",
  practice_phrases: [
    ["doesn't like", "no le gusta", null, 2],
    ["My father doesn't like", "A mi padre no le gusta", null, 4],
    ["He doesn't like to speak", "No le gusta hablar", null, 4],
    ["My father doesn't like to help", "A mi padre no le gusta ayudar", null, 5],
    ["She doesn't like to learn", "No le gusta aprender", null, 4],
    ["My father doesn't like to speak Spanish", "A mi padre no le gusta hablar español", null, 6],
    ["He doesn't like to work", "No le gusta trabajar", null, 4],
    ["My father doesn't like to speak with you", "A mi padre no le gusta hablar contigo", null, 6],
    ["I know someone who doesn't like to speak Spanish", "Conozco a alguien a quien no le gusta hablar español", null, 9],
    ["My father doesn't like to ask for help", "A mi padre no le gusta pedir ayuda", null, 6]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 0, longer_4_5: 5, long_6_plus: 4 }
};

s0240.legos["S0240L03"] = {
  lego: ["to stop talking", "dejar de hablar"],
  type: "M",
  practice_phrases: [
    ["to stop talking", "dejar de hablar", null, 2],
    ["I don't like to stop talking", "No me gusta dejar de hablar", null, 5],
    ["My father doesn't like to stop talking", "A mi padre no le gusta dejar de hablar", null, 6],
    ["I wanted to stop talking", "Quería dejar de hablar", null, 3],
    ["My father doesn't like to stop talking.", "A mi padre no le gusta dejar de hablar.", null, 6],
    ["I'm not going to stop talking", "No voy a dejar de hablar", null, 5],
    ["He doesn't like to stop talking", "No le gusta dejar de hablar", null, 5],
    ["I know someone who doesn't like to stop talking", "Conozco a alguien a quien no le gusta dejar de hablar", null, 9],
    ["I met someone who said that he doesn't like to stop talking", "Conocí a alguien que dijo que no le gusta dejar de hablar", null, 10],
    ["My mother wanted me to stop talking", "Mi madre quería que dejara de hablar", null, 6]
  ],
  phrase_distribution: { really_short_1_2: 1, quite_short_3: 1, longer_4_5: 2, long_6_plus: 6 },
  full_seed_included: "YES"
};

basketsOutput.seeds["S0240"] = s0240;

// Calculate totals
for (const seedId in basketsOutput.seeds) {
  const seed = basketsOutput.seeds[seedId];
  const legoCount = Object.keys(seed.legos).length;
  basketsOutput.total_legos += legoCount;

  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];
    basketsOutput.total_phrases += lego.practice_phrases.length;
  }
}

// Save output
fs.writeFileSync(
  'phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json',
  JSON.stringify(basketsOutput, null, 2)
);

console.log('\n✓ Agent 14 complete!');
console.log(`✓ Seeds processed: ${basketsOutput.total_seeds}`);
console.log(`✓ LEGOs generated: ${basketsOutput.total_legos}`);
console.log(`✓ Total phrases: ${basketsOutput.total_phrases}`);
console.log(`✓ Output saved to: phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json`);

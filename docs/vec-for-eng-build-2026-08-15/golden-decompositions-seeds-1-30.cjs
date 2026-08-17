// vec_for_eng golden decompositions, seeds 1-30 (2026-08-15).
// Exactly what was POSTed to /api/seed/complete and what the DB stores byte-for-byte
// (T1 round-trip: 86/86 LEGOs identical). Committed as .cjs because .gitignore:155
// excludes seed*.json repo-wide. Read alongside docs/pair-contracts/vec_for_eng.contract.cjs.
module.exports = [
 {
  "course_code": "vec_for_eng",
  "seed_number": 1,
  "known_text": "I want to speak Venetian with you now.",
  "target_text": "vojo parlar vèneto co ti deso",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I want to speak",
    "target": "vojo parlar",
    "components": [
     {
      "known": "I want",
      "target": "vojo"
     },
     {
      "known": "to speak",
      "target": "parlar"
     }
    ],
    "build": [
     {
      "known": "I want to speak",
      "target": "vojo parlar"
     }
    ],
    "use": []
   },
   {
    "idx": 2,
    "type": "A",
    "known": "Venetian",
    "target": "vèneto",
    "build": [
     {
      "known": "to speak Venetian",
      "target": "parlar vèneto"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian",
      "target": "vojo parlar vèneto",
      "score": 8
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "with you",
    "target": "co ti",
    "components": [
     {
      "known": "with",
      "target": "co",
      "introduce": false
     },
     {
      "known": "you",
      "target": "ti",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "to speak with you",
      "target": "parlar co ti"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian with you",
      "target": "vojo parlar vèneto co ti",
      "score": 8
     }
    ]
   },
   {
    "idx": 4,
    "type": "A",
    "known": "now",
    "target": "deso",
    "build": [
     {
      "known": "to speak now",
      "target": "parlar deso"
     },
     {
      "known": "with you now",
      "target": "co ti deso"
     },
     {
      "known": "to speak Venetian now",
      "target": "parlar vèneto deso"
     }
    ],
    "use": [
     {
      "known": "I want to speak now",
      "target": "vojo parlar deso",
      "score": 7
     },
     {
      "known": "I want to speak Venetian now",
      "target": "vojo parlar vèneto deso",
      "score": 8
     },
     {
      "known": "I want to speak with you now",
      "target": "vojo parlar co ti deso",
      "score": 7
     },
     {
      "known": "I want to speak Venetian with you now",
      "target": "vojo parlar vèneto co ti deso",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 2,
  "known_text": "I'm trying to learn.",
  "target_text": "son drio a provar a inparar",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm trying to",
    "target": "son drio a provar a",
    "components": [
     {
      "known": "I'm trying to",
      "target": "son drio a provar a"
     }
    ],
    "build": [
     {
      "known": "I'm trying to speak",
      "target": "son drio a provar a parlar"
     },
     {
      "known": "I'm trying to speak Venetian",
      "target": "son drio a provar a parlar vèneto"
     }
    ],
    "use": [
     {
      "known": "I'm trying to speak Venetian with you",
      "target": "son drio a provar a parlar vèneto co ti",
      "score": 7
     },
     {
      "known": "I'm trying to speak with you now",
      "target": "son drio a provar a parlar co ti deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to learn",
    "target": "inparar",
    "build": [
     {
      "known": "I want to learn",
      "target": "vojo inparar"
     },
     {
      "known": "I'm trying to learn",
      "target": "son drio a provar a inparar"
     }
    ],
    "use": [
     {
      "known": "I want to learn Venetian",
      "target": "vojo inparar vèneto",
      "score": 8
     },
     {
      "known": "I'm trying to learn Venetian",
      "target": "son drio a provar a inparar vèneto",
      "score": 8
     },
     {
      "known": "I want to learn Venetian with you",
      "target": "vojo inparar vèneto co ti",
      "score": 7
     },
     {
      "known": "I want to learn Venetian now",
      "target": "vojo inparar vèneto deso",
      "score": 7
     },
     {
      "known": "I'm trying to learn Venetian with you now",
      "target": "son drio a provar a inparar vèneto co ti deso",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 3,
  "known_text": "how to speak as often as possible.",
  "target_text": "come parlar pì speso che se pol",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "how to",
    "target": "come",
    "build": [
     {
      "known": "how to speak",
      "target": "come parlar"
     },
     {
      "known": "how to learn",
      "target": "come inparar"
     }
    ],
    "use": [
     {
      "known": "I want to learn how to speak Venetian",
      "target": "vojo inparar come parlar vèneto",
      "score": 7
     },
     {
      "known": "I'm trying to learn how to speak Venetian",
      "target": "son drio a provar a inparar come parlar vèneto",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "as often as possible",
    "target": "pì speso che se pol",
    "components": [
     {
      "known": "as often as possible",
      "target": "pì speso che se pol"
     }
    ],
    "build": [
     {
      "known": "to speak as often as possible",
      "target": "parlar pì speso che se pol"
     },
     {
      "known": "how to speak as often as possible",
      "target": "come parlar pì speso che se pol"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian as often as possible",
      "target": "vojo parlar vèneto pì speso che se pol",
      "score": 8
     },
     {
      "known": "I'm trying to speak as often as possible",
      "target": "son drio a provar a parlar pì speso che se pol",
      "score": 7
     },
     {
      "known": "I want to learn Venetian as often as possible",
      "target": "vojo inparar vèneto pì speso che se pol",
      "score": 8
     },
     {
      "known": "I want to speak with you as often as possible",
      "target": "vojo parlar co ti pì speso che se pol",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 4,
  "known_text": "how to say something in Venetian",
  "target_text": "come dir calcosa in vèneto",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "something",
    "target": "calcosa",
    "build": [
     {
      "known": "to learn something",
      "target": "inparar calcosa"
     },
     {
      "known": "I want something",
      "target": "vojo calcosa"
     },
     {
      "known": "something now",
      "target": "calcosa deso"
     }
    ],
    "use": [
     {
      "known": "I want to learn something",
      "target": "vojo inparar calcosa",
      "score": 7
     },
     {
      "known": "I'm trying to learn something",
      "target": "son drio a provar a inparar calcosa",
      "score": 7
     },
     {
      "known": "I want to learn something now",
      "target": "vojo inparar calcosa deso",
      "score": 7
     },
     {
      "known": "I'm trying to learn something with you",
      "target": "son drio a provar a inparar calcosa co ti",
      "score": 6
     },
     {
      "known": "I want to learn something as often as possible",
      "target": "vojo inparar calcosa pì speso che se pol",
      "score": 6
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to say",
    "target": "dir",
    "build": [
     {
      "known": "to say something",
      "target": "dir calcosa"
     },
     {
      "known": "I want to say",
      "target": "vojo dir"
     },
     {
      "known": "how to say something",
      "target": "come dir calcosa"
     }
    ],
    "use": [
     {
      "known": "I want to say something",
      "target": "vojo dir calcosa",
      "score": 8
     },
     {
      "known": "I'm trying to say something",
      "target": "son drio a provar a dir calcosa",
      "score": 8
     },
     {
      "known": "I want to say something now",
      "target": "vojo dir calcosa deso",
      "score": 8
     },
     {
      "known": "I want to say something with you",
      "target": "vojo dir calcosa co ti",
      "score": 6
     },
     {
      "known": "I want to say something as often as possible",
      "target": "vojo dir calcosa pì speso che se pol",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "in Venetian",
    "target": "in vèneto",
    "components": [
     {
      "known": "in",
      "target": "in",
      "introduce": false
     },
     {
      "known": "Venetian",
      "target": "vèneto",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "to say something in Venetian",
      "target": "dir calcosa in vèneto"
     },
     {
      "known": "how to say something in Venetian",
      "target": "come dir calcosa in vèneto"
     },
     {
      "known": "to learn in Venetian",
      "target": "inparar in vèneto"
     }
    ],
    "use": [
     {
      "known": "I want to say something in Venetian",
      "target": "vojo dir calcosa in vèneto",
      "score": 8
     },
     {
      "known": "I'm trying to say something in Venetian",
      "target": "son drio a provar a dir calcosa in vèneto",
      "score": 8
     },
     {
      "known": "I want to say something in Venetian now",
      "target": "vojo dir calcosa in vèneto deso",
      "score": 8
     },
     {
      "known": "I want to learn something in Venetian",
      "target": "vojo inparar calcosa in vèneto",
      "score": 7
     },
     {
      "known": "I'm trying to speak in Venetian as often as possible",
      "target": "son drio a provar a parlar in vèneto pì speso che se pol",
      "score": 6
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 5,
  "known_text": "I'm going to practise speaking with someone else.",
  "target_text": "farò pràtega de parlar co calchedun altro",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm going to practise speaking",
    "target": "farò pràtega de parlar",
    "components": [
     {
      "known": "I'm going to practise",
      "target": "farò pràtega de"
     },
     {
      "known": "speaking",
      "target": "parlar",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "I'm going to practise speaking now",
      "target": "farò pràtega de parlar deso"
     },
     {
      "known": "I'm going to practise speaking in Venetian",
      "target": "farò pràtega de parlar in vèneto"
     },
     {
      "known": "I'm going to practise speaking with you",
      "target": "farò pràtega de parlar co ti"
     }
    ],
    "use": [
     {
      "known": "I'm going to practise speaking Venetian",
      "target": "farò pràtega de parlar vèneto",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking Venetian now",
      "target": "farò pràtega de parlar vèneto deso",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking as often as possible",
      "target": "farò pràtega de parlar pì speso che se pol",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking Venetian with you now",
      "target": "farò pràtega de parlar vèneto co ti deso",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking Venetian as often as possible",
      "target": "farò pràtega de parlar vèneto pì speso che se pol",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "with someone else",
    "target": "co calchedun altro",
    "components": [
     {
      "known": "with",
      "target": "co",
      "introduce": false
     },
     {
      "known": "someone else",
      "target": "calchedun altro"
     }
    ],
    "build": [
     {
      "known": "to speak with someone else",
      "target": "parlar co calchedun altro"
     },
     {
      "known": "to learn with someone else",
      "target": "inparar co calchedun altro"
     },
     {
      "known": "to say something with someone else",
      "target": "dir calcosa co calchedun altro"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian with someone else",
      "target": "vojo parlar vèneto co calchedun altro",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking with someone else",
      "target": "farò pràtega de parlar co calchedun altro",
      "score": 8
     },
     {
      "known": "I'm trying to speak with someone else now",
      "target": "son drio a provar a parlar co calchedun altro deso",
      "score": 7
     },
     {
      "known": "I want to learn Venetian with someone else",
      "target": "vojo inparar vèneto co calchedun altro",
      "score": 7
     },
     {
      "known": "I want to speak with someone else as often as possible",
      "target": "vojo parlar co calchedun altro pì speso che se pol",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 6,
  "known_text": "I'm trying to remember a word.",
  "target_text": "son drio a provar a ricordarme na paroła",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "to remember",
    "target": "ricordarme",
    "build": [
     {
      "known": "I want to remember",
      "target": "vojo ricordarme"
     },
     {
      "known": "to remember something",
      "target": "ricordarme calcosa"
     },
     {
      "known": "to remember how to speak",
      "target": "ricordarme come parlar"
     }
    ],
    "use": [
     {
      "known": "I want to remember something",
      "target": "vojo ricordarme calcosa",
      "score": 8
     },
     {
      "known": "I'm trying to remember something now",
      "target": "son drio a provar a ricordarme calcosa deso",
      "score": 8
     },
     {
      "known": "I want to remember how to say something in Venetian",
      "target": "vojo ricordarme come dir calcosa in vèneto",
      "score": 7
     },
     {
      "known": "I want to remember something with you",
      "target": "vojo ricordarme calcosa co ti",
      "score": 6
     },
     {
      "known": "I want to remember how to speak Venetian",
      "target": "vojo ricordarme come parlar vèneto",
      "score": 8
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "a word",
    "target": "na paroła",
    "components": [
     {
      "known": "a",
      "target": "na",
      "introduce": false
     },
     {
      "known": "word",
      "target": "paroła"
     }
    ],
    "build": [
     {
      "known": "to remember a word",
      "target": "ricordarme na paroła"
     },
     {
      "known": "I want to remember a word",
      "target": "vojo ricordarme na paroła"
     },
     {
      "known": "to say a word",
      "target": "dir na paroła"
     }
    ],
    "use": [
     {
      "known": "I'm trying to remember a word now",
      "target": "son drio a provar a ricordarme na paroła deso",
      "score": 8
     },
     {
      "known": "I want to learn a word in Venetian",
      "target": "vojo inparar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I want to say a word in Venetian",
      "target": "vojo dir na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I'm trying to remember a word in Venetian",
      "target": "son drio a provar a ricordarme na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I want to remember a word with you",
      "target": "vojo ricordarme na paroła co ti",
      "score": 6
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 7,
  "known_text": "I want to try as hard as I can today.",
  "target_text": "vojo provar pì che poso ancò",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "to try",
    "target": "provar",
    "build": [
     {
      "known": "I want to try",
      "target": "vojo provar"
     },
     {
      "known": "to try now",
      "target": "provar deso"
     },
     {
      "known": "to try with you",
      "target": "provar co ti"
     }
    ],
    "use": [
     {
      "known": "I want to try now",
      "target": "vojo provar deso",
      "score": 6
     },
     {
      "known": "I want to try as often as possible",
      "target": "vojo provar pì speso che se pol",
      "score": 7
     },
     {
      "known": "I want to try with someone else",
      "target": "vojo provar co calchedun altro",
      "score": 7
     },
     {
      "known": "I want to try with you now",
      "target": "vojo provar co ti deso",
      "score": 6
     },
     {
      "known": "I want to try in Venetian",
      "target": "vojo provar in vèneto",
      "score": 6
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "as hard as I can",
    "target": "pì che poso",
    "components": [
     {
      "known": "as hard as I can",
      "target": "pì che poso"
     }
    ],
    "build": [
     {
      "known": "I want to try as hard as I can",
      "target": "vojo provar pì che poso"
     },
     {
      "known": "to speak as hard as I can",
      "target": "parlar pì che poso"
     },
     {
      "known": "to learn as hard as I can",
      "target": "inparar pì che poso"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian as hard as I can",
      "target": "vojo parlar vèneto pì che poso",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking as hard as I can",
      "target": "farò pràtega de parlar pì che poso",
      "score": 7
     },
     {
      "known": "I want to learn Venetian as hard as I can",
      "target": "vojo inparar vèneto pì che poso",
      "score": 7
     },
     {
      "known": "I'm trying to remember a word as hard as I can",
      "target": "son drio a provar a ricordarme na paroła pì che poso",
      "score": 6
     },
     {
      "known": "I want to speak with someone else as hard as I can",
      "target": "vojo parlar co calchedun altro pì che poso",
      "score": 6
     }
    ]
   },
   {
    "idx": 3,
    "type": "A",
    "known": "today",
    "target": "ancò",
    "build": [
     {
      "known": "to speak today",
      "target": "parlar ancò"
     },
     {
      "known": "I want to try today",
      "target": "vojo provar ancò"
     },
     {
      "known": "a word today",
      "target": "na paroła ancò"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian today",
      "target": "vojo parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I want to try as hard as I can today",
      "target": "vojo provar pì che poso ancò",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking with someone else today",
      "target": "farò pràtega de parlar co calchedun altro ancò",
      "score": 7
     },
     {
      "known": "I'm trying to learn a word today",
      "target": "son drio a provar a inparar na paroła ancò",
      "score": 7
     },
     {
      "known": "I want to remember a word in Venetian today",
      "target": "vojo ricordarme na paroła in vèneto ancò",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 8,
  "known_text": "I'm going to try to explain what I mean.",
  "target_text": "provarò a spiegar queło che vojo dir",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm going to try to",
    "target": "provarò a",
    "components": [
     {
      "known": "I'm going to try to",
      "target": "provarò a"
     }
    ],
    "build": [
     {
      "known": "I'm going to try to speak",
      "target": "provarò a parlar"
     },
     {
      "known": "I'm going to try to learn",
      "target": "provarò a inparar"
     },
     {
      "known": "I'm going to try to remember",
      "target": "provarò a ricordarme"
     }
    ],
    "use": [
     {
      "known": "I'm going to try to speak Venetian today",
      "target": "provarò a parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'm going to try to remember a word",
      "target": "provarò a ricordarme na paroła",
      "score": 8
     },
     {
      "known": "I'm going to try to speak with someone else",
      "target": "provarò a parlar co calchedun altro",
      "score": 8
     },
     {
      "known": "I'm going to try to learn Venetian as often as possible",
      "target": "provarò a inparar vèneto pì speso che se pol",
      "score": 7
     },
     {
      "known": "I'm going to try to say something in Venetian now",
      "target": "provarò a dir calcosa in vèneto deso",
      "score": 8
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to explain",
    "target": "spiegar",
    "build": [
     {
      "known": "I want to explain",
      "target": "vojo spiegar"
     },
     {
      "known": "I'm going to try to explain",
      "target": "provarò a spiegar"
     },
     {
      "known": "to explain a word",
      "target": "spiegar na paroła"
     }
    ],
    "use": [
     {
      "known": "I want to explain something in Venetian",
      "target": "vojo spiegar calcosa in vèneto",
      "score": 8
     },
     {
      "known": "I'm going to try to explain something today",
      "target": "provarò a spiegar calcosa ancò",
      "score": 8
     },
     {
      "known": "I'm trying to explain a word",
      "target": "son drio a provar a spiegar na paroła",
      "score": 7
     },
     {
      "known": "I want to explain a word in Venetian",
      "target": "vojo spiegar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I want to explain something with you today",
      "target": "vojo spiegar calcosa co ti ancò",
      "score": 6
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "what I mean",
    "target": "queło che vojo dir",
    "components": [
     {
      "known": "what I mean",
      "target": "queło che vojo dir"
     }
    ],
    "build": [
     {
      "known": "to explain what I mean",
      "target": "spiegar queło che vojo dir"
     },
     {
      "known": "to say what I mean",
      "target": "dir queło che vojo dir"
     },
     {
      "known": "to remember what I mean",
      "target": "ricordarme queło che vojo dir"
     }
    ],
    "use": [
     {
      "known": "I want to explain what I mean",
      "target": "vojo spiegar queło che vojo dir",
      "score": 8
     },
     {
      "known": "I'm going to try to explain what I mean",
      "target": "provarò a spiegar queło che vojo dir",
      "score": 8
     },
     {
      "known": "I'm trying to explain what I mean now",
      "target": "son drio a provar a spiegar queło che vojo dir deso",
      "score": 7
     },
     {
      "known": "I want to explain what I mean in Venetian",
      "target": "vojo spiegar queło che vojo dir in vèneto",
      "score": 7
     },
     {
      "known": "I'm going to try to say what I mean in Venetian",
      "target": "provarò a dir queło che vojo dir in vèneto",
      "score": 6
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 9,
  "known_text": "I speak a little Venetian now.",
  "target_text": "parlo un fià de vèneto deso",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "I speak",
    "target": "parlo",
    "build": [
     {
      "known": "I speak Venetian",
      "target": "parlo vèneto"
     },
     {
      "known": "I speak now",
      "target": "parlo deso"
     },
     {
      "known": "I speak with you",
      "target": "parlo co ti"
     }
    ],
    "use": [
     {
      "known": "I speak Venetian now",
      "target": "parlo vèneto deso",
      "score": 7
     },
     {
      "known": "I speak Venetian with you",
      "target": "parlo vèneto co ti",
      "score": 7
     },
     {
      "known": "I speak Venetian with someone else today",
      "target": "parlo vèneto co calchedun altro ancò",
      "score": 7
     },
     {
      "known": "I speak Venetian as often as possible",
      "target": "parlo vèneto pì speso che se pol",
      "score": 7
     },
     {
      "known": "I speak Venetian with you today",
      "target": "parlo vèneto co ti ancò",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "a little",
    "target": "un fià de",
    "components": [
     {
      "known": "a little",
      "target": "un fià de"
     }
    ],
    "build": [
     {
      "known": "a little Venetian",
      "target": "un fià de vèneto"
     },
     {
      "known": "I speak a little Venetian",
      "target": "parlo un fià de vèneto"
     },
     {
      "known": "to learn a little Venetian",
      "target": "inparar un fià de vèneto"
     }
    ],
    "use": [
     {
      "known": "I speak a little Venetian now",
      "target": "parlo un fià de vèneto deso",
      "score": 8
     },
     {
      "known": "I want to learn a little Venetian today",
      "target": "vojo inparar un fià de vèneto ancò",
      "score": 8
     },
     {
      "known": "I'm trying to speak a little Venetian",
      "target": "son drio a provar a parlar un fià de vèneto",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking a little Venetian with someone else",
      "target": "farò pràtega de parlar un fià de vèneto co calchedun altro",
      "score": 7
     },
     {
      "known": "I speak a little Venetian with you today",
      "target": "parlo un fià de vèneto co ti ancò",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 10,
  "known_text": "I'm not sure if I can remember the whole sentence.",
  "target_text": "no son sicuro se poso ricordarme tuta ła frase",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "if I can",
    "target": "se poso",
    "components": [
     {
      "known": "if",
      "target": "se",
      "introduce": false
     },
     {
      "known": "I can",
      "target": "poso"
     }
    ],
    "build": [
     {
      "known": "if I can speak",
      "target": "se poso parlar"
     },
     {
      "known": "if I can remember",
      "target": "se poso ricordarme"
     },
     {
      "known": "if I can learn",
      "target": "se poso inparar"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian if I can",
      "target": "vojo parlar vèneto se poso",
      "score": 7
     },
     {
      "known": "I'm going to try to explain something if I can",
      "target": "provarò a spiegar calcosa se poso",
      "score": 7
     },
     {
      "known": "I want to remember a word today if I can",
      "target": "vojo ricordarme na paroła ancò se poso",
      "score": 6
     },
     {
      "known": "I want to say something in Venetian if I can",
      "target": "vojo dir calcosa in vèneto se poso",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking with someone else if I can",
      "target": "farò pràtega de parlar co calchedun altro se poso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "the whole sentence",
    "target": "tuta ła frase",
    "components": [
     {
      "known": "whole",
      "target": "tuta"
     },
     {
      "known": "the",
      "target": "ła",
      "introduce": false
     },
     {
      "known": "sentence",
      "target": "frase"
     }
    ],
    "build": [
     {
      "known": "to remember the whole sentence",
      "target": "ricordarme tuta ła frase"
     },
     {
      "known": "if I can remember the whole sentence",
      "target": "se poso ricordarme tuta ła frase"
     },
     {
      "known": "to say the whole sentence",
      "target": "dir tuta ła frase"
     }
    ],
    "use": [
     {
      "known": "I want to remember the whole sentence",
      "target": "vojo ricordarme tuta ła frase",
      "score": 8
     },
     {
      "known": "I'm trying to remember the whole sentence today",
      "target": "son drio a provar a ricordarme tuta ła frase ancò",
      "score": 8
     },
     {
      "known": "I want to say the whole sentence in Venetian",
      "target": "vojo dir tuta ła frase in vèneto",
      "score": 8
     },
     {
      "known": "I want to explain the whole sentence if I can",
      "target": "vojo spiegar tuta ła frase se poso",
      "score": 7
     },
     {
      "known": "I'm going to try to say the whole sentence",
      "target": "provarò a dir tuta ła frase",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "I'm not sure",
    "target": "no son sicuro",
    "components": [
     {
      "known": "not",
      "target": "no",
      "introduce": false
     },
     {
      "known": "I'm sure",
      "target": "son sicuro"
     }
    ],
    "build": [
     {
      "known": "I'm not sure today",
      "target": "no son sicuro ancò"
     },
     {
      "known": "I'm not sure now",
      "target": "no son sicuro deso"
     },
     {
      "known": "I'm not sure if I can",
      "target": "no son sicuro se poso"
     }
    ],
    "use": [
     {
      "known": "I'm not sure if I can remember",
      "target": "no son sicuro se poso ricordarme",
      "score": 8
     },
     {
      "known": "I'm not sure if I can remember the whole sentence",
      "target": "no son sicuro se poso ricordarme tuta ła frase",
      "score": 8
     },
     {
      "known": "I'm not sure if I can speak Venetian today",
      "target": "no son sicuro se poso parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'm not sure if I can say something in Venetian",
      "target": "no son sicuro se poso dir calcosa in vèneto",
      "score": 8
     },
     {
      "known": "I'm not sure if I can explain what I mean",
      "target": "no son sicuro se poso spiegar queło che vojo dir",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 11,
  "known_text": "I'd like to be able to speak after you finish.",
  "target_text": "vorìa poder parlar dopo che te finisi",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "I'd like",
    "target": "vorìa",
    "build": [
     {
      "known": "I'd like to speak",
      "target": "vorìa parlar"
     },
     {
      "known": "I'd like to learn",
      "target": "vorìa inparar"
     },
     {
      "known": "I'd like to try",
      "target": "vorìa provar"
     }
    ],
    "use": [
     {
      "known": "I'd like to speak Venetian today",
      "target": "vorìa parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'd like to learn a word in Venetian",
      "target": "vorìa inparar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I'd like to speak Venetian with you now",
      "target": "vorìa parlar vèneto co ti deso",
      "score": 8
     },
     {
      "known": "I'd like to remember the whole sentence",
      "target": "vorìa ricordarme tuta ła frase",
      "score": 8
     },
     {
      "known": "I'd like to speak Venetian as often as possible",
      "target": "vorìa parlar vèneto pì speso che se pol",
      "score": 8
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to be able to",
    "target": "poder",
    "build": [
     {
      "known": "I'd like to be able to speak",
      "target": "vorìa poder parlar"
     },
     {
      "known": "to be able to remember",
      "target": "poder ricordarme"
     },
     {
      "known": "to be able to learn",
      "target": "poder inparar"
     }
    ],
    "use": [
     {
      "known": "I'd like to be able to speak Venetian",
      "target": "vorìa poder parlar vèneto",
      "score": 8
     },
     {
      "known": "I'd like to be able to remember the whole sentence",
      "target": "vorìa poder ricordarme tuta ła frase",
      "score": 8
     },
     {
      "known": "I want to be able to speak Venetian today",
      "target": "vojo poder parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'd like to be able to say something in Venetian",
      "target": "vorìa poder dir calcosa in vèneto",
      "score": 8
     },
     {
      "known": "I'm going to try to be able to speak with someone else",
      "target": "provarò a poder parlar co calchedun altro",
      "score": 6
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "after you finish",
    "target": "dopo che te finisi",
    "components": [
     {
      "known": "after",
      "target": "dopo che",
      "introduce": false
     },
     {
      "known": "you finish",
      "target": "te finisi"
     }
    ],
    "build": [
     {
      "known": "to speak after you finish",
      "target": "parlar dopo che te finisi"
     },
     {
      "known": "to learn after you finish",
      "target": "inparar dopo che te finisi"
     },
     {
      "known": "I'd like to speak after you finish",
      "target": "vorìa parlar dopo che te finisi"
     }
    ],
    "use": [
     {
      "known": "I'd like to be able to speak after you finish",
      "target": "vorìa poder parlar dopo che te finisi",
      "score": 8
     },
     {
      "known": "I want to speak Venetian after you finish",
      "target": "vojo parlar vèneto dopo che te finisi",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking after you finish",
      "target": "farò pràtega de parlar dopo che te finisi",
      "score": 8
     },
     {
      "known": "I want to say something in Venetian after you finish",
      "target": "vojo dir calcosa in vèneto dopo che te finisi",
      "score": 7
     },
     {
      "known": "I'd like to learn a word after you finish",
      "target": "vorìa inparar na paroła dopo che te finisi",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 12,
  "known_text": "I wouldn't like to guess what's going to happen tomorrow.",
  "target_text": "no vorìa indovinar queło che capitarà doman",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I wouldn't like",
    "target": "no vorìa",
    "components": [
     {
      "known": "not",
      "target": "no",
      "introduce": false
     },
     {
      "known": "I'd like",
      "target": "vorìa",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "I wouldn't like to speak",
      "target": "no vorìa parlar"
     },
     {
      "known": "I wouldn't like to try",
      "target": "no vorìa provar"
     },
     {
      "known": "I wouldn't like to learn",
      "target": "no vorìa inparar"
     }
    ],
    "use": [
     {
      "known": "I wouldn't like to speak Venetian today",
      "target": "no vorìa parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I wouldn't like to try as hard as I can",
      "target": "no vorìa provar pì che poso",
      "score": 7
     },
     {
      "known": "I wouldn't like to be able to speak with someone else",
      "target": "no vorìa poder parlar co calchedun altro",
      "score": 6
     },
     {
      "known": "I wouldn't like to say something in Venetian now",
      "target": "no vorìa dir calcosa in vèneto deso",
      "score": 7
     },
     {
      "known": "I wouldn't like to speak after you finish",
      "target": "no vorìa parlar dopo che te finisi",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to guess",
    "target": "indovinar",
    "build": [
     {
      "known": "I'd like to guess",
      "target": "vorìa indovinar"
     },
     {
      "known": "to guess a word",
      "target": "indovinar na paroła"
     },
     {
      "known": "I wouldn't like to guess",
      "target": "no vorìa indovinar"
     }
    ],
    "use": [
     {
      "known": "I want to guess a word in Venetian",
      "target": "vojo indovinar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "I wouldn't like to guess now",
      "target": "no vorìa indovinar deso",
      "score": 7
     },
     {
      "known": "I'm going to try to guess the whole sentence",
      "target": "provarò a indovinar tuta ła frase",
      "score": 7
     },
     {
      "known": "I'd like to be able to guess something in Venetian",
      "target": "vorìa poder indovinar calcosa in vèneto",
      "score": 7
     },
     {
      "known": "I'm trying to guess a word today",
      "target": "son drio a provar a indovinar na paroła ancò",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "what's going to happen",
    "target": "queło che capitarà",
    "components": [
     {
      "known": "what",
      "target": "queło che",
      "introduce": false
     },
     {
      "known": "is going to happen",
      "target": "capitarà"
     }
    ],
    "build": [
     {
      "known": "to guess what's going to happen",
      "target": "indovinar queło che capitarà"
     },
     {
      "known": "to say what's going to happen",
      "target": "dir queło che capitarà"
     },
     {
      "known": "to explain what's going to happen",
      "target": "spiegar queło che capitarà"
     }
    ],
    "use": [
     {
      "known": "I wouldn't like to guess what's going to happen",
      "target": "no vorìa indovinar queło che capitarà",
      "score": 8
     },
     {
      "known": "I want to explain what's going to happen",
      "target": "vojo spiegar queło che capitarà",
      "score": 8
     },
     {
      "known": "I'm going to try to say what's going to happen",
      "target": "provarò a dir queło che capitarà",
      "score": 7
     },
     {
      "known": "I'm not sure if I can explain what's going to happen",
      "target": "no son sicuro se poso spiegar queło che capitarà",
      "score": 8
     },
     {
      "known": "I'd like to be able to guess what's going to happen",
      "target": "vorìa poder indovinar queło che capitarà",
      "score": 7
     }
    ]
   },
   {
    "idx": 4,
    "type": "A",
    "known": "tomorrow",
    "target": "doman",
    "build": [
     {
      "known": "to speak tomorrow",
      "target": "parlar doman"
     },
     {
      "known": "I'd like to try tomorrow",
      "target": "vorìa provar doman"
     },
     {
      "known": "a word tomorrow",
      "target": "na paroła doman"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian tomorrow",
      "target": "vojo parlar vèneto doman",
      "score": 8
     },
     {
      "known": "I wouldn't like to guess what's going to happen tomorrow",
      "target": "no vorìa indovinar queło che capitarà doman",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking with someone else tomorrow",
      "target": "farò pràtega de parlar co calchedun altro doman",
      "score": 7
     },
     {
      "known": "I'd like to be able to speak Venetian tomorrow",
      "target": "vorìa poder parlar vèneto doman",
      "score": 8
     },
     {
      "known": "I want to remember the whole sentence tomorrow",
      "target": "vojo ricordarme tuta ła frase doman",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 13,
  "known_text": "You speak Venetian very well.",
  "target_text": "te parli vèneto molto ben",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "you speak",
    "target": "te parli",
    "components": [
     {
      "known": "you speak",
      "target": "te parli"
     }
    ],
    "build": [
     {
      "known": "you speak Venetian",
      "target": "te parli vèneto"
     },
     {
      "known": "you speak now",
      "target": "te parli deso"
     },
     {
      "known": "you speak a little Venetian",
      "target": "te parli un fià de vèneto"
     }
    ],
    "use": [
     {
      "known": "you speak Venetian now",
      "target": "te parli vèneto deso",
      "score": 7
     },
     {
      "known": "you speak Venetian today",
      "target": "te parli vèneto ancò",
      "score": 7
     },
     {
      "known": "you speak Venetian after you finish",
      "target": "te parli vèneto dopo che te finisi",
      "score": 6
     },
     {
      "known": "you speak Venetian as often as possible",
      "target": "te parli vèneto pì speso che se pol",
      "score": 7
     },
     {
      "known": "you speak Venetian with someone else today",
      "target": "te parli vèneto co calchedun altro ancò",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "very well",
    "target": "molto ben",
    "components": [
     {
      "known": "very",
      "target": "molto"
     },
     {
      "known": "well",
      "target": "ben"
     }
    ],
    "build": [
     {
      "known": "to speak very well",
      "target": "parlar molto ben"
     },
     {
      "known": "you speak very well",
      "target": "te parli molto ben"
     },
     {
      "known": "to learn very well",
      "target": "inparar molto ben"
     }
    ],
    "use": [
     {
      "known": "you speak Venetian very well",
      "target": "te parli vèneto molto ben",
      "score": 8
     },
     {
      "known": "I want to speak Venetian very well",
      "target": "vojo parlar vèneto molto ben",
      "score": 8
     },
     {
      "known": "I'd like to be able to speak Venetian very well",
      "target": "vorìa poder parlar vèneto molto ben",
      "score": 8
     },
     {
      "known": "I'm going to practise speaking Venetian very well",
      "target": "farò pràtega de parlar vèneto molto ben",
      "score": 7
     },
     {
      "known": "I'm not sure if I can speak Venetian very well",
      "target": "no son sicuro se poso parlar vèneto molto ben",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 14,
  "known_text": "Do you speak Venetian all day?",
  "target_text": "pàrlitu vèneto tuto el dì",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "do you speak",
    "target": "pàrlitu",
    "build": [
     {
      "known": "do you speak Venetian",
      "target": "pàrlitu vèneto"
     },
     {
      "known": "do you speak now",
      "target": "pàrlitu deso"
     },
     {
      "known": "do you speak a little Venetian",
      "target": "pàrlitu un fià de vèneto"
     }
    ],
    "use": [
     {
      "known": "do you speak Venetian today",
      "target": "pàrlitu vèneto ancò",
      "score": 7
     },
     {
      "known": "do you speak Venetian very well",
      "target": "pàrlitu vèneto molto ben",
      "score": 7
     },
     {
      "known": "do you speak Venetian with someone else",
      "target": "pàrlitu vèneto co calchedun altro",
      "score": 7
     },
     {
      "known": "do you speak Venetian as often as possible",
      "target": "pàrlitu vèneto pì speso che se pol",
      "score": 7
     },
     {
      "known": "do you speak a little Venetian now",
      "target": "pàrlitu un fià de vèneto deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "all day",
    "target": "tuto el dì",
    "components": [
     {
      "known": "all day",
      "target": "tuto el dì"
     }
    ],
    "build": [
     {
      "known": "to speak all day",
      "target": "parlar tuto el dì"
     },
     {
      "known": "to learn all day",
      "target": "inparar tuto el dì"
     },
     {
      "known": "you speak all day",
      "target": "te parli tuto el dì"
     }
    ],
    "use": [
     {
      "known": "do you speak Venetian all day",
      "target": "pàrlitu vèneto tuto el dì",
      "score": 8
     },
     {
      "known": "I want to speak Venetian all day",
      "target": "vojo parlar vèneto tuto el dì",
      "score": 8
     },
     {
      "known": "I'd like to speak Venetian all day tomorrow",
      "target": "vorìa parlar vèneto tuto el dì doman",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking all day today",
      "target": "farò pràtega de parlar tuto el dì ancò",
      "score": 7
     },
     {
      "known": "I'm not sure if I can speak Venetian all day",
      "target": "no son sicuro se poso parlar vèneto tuto el dì",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 15,
  "known_text": "And I want you to speak Venetian with me tomorrow.",
  "target_text": "e vojo che te parli vèneto co mi doman",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "with me",
    "target": "co mi",
    "components": [
     {
      "known": "with",
      "target": "co",
      "introduce": false
     },
     {
      "known": "me",
      "target": "mi"
     }
    ],
    "build": [
     {
      "known": "to speak with me",
      "target": "parlar co mi"
     },
     {
      "known": "to learn with me",
      "target": "inparar co mi"
     },
     {
      "known": "to say something with me",
      "target": "dir calcosa co mi"
     }
    ],
    "use": [
     {
      "known": "do you speak Venetian with me",
      "target": "pàrlitu vèneto co mi",
      "score": 8
     },
     {
      "known": "you speak Venetian with me today",
      "target": "te parli vèneto co mi ancò",
      "score": 7
     },
     {
      "known": "do you speak Venetian with me tomorrow",
      "target": "pàrlitu vèneto co mi doman",
      "score": 7
     },
     {
      "known": "do you speak Venetian with me all day",
      "target": "pàrlitu vèneto co mi tuto el dì",
      "score": 7
     },
     {
      "known": "you speak Venetian with me very well",
      "target": "te parli vèneto co mi molto ben",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "and I want you to speak",
    "target": "e vojo che te parli",
    "components": [
     {
      "known": "and",
      "target": "e",
      "introduce": false
     },
     {
      "known": "I want",
      "target": "vojo",
      "introduce": false
     },
     {
      "known": "that",
      "target": "che",
      "introduce": false
     },
     {
      "known": "you speak",
      "target": "te parli",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "and I want you to speak Venetian",
      "target": "e vojo che te parli vèneto"
     },
     {
      "known": "and I want you to speak now",
      "target": "e vojo che te parli deso"
     },
     {
      "known": "and I want you to speak with me",
      "target": "e vojo che te parli co mi"
     }
    ],
    "use": [
     {
      "known": "and I want you to speak Venetian with me tomorrow",
      "target": "e vojo che te parli vèneto co mi doman",
      "score": 8
     },
     {
      "known": "and I want you to speak Venetian today",
      "target": "e vojo che te parli vèneto ancò",
      "score": 8
     },
     {
      "known": "and I want you to speak Venetian very well",
      "target": "e vojo che te parli vèneto molto ben",
      "score": 7
     },
     {
      "known": "and I want you to speak Venetian all day",
      "target": "e vojo che te parli vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "and I want you to speak Venetian as often as possible",
      "target": "e vojo che te parli vèneto pì speso che se pol",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 16,
  "known_text": "He wants to come back with everyone else later on.",
  "target_text": "el vol tornar co tuti i altri pì tardi",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "he wants",
    "target": "el vol",
    "components": [
     {
      "known": "he",
      "target": "el"
     },
     {
      "known": "wants",
      "target": "vol"
     }
    ],
    "build": [
     {
      "known": "he wants to speak",
      "target": "el vol parlar"
     },
     {
      "known": "he wants to learn",
      "target": "el vol inparar"
     },
     {
      "known": "he wants to try",
      "target": "el vol provar"
     }
    ],
    "use": [
     {
      "known": "he wants to speak Venetian today",
      "target": "el vol parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "he wants to speak Venetian with me tomorrow",
      "target": "el vol parlar vèneto co mi doman",
      "score": 8
     },
     {
      "known": "he wants to learn a word in Venetian",
      "target": "el vol inparar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "he wants to speak Venetian very well",
      "target": "el vol parlar vèneto molto ben",
      "score": 8
     },
     {
      "known": "he wants to speak Venetian all day",
      "target": "el vol parlar vèneto tuto el dì",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to come back",
    "target": "tornar",
    "build": [
     {
      "known": "he wants to come back",
      "target": "el vol tornar"
     },
     {
      "known": "I want to come back",
      "target": "vojo tornar"
     },
     {
      "known": "to come back tomorrow",
      "target": "tornar doman"
     }
    ],
    "use": [
     {
      "known": "I want to come back tomorrow",
      "target": "vojo tornar doman",
      "score": 7
     },
     {
      "known": "he wants to come back with me today",
      "target": "el vol tornar co mi ancò",
      "score": 7
     },
     {
      "known": "I'd like to be able to come back tomorrow",
      "target": "vorìa poder tornar doman",
      "score": 7
     },
     {
      "known": "I'm going to try to come back with someone else",
      "target": "provarò a tornar co calchedun altro",
      "score": 7
     },
     {
      "known": "I'm not sure if I can come back tomorrow",
      "target": "no son sicuro se poso tornar doman",
      "score": 8
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "with everyone else",
    "target": "co tuti i altri",
    "components": [
     {
      "known": "with",
      "target": "co",
      "introduce": false
     },
     {
      "known": "everyone else",
      "target": "tuti i altri"
     }
    ],
    "build": [
     {
      "known": "to speak with everyone else",
      "target": "parlar co tuti i altri"
     },
     {
      "known": "to come back with everyone else",
      "target": "tornar co tuti i altri"
     },
     {
      "known": "to learn with everyone else",
      "target": "inparar co tuti i altri"
     }
    ],
    "use": [
     {
      "known": "he wants to come back with everyone else",
      "target": "el vol tornar co tuti i altri",
      "score": 8
     },
     {
      "known": "I want to speak Venetian with everyone else",
      "target": "vojo parlar vèneto co tuti i altri",
      "score": 8
     },
     {
      "known": "I'd like to speak Venetian with everyone else tomorrow",
      "target": "vorìa parlar vèneto co tuti i altri doman",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking with everyone else today",
      "target": "farò pràtega de parlar co tuti i altri ancò",
      "score": 7
     },
     {
      "known": "do you speak Venetian with everyone else",
      "target": "pàrlitu vèneto co tuti i altri",
      "score": 7
     }
    ]
   },
   {
    "idx": 4,
    "type": "M",
    "known": "later on",
    "target": "pì tardi",
    "components": [
     {
      "known": "later on",
      "target": "pì tardi"
     }
    ],
    "build": [
     {
      "known": "to speak later on",
      "target": "parlar pì tardi"
     },
     {
      "known": "to come back later on",
      "target": "tornar pì tardi"
     },
     {
      "known": "he wants to speak later on",
      "target": "el vol parlar pì tardi"
     }
    ],
    "use": [
     {
      "known": "he wants to come back with everyone else later on",
      "target": "el vol tornar co tuti i altri pì tardi",
      "score": 8
     },
     {
      "known": "I want to speak Venetian later on",
      "target": "vojo parlar vèneto pì tardi",
      "score": 8
     },
     {
      "known": "I'd like to be able to come back later on",
      "target": "vorìa poder tornar pì tardi",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking with someone else later on",
      "target": "farò pràtega de parlar co calchedun altro pì tardi",
      "score": 7
     },
     {
      "known": "I'm not sure if I can come back later on",
      "target": "no son sicuro se poso tornar pì tardi",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 17,
  "known_text": "She wants to find out what the answer is.",
  "target_text": "ła vol saver cosa che xe ła risposta",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "she wants",
    "target": "ła vol",
    "components": [
     {
      "known": "she",
      "target": "ła"
     },
     {
      "known": "wants",
      "target": "vol",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "she wants to speak",
      "target": "ła vol parlar"
     },
     {
      "known": "she wants to learn",
      "target": "ła vol inparar"
     },
     {
      "known": "she wants to come back",
      "target": "ła vol tornar"
     }
    ],
    "use": [
     {
      "known": "she wants to speak Venetian today",
      "target": "ła vol parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "she wants to come back with everyone else later on",
      "target": "ła vol tornar co tuti i altri pì tardi",
      "score": 8
     },
     {
      "known": "she wants to learn a word in Venetian",
      "target": "ła vol inparar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "she wants to speak Venetian with me tomorrow",
      "target": "ła vol parlar vèneto co mi doman",
      "score": 8
     },
     {
      "known": "she wants to speak Venetian very well",
      "target": "ła vol parlar vèneto molto ben",
      "score": 8
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to find out",
    "target": "saver",
    "build": [
     {
      "known": "she wants to find out",
      "target": "ła vol saver"
     },
     {
      "known": "I want to find out",
      "target": "vojo saver"
     },
     {
      "known": "to find out tomorrow",
      "target": "saver doman"
     }
    ],
    "use": [
     {
      "known": "I want to find out something today",
      "target": "vojo saver calcosa ancò",
      "score": 7
     },
     {
      "known": "she wants to find out what I mean",
      "target": "ła vol saver queło che vojo dir",
      "score": 7
     },
     {
      "known": "I'd like to find out what's going to happen tomorrow",
      "target": "vorìa saver queło che capitarà doman",
      "score": 8
     },
     {
      "known": "I'm going to try to find out something tomorrow",
      "target": "provarò a saver calcosa doman",
      "score": 7
     },
     {
      "known": "I'm not sure if I can find out what's going to happen",
      "target": "no son sicuro se poso saver queło che capitarà",
      "score": 8
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "the answer",
    "target": "ła risposta",
    "components": [
     {
      "known": "the answer",
      "target": "ła risposta"
     }
    ],
    "build": [
     {
      "known": "to find out the answer",
      "target": "saver ła risposta"
     },
     {
      "known": "she wants to find out the answer",
      "target": "ła vol saver ła risposta"
     },
     {
      "known": "the answer tomorrow",
      "target": "ła risposta doman"
     }
    ],
    "use": [
     {
      "known": "I want to find out the answer today",
      "target": "vojo saver ła risposta ancò",
      "score": 8
     },
     {
      "known": "she wants to find out the answer tomorrow",
      "target": "ła vol saver ła risposta doman",
      "score": 8
     },
     {
      "known": "I'd like to be able to find out the answer",
      "target": "vorìa poder saver ła risposta",
      "score": 8
     },
     {
      "known": "I'm going to try to explain the answer",
      "target": "provarò a spiegar ła risposta",
      "score": 7
     },
     {
      "known": "I'm not sure if I can remember the answer",
      "target": "no son sicuro se poso ricordarme ła risposta",
      "score": 8
     }
    ]
   },
   {
    "idx": 4,
    "type": "M",
    "known": "what is",
    "target": "cosa che xe",
    "components": [
     {
      "known": "what is",
      "target": "cosa che xe"
     }
    ],
    "build": [
     {
      "known": "to find out what the answer is",
      "target": "saver cosa che xe ła risposta"
     },
     {
      "known": "she wants to find out what the answer is",
      "target": "ła vol saver cosa che xe ła risposta"
     },
     {
      "known": "I want to find out what the answer is",
      "target": "vojo saver cosa che xe ła risposta"
     }
    ],
    "use": [
     {
      "known": "she wants to find out what the answer is today",
      "target": "ła vol saver cosa che xe ła risposta ancò",
      "score": 8
     },
     {
      "known": "I want to find out what the answer is tomorrow",
      "target": "vojo saver cosa che xe ła risposta doman",
      "score": 8
     },
     {
      "known": "I'd like to find out what the answer is later on",
      "target": "vorìa saver cosa che xe ła risposta pì tardi",
      "score": 7
     },
     {
      "known": "I'm not sure if I can find out what the answer is",
      "target": "no son sicuro se poso saver cosa che xe ła risposta",
      "score": 8
     },
     {
      "known": "I'm going to try to explain what the answer is",
      "target": "provarò a spiegar cosa che xe ła risposta",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 18,
  "known_text": "We want to meet at six o'clock this evening.",
  "target_text": "volemo catarse a łe sie stasera",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "we want",
    "target": "volemo",
    "build": [
     {
      "known": "we want to speak",
      "target": "volemo parlar"
     },
     {
      "known": "we want to learn",
      "target": "volemo inparar"
     },
     {
      "known": "we want to come back",
      "target": "volemo tornar"
     }
    ],
    "use": [
     {
      "known": "we want to speak Venetian today",
      "target": "volemo parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "we want to come back with everyone else later on",
      "target": "volemo tornar co tuti i altri pì tardi",
      "score": 8
     },
     {
      "known": "we want to speak Venetian very well",
      "target": "volemo parlar vèneto molto ben",
      "score": 8
     },
     {
      "known": "we want to find out the answer tomorrow",
      "target": "volemo saver ła risposta doman",
      "score": 8
     },
     {
      "known": "we want to learn a word in Venetian today",
      "target": "volemo inparar na paroła in vèneto ancò",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to meet",
    "target": "catarse",
    "build": [
     {
      "known": "we want to meet",
      "target": "volemo catarse"
     },
     {
      "known": "I want to meet",
      "target": "vojo catarse"
     },
     {
      "known": "to meet tomorrow",
      "target": "catarse doman"
     }
    ],
    "use": [
     {
      "known": "we want to meet tomorrow",
      "target": "volemo catarse doman",
      "score": 8
     },
     {
      "known": "I'd like to meet with everyone else later on",
      "target": "vorìa catarse co tuti i altri pì tardi",
      "score": 7
     },
     {
      "known": "she wants to meet with me today",
      "target": "ła vol catarse co mi ancò",
      "score": 7
     },
     {
      "known": "I'm going to try to meet with someone else tomorrow",
      "target": "provarò a catarse co calchedun altro doman",
      "score": 7
     },
     {
      "known": "I'm not sure if I can meet with you today",
      "target": "no son sicuro se poso catarse co ti ancò",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "at six o'clock",
    "target": "a łe sie",
    "components": [
     {
      "known": "at six o'clock",
      "target": "a łe sie"
     }
    ],
    "build": [
     {
      "known": "to meet at six o'clock",
      "target": "catarse a łe sie"
     },
     {
      "known": "we want to meet at six o'clock",
      "target": "volemo catarse a łe sie"
     },
     {
      "known": "to speak at six o'clock",
      "target": "parlar a łe sie"
     }
    ],
    "use": [
     {
      "known": "we want to meet at six o'clock tomorrow",
      "target": "volemo catarse a łe sie doman",
      "score": 8
     },
     {
      "known": "I'd like to meet at six o'clock today",
      "target": "vorìa catarse a łe sie ancò",
      "score": 8
     },
     {
      "known": "she wants to meet at six o'clock with everyone else",
      "target": "ła vol catarse a łe sie co tuti i altri",
      "score": 7
     },
     {
      "known": "I'm going to try to come back at six o'clock",
      "target": "provarò a tornar a łe sie",
      "score": 7
     },
     {
      "known": "I'm not sure if I can meet at six o'clock tomorrow",
      "target": "no son sicuro se poso catarse a łe sie doman",
      "score": 8
     }
    ]
   },
   {
    "idx": 4,
    "type": "A",
    "known": "this evening",
    "target": "stasera",
    "build": [
     {
      "known": "to meet this evening",
      "target": "catarse stasera"
     },
     {
      "known": "we want to speak this evening",
      "target": "volemo parlar stasera"
     },
     {
      "known": "at six o'clock this evening",
      "target": "a łe sie stasera"
     }
    ],
    "use": [
     {
      "known": "we want to meet at six o'clock this evening",
      "target": "volemo catarse a łe sie stasera",
      "score": 8
     },
     {
      "known": "I want to speak Venetian this evening",
      "target": "vojo parlar vèneto stasera",
      "score": 8
     },
     {
      "known": "she wants to come back this evening",
      "target": "ła vol tornar stasera",
      "score": 8
     },
     {
      "known": "I'd like to be able to meet with you this evening",
      "target": "vorìa poder catarse co ti stasera",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking with someone else this evening",
      "target": "farò pràtega de parlar co calchedun altro stasera",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 19,
  "known_text": "But I don't want to stop talking.",
  "target_text": "ma no vojo desméter de parlar",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "but",
    "target": "ma",
    "build": [
     {
      "known": "but I want to speak",
      "target": "ma vojo parlar"
     },
     {
      "known": "but I'd like to learn",
      "target": "ma vorìa inparar"
     },
     {
      "known": "but he wants to come back",
      "target": "ma el vol tornar"
     }
    ],
    "use": [
     {
      "known": "but I want to speak Venetian today",
      "target": "ma vojo parlar vèneto ancò",
      "score": 7
     },
     {
      "known": "but she wants to find out the answer",
      "target": "ma ła vol saver ła risposta",
      "score": 7
     },
     {
      "known": "but we want to meet at six o'clock this evening",
      "target": "ma volemo catarse a łe sie stasera",
      "score": 7
     },
     {
      "known": "but I'd like to speak Venetian very well",
      "target": "ma vorìa parlar vèneto molto ben",
      "score": 7
     },
     {
      "known": "but I'm not sure if I can come back tomorrow",
      "target": "ma no son sicuro se poso tornar doman",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "I don't want",
    "target": "no vojo",
    "components": [
     {
      "known": "not",
      "target": "no",
      "introduce": false
     },
     {
      "known": "I want",
      "target": "vojo",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "I don't want to speak",
      "target": "no vojo parlar"
     },
     {
      "known": "I don't want to learn",
      "target": "no vojo inparar"
     },
     {
      "known": "I don't want to come back",
      "target": "no vojo tornar"
     }
    ],
    "use": [
     {
      "known": "I don't want to speak Venetian today",
      "target": "no vojo parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I don't want to come back this evening",
      "target": "no vojo tornar stasera",
      "score": 8
     },
     {
      "known": "but I don't want to meet at six o'clock",
      "target": "ma no vojo catarse a łe sie",
      "score": 8
     },
     {
      "known": "I don't want to guess what's going to happen tomorrow",
      "target": "no vojo indovinar queło che capitarà doman",
      "score": 8
     },
     {
      "known": "I don't want to speak Venetian with everyone else",
      "target": "no vojo parlar vèneto co tuti i altri",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "to stop talking",
    "target": "desméter de parlar",
    "components": [
     {
      "known": "to stop",
      "target": "desméter de"
     },
     {
      "known": "talking",
      "target": "parlar",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "I don't want to stop talking",
      "target": "no vojo desméter de parlar"
     },
     {
      "known": "to stop talking now",
      "target": "desméter de parlar deso"
     },
     {
      "known": "to stop talking today",
      "target": "desméter de parlar ancò"
     }
    ],
    "use": [
     {
      "known": "but I don't want to stop talking",
      "target": "ma no vojo desméter de parlar",
      "score": 8
     },
     {
      "known": "I don't want to stop talking today",
      "target": "no vojo desméter de parlar ancò",
      "score": 8
     },
     {
      "known": "she wants to stop talking this evening",
      "target": "ła vol desméter de parlar stasera",
      "score": 7
     },
     {
      "known": "I'd like to be able to stop talking later on",
      "target": "vorìa poder desméter de parlar pì tardi",
      "score": 7
     },
     {
      "known": "I'm not sure if I can stop talking now",
      "target": "no son sicuro se poso desméter de parlar deso",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 20,
  "known_text": "You want to learn his name quickly.",
  "target_text": "te vol inparar el so nome svelto",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "you want",
    "target": "te vol",
    "components": [
     {
      "known": "you want",
      "target": "te vol"
     }
    ],
    "build": [
     {
      "known": "you want to speak",
      "target": "te vol parlar"
     },
     {
      "known": "you want to learn",
      "target": "te vol inparar"
     },
     {
      "known": "you want to come back",
      "target": "te vol tornar"
     }
    ],
    "use": [
     {
      "known": "you want to speak Venetian today",
      "target": "te vol parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "you want to meet at six o'clock this evening",
      "target": "te vol catarse a łe sie stasera",
      "score": 8
     },
     {
      "known": "you want to find out the answer tomorrow",
      "target": "te vol saver ła risposta doman",
      "score": 8
     },
     {
      "known": "you want to speak Venetian very well",
      "target": "te vol parlar vèneto molto ben",
      "score": 8
     },
     {
      "known": "but you want to stop talking now",
      "target": "ma te vol desméter de parlar deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "his name",
    "target": "el so nome",
    "components": [
     {
      "known": "his",
      "target": "el so"
     },
     {
      "known": "name",
      "target": "nome"
     }
    ],
    "build": [
     {
      "known": "to learn his name",
      "target": "inparar el so nome"
     },
     {
      "known": "to remember his name",
      "target": "ricordarme el so nome"
     },
     {
      "known": "to find out his name",
      "target": "saver el so nome"
     }
    ],
    "use": [
     {
      "known": "you want to learn his name",
      "target": "te vol inparar el so nome",
      "score": 8
     },
     {
      "known": "I want to remember his name today",
      "target": "vojo ricordarme el so nome ancò",
      "score": 8
     },
     {
      "known": "she wants to find out his name tomorrow",
      "target": "ła vol saver el so nome doman",
      "score": 8
     },
     {
      "known": "I'd like to be able to remember his name",
      "target": "vorìa poder ricordarme el so nome",
      "score": 8
     },
     {
      "known": "I'm not sure if I can remember his name",
      "target": "no son sicuro se poso ricordarme el so nome",
      "score": 8
     }
    ]
   },
   {
    "idx": 3,
    "type": "A",
    "known": "quickly",
    "target": "svelto",
    "build": [
     {
      "known": "to speak quickly",
      "target": "parlar svelto"
     },
     {
      "known": "to learn quickly",
      "target": "inparar svelto"
     },
     {
      "known": "to come back quickly",
      "target": "tornar svelto"
     }
    ],
    "use": [
     {
      "known": "you want to learn his name quickly",
      "target": "te vol inparar el so nome svelto",
      "score": 8
     },
     {
      "known": "I want to speak Venetian quickly",
      "target": "vojo parlar vèneto svelto",
      "score": 8
     },
     {
      "known": "she wants to come back quickly this evening",
      "target": "ła vol tornar svelto stasera",
      "score": 7
     },
     {
      "known": "I'd like to be able to learn a word quickly",
      "target": "vorìa poder inparar na paroła svelto",
      "score": 7
     },
     {
      "known": "I'm not sure if I can find out the answer quickly",
      "target": "no son sicuro se poso saver ła risposta svelto",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 21,
  "known_text": "Why are you learning her name?",
  "target_text": "parcosa situ drio a inparar el so nome",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "why",
    "target": "parcosa",
    "build": [
     {
      "known": "why do you speak Venetian",
      "target": "parcosa pàrlitu vèneto"
     },
     {
      "known": "why do you want to come back",
      "target": "parcosa te vol tornar"
     },
     {
      "known": "why do you speak with me",
      "target": "parcosa pàrlitu co mi"
     }
    ],
    "use": [
     {
      "known": "why do you speak Venetian all day",
      "target": "parcosa pàrlitu vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "why do you want to learn his name",
      "target": "parcosa te vol inparar el so nome",
      "score": 7
     },
     {
      "known": "why do you want to come back tomorrow",
      "target": "parcosa te vol tornar doman",
      "score": 7
     },
     {
      "known": "why do you speak Venetian with me",
      "target": "parcosa pàrlitu vèneto co mi",
      "score": 7
     },
     {
      "known": "why do you want to stop talking now",
      "target": "parcosa te vol desméter de parlar deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "are you learning",
    "target": "situ drio a inparar",
    "components": [
     {
      "known": "are you",
      "target": "situ drio a"
     },
     {
      "known": "learning",
      "target": "inparar",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "are you learning Venetian",
      "target": "situ drio a inparar vèneto"
     },
     {
      "known": "are you learning now",
      "target": "situ drio a inparar deso"
     },
     {
      "known": "are you learning his name",
      "target": "situ drio a inparar el so nome"
     }
    ],
    "use": [
     {
      "known": "why are you learning his name",
      "target": "parcosa situ drio a inparar el so nome",
      "score": 8
     },
     {
      "known": "are you learning Venetian today",
      "target": "situ drio a inparar vèneto ancò",
      "score": 8
     },
     {
      "known": "are you learning a word in Venetian",
      "target": "situ drio a inparar na paroła in vèneto",
      "score": 7
     },
     {
      "known": "are you learning Venetian all day",
      "target": "situ drio a inparar vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "are you learning Venetian with someone else",
      "target": "situ drio a inparar vèneto co calchedun altro",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 22,
  "known_text": "Because I want to meet people who speak Venetian.",
  "target_text": "parché vojo conoser xente che parla vèneto",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "because",
    "target": "parché",
    "build": [
     {
      "known": "because I want to speak",
      "target": "parché vojo parlar"
     },
     {
      "known": "because he wants to come back",
      "target": "parché el vol tornar"
     },
     {
      "known": "because you want to learn",
      "target": "parché te vol inparar"
     }
    ],
    "use": [
     {
      "known": "because I want to speak Venetian today",
      "target": "parché vojo parlar vèneto ancò",
      "score": 7
     },
     {
      "known": "because she wants to find out the answer",
      "target": "parché ła vol saver ła risposta",
      "score": 7
     },
     {
      "known": "because we want to meet at six o'clock",
      "target": "parché volemo catarse a łe sie",
      "score": 7
     },
     {
      "known": "because I don't want to stop talking",
      "target": "parché no vojo desméter de parlar",
      "score": 7
     },
     {
      "known": "because I'd like to speak Venetian very well",
      "target": "parché vorìa parlar vèneto molto ben",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to get to know",
    "target": "conoser",
    "build": [
     {
      "known": "I want to get to know",
      "target": "vojo conoser"
     },
     {
      "known": "to get to know someone else",
      "target": "conoser calchedun altro"
     },
     {
      "known": "to get to know everyone else",
      "target": "conoser tuti i altri"
     }
    ],
    "use": [
     {
      "known": "I want to get to know someone else today",
      "target": "vojo conoser calchedun altro ancò",
      "score": 7
     },
     {
      "known": "she wants to get to know everyone else",
      "target": "ła vol conoser tuti i altri",
      "score": 7
     },
     {
      "known": "I'd like to get to know everyone else this evening",
      "target": "vorìa conoser tuti i altri stasera",
      "score": 7
     },
     {
      "known": "I'm going to try to get to know someone else tomorrow",
      "target": "provarò a conoser calchedun altro doman",
      "score": 7
     },
     {
      "known": "but I don't want to get to know everyone else",
      "target": "ma no vojo conoser tuti i altri",
      "score": 6
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "people who speak",
    "target": "xente che parla",
    "components": [
     {
      "known": "people",
      "target": "xente"
     },
     {
      "known": "who speak",
      "target": "che parla"
     }
    ],
    "build": [
     {
      "known": "to get to know people who speak Venetian",
      "target": "conoser xente che parla vèneto"
     },
     {
      "known": "people who speak Venetian",
      "target": "xente che parla vèneto"
     },
     {
      "known": "I want to get to know people who speak Venetian",
      "target": "vojo conoser xente che parla vèneto"
     }
    ],
    "use": [
     {
      "known": "because I want to get to know people who speak Venetian",
      "target": "parché vojo conoser xente che parla vèneto",
      "score": 8
     },
     {
      "known": "she wants to get to know people who speak Venetian",
      "target": "ła vol conoser xente che parla vèneto",
      "score": 8
     },
     {
      "known": "I'd like to get to know people who speak Venetian today",
      "target": "vorìa conoser xente che parla vèneto ancò",
      "score": 8
     },
     {
      "known": "we want to get to know people who speak Venetian tomorrow",
      "target": "volemo conoser xente che parla vèneto doman",
      "score": 7
     },
     {
      "known": "I'm going to try to get to know people who speak Venetian",
      "target": "provarò a conoser xente che parla vèneto",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 23,
  "known_text": "I'm going to start talking more soon.",
  "target_text": "scominçiarò a parlar de pì tra poco",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm going to start",
    "target": "scominçiarò a",
    "components": [
     {
      "known": "I'm going to start",
      "target": "scominçiarò a"
     }
    ],
    "build": [
     {
      "known": "I'm going to start talking",
      "target": "scominçiarò a parlar"
     },
     {
      "known": "I'm going to start learning",
      "target": "scominçiarò a inparar"
     },
     {
      "known": "I'm going to start speaking Venetian",
      "target": "scominçiarò a parlar vèneto"
     }
    ],
    "use": [
     {
      "known": "I'm going to start talking today",
      "target": "scominçiarò a parlar ancò",
      "score": 8
     },
     {
      "known": "I'm going to start learning Venetian tomorrow",
      "target": "scominçiarò a inparar vèneto doman",
      "score": 8
     },
     {
      "known": "I'm going to start talking with everyone else",
      "target": "scominçiarò a parlar co tuti i altri",
      "score": 8
     },
     {
      "known": "I'm going to start talking this evening",
      "target": "scominçiarò a parlar stasera",
      "score": 8
     },
     {
      "known": "I'm going to start learning his name quickly",
      "target": "scominçiarò a inparar el so nome svelto",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "more",
    "target": "de pì",
    "components": [
     {
      "known": "more",
      "target": "de pì"
     }
    ],
    "build": [
     {
      "known": "to speak more",
      "target": "parlar de pì"
     },
     {
      "known": "to learn more",
      "target": "inparar de pì"
     },
     {
      "known": "I'm going to start talking more",
      "target": "scominçiarò a parlar de pì"
     }
    ],
    "use": [
     {
      "known": "I want to speak more today",
      "target": "vojo parlar de pì ancò",
      "score": 7
     },
     {
      "known": "I'd like to learn more tomorrow",
      "target": "vorìa inparar de pì doman",
      "score": 7
     },
     {
      "known": "she wants to speak more this evening",
      "target": "ła vol parlar de pì stasera",
      "score": 7
     },
     {
      "known": "I'm going to start talking more with everyone else",
      "target": "scominçiarò a parlar de pì co tuti i altri",
      "score": 7
     },
     {
      "known": "but I don't want to speak more now",
      "target": "ma no vojo parlar de pì deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "soon",
    "target": "tra poco",
    "components": [
     {
      "known": "soon",
      "target": "tra poco"
     }
    ],
    "build": [
     {
      "known": "to speak soon",
      "target": "parlar tra poco"
     },
     {
      "known": "to come back soon",
      "target": "tornar tra poco"
     },
     {
      "known": "to meet soon",
      "target": "catarse tra poco"
     }
    ],
    "use": [
     {
      "known": "I'm going to start talking more soon",
      "target": "scominçiarò a parlar de pì tra poco",
      "score": 8
     },
     {
      "known": "I want to come back soon",
      "target": "vojo tornar tra poco",
      "score": 7
     },
     {
      "known": "she wants to meet with everyone else soon",
      "target": "ła vol catarse co tuti i altri tra poco",
      "score": 7
     },
     {
      "known": "I'd like to be able to speak Venetian soon",
      "target": "vorìa poder parlar vèneto tra poco",
      "score": 8
     },
     {
      "known": "I'm not sure if I can come back soon",
      "target": "no son sicuro se poso tornar tra poco",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 24,
  "known_text": "I'm not going to be able to remember easily.",
  "target_text": "no podarò ricordarme façilmente",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm not going to be able to",
    "target": "no podarò",
    "components": [
     {
      "known": "not",
      "target": "no",
      "introduce": false
     },
     {
      "known": "I'm going to be able to",
      "target": "podarò"
     }
    ],
    "build": [
     {
      "known": "I'm not going to be able to speak",
      "target": "no podarò parlar"
     },
     {
      "known": "I'm not going to be able to remember",
      "target": "no podarò ricordarme"
     },
     {
      "known": "I'm not going to be able to come back",
      "target": "no podarò tornar"
     }
    ],
    "use": [
     {
      "known": "I'm not going to be able to speak Venetian today",
      "target": "no podarò parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'm not going to be able to come back this evening",
      "target": "no podarò tornar stasera",
      "score": 8
     },
     {
      "known": "I'm not going to be able to remember his name",
      "target": "no podarò ricordarme el so nome",
      "score": 8
     },
     {
      "known": "I'm not going to be able to meet at six o'clock tomorrow",
      "target": "no podarò catarse a łe sie doman",
      "score": 8
     },
     {
      "known": "I'm not going to be able to find out the answer soon",
      "target": "no podarò saver ła risposta tra poco",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "easily",
    "target": "façilmente",
    "build": [
     {
      "known": "to speak easily",
      "target": "parlar façilmente"
     },
     {
      "known": "to remember easily",
      "target": "ricordarme façilmente"
     },
     {
      "known": "to learn easily",
      "target": "inparar façilmente"
     }
    ],
    "use": [
     {
      "known": "I'm not going to be able to remember easily",
      "target": "no podarò ricordarme façilmente",
      "score": 8
     },
     {
      "known": "I want to speak Venetian easily",
      "target": "vojo parlar vèneto façilmente",
      "score": 8
     },
     {
      "known": "she wants to learn his name easily",
      "target": "ła vol inparar el so nome façilmente",
      "score": 7
     },
     {
      "known": "I'd like to be able to remember the whole sentence easily",
      "target": "vorìa poder ricordarme tuta ła frase façilmente",
      "score": 7
     },
     {
      "known": "I'm not sure if I can find out the answer easily",
      "target": "no son sicuro se poso saver ła risposta façilmente",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 25,
  "known_text": "Are you going to help me before I have to go?",
  "target_text": "me giutaràtu prima che gabia da andar",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "to go",
    "target": "andar",
    "build": [
     {
      "known": "I want to go",
      "target": "vojo andar"
     },
     {
      "known": "to go tomorrow",
      "target": "andar doman"
     },
     {
      "known": "she wants to go",
      "target": "ła vol andar"
     }
    ],
    "use": [
     {
      "known": "I want to go this evening",
      "target": "vojo andar stasera",
      "score": 8
     },
     {
      "known": "she wants to go with everyone else tomorrow",
      "target": "ła vol andar co tuti i altri doman",
      "score": 7
     },
     {
      "known": "I'd like to be able to go soon",
      "target": "vorìa poder andar tra poco",
      "score": 7
     },
     {
      "known": "I'm not going to be able to go today",
      "target": "no podarò andar ancò",
      "score": 8
     },
     {
      "known": "but I don't want to go this evening",
      "target": "ma no vojo andar stasera",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "before I have to go",
    "target": "prima che gabia da andar",
    "components": [
     {
      "known": "before",
      "target": "prima che",
      "introduce": false
     },
     {
      "known": "I have to",
      "target": "gabia da"
     },
     {
      "known": "go",
      "target": "andar",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "to speak before I have to go",
      "target": "parlar prima che gabia da andar"
     },
     {
      "known": "to come back before I have to go",
      "target": "tornar prima che gabia da andar"
     },
     {
      "known": "to meet before I have to go",
      "target": "catarse prima che gabia da andar"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian before I have to go",
      "target": "vojo parlar vèneto prima che gabia da andar",
      "score": 8
     },
     {
      "known": "she wants to meet with me before I have to go",
      "target": "ła vol catarse co mi prima che gabia da andar",
      "score": 7
     },
     {
      "known": "I'd like to find out the answer before I have to go",
      "target": "vorìa saver ła risposta prima che gabia da andar",
      "score": 7
     },
     {
      "known": "I'm going to start talking before I have to go",
      "target": "scominçiarò a parlar prima che gabia da andar",
      "score": 7
     },
     {
      "known": "I'm not sure if I can come back before I have to go",
      "target": "no son sicuro se poso tornar prima che gabia da andar",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "A",
    "known": "are you going to help me",
    "target": "me giutaràtu",
    "build": [
     {
      "known": "are you going to help me now",
      "target": "me giutaràtu deso"
     },
     {
      "known": "are you going to help me today",
      "target": "me giutaràtu ancò"
     },
     {
      "known": "are you going to help me tomorrow",
      "target": "me giutaràtu doman"
     }
    ],
    "use": [
     {
      "known": "are you going to help me before I have to go",
      "target": "me giutaràtu prima che gabia da andar",
      "score": 8
     },
     {
      "known": "are you going to help me this evening",
      "target": "me giutaràtu stasera",
      "score": 8
     },
     {
      "known": "are you going to help me soon",
      "target": "me giutaràtu tra poco",
      "score": 7
     },
     {
      "known": "are you going to help me at six o'clock",
      "target": "me giutaràtu a łe sie",
      "score": 7
     },
     {
      "known": "are you going to help me later on",
      "target": "me giutaràtu pì tardi",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 26,
  "known_text": "I like feeling as if I'm nearly ready to go.",
  "target_text": "me piaxe sentirme come se fuse squasi pronto par andar",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I like",
    "target": "me piaxe",
    "components": [
     {
      "known": "I like",
      "target": "me piaxe"
     }
    ],
    "build": [
     {
      "known": "I like to speak Venetian",
      "target": "me piaxe parlar vèneto"
     },
     {
      "known": "I like to learn",
      "target": "me piaxe inparar"
     },
     {
      "known": "I like to come back",
      "target": "me piaxe tornar"
     }
    ],
    "use": [
     {
      "known": "I like to speak Venetian with everyone else",
      "target": "me piaxe parlar vèneto co tuti i altri",
      "score": 7
     },
     {
      "known": "I like to get to know people who speak Venetian",
      "target": "me piaxe conoser xente che parla vèneto",
      "score": 8
     },
     {
      "known": "I like to speak Venetian all day",
      "target": "me piaxe parlar vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "I like to speak more with someone else",
      "target": "me piaxe parlar de pì co calchedun altro",
      "score": 7
     },
     {
      "known": "I like to come back this evening",
      "target": "me piaxe tornar stasera",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "feeling",
    "target": "sentirme",
    "build": [
     {
      "known": "I like feeling",
      "target": "me piaxe sentirme"
     },
     {
      "known": "feeling well",
      "target": "sentirme ben"
     },
     {
      "known": "feeling very well",
      "target": "sentirme molto ben"
     }
    ],
    "use": [
     {
      "known": "I like feeling very well today",
      "target": "me piaxe sentirme molto ben ancò",
      "score": 7
     },
     {
      "known": "I like feeling very well this evening",
      "target": "me piaxe sentirme molto ben stasera",
      "score": 7
     },
     {
      "known": "I like feeling well after you finish",
      "target": "me piaxe sentirme ben dopo che te finisi",
      "score": 6
     },
     {
      "known": "I like feeling very well all day",
      "target": "me piaxe sentirme molto ben tuto el dì",
      "score": 6
     },
     {
      "known": "I like feeling very well with everyone else",
      "target": "me piaxe sentirme molto ben co tuti i altri",
      "score": 6
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "nearly ready to go",
    "target": "squasi pronto par andar",
    "components": [
     {
      "known": "nearly ready to go",
      "target": "squasi pronto par andar"
     }
    ],
    "build": [
     {
      "known": "feeling nearly ready to go",
      "target": "sentirme squasi pronto par andar"
     },
     {
      "known": "nearly ready to go now",
      "target": "squasi pronto par andar deso"
     },
     {
      "known": "I like feeling nearly ready to go",
      "target": "me piaxe sentirme squasi pronto par andar"
     }
    ],
    "use": [
     {
      "known": "I like feeling nearly ready to go today",
      "target": "me piaxe sentirme squasi pronto par andar ancò",
      "score": 7
     },
     {
      "known": "I like feeling nearly ready to go this evening",
      "target": "me piaxe sentirme squasi pronto par andar stasera",
      "score": 7
     },
     {
      "known": "I like feeling nearly ready to go tomorrow",
      "target": "me piaxe sentirme squasi pronto par andar doman",
      "score": 7
     },
     {
      "known": "I like feeling nearly ready to go soon",
      "target": "me piaxe sentirme squasi pronto par andar tra poco",
      "score": 6
     },
     {
      "known": "I like feeling nearly ready to go all day",
      "target": "me piaxe sentirme squasi pronto par andar tuto el dì",
      "score": 6
     }
    ]
   },
   {
    "idx": 4,
    "type": "M",
    "known": "as if I'm",
    "target": "come se fuse",
    "components": [
     {
      "known": "as if I'm",
      "target": "come se fuse"
     }
    ],
    "build": [
     {
      "known": "as if I'm nearly ready to go",
      "target": "come se fuse squasi pronto par andar"
     },
     {
      "known": "feeling as if I'm nearly ready to go",
      "target": "sentirme come se fuse squasi pronto par andar"
     },
     {
      "known": "I like feeling as if I'm",
      "target": "me piaxe sentirme come se fuse"
     }
    ],
    "use": [
     {
      "known": "I like feeling as if I'm nearly ready to go",
      "target": "me piaxe sentirme come se fuse squasi pronto par andar",
      "score": 8
     },
     {
      "known": "I like feeling as if I'm nearly ready to go today",
      "target": "me piaxe sentirme come se fuse squasi pronto par andar ancò",
      "score": 7
     },
     {
      "known": "I like feeling as if I'm nearly ready to go this evening",
      "target": "me piaxe sentirme come se fuse squasi pronto par andar stasera",
      "score": 7
     },
     {
      "known": "I like feeling as if I'm nearly ready to go now",
      "target": "me piaxe sentirme come se fuse squasi pronto par andar deso",
      "score": 7
     },
     {
      "known": "I like feeling as if I'm nearly ready to go tomorrow",
      "target": "me piaxe sentirme come se fuse squasi pronto par andar doman",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 27,
  "known_text": "I don't like taking too much time to answer.",
  "target_text": "no me piaxe méterghe masa tenpo par risponder",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I don't like",
    "target": "no me piaxe",
    "components": [
     {
      "known": "not",
      "target": "no",
      "introduce": false
     },
     {
      "known": "I like",
      "target": "me piaxe",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "I don't like to speak",
      "target": "no me piaxe parlar"
     },
     {
      "known": "I don't like to come back",
      "target": "no me piaxe tornar"
     },
     {
      "known": "I don't like feeling",
      "target": "no me piaxe sentirme"
     }
    ],
    "use": [
     {
      "known": "I don't like to speak Venetian all day",
      "target": "no me piaxe parlar vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "I don't like to come back this evening",
      "target": "no me piaxe tornar stasera",
      "score": 7
     },
     {
      "known": "I don't like to get to know people who speak Venetian",
      "target": "no me piaxe conoser xente che parla vèneto",
      "score": 6
     },
     {
      "known": "I don't like to speak more today",
      "target": "no me piaxe parlar de pì ancò",
      "score": 7
     },
     {
      "known": "I don't like feeling nearly ready to go",
      "target": "no me piaxe sentirme squasi pronto par andar",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "taking too much time",
    "target": "méterghe masa tenpo",
    "components": [
     {
      "known": "taking",
      "target": "méterghe",
      "introduce": false
     },
     {
      "known": "too much",
      "target": "masa"
     },
     {
      "known": "time",
      "target": "tenpo"
     }
    ],
    "build": [
     {
      "known": "I don't like taking too much time",
      "target": "no me piaxe méterghe masa tenpo"
     },
     {
      "known": "taking too much time today",
      "target": "méterghe masa tenpo ancò"
     },
     {
      "known": "taking too much time now",
      "target": "méterghe masa tenpo deso"
     }
    ],
    "use": [
     {
      "known": "I don't like taking too much time this evening",
      "target": "no me piaxe méterghe masa tenpo stasera",
      "score": 7
     },
     {
      "known": "I don't like taking too much time all day",
      "target": "no me piaxe méterghe masa tenpo tuto el dì",
      "score": 7
     },
     {
      "known": "I don't like taking too much time tomorrow",
      "target": "no me piaxe méterghe masa tenpo doman",
      "score": 7
     },
     {
      "known": "I don't like taking too much time before I have to go",
      "target": "no me piaxe méterghe masa tenpo prima che gabia da andar",
      "score": 7
     },
     {
      "known": "I don't like taking too much time after you finish",
      "target": "no me piaxe méterghe masa tenpo dopo che te finisi",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "to answer",
    "target": "par risponder",
    "components": [
     {
      "known": "to answer",
      "target": "par risponder"
     }
    ],
    "build": [
     {
      "known": "taking too much time to answer",
      "target": "méterghe masa tenpo par risponder"
     },
     {
      "known": "too much time to answer",
      "target": "masa tenpo par risponder"
     },
     {
      "known": "time to answer",
      "target": "tenpo par risponder"
     }
    ],
    "use": [
     {
      "known": "I don't like taking too much time to answer",
      "target": "no me piaxe méterghe masa tenpo par risponder",
      "score": 8
     },
     {
      "known": "I don't like taking too much time to answer today",
      "target": "no me piaxe méterghe masa tenpo par risponder ancò",
      "score": 7
     },
     {
      "known": "I don't like taking too much time to answer this evening",
      "target": "no me piaxe méterghe masa tenpo par risponder stasera",
      "score": 7
     },
     {
      "known": "I don't like taking too much time to answer all day",
      "target": "no me piaxe méterghe masa tenpo par risponder tuto el dì",
      "score": 6
     },
     {
      "known": "I don't like taking too much time to answer tomorrow",
      "target": "no me piaxe méterghe masa tenpo par risponder doman",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 28,
  "known_text": "It's useful to start talking as soon as you can.",
  "target_text": "xe ùtiłe scominçiar a parlar pì presto che te pol",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "it's useful",
    "target": "xe ùtiłe",
    "components": [
     {
      "known": "it's",
      "target": "xe",
      "introduce": false
     },
     {
      "known": "useful",
      "target": "ùtiłe"
     }
    ],
    "build": [
     {
      "known": "it's useful to speak Venetian",
      "target": "xe ùtiłe parlar vèneto"
     },
     {
      "known": "it's useful to learn",
      "target": "xe ùtiłe inparar"
     },
     {
      "known": "it's useful to come back",
      "target": "xe ùtiłe tornar"
     }
    ],
    "use": [
     {
      "known": "it's useful to speak Venetian all day",
      "target": "xe ùtiłe parlar vèneto tuto el dì",
      "score": 7
     },
     {
      "known": "it's useful to learn his name quickly",
      "target": "xe ùtiłe inparar el so nome svelto",
      "score": 7
     },
     {
      "known": "it's useful to get to know people who speak Venetian",
      "target": "xe ùtiłe conoser xente che parla vèneto",
      "score": 8
     },
     {
      "known": "it's useful to speak more with someone else",
      "target": "xe ùtiłe parlar de pì co calchedun altro",
      "score": 7
     },
     {
      "known": "it's useful to come back this evening",
      "target": "xe ùtiłe tornar stasera",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "M",
    "known": "to start talking",
    "target": "scominçiar a parlar",
    "components": [
     {
      "known": "to start",
      "target": "scominçiar a"
     },
     {
      "known": "talking",
      "target": "parlar",
      "introduce": false
     }
    ],
    "build": [
     {
      "known": "it's useful to start talking",
      "target": "xe ùtiłe scominçiar a parlar"
     },
     {
      "known": "to start talking now",
      "target": "scominçiar a parlar deso"
     },
     {
      "known": "to start talking today",
      "target": "scominçiar a parlar ancò"
     }
    ],
    "use": [
     {
      "known": "it's useful to start talking today",
      "target": "xe ùtiłe scominçiar a parlar ancò",
      "score": 8
     },
     {
      "known": "I want to start talking this evening",
      "target": "vojo scominçiar a parlar stasera",
      "score": 8
     },
     {
      "known": "she wants to start talking with everyone else",
      "target": "ła vol scominçiar a parlar co tuti i altri",
      "score": 7
     },
     {
      "known": "I'd like to be able to start talking soon",
      "target": "vorìa poder scominçiar a parlar tra poco",
      "score": 7
     },
     {
      "known": "it's useful to start talking with someone else",
      "target": "xe ùtiłe scominçiar a parlar co calchedun altro",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "as soon as you can",
    "target": "pì presto che te pol",
    "components": [
     {
      "known": "as soon as you can",
      "target": "pì presto che te pol"
     }
    ],
    "build": [
     {
      "known": "to start talking as soon as you can",
      "target": "scominçiar a parlar pì presto che te pol"
     },
     {
      "known": "to speak as soon as you can",
      "target": "parlar pì presto che te pol"
     },
     {
      "known": "to come back as soon as you can",
      "target": "tornar pì presto che te pol"
     }
    ],
    "use": [
     {
      "known": "it's useful to start talking as soon as you can",
      "target": "xe ùtiłe scominçiar a parlar pì presto che te pol",
      "score": 8
     },
     {
      "known": "it's useful to speak Venetian as soon as you can",
      "target": "xe ùtiłe parlar vèneto pì presto che te pol",
      "score": 8
     },
     {
      "known": "it's useful to come back as soon as you can",
      "target": "xe ùtiłe tornar pì presto che te pol",
      "score": 7
     },
     {
      "known": "it's useful to find out the answer as soon as you can",
      "target": "xe ùtiłe saver ła risposta pì presto che te pol",
      "score": 7
     },
     {
      "known": "it's useful to learn his name as soon as you can",
      "target": "xe ùtiłe inparar el so nome pì presto che te pol",
      "score": 7
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 29,
  "known_text": "I'm looking forward to speaking better as soon as I can.",
  "target_text": "no vedo l'ora de parlar mejo pì presto che poso",
  "legos": [
   {
    "idx": 1,
    "type": "M",
    "known": "I'm looking forward to",
    "target": "no vedo l'ora de",
    "components": [
     {
      "known": "I'm looking forward to",
      "target": "no vedo l'ora de"
     }
    ],
    "build": [
     {
      "known": "I'm looking forward to speaking",
      "target": "no vedo l'ora de parlar"
     },
     {
      "known": "I'm looking forward to learning",
      "target": "no vedo l'ora de inparar"
     },
     {
      "known": "I'm looking forward to speaking Venetian",
      "target": "no vedo l'ora de parlar vèneto"
     }
    ],
    "use": [
     {
      "known": "I'm looking forward to speaking Venetian today",
      "target": "no vedo l'ora de parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I'm looking forward to speaking Venetian with you tomorrow",
      "target": "no vedo l'ora de parlar vèneto co ti doman",
      "score": 8
     },
     {
      "known": "I'm looking forward to learning his name",
      "target": "no vedo l'ora de inparar el so nome",
      "score": 7
     },
     {
      "known": "I'm looking forward to speaking Venetian with everyone else",
      "target": "no vedo l'ora de parlar vèneto co tuti i altri",
      "score": 7
     },
     {
      "known": "I'm looking forward to speaking Venetian this evening",
      "target": "no vedo l'ora de parlar vèneto stasera",
      "score": 8
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "better",
    "target": "mejo",
    "build": [
     {
      "known": "to speak better",
      "target": "parlar mejo"
     },
     {
      "known": "to learn better",
      "target": "inparar mejo"
     },
     {
      "known": "I'm looking forward to speaking better",
      "target": "no vedo l'ora de parlar mejo"
     }
    ],
    "use": [
     {
      "known": "I want to speak Venetian better",
      "target": "vojo parlar vèneto mejo",
      "score": 7
     },
     {
      "known": "I'm looking forward to speaking better today",
      "target": "no vedo l'ora de parlar mejo ancò",
      "score": 8
     },
     {
      "known": "I'd like to be able to speak better tomorrow",
      "target": "vorìa poder parlar mejo doman",
      "score": 7
     },
     {
      "known": "it's useful to speak Venetian better",
      "target": "xe ùtiłe parlar vèneto mejo",
      "score": 7
     },
     {
      "known": "I'm going to practise speaking better this evening",
      "target": "farò pràtega de parlar mejo stasera",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "M",
    "known": "as soon as I can",
    "target": "pì presto che poso",
    "components": [
     {
      "known": "as soon as I can",
      "target": "pì presto che poso"
     }
    ],
    "build": [
     {
      "known": "to speak better as soon as I can",
      "target": "parlar mejo pì presto che poso"
     },
     {
      "known": "to come back as soon as I can",
      "target": "tornar pì presto che poso"
     },
     {
      "known": "to start talking as soon as I can",
      "target": "scominçiar a parlar pì presto che poso"
     }
    ],
    "use": [
     {
      "known": "I'm looking forward to speaking better as soon as I can",
      "target": "no vedo l'ora de parlar mejo pì presto che poso",
      "score": 8
     },
     {
      "known": "I want to speak Venetian as soon as I can",
      "target": "vojo parlar vèneto pì presto che poso",
      "score": 8
     },
     {
      "known": "I'd like to come back as soon as I can",
      "target": "vorìa tornar pì presto che poso",
      "score": 8
     },
     {
      "known": "I'm going to start talking as soon as I can",
      "target": "scominçiarò a parlar pì presto che poso",
      "score": 7
     },
     {
      "known": "I want to find out the answer as soon as I can",
      "target": "vojo saver ła risposta pì presto che poso",
      "score": 8
     }
    ]
   }
  ]
 },
 {
  "course_code": "vec_for_eng",
  "seed_number": 30,
  "known_text": "I wanted to ask you something yesterday.",
  "target_text": "vołeva domandarte calcosa geri",
  "legos": [
   {
    "idx": 1,
    "type": "A",
    "known": "I wanted",
    "target": "vołeva",
    "build": [
     {
      "known": "I wanted to speak",
      "target": "vołeva parlar"
     },
     {
      "known": "I wanted to learn",
      "target": "vołeva inparar"
     },
     {
      "known": "I wanted to come back",
      "target": "vołeva tornar"
     }
    ],
    "use": [
     {
      "known": "I wanted to speak Venetian today",
      "target": "vołeva parlar vèneto ancò",
      "score": 8
     },
     {
      "known": "I wanted to get to know people who speak Venetian",
      "target": "vołeva conoser xente che parla vèneto",
      "score": 8
     },
     {
      "known": "I wanted to find out the answer this evening",
      "target": "vołeva saver ła risposta stasera",
      "score": 8
     },
     {
      "known": "I wanted to speak Venetian with you all day",
      "target": "vołeva parlar vèneto co ti tuto el dì",
      "score": 7
     },
     {
      "known": "I wanted to start talking as soon as I can",
      "target": "vołeva scominçiar a parlar pì presto che poso",
      "score": 7
     }
    ]
   },
   {
    "idx": 2,
    "type": "A",
    "known": "to ask you",
    "target": "domandarte",
    "build": [
     {
      "known": "I wanted to ask you",
      "target": "vołeva domandarte"
     },
     {
      "known": "to ask you something",
      "target": "domandarte calcosa"
     },
     {
      "known": "to ask you tomorrow",
      "target": "domandarte doman"
     }
    ],
    "use": [
     {
      "known": "I wanted to ask you something today",
      "target": "vołeva domandarte calcosa ancò",
      "score": 8
     },
     {
      "known": "I want to ask you something this evening",
      "target": "vojo domandarte calcosa stasera",
      "score": 8
     },
     {
      "known": "I'd like to ask you something before I have to go",
      "target": "vorìa domandarte calcosa prima che gabia da andar",
      "score": 7
     },
     {
      "known": "I'm going to try to ask you something soon",
      "target": "provarò a domandarte calcosa tra poco",
      "score": 7
     },
     {
      "known": "I'm not sure if I can ask you something now",
      "target": "no son sicuro se poso domandarte calcosa deso",
      "score": 7
     }
    ]
   },
   {
    "idx": 3,
    "type": "A",
    "known": "yesterday",
    "target": "geri",
    "build": [
     {
      "known": "to speak yesterday",
      "target": "parlar geri"
     },
     {
      "known": "I wanted to speak yesterday",
      "target": "vołeva parlar geri"
     },
     {
      "known": "to ask you yesterday",
      "target": "domandarte geri"
     }
    ],
    "use": [
     {
      "known": "I wanted to ask you something yesterday",
      "target": "vołeva domandarte calcosa geri",
      "score": 8
     },
     {
      "known": "I wanted to speak Venetian yesterday",
      "target": "vołeva parlar vèneto geri",
      "score": 8
     },
     {
      "known": "I wanted to get to know everyone else yesterday",
      "target": "vołeva conoser tuti i altri geri",
      "score": 7
     },
     {
      "known": "I wanted to find out the answer yesterday",
      "target": "vołeva saver ła risposta geri",
      "score": 8
     },
     {
      "known": "I wanted to start talking yesterday",
      "target": "vołeva scominçiar a parlar geri",
      "score": 7
     }
    ]
   }
  ]
 }
];

// vec_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing vec_for_eng seed
// translations (the course was created 2026-07-07 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract, this is the rule layer for THIS pair;
// nothing here is copied from another Romance pair's target-side layer.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Venetian.
// Ratifying it needs a Venetian speaker to rule on the open questions collected in
// docs/a108/vec-for-eng-native-speaker-questions-2026-08-15.md.
module.exports = {
  course_code: 'vec_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Venetian) ──
  //
  // glossSynonyms: one Venetian target legitimately carrying several English glosses
  // (the RECEPTION direction, which ZUT permits — ralph-methodology.md §ZUT Outranks
  // Naturalness). Each entry makes the listed English words available to the known
  // side from the seed where that carrier debuts. All four were MEASURED in the
  // built band, not assumed — see the T2 self-check in the build report.
  glossSynonyms: {
    // English splits the bare infinitive from the gerund; Venetian does not.
    "parlar": ['to speak', 'speaking', 'talking'],
    "inparar": ['to learn', 'learning'],
    // Venetian "ła" is BOTH the feminine article and the feminine subject clitic.
    // Both debut in the built band (S10 as "the", S17 as "she").
    "ła": ['the', 'she'],
    "andar": ['to go', 'go'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  // Venetian realises each as a single frame that must never be re-split.
  glossUnits: [
    { phrase: 'as often as possible', carrier: 'pì speso che se pol' },
    { phrase: 'as hard as i can', carrier: 'pì che poso' },
    { phrase: 'as soon as you can', carrier: 'pì presto che te pol' },
    { phrase: 'as soon as i can', carrier: 'pì presto che poso' },
    { phrase: 'what i mean', carrier: 'queło che vojo dir' },
    // Literally "I can't wait to" — idiomatic, and NEGATIVE in form though
    // positive in meaning. Never re-split; see speaker question D.
    { phrase: "i'm looking forward to", carrier: "no vedo l'ora de" },
  ],

  // constructions: English machinery licensed only once its Venetian carrier has
  // debuted. Seed numbers are FIRST APPEARANCE, verified against the corpus.
  constructions: [
    // "I'm going to …" — the -arò synthetic future. First carrier is farò (S5);
    // provarò S8, scominçiarò S23, podarò S24, giutaràtu S25.
    { id: 'going-to', carrier: 'farò', test: /\bgoing to\b/i },
    // Negation is carried by "no" (debuts S10 as a component of "no son sicuro").
    { id: 'negation', carrier: 'no', test: /\b(not|n't|never)\b/i },
    // Interrogative enclisis (pàrlitu, situ, vołévitu, giutaràtu) — Venetian forms
    // questions by attaching the pronoun to the verb, NOT by do-support. Debuts S14.
    { id: 'do-support', carrier: 'pàrlitu', test: /\b(do|does|did) (you|he|she|we|they)\b/i },
    // Past tense: vołeva (S30) is the first preterite/imperfect carrier.
    { id: 'past', carrier: 'vołeva', test: /\b(wanted|was|were|had)\b/i },
  ],

  clusterRounds: {},
  glossRules: {},
};

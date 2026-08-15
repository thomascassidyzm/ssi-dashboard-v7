// nap_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing nap_for_eng seed
// translations (the course was created 2026-07-07 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract, this is the rule layer for THIS pair;
// nothing here is copied from another Romance pair's target-side layer.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Neapolitan.
// The known-side gate therefore runs advisory. Ratifying it needs a Neapolitan speaker
// to rule on the open questions collected in
// docs/a108/nap-for-eng-native-speaker-questions-2026-08-15.md.
module.exports = {
  course_code: 'nap_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Neapolitan) ──
  //
  // glossSynonyms: one Neapolitan target that legitimately carries several English
  // glosses (the RECEPTION direction, which ZUT permits — see ralph-methodology.md
  // §ZUT Outranks Naturalness). Each entry makes the listed English words available
  // to the known side from the seed where that carrier debuts.
  glossSynonyms: {
    // The corpus uses one verb for "practise" and "try" alike (S5 "aggi'a pruvà a parlà"
    // = I'm going to practise speaking; S7 "voglio pruvà" = I want to try). Convergence,
    // not a fork — English splits it, Neapolitan does not.
    "pruvà": ['try', 'trying', 'practise', 'practising'],
    "stongo pruvanno a": ['try', 'trying'],
    // "chello ca" is the corpus's single relativiser for English "what" (S8, S49, S57,
    // S59, S78, S83, S84, S104, S107).
    "chello ca": ['what'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  glossUnits: [
    // English "as X as possible" / "as X as I can" are both realised by the single
    // frame 'o cchiù … ca pozzo; the English is taught whole, never re-split.
    { phrase: 'as often as possible', carrier: "'o cchiù spisso ca pozzo" },
    { phrase: 'as hard as i can', carrier: "'o cchiù ca pozzo" },
    { phrase: 'what i mean', carrier: 'chello ca voglio dicere' },
  ],

  // constructions: English machinery licensed only once its Neapolitan carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by aggi'a (debuts S5). Before that the learner has no
    // way to produce a future, so the English prompt must not use one.
    { id: 'going-to', carrier: "aggi'a", test: /\bgoing to\b/i },
    // Negation is carried by nun (debuts S10, as a component of "nun so' sicuro").
    { id: 'negation', carrier: 'nun', test: /\b(not|n't|never)\b/i },
  ],

  clusterRounds: {},
  glossRules: {},
};

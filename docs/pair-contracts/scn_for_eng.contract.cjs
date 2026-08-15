// scn_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing scn_for_eng seed
// translations (the course was created 2026-07-07 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract, this is the rule layer for THIS pair;
// nothing here is copied from another Romance pair's target-side layer. Every Sicilian
// form below was read out of the 668-seed corpus, never recalled from memory.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Sicilian.
// The known-side gate therefore runs advisory. Ratifying it needs a Sicilian speaker
// to rule on the open questions collected in
// docs/a108/scn-for-eng-native-speaker-questions-2026-08-15.md.
module.exports = {
  course_code: 'scn_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Sicilian) ──
  //
  // ORTHOGRAPHY NOTE, and it matters for every regex here: in this corpus the apostrophe
  // is a LETTER, not punctuation. 'n (in) is not n; 'mparari is not mparari; l'àutri and
  // d'arricurdàrimi are single tokens. Any sameness/dedup test that strips apostrophes
  // will merge distinct words and manufacture false defects.
  //
  // glossSynonyms: one Sicilian target that legitimately carries several English glosses
  // (the RECEPTION direction, which ZUT permits — see ralph-methodology.md §ZUT Outranks
  // Naturalness). Each entry makes the listed English words available to the known side
  // from the seed where that carrier debuts.
  glossSynonyms: {
    // pirchì is BOTH "why" (S21, S47, S67, S81, S113) and "because" (S22). The course
    // currently debuts it glossed only as "why" at S21; S22 then uses it as "because"
    // with no LEGO teaching that sense. See speaker question B.
    'pirchì': ['why', 'because'],
    // chiḍḍu ca is the corpus's single relativiser for English "what" (S7, S8, S12, S49,
    // S57, S59, S113 and 33 others).
    'chiḍḍu ca': ['what'],
    // aju a is BOTH "I'm going to" (S5, S8, S23) and "I have to" (S25, S293). One form,
    // two English modalities. See speaker question C.
    'aju a': ['going to', 'have to'],
    // prestu is BOTH "quickly" (S20) and "soon" (S23).
    'prestu': ['quickly', 'soon'],
    // lu sò is BOTH "his" (S20) and "her" (S21) — Sicilian does not mark the possessor's
    // gender here. This is the sharpest convergence in the opening band. Speaker question A.
    'lu sò': ['his', 'her'],
  },

  // ── OPEN ZUT COMMITMENT, for whoever builds seeds 31+ ──
  // This build taught "people" -> genti at S22 (that is what S22 says). Seeds 85, 87, 88, 286,
  // 287, 288, 297 use pirsuni for the same English word. One known prompt may map to only one
  // target, so seed 85 will be REJECTED until this is ruled on. See speaker question K.
  openForks: [
    { gloss: 'people', committed: 'genti', committedAt: 22, competing: 'pirsuni', competingAt: [85, 87, 88, 286, 287, 288, 297] },
  ],

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  glossUnits: [
    // English "as X as possible" / "as X as I can" are realised by frames that are not
    // compositional from their parts; the English is taught whole, never re-split.
    { phrase: 'as often as possible', carrier: 'lu cchiù spissu pussìbbili' },
    { phrase: 'as hard as i can', carrier: 'tuttu chiḍḍu ca pozzu' },
    { phrase: 'what i mean', carrier: 'chiḍḍu ca vogghiu diri' },
    { phrase: "i'm looking forward to", carrier: "nun viju l'ura di" },
    { phrase: 'as soon as i can', carrier: 'appena pozzu' },
    { phrase: 'as soon as you can', carrier: 'appena poi' },
  ],

  // constructions: English machinery licensed only once its Sicilian carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by aju a (debuts S5). Before that the learner has no
    // way to produce a future, so the English prompt must not use one.
    { id: 'going-to', carrier: 'aju a', test: /\bgoing to\b/i },
    // Negation is carried by nun (debuts S10, as a component of "nun sugnu sicuru").
    { id: 'negation', carrier: 'nun', test: /\b(not|n't|never)\b/i },
  ],

  // ── CLITIC PLACEMENT — the one target-side rule an author most needs, and it is NOT
  // a free choice. Both patterns are attested in the corpus and they are complementary:
  //   ENCLITIC on a bare infinitive:      arricurdàrimi (S6), aiutàrimi (S25),
  //                                       sèntirimi (S26), pigghiàrimi (S27),
  //                                       spiàriti (S30), vìdirini (S18)
  //   PROCLITIC before a finite verb:     mi pozzu arricurdari (S10, S56, S57, S113)
  // A full sweep of all 668 seeds (worker #704) found the two patterns COMPLEMENTARY with
  // ZERO counter-examples: enclitic iff the verb is an infinitive (41 instances), proclitic
  // iff the verb is finite. This is a rule, not free variation. The one case still open is
  // under a modal, where S24 "nun aju a putiri arricurdàrimi" shows the enclitic surviving
  // but the corpus only ever shows climbing elsewhere ("mi pozzu arricurdari"). Authors
  // should reproduce whichever pattern the seed uses and NOT invent the other.
  // See speaker question D.
  cliticPlacement: {
    enclitic_on_infinitive: true,
    proclitic_on_finite: true,
    climbing_optional: null,   // unresolved for modals specifically — see speaker question D
  },

  clusterRounds: {},
  glossRules: {},
};

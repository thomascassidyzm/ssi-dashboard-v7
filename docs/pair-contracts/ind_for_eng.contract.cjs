// ind_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing ind_for_eng seed
// translations (course created 2026-08-11 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract, this is the rule layer for THIS pair.
// Nothing here is copied from another pair's target-side layer.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Indonesian.
// The known-side gate therefore runs advisory. Ratifying it needs an Indonesian speaker
// to rule on the open questions collected in
// docs/a108/ind-for-eng-native-speaker-questions-2026-08-15.md.
module.exports = {
  course_code: 'ind_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── THE AFFIX RULE FOR THIS PAIR (the load-bearing decision of this build) ──
  //
  // Indonesian is agglutinative (me-, ber-, per-, -kan, -i, -an, -nya, se-…). Affixes are
  // CONSTRUCTION-FEATURES, never units of intention (ralph-methodology.md §Intention-units
  // vs construction-features). Therefore:
  //   1. The learnable unit is the WHOLE ORTHOGRAPHIC WORD. `belajar` is one LEGO; there is
  //      no `bel-` + `ajar`. `namanya` is one LEGO; there is no bare `-nya` card.
  //   2. Where root AND affixed form both need teaching, they are two whole-word LEGOs with
  //      distinct English glosses, and the OVERLAP does the teaching by inference
  //      (nama = "name" → namanya = "his name"). No affix is ever glossed as itself.
  //   3. Structural particles with no standalone intention — `lagi` (progressive),
  //      `yang` (relativiser), `itu` (definite), `akan` (future), `tidak` (negator) — are
  //      absorbed inside an M-LEGO whose gloss names the whole thought. They are covered for
  //      tiling by the M-LEGO's own target and never get a component row of their own.
  // This is also what the tiling validator requires: checkTiling is whitespace-word based,
  // so a sub-word affix LEGO could not tile at all.

  // ── TARGET-SPECIFIC (Indonesian) ──
  //
  // glossSynonyms: one Indonesian target legitimately carrying several English glosses
  // (the RECEPTION direction, which ZUT permits). Each entry makes the listed English
  // words available to the known side from the seed where that carrier debuts.
  glossSynonyms: {
    // Real feature of Indonesian, flagged in the course's own translation_analysis:
    // no gender marking on the 3rd person pronoun.
    'dia': ['he', 'she', 'him', 'her'],
    // -nya carries both possessors for the same reason.
    'namanya': ['his', 'her'],
    // bisa carries both "can" and "to be able to"; Indonesian marks no tense, so
    // past-ability "could" lands here too (translation_analysis, zut_concerns).
    'bisa': ['can', 'could', 'able'],
    // orang is both the count noun and the plural/generic.
    'orang': ['person', 'people', 'someone'],
    // akan carries "will" and "going to" alike — Indonesian has no separate future tense.
    'akan': ['will', 'going'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  // The se-ADJ-mungkin frame is the productive Indonesian pattern behind all three.
  glossUnits: [
    { phrase: 'as often as possible', carrier: 'sesering mungkin' },
    { phrase: 'as hard as i can', carrier: 'sebisa mungkin' },
    { phrase: 'what i mean', carrier: 'apa maksud saya' },
    { phrase: 'what the answer is', carrier: 'apa jawabannya' },
    { phrase: "what's going to happen", carrier: 'apa yang akan terjadi' },
    { phrase: 'before i have to go', carrier: 'sebelum saya harus pergi' },
  ],

  // constructions: English machinery licensed only once its Indonesian carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by akan, which debuts at S5 inside "saya akan".
    { id: 'going-to', carrier: 'saya akan', test: /\bgoing to\b/i },
    // Negation is carried by tidak, which debuts at S10 inside "saya tidak yakin".
    { id: 'negation', carrier: 'saya tidak yakin', test: /\b(not|n't|never)\b/i },
    // do-support questions are carried by apakah in its sentence-initial use, S14.
    { id: 'do-support', carrier: 'apakah kamu bicara', test: /^(do|does|did|are|is) (you|we|they|he|she|i)\b/i },
  ],

  clusterRounds: {},

  // glossRules: forks this pair must hold apart on the KNOWN side, because the English
  // word is ambiguous and the two senses take different Indonesian forms.
  glossRules: {
    // "if" is the one real English-side fork in this corpus. Indirect-question "if"
    // (= whether) is apakah; conditional "if" is kalau. The course NEVER glosses either
    // as "if" — apakah is always glossed "whether", kalau will be glossed "if" when it
    // debuts (first corpus occurrence S44). Keeps the known side deterministic.
    if: { note: 'never gloss apakah as "if" — always "whether"; reserve "if" for kalau' },
    // "want" vs "would like" are held apart from seed 1: mau vs ingin. They must never
    // be allowed to converge, or the learner loses a distinction the corpus relies on
    // for 668 seeds.
    want: { target: 'mau' },
    'would like': { target: 'ingin' },
  },
};

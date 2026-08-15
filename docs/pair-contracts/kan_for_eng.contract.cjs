// kan_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing kan_for_eng seed
// translations (course created 2026-06-30 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract, this is the rule layer for THIS pair.
// Nothing here is copied from another Dravidian or Indic pair — there is no other.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Kannada.
// The known-side gate therefore runs advisory. Ratifying it needs a Kannada speaker to
// rule on docs/a108/kan-for-eng-native-speaker-questions-2026-08-15.md — question A0
// (the infinitive fork) is BLOCKING and implicates content already in the database.
module.exports = {
  course_code: 'kan_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Kannada) ──
  //
  // THE DEFINING FACT OF THIS PAIR: Kannada is agglutinative and SOV. A single written
  // word routinely carries what English spreads over four. Consequences encoded below.
  //
  // K1  The LEGO boundary is the FREE FORM, never the bare root. Kannada verb roots
  //     (ಮಾತಾಡ-, ಕಲಿ-, ಬರ-) never occur unsuffixed; minting one as a LEGO hands the
  //     learner a form they can never utter. The whole inflected word is the LEGO.
  // K2  Morphology is revealed by CONTRASTIVE OVERLAP, never by atomising the suffix.
  //     -ಬೇಕು / -ತೀನಿ / -ಲಿದ್ದೀನಿ / -ಲು are construction-features, taught by placing two
  //     whole words that share a root side by side.
  // K3  A vs M is decided by MORPHOLOGICAL composition, not by whitespace. ಕನ್ನಡದಲ್ಲಿ is
  //     one written word and a genuine M-LEGO. Bound case suffixes live in components[]
  //     with introduce:false — never as a standalone card.
  // K4  The 8-syllable LEGO cap must be applied by AKSHARA COUNT. `kan` is absent from
  //     CHARS_PER_SYLLABLE in services/course-builder/lib/language-config.cjs, so the
  //     API falls back to DEFAULT=3.5 chars/syllable; Kannada's real ratio is ~2.0, so
  //     the gate runs ~1.75x too loose and will not protect this course.

  // glossSynonyms: one Kannada carrier that legitimately serves several English glosses
  // (the RECEPTION direction, which ZUT permits — ralph §ZUT Outranks Naturalness).
  glossSynonyms: {
    // ಅಂತ is the quotative/complementiser that closes an embedded clause. It is a
    // construction-feature: it NEVER debuts alone, only inside a frame.
    'ಅಂತ': ['that'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  glossUnits: [
    // Kannada wraps an embedded question in a frame: ಹೇಗೆ … ಅಂತ. The English "how to X"
    // is taught whole at that frame, never re-split.
    { phrase: 'how to speak', carrier: 'ಹೇಗೆ ಮಾತಾಡೋದು ಅಂತ' },
    { phrase: 'how to say', carrier: 'ಹೇಗೆ ಹೇಳೋದು ಅಂತ' },
    // "as hard as I can" is the frame ನನ್ನಿಂದ ಆಗುವಷ್ಟು ("as much as comes-about by me").
    // Note it is FIRST-PERSON-BOUND: ನನ್ನಿಂದ is "by me". It must be kept off any
    // you-subject sentence until a speaker supplies the second-person counterpart.
    { phrase: 'as hard as i can', carrier: 'ನನ್ನಿಂದ ಆಗುವಷ್ಟು' },
  ],

  // constructions: English machinery licensed only once its Kannada carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by the -ಲಿದ್ದೀನಿ ending, which debuts at S5 in
    // ಮಾಡಲಿದ್ದೀನಿ. Before that the learner has no future and the prompt must not use one.
    { id: 'going-to', carrier: 'ಮಾಡಲಿದ್ದೀನಿ', test: /\bgoing to\b/i },
    // The locative "in X" is carried by the bound suffix -ದಲ್ಲಿ, debuting S4 (ಕನ್ನಡದಲ್ಲಿ).
    { id: 'locative-in', carrier: 'ದಲ್ಲಿ', test: /\bin\b/i },
  ],

  // NOT YET SET — negation. The corpus negates with several distinct endings
  // (…ಲ್ಲ in ಇಷ್ಟಪಡಲ್ಲ S19 / ಆಗಲ್ಲ S24, ಗೊತ್ತಿಲ್ಲ S10, ಇಲ್ವೋ S10). No negation carrier has
  // debuted in seeds 1-9, so no negative English prompt is licensed yet. Do not add a
  // negation construction until a speaker rules on which ending is THE course's negator.

  clusterRounds: {},
  glossRules: {},
};

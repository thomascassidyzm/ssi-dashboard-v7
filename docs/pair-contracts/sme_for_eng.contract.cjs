// sme_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing sme_for_eng seed
// translations (the course carried translations and zero LEGOs). Per
// ralph-methodology.md §The Pair-Contract this is the rule layer for THIS pair;
// nothing in the target-side section is copied from another Uralic pair. The known-side
// scaffold IS shared verbatim with every other _for_eng pair, which is correct.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Northern Sami.
// The known-side gate therefore runs advisory. Ratifying it needs a Northern Sami speaker
// to rule on docs/a108/sme-for-eng-native-speaker-questions-2026-08-15.md — two of whose
// entries are BLOCKING, because the existing translation is internally inconsistent and
// the content currently teaches one of two spellings without knowing which is right.
module.exports = {
  course_code: 'sme_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Northern Sami) ──
  //
  // THE GOVERNING RULE FOR THIS PAIR — consonant gradation.
  //
  // Northern Sami alternates the STEM through the paradigm (strong ~ weak grade), so
  // forms of one lexeme share no usable prefix:
  //     hupmat (to speak) ~ human (I speak) ~ humat (you speak) ~ hupmet (they speak)
  //     háliidan (I want) ~ háliida (he/she wants) ~ háliidit (we want) ~ háliidivččen (I'd like)
  //     sáhtán (I'm able to) ~ sáhtát (you're able to) ~ sáhttit (to be able to) ~ sáhte (…able, connegative)
  // Consequence: ANY string-similarity test for "same word" is unsafe in this pair — it
  // both misses real repeats (hupmat/human) and would merge distinct words. Do not write
  // one, and do not trust one written elsewhere in the toolchain.
  //
  // The adopted rule: EVERY LEGO IS A WHOLE INFLECTED SURFACE FORM WITH ITS OWN ENGLISH
  // INTENTION. Never a stem, never a bare person-ending, never an abstract lexeme. Each
  // form the learner must PRODUCE is its own card with its own English intention, and the
  // paradigm is inferred by contrast (ralph-methodology.md §Grammar is INFERRED) — exactly
  // as "to speak → hupmat" vs "I speak → mun human" does at seeds 1 and 9.
  //
  // NEGATION follows from the same rule and is the sharpest case. Northern Sami negates
  // with an INFLECTING negative verb (in / it / ii / eat / ehpet / eai) AND puts the main
  // verb into a distinct connegative form, so BOTH halves change:
  //     mun háliidan (I want)     → mun in háliid   (I don't want)     [seed 19]
  //     mun sáhtán   (I'm able to)→ mun in sáhte    (I'm not able to)  [seed 24]
  //     mun lean     (I am)       → mun in leat     (I'm not)          [seed 10]
  // There is therefore NO "not" LEGO to be had. A negator card would be a category error
  // (ralph-methodology.md §Intention-units vs construction-features): the learner never
  // forms an intention to "say in". Negatives are taught as whole inflected chunks, and
  // the affirmative/negative pair is what carries the grammar.
  glossSynonyms: {
    // ONE Sami target legitimately carrying several English glosses — the RECEPTION
    // direction, which ZUT permits. These are the convergences actually attested in the
    // built block, not a speculative list.
    'hupmat': ['speak', 'speaking'],       // "to speak" (S1) and "speaking" (S5, in hárjehallat hupmat)
    'muitit': ['remember'],                // "to remember" (S6) and bare "remember" (S10 component)
    'geahččalit': ['try'],                 // infinitive; distinct card from geahččalan "I'm trying"
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  // Sami builds comparatives with the discontinuous frame nu … go, which cannot be split
  // into an English-mappable "as" + "as" without inventing a known-side fork — so the
  // whole frame is one unit.
  glossUnits: [
    { phrase: 'as often as possible', carrier: 'nu dávjá go vejolaš' },
    { phrase: "as well as i'm able to", carrier: 'nu bures go sáhtán' },
    { phrase: 'what i mean', carrier: 'mun oaivvildan' },
    { phrase: 'the whole sentence', carrier: 'olles cealkaga' },
  ],

  // constructions: English machinery licensed only once its Sami carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by áiggun (debuts S5). Before that the learner has no
    // future, so the English prompt must not use one.
    { id: 'going-to', carrier: 'mun áiggun', test: /\bgoing to\b/i },
    // Negation is carried by the negative verb, which debuts S10 inside "mun in leat sihkkar".
    { id: 'negation', carrier: 'mun in leat', test: /\b(not|n't|never)\b/i },
  ],

  // KNOWN-SIDE HOUSE RULE for this pair, learned from the gate rejecting seed 10:
  // prefer "able to" over "can" in every LEGO gloss. English "can" is not in the free
  // class and stems to a non-word, and more importantly Sami splits it by person and
  // polarity (sáhtán / sáhtát / sáhttit / sáhte), so "can" would fork on the target side.
  // This matches the fin_for_eng precedent on the same 668-seed corpus.

  clusterRounds: {},
  glossRules: {},
};

// roh_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing roh_for_eng seed
// translations (course created 2026-07-07 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract this is the rule layer for THIS pair;
// nothing here is copied from another Romance pair's target-side layer.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Romansh.
// The known-side gate therefore runs advisory. Ratifying it needs a Romansh speaker to
// rule on the open questions collected in
// docs/a108/roh-for-eng-native-speaker-questions-2026-08-15.md.
//
// VARIETY. Romansh has five written idioms plus the pan-regional standard. This corpus
// is Rumantsch Grischun, established by marker census over all 668 seeds and not by
// assumption: jau 310 / jeu 0 / eu 0 / ia 0 / jou 0; betg 152 / buc 0; tge 43 / tgei 0;
// gea 28 / ei 0; fitg 31 / fetg 0; pussaivel 6 / pusseivel 0 / pussibel 0;
// discurrer 19 / discuorrer 0. Zero cross-variety tokens survive inspection — the two
// candidates both resolve as standard RG (`es` is always 2SG after `ti`, and `nun ch'`
// at S532 is the conjunction "unless", not the Vallader negator).
module.exports = {
  course_code: 'roh_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Rumantsch Grischun) ──
  //
  // THE ELISION RULE — the structural fact that shapes every decomposition in this pair.
  // Romansh elides the linkers `da`→`d'`, `a`→`ad` and the subordinators `che`→`ch'`,
  // `sche`→`sch'` before a vowel. The tiling validator matches WHOLE chunks and never
  // re-splices word forms, and normalizeForContainment does not strip the ASCII
  // apostrophe — so `d'emprender` and `emprender` are two different tokens to the gate,
  // and `jau vegn a` cannot be joined to a vowel-initial infinitive at all.
  //
  // POLICY ADOPTED HERE (departure from the plain layered-decomposition recipe, declared
  // per the methodology's "say where and why you departed"):
  //   1. The bare citation form is taught as its own LEGO where the corpus attests it
  //      bare (emprender S20/S64/S79, in pled). It is what the learner recombines with.
  //   2. The elided form is taught as a SEPARATE unit with a DISTINCT English gloss —
  //      never the same gloss as the bare form, or ZUT forks. The convention is that the
  //      linker is absorbed into the following word and glossed by what the linker
  //      signals in English: da+INF -> the "-ing" gloss, d'+NP -> the "of a …" gloss.
  //        emprender = "to learn"      d'emprender    = "learning"
  //        discurrer = "to speak"      da discurrer   = "speaking"
  //        declerar  = "to explain"    da declerar    = "explaining"
  //        in pled   = "a word"        d'in pled      = "of a word"
  //        ma regurdar = "to remember" da ma regurdar = "remembering"
  //   3. A linker is NEVER glossed alone and never carries a known of its own.
  //   4. `jau vegn a` ("I'm going to") must not be combined with a vowel-initial
  //      infinitive in any authored phrase — the corpus writes `jau vegn ad …` and the
  //      gate correctly rejects the unelided splice. Where the seed itself needs it,
  //      the whole elided chunk is one LEGO (`jau vegn ad empruvar`, S8).
  elision: {
    pairs: [['da', "d'"], ['a', 'ad'], ['che', "ch'"], ['sche', "sch'"]],
    note: 'Elided and unelided forms are distinct chunks to the tiler. Never gloss both the same.',
  },

  // glossSynonyms: one Romansh target legitimately carrying several English glosses
  // (the RECEPTION direction, which ZUT permits — ralph-methodology.md §ZUT Outranks
  // Naturalness). Each entry makes the listed English words available from the seed
  // where that carrier debuts.
  glossSynonyms: {
    // `fitg` is "very" in 30 of its 31 corpus appearances (S13 "fitg bain" = very well)
    // but is the degree word inside the as-hard-as frame at S7. It is therefore NEVER
    // glossed alone in this build — it lives inside the bound unit below — so that
    // "hard" and "very" cannot fork onto the same card.
    fitg: ['very', 'hard'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  // The `uschè X sco Y` comparative frame is the corpus's single as-X-as construction
  // (16 occurrences, S3/S7/S28/S29/S50/S97/S403/S437). English splits the tail into
  // "as possible" (sco pussaivel) and "as I can" (sco che jau poss); the frame is taught
  // whole and never re-split.
  glossUnits: [
    { phrase: 'as often as possible', carrier: 'uschè savens sco pussaivel' },
    { phrase: 'as hard as i can', carrier: 'uschè fitg sco che jau poss' },
    { phrase: 'what i mean', carrier: 'tge che jau manegel' },
  ],

  // constructions: English machinery licensed only once its Romansh carrier has debuted.
  constructions: [
    // "I'm going to …" is carried by `jau vegn a` (debuts S5). Before that the learner
    // has no future at all, so the English prompt must not use one.
    { id: 'going-to', carrier: 'jau vegn a', test: /\bgoing to\b/i },
    // Negation is the discontinuous circumfix na … betg, taught whole inside
    // "jau na sun betg segir" (S10). It is a construction-feature, never a bare A-LEGO:
    // there is no card that asks the learner to mean "betg".
    { id: 'negation', carrier: 'betg', test: /\b(not|n't|never)\b/i },
  ],

  clusterRounds: {},
  glossRules: {},
};

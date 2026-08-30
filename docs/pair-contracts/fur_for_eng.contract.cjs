// fur_for_eng pair-contract — FIRST PASS (2026-08-15), NOT ratified.
//
// Derived on first contact while decomposing the 668 pre-existing fur_for_eng seed
// translations (course created 2026-07-07 with translations but zero LEGOs).
// Per ralph-methodology.md §The Pair-Contract this is the rule layer for THIS pair;
// nothing in the target-side layer is copied from another Romance pair.
//
// `ratified: null` is load-bearing and honest: nobody on this build speaks Friulian.
// The known-side gate therefore runs advisory. Ratifying it needs a Friulian speaker to
// rule on docs/a108/fur-for-eng-native-speaker-questions-2026-08-15.md.
module.exports = {
  course_code: 'fur_for_eng',
  ratified: null,
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from _default_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // ── TARGET-SPECIFIC (Friulian) ──
  //
  // THE STRUCTURAL FACT THAT SHAPES THIS PAIR: Friulian requires a subject clitic on every
  // finite verb (o / tu / al / e / o …-ìn / a), the clitic DISAPPEARS in the 1sg under
  // negation (o vuei -> no vuei), and questions are formed by enclisis (tu fevelis ->
  // fevelistu). A bare finite verb is never producible, so finite forms are ALWAYS taught
  // as clitic+verb M-LEGOs, never as a bare A-LEGO with the clitic split off as a
  // "construction feature". Every affirmative/negative/interrogative face of a verb is a
  // separate debut with its own English gloss — that is the overlap ladder doing the
  // teaching, not duplication.
  //
  // THE LINKER RULE: a governing verb selects the linker before an infinitive (a / di /
  // none) and the linker is bundled with the GOVERNING verb, never with the infinitive:
  //   o cîr di + imparâ | o cirarai di + spiegâ | smeti di + fevelâ | o fasarai pratiche a +
  //   fevelâ | o scomençarai + a fevelâ | o vuei + fevelâ (bare).
  // The one exception on record is "speaking" -> "a fevelâ", introduced as a component at
  // S5 so that "I'm going to practise speaking" and "I'm going to start speaking" tile from
  // the same piece. A Friulian speaker must confirm the a/di assignment per verb (question F).

  // glossSynonyms: one Friulian carrier that legitimately answers several English glosses
  // (the RECEPTION direction, which ZUT permits). Each entry makes the listed English words
  // available to the known side from the seed where that carrier debuts.
  glossSynonyms: {
    // Friulian possessives agree with the possessed noun, not the possessor: "il so non"
    // is both "his name" and "her name" (S20, S21). Convergence, not a fork.
    'il so non': ['his', 'her'],
    // fevelâ answers both the infinitive and the English gerund after a linker.
    'fevelâ': ['speak', 'speaking'],
    'a fevelâ': ['speaking'],
  },

  // glossUnits: bound, non-compositional English phrases taught whole at a carrier.
  glossUnits: [
    { phrase: 'as often as possible', carrier: 'il plui pussibil dispès' },
    { phrase: 'as hard as i can', carrier: 'il plui che o pues' },
    { phrase: 'as soon as i can', carrier: 'al plui prest che o pues' },
    { phrase: 'what i mean', carrier: 'ce che o vuei dî' },
    { phrase: 'at six o\'clock', carrier: 'aes sîs' },
  ],

  // constructions: English machinery licensed only once its Friulian carrier has debuted.
  constructions: [
    // The English "going to" future is carried by the Friulian synthetic future, which
    // first debuts at S5 in "o fasarai pratiche a" and recurs as o cirarai / o scomençarai /
    // no podarai / mi judarâstu. Without this entry the default contract flags every
    // "I'm going to …" prompt as unlicensed machinery.
    { id: 'going-to', carrier: 'o fasarai pratiche', test: /\bgoing to\b/i },
    // Negation is carried by "no" before the verb, debuting S10 in "no soi sigûr".
    { id: 'negation', carrier: 'no soi sigûr', test: /\b(not|n't|never)\b/i },
    // Do-support questions are carried by the enclitic interrogative, debuting S14
    // (fevelistu). Before S14 no English "do you …?" prompt is producible.
    { id: 'do-support', carrier: 'fevelistu', test: /\bdo(es)? (you|he|she|we|they)\b/i },
  ],

  clusterRounds: {},
  glossRules: {},
};

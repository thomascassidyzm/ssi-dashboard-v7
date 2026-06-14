// _TEMPLATE.contract.cjs — language-agnostic pair-contract schema.
// Copy to {course_code}.contract.cjs and derive each field on first contact with a
// new pair (see ralph-methodology.md "The Pair-Contract"). The both-sides gate reads
// this; it is order-independent (construction licenses keyed by CARRIER, resolved to a
// round/seed from whatever order is in force). Vocabulary: known / target / seed only
// — never "source".
//
// CRITICAL: the free class, NPI, negation, inflection and machinery are KNOWN-LANGUAGE
// specific. The values below are ENGLISH (known_lang:'eng'). A pair with a different
// known language (e.g. _for_jpn) MUST restate freeGlue / npiTokens / negationWords /
// stemStrip / negationMarkers / the do-support family in that language, or the gate will
// mis-fire. The gate only runs when course known language === contract known_lang.

module.exports = {
  course_code: 'xxx_for_yyy',   // e.g. 'spa_for_eng'
  known_lang: 'eng',            // ISO-639-3 of the KNOWN (prompt) language
  ratified: null,               // set to a date string only AFTER adversarial verification; null = advisory/warn-only

  // ── Free class (KNOWN-language; never needs introduction) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  stemStrip: ['ing', 'ed', 's', 'e', 'd'],            // crude inflection strip for gloss matching
  npiTokens: ['any', 'anyone', 'anything', 'ever', 'yet', 'either'],  // free ONLY under negation
  negationMarkers: /\b(not|n['’]t|never|no)\b/i,       // detects whether a prompt is negated (NPI gate)
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't"],  // covered by the 'negation' construction

  // ── Multi-gloss LEGOs: one target legitimately carries several known glosses ──
  // (many-known→one-target is ZUT-legal). Keyed by carrier TARGET.
  glossSynonyms: {
    // '说': ['speak', 'say'],
  },

  // ── Bound gloss-units: non-compositional known phrases taught WHOLE at a carrier's debut ──
  // (the gate masks the matched span instead of tiling it word-by-word). Keyed by carrier TARGET.
  glossUnits: [
    // { phrase: 'what i mean', carrier: '意思' },
  ],

  // ── Construction licenses: known-side machinery, each unavailable until its carrier debuts ──
  // carrier = a target whose debut licenses the construction; cluster = a deliberate teaching
  // moment not tied to one lego (round/seed from clusterRounds/clusterSeeds).
  constructions: [
    // { id: 'negation',     test: /\b(don't|doesn't|not)\b/i,                       carrier: '<neg-marker>' },
    // { id: 'do-support-q', test: /\b(how|what) (do|does) (you|i|we)\b/i,           cluster: 'do_support' },
  ],
  clusterRounds: { /* do_support: 17 */ },   // for reorder/round-indexed checks
  clusterSeeds: { /* do_support: 17 */ },    // for seed-indexed generation checks

  // ── Gloss/ZUT rules enforced by authoring + gates (recorded; not all are pure tiling) ──
  glossRules: {
    // example categories (instances are pair-specific — DO NOT copy Chinese rules verbatim):
    // modalSplit: 'ability-vs-circumstance: ...',
    // intensifierSplit: 'silent before adjective predicate; gloss the intensity before psych-verbs',
    // aspectCueTable: 'past bounded event -> aspect marker always; past state -> bare; ...',
  },
};

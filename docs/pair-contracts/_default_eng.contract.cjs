// _default_eng — fallback KNOWN-SIDE contract for every *_for_eng course that has no
// pair-specific contract file (vocab-gate breach fix, 2026-07-27: "yes I want to speak"
// passed /seed/complete in glg_for_eng because the known-side check silently skipped
// courses without a contract, and was warn-only besides).
//
// KNOWN-SIDE SCAFFOLD is the shared English scaffold, verbatim from fra_for_eng /
// zho_for_eng ("identical for ALL _for_eng pairs"). The TARGET-specific layer is empty
// by definition — a default cannot know target-language synonym/construction licensing.
// Consequence: gloss-vocab breaches (a known word never introduced, e.g. "yes") are
// detectable and BLOCKED for every English-known course; construction licensing stays
// contract-specific and is only checked where a real contract exists.
module.exports = {
  course_code: '_default_eng',
  ratified: null,
  known_lang: 'eng',
  is_default: true,

  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  glossSynonyms: {},
  glossUnits: [],
  constructions: [],
  clusterRounds: {},
  glossRules: {},
};

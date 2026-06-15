// fra_for_eng pair-contract — FIRST PASS (2026-06-15), NOT yet ratified.
// Travel test of the gate-and-fix template from zho_for_eng to French.
// KEY REUSE: known_lang === 'eng', so the entire KNOWN-SIDE scaffold (free class, NPI,
// negation, tense/inflection constructions) is IDENTICAL to zho_for_eng — copied verbatim
// below. Only the TARGET-specific layer (glossSynonyms / glossUnits / constructions /
// glossRules) is French-specific, and is left EMPTY here to be discovered from the lint
// flags (the gate will over-flag legitimate many-English->one-French until these are filled
// — those flags ARE the worklist for ratifying this contract).
module.exports = {
  course_code: 'fra_for_eng',
  ratified: null,            // advisory/warn-only until a French speaker + adversarial pass ratify
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from zho_for_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  stemStrip: ['ing', 'ed', 's', 'd'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],
  // English tense/inflection constructions — introduce-once-then-free (known-side mirror of
  // any target aspect-contract). RENDERING column differs per target; for French most carry
  // through real verb morphology (parlé / parlais / parlerai) so the demonstration differs
  // from Chinese, but the SET of English forms to introduce is the same.
  knownTenseConstructions: [
    { id: 'past',          englishForm: '-ed + irregular past (tried, went, saw)', semantics: 'introduce-once-then-free' },
    { id: 'progressive',   englishForm: "-ing (I'm trying)",                        semantics: 'introduce-once-then-free' },
    { id: 'perfect',       englishForm: 'have/has V-ed (I have tried)',             semantics: 'introduce-once-then-free' },
    { id: 'future',        englishForm: 'will / going to (I will try)',             semantics: 'introduce-once-then-free' },
    { id: 'agreement_3sg', englishForm: '3sg -s (she wants)',                       semantics: 'introduce-once-then-free' },
    { id: 'comparative',   englishForm: '-er / -est (harder, best)',                semantics: 'introduce-once-then-free' },
    { id: 'plural',        englishForm: 'noun -s (words)',                          semantics: 'introduce-once-then-free' },
  ],

  // ── TARGET-SPECIFIC (French) — EMPTY; to be derived from the lint flags ──
  glossSynonyms: {},   // e.g. one French target legitimately carrying several English glosses
  glossUnits: [],      // bound non-compositional English phrases taught whole at a carrier
  constructions: [],   // French machinery licensed at a carrier debut (gender agreement, etc.)
  clusterRounds: {},
  glossRules: {},
};

// zho_for_eng pair-contract — ratified by Tom 2026-06-13 (see memory reference_ssi_zho_pair_contract).
// The rule layer the both-sides tiling gate reads. Order-independent: construction
// licenses are keyed by CARRIER LEGO (target text); the gate resolves the round from
// whatever order is in force, so this file is valid under canon OR any reorder.

module.exports = {
  course_code: 'zho_for_eng',
  ratified: '2026-06-13',
  // KNOWN language this contract's free-class/NPI/machinery are written for. The
  // generation gate only fires when the course's known language matches — English
  // regexes must not be applied to a non-English-known course (a _for_jpn contract
  // restates the free class / NPI / machinery in Japanese).
  known_lang: 'eng',

  // Free class — never needs introduction on the known side.
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],

  // ── NO INFLECTION ALLOWANCE (Tom 2026-06-15) ──
  // A known form is usable ONLY if it was introduced as a LEGO or a COMPONENT of an M-LEGO —
  // EXACT form, no stemming. "tried" / "wants" / "going" each need their own LEGO/component debut
  // before use; they are NOT licensed by an introduced "try"/"want"/"go". The gate enforces this:
  // stemKnownGloss is now an exact normaliser (no suffix stripping); there is NO stemStrip and NO
  // tense-construction class-licensing. (Genuine glue above + NPI-under-negation below stay free.)

  // NPI (rule 4): these tokens are FREE, but only when the phrase is negated.
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  // Negation words are covered by the 'negation' construction (carrier 不), not a standalone gloss.
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],

  // Bound gloss-units (rule 3 etc.): non-compositional English phrases taught WHOLE
  // at a carrier's debut — must not be tiled word-by-word. Gate masks the matched
  // span (so "what" inside "what I mean" isn't required separately) and checks the
  // carrier is available.
  glossUnits: [
    { phrase: 'what i mean', carrier: '意思' },
    { phrase: 'how long', carrier: '多久了' },
    { phrase: 'someone else', carrier: '和别人' },
  ],

  // Multi-gloss LEGOs: one target legitimately carries several English glosses
  // (many-known→one-target is ZUT-legal). Keyed by carrier target; the gate
  // registers every synonym at the carrier's round.
  glossSynonyms: {
    '说': ['speak', 'say'],
    '也': ['also', 'too'],
    '很': ['very', 'really'],
    '想': ['want'],
    '学习': ['learn', 'study'],
    '试试': ['try'],
    '意思': ['meaning', 'mean'],
  },

  // Construction licenses (rules 4,6,7 + known-side doctrine). Each is unavailable until
  // its carrier LEGO has debuted (gate resolves carrier→round from the live order).
  // `cluster` carriers are deliberate teaching moments not tied to one lego — the gate
  // takes their round from opts.clusterRounds.
  constructions: [
    { id: 'negation',      test: /\b(don't|doesn't|didn't|not|won't|can't)\b/i, carrier: '不' },
    { id: '3sg',           test: /\b(she|he|she's|he's)\b/i,                      carrier: '她' },
    { id: 'going-to',      test: /\bgoing to\b/i,                                 carrier: '我要' },
    { id: 'want-to-have',  test: /\bwant to have\b/i,                             carrier: '想要' },
    { id: 'have-got',      test: /\b(i've got|you've got|i have got)\b/i,         carrier: '有' },
    { id: 'have-you-been', test: /\bhave (you|i|we) been\b|\bhow long have\b/i,    carrier: '多久了' },
    { id: 'bare-wh',       test: /\bhow to\b/i,                                   carrier: '怎么' },
    // do-support questions: deliberate convergence cluster, same target as the bare-wh statement.
    { id: 'do-support-q',  test: /\b(how|what|where|when|why) (do|does) (you|i|we|she|he)\b/i, cluster: 'do_support' },
  ],

  // Gloss/ZUT rules that authoring + the ZUT gate enforce (not pure tiling — recorded for completeness).
  glossRules: {
    keFork: 'can+ability(esp. a language) -> 会; situational possibility/permission -> 能',
    jinkeneng: '尽可能 = "as much as possible" only; "as often as possible" = 尽可能经常',
    yisi: '意思="meaning"; 我的意思="what I mean" (bound unit)',
    ye: '也 = silent construction-feature; gloss whole intention, never standalone also/too',
    henSplit: '很+adjective-predicate = silent (no "very"); 很+psych-verb = "really"',
    le: 'past bounded event -> always 了; past state -> bare; didn\'t -> 没 (never 了); have-V-ed-before -> 过',
  },

  // Default cluster rounds (overridable via opts). Placed once the bare-wh statement is solid.
  clusterRounds: { do_support: 17 },
};

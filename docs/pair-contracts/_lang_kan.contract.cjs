// _lang_kan — LANGUAGE-LEVEL known-side brief for kan-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// The KNOWN/prompt language is Kannada. This is the AGENT-BRIEF dialect: freeClass / npi /
// npiLicensing / negation / knownConstructions / glossRules — no regexes, by design (Tom: "no
// regex for language — this is the agent's reference knowledge, NOT a regex gate config"; Kai's
// 2026-08-17 ruling that for these languages an exact-form matcher is TRIAGE, never pass/fail).
// isMechanicalContract() must return FALSE for this file. Adding freeGlue / negationMarkers /
// constructions[{id,test}] would flip it to mechanical and start BLOCKING submissions on
// morphology the matcher cannot read. Don't.
//
// ⚠ NOT TO BE CONFUSED WITH kan_for_eng.contract.cjs, which exists but whose known_lang is 'eng'
// (Kannada is the TARGET there, English the prompt). That file says nothing about Kannada as a
// known language and must never be used as one.
//
// ── WHAT THIS WAS CALIBRATED ON ──────────────────────────────────────────────────────
// eng_for_kan is the only kan-known course in the estate today (released, 668 seeds).
// Corpus tokenised with the live tokenizeKnown + stemKnownGloss (post-2026-08-17 Unicode fix):
//   • course_legos.known_text        1,554 rows →  3,389 tokens / 1,284 types
//   • course_practice_phrases.known 14,230 rows → 55,083 tokens / 1,711 types
// The free class is derived from the PHRASE corpus (55k tokens), which is what the gate reads.
// Debut seeds quoted below are the seed at which a form first appears as a LEGO or an M-LEGO
// component — the introduction point the gate actually uses.
//
// ── TYPOLOGICAL PROFILE AND WHAT IT MEANS FOR EXACT-FORM MATCHING ────────────────────
// Kannada (kan) is Dravidian — the same family as Tamil, and eng_for_tam.contract.cjs is the
// nearest model — so: agglutinative, head-final (SOV), pro-drop, nominative-accusative (NOT
// ergative), with bound case suffixes stacked on nouns and tense+person+number+polarity FUSED into
// the finite verb. Negation is not a free word: it is a bound suffix (-ಇಲ್ಲ present, -ಲಿಲ್ಲ past,
// -ಲ್ಲ colloquial contraction) or the negative existential/desiderative ಇಲ್ಲ / ಬೇಡ / ಅಲ್ಲ.
// Three properties dominate what the matcher can and cannot see:
//   1. FUSION. ಮಾಡು 'do' surfaces as ಮಾಡಬೇಕು 'must/want to do', ಮಾಡೋಕೆ 'to do', ಮಾಡೋದು 'doing',
//      ಮಾಡ್ತೀನಿ 'I do', ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing', ಮಾಡಿದ್ದೇನೆ "I've done", ಮಾಡಲಿಲ್ಲ "didn't do".
//      Those are seven unrelated strings to an exact-form matcher and one lexeme to a learner.
//      No stem-strip can fix this: the stem itself mutates and the endings are portmanteaux.
//      This is why `stemKnownGloss` does no stripping and why a kan sweep is a triage list.
//   2. SPOKEN REGISTER. This course is authored in colloquial (spoken) Kannada, not the literary
//      register: ಮಾಡೋಕೆ not ಮಾಡುವುದಕ್ಕೆ, ಹೇಳ್ತೀನಿ not ಹೇಳುತ್ತೇನೆ, ಆಗಲ್ಲ not ಆಗುವುದಿಲ್ಲ,
//      ಗೊತ್ತಿಲ್ಲ for 'don't know', ಅಂತ for the quotative. Any external word list built from
//      literary Kannada will not match this corpus at all.
//   3. DATIVE SUBJECTS. Kannada puts experiencers, wanters, knowers and possessors in the DATIVE:
//      ನನಗೆ is the single commonest token in the corpus (2,551 phrase hits) because "I want",
//      "I know", "I feel", "I have" and "I don't have" are all ನನಗೆ … frames. English uses a
//      nominative subject for every one of them, so the case is systematically invisible on the
//      English side and ನಾನು (1,488) and ನನಗೆ are one English 'I'.
// Ability is stranger still: "he could" is ಅವನಿಂದ ಆಗುತ್ತೆ — the INSTRUMENTAL/ablative -ಇಂದ on the
// person plus an impersonal 'it becomes'. English 'can/could/be able to' therefore corresponds to
// a change of case on the subject, not to an auxiliary word (see the ability_by_instrumental
// construction).
//
// ── ZWNJ: A REAL TOKENISATION DISTORTION IN THIS CORPUS ──────────────────────────────
// 64 of a 1,000-phrase sample carry U+200C ZERO WIDTH NON-JOINER between a Latin-script loanword
// and its Kannada case suffix. ZWNJ is neither \p{L} nor \p{M}, so tokenizeKnown SPLITS there:
//   ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ("in English") → ["ಇಂಗ್ಲಿಷ್", "ನಲ್ಲಿ"]
// Across the whole phrase corpus the stranded tails are ನಲ್ಲಿ (633), ಳ (27), ಗೆ (24), ಕೇಸ್ (16),
// ಬಾಲ್ (15), ಕಾರ್ಡ್ (14), ಗಿಂತ (1), ನ (1). This does two things a reader must know: it inflates
// the type count slightly, and it manufactures ~700 standalone bare-case-suffix tokens that would
// otherwise never exist. ನಲ್ಲಿ, ಗೆ, ಗಿಂತ and ನ are therefore listed in the free class as bound
// case markers — not because Kannada writes them separately, but because this corpus's ZWNJ makes
// the tokenizer see them separately, and a locative suffix is glue in either analysis. (ಕೇಸ್,
// ಬಾಲ್, ಕಾರ್ಡ್ are loanword STEMS split off their suffixes and are left out: they are content.
// The single-grapheme strandings ನ (1 hit) and ಳ (27) are also left out: they are fragments of a
// suffix, not morphemes, and freeing a bare grapheme would mask real tokens.)
// No parenthetical/authoring tags are baked into this corpus — 0 of 1,554 lego rows carry brackets
// or an `introduce` directive in known_text — so the frequencies above are not tag-distorted. (The
// recorded tag leakage is on the ENGLISH known side of mirror courses, not here.)
//
// ── HONEST GAPS: TOKENS I DID NOT PUT IN THE FREE CLASS, AND WHY ─────────────────────
// High-frequency but LEXICAL, each with a real debut, so classing them free would hide breaches:
// ಅನಿಸುತ್ತೆ (391, 'it seems/I feel' — carrier of the whole ನನಗೆ … ಅನಿಸುತ್ತೆ frame), ಗೊತ್ತು (213,
// 'known'), ಇಷ್ಟ (194, 'liked'), ಸಹಾಯ (358, 'help'), ಕೆಲಸ (311, 'work'), ಸಿದ್ಧ (229, 'ready'),
// ಅರ್ಥ (130, 'meaning/understand'). Temporal and deictic adverbs are also OUT even though they
// behave like glue — ಇವತ್ತು (952), ಈಗ (903), ಇಲ್ಲಿ (293), ಮುಂದಿನ (345), ಭಾನುವಾರ (281) — because
// each has a debut seed here and freeing them would silently license "on Sunday" before it was
// taught.
// Tokens I could NOT confidently classify, and left OUT rather than guess:
//   • ಮೊದಲು (145) / ಮುಂಚೆ — 'before', both a postposition and a temporal adverb, and it appears
//     only inside the ಹೋಗಬೇಕಾಗೋ ಮೊದಲು \"before I have to go\" M-chunk (S25); per-carrier licensing
//     is safer than an always-free classing.
//   • ಆಗುತ್ತೆ (154) — literally 'it becomes', but it is the ability auxiliary, the future copula
//     AND a lexical 'happens'; it is described as a construction instead.
//   • ಸಾಧ್ಯವಾದಷ್ಟು (79, 'as much as possible'), ಸಾಕಷ್ಟು (4, 'enough') — bound inside comparative
//     M-chunks.
//   • ಆಯ್ತು (69, 'okay/done') and ಸರಿ (86, 'right/okay') — discourse particles that are also
//     content answers; genuinely ambiguous.
//   • ಪರವಾಗಿಲ್ಲ (\"no problem / that's fine\") CONTAINS the negative suffix -ಇಲ್ಲ but glosses
//     POSITIVELY. It is in neither list. Flagged here because the brief-dialect negation test is
//     a substring test: it will read this phrase as negated, which happens to be harmless for NPI
//     licensing but is the wrong reason, and an agent should not cite it as evidence of negation.
// The familiar 2sg ನೀನು / ನಿನಗೆ / ನಿನ್ನ appears as a standalone token in 0 of 15,784 lego+phrase
// rows (checked with tokenizeKnown, not a \b regex — JS \b never matches between Kannada letters,
// so \b-anchored probes return meaningless zeroes for every Indic form). 'you' is uniformly
// honorific ನೀವು (906) / ನಿಮಗೆ (857), exactly as Tamil நீங்கள். No register split to model.
//
// ── HOW TO READ A SWEEP OF THIS CONTRACT ─────────────────────────────────────────────
// Every finding is TRIAGE. The gate is seed-granular, so an intra-seed ordering violation passes
// clean and must still be checked by hand. Expect most "unknown gloss" hits to be (a) a verb in a
// fused tense/aspect/polarity form other than the one that debuted, (b) a case-stacked form of an
// introduced noun, (c) a spoken-register contraction of an introduced literary form.
module.exports = {
  course_code: null,          // language-level: serves every kan-known course
  ratified: null,             // advisory until adversarially verified against a real build
  known_lang: 'kan',
  known_lang_name: 'Kannada',

  // Free class — Kannada closed-class function words, corpus-derived from eng_for_kan phrase
  // prompts. Pronouns are listed in every case form the corpus attests, because the matcher cannot
  // relate ನಾನು to ನನಗೆ to ನನ್ನನ್ನ. EVERY entry below was checked to occur as a standalone token in
  // this corpus (tokenizeKnown, lego+phrase rows); candidates that scored 0 — ನೀನು / ನಿನಗೆ /
  // ನಿನ್ನ, ಯಾರಿಗೆ, ಯಾವ, ಯಾರಾದರೂ — were dropped rather than carried on intuition.
  freeClass: [
    // personal pronouns — nominative
    'ನಾನು', 'ನಾವು', 'ನೀವು', 'ಅವನು', 'ಅವಳು', 'ಅವರು', 'ಅದು', 'ಇದು', 'ತಾನು', 'ಒಬ್ಬರು', 'ನೀವೆಲ್ಲ',
    // dative (-ಗೆ) — the case of experiencers, wanters, knowers and possessors
    'ನನಗೆ', 'ನಮಗೆ', 'ನಿಮಗೆ', 'ಅವನಿಗೆ', 'ಅವಳಿಗೆ', 'ಅವರಿಗೆ', 'ಯಾರಿಗೆ',
    // accusative (-ನ್ನ, spoken for -ನ್ನು)
    'ನನ್ನನ್ನ', 'ನಮ್ಮನ್ನ', 'ನಿಮ್ಮನ್ನ', 'ಅದನ್ನ', 'ಅವನ್ನ', 'ಅವಳನ್ನ', 'ಇದನ್ನ',
    // genitive
    'ನನ್ನ', 'ನಮ್ಮ', 'ನಿಮ್ಮ', 'ಅವನ', 'ಅವಳ', 'ಅವರ', 'ಅದರ', 'ತನ್ನ', 'ಯಾರ', 'ಯಾರೋ',
    // instrumental / ablative (-ಇಂದ) — carries the ability construction
    'ನನ್ನಿಂದ', 'ನಿಮ್ಮಿಂದ', 'ಅವನಿಂದ', 'ಅವಳಿಂದ', 'ಅವರಿಂದ',
    // demonstratives / deictic determiners
    'ಆ', 'ಈ', 'ಅದೇ', 'ಇದೇ', 'ಹಾಗೆ', 'ಹೀಗೆ',
    // determiners / quantifiers / degree
    'ಒಂದು', 'ಒಬ್ಬ', 'ಒಬ್ಬರು', 'ಕೆಲವು', 'ಎಲ್ಲಾ', 'ತುಂಬಾ', 'ಹೆಚ್ಚು', 'ಸ್ವಲ್ಪ', 'ಇಷ್ಟು', 'ಅಷ್ಟು', 'ಬೇರೆ', 'ಮಾತ್ರ',
    // conjunctions, quotative complementizers, discourse glue
    'ಆದರೆ', 'ಮತ್ತು', 'ಮತ್ತೆ', 'ಅಥವಾ', 'ಅಂತ', 'ಅನ್ನೋ', 'ಹೌದು',
    // free postpositions (the bound ones are suffixes — see case_suffix_stacking)
    'ಜೊತೆ', 'ಬಗ್ಗೆ', 'ಮೇಲೆ', 'ಹತ್ರ', 'ಗಿಂತ',
    // interrogatives (closed-class machinery, though each debuts as a wh-LEGO)
    'ಏನು', 'ಯಾರು', 'ಎಲ್ಲಿ', 'ಯಾವಾಗ', 'ಹೇಗೆ', 'ಎಷ್ಟು', 'ಯಾಕೆ',
    // bound case markers stranded as standalone tokens by ZWNJ in this corpus (see header)
    'ನಲ್ಲಿ', 'ಗೆ',
  ],

  // NPI / polarity items — the -ಊ series. A violation is one of these in a plain POSITIVE
  // DECLARATIVE with no licenser. The -ಆದರೂ / -ಓ free-choice series is deliberately NOT here.
  npi: ['ಏನೂ', 'ಯಾರೂ', 'ಯಾರಿಗೂ', 'ಸ್ವಲ್ಪವೂ', 'ಎಲ್ಲಿಯೂ', 'ಇನ್ನೂ'],
  npiLicensing: {
    rule: "Kannada, like Tamil, has TWO indefinite series built by suffixing a particle to a "
      + "wh-word, and the particle decides the polarity — so the rule must be stated per series. "
      + "(A) The -ಊ SERIES (ಏನೂ 'anything/nothing' 42, ಯಾರೂ / ಯಾರಿಗೂ 'anyone/nobody' 44, "
      + "ಸ್ವಲ್ಪವೂ 'the least bit' 21, ಎಲ್ಲಿಯೂ 'anywhere', plus the aspectual ಇನ್ನೂ 'yet/still' 188) "
      + "is the negative-concord / negative-polarity series. In this corpus it is essentially "
      + "always under a negator: ಅವನಿಗೆ ಏನೂ ಹೇಳೋದು ಬೇಡ \"he doesn't want to say anything\" (S35); "
      + "ಹೇಳೋಕೆ ಏನೂ ಉಳಿದಿಲ್ಲ \"I've got nothing left to say\" (S298); ನನಗೆ ಸ್ವಲ್ಪವೂ ಗೊತ್ತಿಲ್ಲ "
      + "\"I don't have the faintest idea\" (S260); ಇನ್ನೂ … ಬೇಡ \"don't want to … yet\" (S251). "
      + "(B) The -ಆದರೂ / -ಓ FREE-CHOICE series (ಏನಾದರೂ 'something/anything' 144, ಎಲ್ಲಾದರೂ "
      + "'anywhere' 62, ಏನೋ 'something' 180, ಯಾರೋ 'someone' 11 — note ಯಾರಾದರೂ "
      + "'someone/anyone' is expected in this series but does NOT occur in this corpus) is "
      + "specific-unknown / free-choice and is PERFECTLY FINE in a positive declarative meaning "
      + "'some-': ನಾನು ನಿಮ್ಮನ್ನ ಏನಾದರೂ ಕೇಳಬೇಕು \"I need to ask you something\" (S208); ನಿಮಗೆ "
      + "ಏನಾದರೂ ಹೇಳಬೇಕು \"I want to say something\" (S249). An -ಆದರೂ or -ಓ item in a positive "
      + "declarative is NEVER a violation, and must not be 'corrected' to an -ಊ form. So the only "
      + "thing the gate should treat as an NPI breach is an -ಊ item standing in a positive "
      + "declarative with no licenser anywhere in the clause. Two Kannada-specific warnings. "
      + "FIRST, the licenser is usually a BOUND SUFFIX on a clause-final verb (-ಇಲ್ಲ, -ಲಿಲ್ಲ, "
      + "-ಲ್ಲ, the question clitic -ಆ, the conditional -ದ್ರೆ), so there is no free 'not' / 'do' / "
      + "'if' word to find, and it comes AFTER the NPI: any left-to-right 'negator before the "
      + "NPI' test reports a false breach. Read the verb's fused polarity. SECOND, ಬೇಡ is a "
      + "negative in its own right (negative desiderative 'don't want / don't') with no -ಇಲ್ಲ in "
      + "it, and ಅಲ್ಲ is the nominal negator 'is not'; both license the -ಊ series.",
    licensedIn: [
      "Suffixal verbal negation -ಇಲ್ಲ (present/perfect: ಗೊತ್ತಿಲ್ಲ \"don't know\", ಅರ್ಥ ಆಗ್ತಿಲ್ಲ "
        + "\"don't understand\", ಉಳಿದಿಲ್ಲ 'nothing left') and its colloquial contraction -ಲ್ಲ "
        + "(ಆಗಲ್ಲ \"I'm not going to be able\" 133, ಅನಿಸಲ್ಲ \"doesn't seem\")",
      "Past negation -ಲಿಲ್ಲ / -ಿರಲಿಲ್ಲ (ಹೇಳಲಿಲ್ಲ \"didn't say\", ಇಷ್ಟ ಆಗಲಿಲ್ಲ \"didn't like it\", "
        + "ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ \"wasn't expecting\", ಬೇಕಿರಲಿಲ್ಲ \"didn't want\" 83)",
      "The negative existential / desiderative ಇಲ್ಲ ('there isn't', 'no' — 322) and ಬೇಡ "
        + "('don't want' — 242 as a standalone token; the prohibitive -ಬೇಡಿ occurs only fused to a "
        + "verb, ಚಿಂತಿಸಬೇಡಿ \"don't worry\" S282)",
      "The nominal negator ಅಲ್ಲ ('is not' — 95: ಸುಲಭ ಅಲ್ಲ \"isn't easy\"; ಸಮಸ್ಯೆ ಅಲ್ಲ \"is not a "
        + "problem\") and negated obligation ಬೇಕಾಗಿಲ್ಲ \"don't need to\" (97)",
      "Yes/no questions formed with the clitic -ಆ on the questioned constituent (ಬೇಕಾ? 725, "
        + "ಗೊತ್ತಾ? 100, ಇದ್ದೀರಾ?, ಮಾತಾಡಬಹುದಾ?) and wh-questions",
      "Conditional / counterfactual clauses in -ದ್ರೆ (spoken for -ದರೆ; 341 hits: ಗೊತ್ತಿದ್ದಿದ್ರೆ "
        + "\"if I had known\" S152, ಅವನಿಂದ ಆಗ್ತಿದ್ರೆ \"if he could\" S225, ನೀವು ಬಯಸಿದ್ರೆ \"if you "
        + "want\")",
      "The desiderative/deontic modal ಬೇಕು ('want / need / must') and the permissive-dubitative "
        + "-ಬಹುದು ('may / might / can': ಇರಬಹುದು \"I can stay\" S276, ಮುಖ್ಯವಾದದ್ದು ಇರಬಹುದು \"might "
        + "be something important\" S261)",
      "Comparatives in -ಗಿಂತ ('than') and superlative/scalar contexts (ಅತ್ಯಂತ, ಸಾಧ್ಯವಾದಷ್ಟು)",
      "Exclusive / restrictive focus ಮಾತ್ರ ('only') and 'before' clauses (ಮೊದಲು / ಮುಂಚೆ)",
      "Imperatives, hortatives and the temporal -ಾಗ 'when' clause (non-assertive contexts)",
    ],
  },

  // Negation markers — reference list for the agent, and the substring cue the brief-dialect
  // negation test uses. In Kannada negation is a BOUND SUFFIX, so most entries here are suffix
  // fragments, not free words. debut: ಇಲ್ಲ S12, ಬೇಡ S19, ಅಲ್ಲ S64, ಆಗಲಿಲ್ಲ S86.
  negation: [
    'ಇಲ್ಲ', 'ಿಲ್ಲ', 'ಲ್ಲ', 'ಲಿಲ್ಲ', 'ಿರಲಿಲ್ಲ', 'ಆಗಲ್ಲ', 'ಆಗಲಿಲ್ಲ', 'ಇರಲಿಲ್ಲ',
    'ಬೇಡ', 'ಬೇಡಿ', 'ಅಲ್ಲ', 'ಬೇಕಾಗಿಲ್ಲ', 'ಬೇಕಿರಲಿಲ್ಲ', 'ಗೊತ್ತಿಲ್ಲ', 'ಇಷ್ಟವಿಲ್ಲ',
  ],

  // Kannada machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'honorific_you', marker: 'ನೀವು / ನಿಮಗೆ', description: "Kannada 'you' in this course is uniformly honorific-plural ನೀವು (906 phrase hits, debut S1), dative ನಿಮಗೆ (857), accusative ನಿಮ್ಮನ್ನ, genitive ನಿಮ್ಮ, plus the composite ನೀವೆಲ್ಲ / ನೀವೆಲ್ಲರಿಂದ 'you all'. The familiar ನೀನು / ನಿನಗೆ / ನಿನ್ನ does not occur once in 15,784 rows. Licensed at ನೀವು's debut; the gate must accept ನೀವು and its case forms and the -ೀರಿ / -ತೀರಾ agreement for every English 'you'." },
    { id: 'dative_subject_experiencer', marker: 'ನನಗೆ … ಬೇಕು / ಗೊತ್ತು / ಅನಿಸುತ್ತೆ / ಇಲ್ಲ', description: "THE signature Kannada frame, and why ನನಗೆ is the corpus's commonest token (2,551). Experiencers, wanters, knowers and possessors take the DATIVE -ಗೆ, with no nominative subject at all: ನನಗೆ … ಬೇಕು \"I want / I need\" (S1), ನಿಮಗೆ ಗೊತ್ತಾ? \"do you know?\", ನನಗೆ ಅನಿಸುತ್ತೆ \"I think / it seems to me\" (391), ನನಗೆ ಇಷ್ಟ \"I like\", ಮುಂದಿನ ವಾರ ನನಗೆ ಸಾಕಷ್ಟು ಸಮಯ ಇಲ್ಲ \"next week I don't have enough time\" (S294), ನನಗೆ ಇಷ್ಟ ಆಗಲಿಲ್ಲ \"I didn't like it\" (S248). English uses a NOMINATIVE subject for all of these. Licensed at S1; ನಾನು and ನನಗೆ are one English 'I' and the choice between them is Kannada-internal, driven by the predicate." },
    { id: 'ಬೇಕು', marker: 'ಬೇಕು', description: "want / need to / have to / must — the desiderative-deontic modal, and the direct Kannada analogue of Tamil வேண்டும். 1,691 hits, debut S1. It is invariant machinery either standing after a dative subject (ನನಗೆ … ಬೇಕು 'I want') or suffixed to a verb stem (ಮಾಡಬೇಕು 'must/want to do' 175, ಮಾತಾಡಬೇಕು 122, ಹೇಳಬೇಕು 77, ಕೊಡಬೇಕು). ONE Kannada form covers want / need to / have to / must / would like — a large many-English→one-Kannada collapse. Must be licensed as a modal construction, not introduced as content, or it leaks unclassified into every seed." },
    { id: 'ಬೇಡ', marker: 'ಬೇಡ / ಬೇಡಿ', description: "don't want / don't — the NEGATIVE of ಬೇಕು, and a negator in its own right with no -ಇಲ್ಲ in it (242 hits, debut S19): ಅವಳಿಗೆ ಬೇಡ \"she doesn't want\", ನನಗೆ ಇನ್ನೂ ತಿಳಿದುಕೊಳ್ಳೋದು ಬೇಡ \"I don't want to find out yet\" (S251), prohibitive ಚಿಂತಿಸಬೇಡಿ \"don't worry\" (S282). Same modal machinery in negative polarity, and an NPI licenser. Its past is ಬೇಕಿರಲಿಲ್ಲ \"didn't want\" (83) and its deontic negative is ಬೇಕಾಗಿಲ್ಲ \"don't need to\" (97), ಬೇಕಿತ್ತು \"had to / wanted\" (333) being the past positive." },
    { id: 'ability_by_instrumental', marker: '-ಇಂದ … ಆಗುತ್ತೆ', description: "can / could / be able to — expressed NOT by an auxiliary but by putting the able person in the INSTRUMENTAL/ablative -ಇಂದ and using an impersonal 'it becomes': ಅವಳಿಂದ ಆಗುತ್ತೆ \"she could\" (S317), ಅವನಿಂದ ಆಗ್ತಿದ್ರೆ ಅವನು ನಿಮಗೆ ಉತ್ತರ ಕೊಡ್ತಿದ್ದ \"if he could he would give you an answer\" (S225), ನೀವೆಲ್ಲರಿಂದ ಹೋಗೋಕೆ ಆಗುತ್ತೆ \"you'll all be able to go\" (S668), negative ನನಗೆ ಆಗಲ್ಲ \"I'm not going to be able\". The English subject appears in Kannada as an oblique — so an English 'you can' has NO nominative counterpart in the prompt. License the case-shift with the construction; do not read the -ಇಂದ form as new vocabulary." },
    { id: 'ಬಹುದು', marker: '-ಬಹುದು', description: "may / might / can (permission and epistemic possibility) — a bound modal suffix on the verb stem, 212 hits: ಇರಬಹುದು \"I can stay\" (S276), ಮುಖ್ಯವಾದದ್ದು ಇರಬಹುದು \"might be something important\" (S261), ಮಾತಾಡಬಹುದಾ? \"can we talk?\" (S158, with the question clitic riding on it). Distinct from the -ಇಂದ ಆಗುತ್ತೆ ability construction: -ಬಹುದು is permission/possibility, ಆಗುತ್ತೆ is capability. Machinery, not content, and an NPI licenser." },
    { id: 'quotative_anta', marker: 'ಅಂತ / ಅನ್ನೋ', description: "ಅಂತ is the quotative complementizer that CLOSES an embedded clause — it follows the reported clause instead of preceding it as English 'that' does (1,972 hits, debut S8): ನಾನು ತುಂಬಾ ಮಾಡಿದ್ದೇನೆ ಅಂತ ಅನಿಸುತ್ತೆ \"I think I've done a lot\" (S89); ಅವನಿಗೆ ಏನು ಬೇಕು ಅಂತ ನಿಮಗೆ ಗೊತ್ತಾ? \"do you know what he wants?\" (S222). Its adnominal form is ಅನ್ನೋ (115). English routinely omits 'that' entirely, so ಅಂತ frequently has no English counterpart token at all. Pure grammatical glue, licensed once — but note it also carries embedded QUESTIONS, where English needs no complementizer either." },
    { id: 'question_clitic_aa', marker: '-ಆ', description: "Polar (yes/no) questions are formed by the interrogative clitic -ಆ agglutinated onto the questioned constituent, usually the clause-final verb: ನಿಮಗೆ ನನ್ನ ಜೊತೆ ಮಾತಾಡಬೇಕಾ? \"do you want to talk to me?\", ನಿಮಗೆ ಗೊತ್ತಾ? \"do you know?\", ನೀವು ಹೊರಡಬೇಕಾ? \"do you have to leave?\", ಅವರು ಮಾತಾಡ್ತಾರಾ? \"do they speak English?\". No do-support, no inversion. English do/does/did are absorbed by this clitic plus the verb's own tense and are NOT separate Kannada glosses. Licensed at the first -ಆ form; the clitic fuses with the preceding suffix (ಬೇಕು → ಬೇಕಾ), so the whole word looks new to the matcher." },
    { id: 'conditional_dre', marker: '-ದ್ರೆ', description: "Conditionals and counterfactuals are the bound verb suffix -ದ್ರೆ (spoken contraction of literary -ದರೆ), not an 'if' word — 341 hits: ನನಗೆ ಗೊತ್ತಿದ್ದಿದ್ರೆ \"if I had known\" (S152), ಆ ಹೆಂಗಸಿಂದ ಆಗ್ತಿದ್ರೆ ಅವಳು ನಿಮಗೆ ಹೇಳ್ತಿದ್ದಳು \"if she could she would tell you\" (S229), ನೀವು ಬಯಸಿದ್ರೆ \"if you want\". The counterfactual apodosis is itself a fused form (ಹೇಳ್ತಿದ್ದಳು 'she would tell', ಕೊಡ್ತಿದ್ದ 'he would give'). The agent must read the verb's mood; there is no free 'if'. Also a key NPI licenser. (Literary -ಇದ್ದರೆ occurs exactly once in this corpus — the register is spoken.)" },
    { id: 'temporal_aaga', marker: '-ಾಗ', description: "when / while — a bound temporal-clause subordinator -ಾಗ on a non-finite verb (354 hits), distinct from the interrogative ಯಾವಾಗ 'when': ನಾವು ಪಬ್‌ನಲ್ಲಿ ಇದ್ದಾಗ \"when we were in the pub\" (S118), ಅವಳು ನನ್ನನ್ನ ನೋಡಿದಾಗ \"when she saw me\" (S147), ಚೆನ್ನಾಗಿ ನಿದ್ದೆ ಮಾಡದಿದ್ದಾಗ \"when I didn't sleep well\" (S55 — note the negative -ದೆ inside the temporal clause). Subordinating machinery glued to the verb; license as one construction so a 'when'-clause is not mis-read as the interrogative." },
    { id: 'fused_tense_agreement', marker: '-ತೀನಿ / -ತೀರಿ / -ದೆ / -ದಳು / -ದ್ದೇನೆ', description: "Tense, person, number and gender are FUSED into the finite verb, so the subject pronoun is freely droppable: ಮಾಡ್ತೀನಿ 'I do', ಕೇಳ್ತೀನಿ 'I'll ask', ಹೇಳ್ತೀರಾ 'will you tell', ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing', ನೋಡಿದೆ 'I saw' (185), ಹೇಳಿದಳು 'she said' (79), ಕೊಡ್ತಿದ್ದ 'he would give', ಮಾಡಿದ್ದೇನೆ \"I've done\". English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will) is realised by ONE fused Kannada form, never by a separate auxiliary. This is one construction, licensed at the first finite verb (S1) — but be warned that it is the single largest source of apparent 'unknown gloss' hits, because every tense of a known verb is a different string." },
    { id: 'gender_number_agreement_3sg', marker: 'ಅವನು / ಅವಳು / ಅವರು', description: "Third person splits by gender AND respect: ಅವನು 'he' (540) / ಅವಳು 'she' (513) / ಅವರು 'they, or he/she honorific' (371), each with matching verb agreement (ಹೇಳಿದಳು 'she said' vs ಕೊಡ್ತಿದ್ದ 'he would give'). ಅವರು is genuinely ambiguous between plural 'they' and honorific singular — ಅವರು ಇಂಗ್ಲಿಷ್ ಮಾತಾಡ್ತಾರಾ? is 'do they speak English?' (S283). Licensed at each pronoun's debut; the honorific/plural ambiguity is a Kannada feature, not an English one." },
    { id: 'case_suffix_stacking', marker: '-ಗೆ / -ನ್ನ / -ಲ್ಲಿ / -ಇಂದ / -ಗಿಂತ', description: "Grammatical and oblique relations are BOUND suffixes agglutinated onto the noun, and they stack: dative -ಗೆ (5,642 hits — ನನಗೆ, ಕುಟುಂಬಕ್ಕೆ 'to the family'), accusative -ನ್ನ (2,957 — ಅದನ್ನ, ಪದಗಳನ್ನ), locative -ಲ್ಲಿ (1,824 — ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ 'in English', ಸಮಯದಲ್ಲಿ 'in time'), instrumental/ablative -ಇಂದ (506), comparative -ಗಿಂತ, plus the free postpositions ಜೊತೆ 'with', ಬಗ್ಗೆ 'about', ಮೇಲೆ 'on', ಹತ್ರ 'near'. English a / an / the / to / in / with / about / than have NO separate Kannada token — they are absorbed here and need no introduction. Mask the case-marked span as a unit; and see the header on ZWNJ, which sometimes strands these suffixes as standalone tokens." },
    { id: 'verbal_nouns', marker: '-ಓಕೆ / -ಓದು / -ಲು', description: "Three productive non-finite forms, all rendering as an English infinitive or gerund: purposive -ಓಕೆ (spoken; ಮಾಡೋಕೆ 'to do' 201, ಕಲಿಯೋಕೆ 'to learn' 88, ಹೇಳೋಕೆ 'to say', ಹೋಗೋಕೆ 'to go'), verbal noun -ಓದು (ಮಾಡೋದು 'doing' 88, ಮಾತಾಡೋದು 'talking' 84, ತಿಳಿದುಕೊಳ್ಳೋದು 'finding out'), and the literary/alternate infinitive -ಲು (ಮಾತಾಡಲು 111, ಬರಲು). One verb, three surface forms, one English 'to V' / 'V-ing'. Licensed as one construction at the first non-finite form (S1/S2)." },
    { id: 'spoken_register_contractions', marker: 'ಮಾಡೋಕೆ / ಹೇಳ್ತೀನಿ / ಆಗಲ್ಲ', description: "This course is authored in SPOKEN Kannada, and the spoken contractions are systematic: -ಓಕೆ for -ುವುದಕ್ಕೆ, -ತೀನಿ for -ುತ್ತೇನೆ, -ತ್ತೆ for -ುತ್ತದೆ (ಆಗುತ್ತೆ, ಅನಿಸುತ್ತೆ), -ಲ್ಲ for -ುವುದಿಲ್ಲ (ಆಗಲ್ಲ, ಅನಿಸಲ್ಲ), -ದ್ರೆ for -ದರೆ, -ನ್ನ for -ನ್ನು, ಅಂತ for ಎಂದು. This is a REGISTER, not an error, and it is the whole corpus. Two consequences: an inventory or word list built from literary Kannada will not match a single prompt here, and the exact-form matcher treats a spoken form and its literary equivalent as two unrelated words. License the register once; never 'correct' a spoken form to the literary one in content." },
    { id: 'negation_suffixal', marker: '-ಇಲ್ಲ / -ಲಿಲ್ಲ / -ಲ್ಲ / ಬೇಡ / ಅಲ್ಲ', description: "Negation is a BOUND SUFFIX on the clause-final verb, not a free word: present/perfect -ಇಲ್ಲ (ಗೊತ್ತಿಲ್ಲ, ಅರ್ಥ ಆಗ್ತಿಲ್ಲ, ಉಳಿದಿಲ್ಲ), past -ಲಿಲ್ಲ / -ಿರಲಿಲ್ಲ (ಹೇಳಲಿಲ್ಲ, ಆಗಲಿಲ್ಲ, ಇರಲಿಲ್ಲ), spoken contraction -ಲ್ಲ (ಆಗಲ್ಲ, ಅನಿಸಲ್ಲ), plus the free negative existential ಇಲ್ಲ, the negative desiderative ಬೇಡ / ಬೇಡಿ, and the nominal negator ಅಲ್ಲ 'is not'. 4,141 rows contain a -ಲ್ಲ-family string. This is ONE polarity construction licensed at ಇಲ್ಲ's debut (S12); each tense's negative form is the same construction, not new vocabulary. Because the negator is clause-final and bound, any check expecting a free 'not' before the verb finds nothing." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'honorificYouCollapse', rule: "ನೀವು / ನಿಮಗೆ / ನಿಮ್ಮ / ನಿಮ್ಮನ್ನ / ನೀವೆಲ್ಲ and the -ೀರಿ agreement all render as English 'you'. There is no familiar ನೀನು in this corpus, so 'you' is always honorific; never split the English into polite vs plural, and never treat a case form of ನೀವು as a new pronoun." },
    { id: 'dativeSubjectIsEnglishNominative', rule: "ನನಗೆ … ಬೇಕು → 'I want'; ನಿಮಗೆ ಗೊತ್ತಾ? → 'do you know?'; ನನಗೆ ಅನಿಸುತ್ತೆ → 'I think'; ನನಗೆ … ಇಲ್ಲ → \"I don't have\". The Kannada experiencer/possessor is DATIVE and the English subject is NOMINATIVE. ನಾನು and ನನಗೆ are one English 'I' — the case is chosen by the Kannada predicate, not by anything in the English. Never gloss ನನಗೆ as 'to me' inside these frames, and never read the missing nominative as a missing pronoun." },
    { id: 'bekuManyToOne', rule: "ONE ಬೇಕು covers English want / need to / have to / must / would like, and its negative ಬೇಡ covers don't want / don't / mustn't, ಬೇಕಾಗಿಲ್ಲ \"don't need to\", ಬೇಕಿತ್ತು 'had to / wanted', ಬೇಕಿರಲಿಲ್ಲ \"didn't want\". Many-English→one-Kannada. Record the intended English modal per carrier, so the same known prompt cannot license two different English modals — that would break ZUT on the target side." },
    { id: 'abilityChangesTheSubjectCase', rule: "English can / could / be able to is NP-ಇಂದ … ಆಗುತ್ತೆ — the able person goes into the instrumental and the verb is impersonal (ಅವಳಿಂದ ಆಗುತ್ತೆ 'she could'; ನೀವೆಲ್ಲರಿಂದ ಹೋಗೋಕೆ ಆಗುತ್ತೆ \"you'll all be able to go\"). So an English nominative subject corresponds to a Kannada oblique, and there is no auxiliary word to tile. Distinguish from -ಬಹುದು, which is may / might / can-as-permission." },
    { id: 'negationIsSuffixal', rule: "Negation is the bound -ಇಲ್ಲ / -ಲಿಲ್ಲ / -ಲ್ಲ on the clause-final verb, or the free ಇಲ್ಲ / ಬೇಡ / ಅಲ್ಲ. English don't / doesn't / didn't / isn't / won't / mustn't all map to whichever fused form the tense and mood dictate — one Kannada negative form per English negation. The negation cue is the presence of one of these forms, not a separate 'not' word, and it comes at the END of the clause. ಅಲ್ಲ negates a NOMINAL predicate ('is not easy') while -ಇಲ್ಲ negates a verbal one; the English 'not' is the same word for both." },
    { id: 'paravaagillaIsPositive', rule: "ಪರವಾಗಿಲ್ಲ contains the negative suffix -ಇಲ್ಲ but means \"no problem / that's fine\" — a POSITIVE reply. A substring negation test reads it as negated. Do not cite it as a negation licenser and do not gloss it with an English 'not'." },
    { id: 'questionByClitic', rule: "English do/does/did-support and copular questions correspond to the Kannada clitic -ಆ fused onto the questioned constituent (ಬೇಕಾ, ಗೊತ್ತಾ, ಮಾತಾಡ್ತಾರಾ). do/does/did are NOT separate Kannada glosses and must never be tiled as such; conversely a -ಆ-final prompt is a question even with declarative word order." },
    { id: 'quotativeAntaClosesTheClause', rule: "ಅಂತ (and adnominal ಅನ್ನೋ) is a quotative complementizer that FOLLOWS its clause, where English 'that' precedes — and English usually omits 'that' altogether. Free grammatical glue: never require an English 'that' for it, never treat its absence in English as a missing gloss, and never gloss it as a copula." },
    { id: 'fusedTenseNotAuxiliary', rule: "English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will, habitual 'would') is realised by a SINGLE fused Kannada finite form (ನೋಡಿದೆ 'I saw', ಮಾಡಿದ್ದೇನೆ \"I've done\", ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing', ಕೊಡ್ತಿದ್ದ 'he would give'). Do not tile English auxiliaries as separate Kannada tokens, and do not require each tense of a known verb to be introduced separately." },
    { id: 'spokenRegisterVariantsAreOneLexeme', rule: "ಮಾಡೋಕೆ / ಮಾಡೋದು / ಮಾಡಬೇಕು / ಮಾಡ್ತೀನಿ are forms of ONE verb; ಆಗಲ್ಲ is the spoken -ುವುದಿಲ್ಲ. The exact-form matcher sees them as unrelated strings, so most of its findings on this course are register/inflection artefacts rather than untaught vocabulary. Adjudicate accordingly, and keep the whole course in ONE register — mixing spoken and literary forms for the same lexeme is a real ZUT hazard (two known prompts, same English)." },
    { id: 'caseSuffixesAreGlue', rule: "English a / an / the / to / in / with / about / than are realised as Kannada bound case suffixes (-ಗೆ, -ನ್ನ, -ಲ್ಲಿ, -ಇಂದ, -ಗಿಂತ) inside a single token, or as the free postpositions ಜೊತೆ / ಬಗ್ಗೆ / ಮೇಲೆ / ಹತ್ರ. They are free on the known side and never need a separate introduced LEGO. Where ZWNJ has stranded a suffix as its own token (ನಲ್ಲಿ, ಗೆ, ಗಿಂತ, ನ) it is still glue, which is why those forms are in the free class." },
    { id: 'innuu', rule: "ಇನ್ನೂ (188) is polarity-conditioned: under a negator it is 'yet' (ಇನ್ನೂ … ಬೇಡ \"don't want to … yet\"), in a positive/additive clause it is 'still' or 'more' (ಇನ್ನೂ ಸ್ವಲ್ಪ ಹೊತ್ತು \"for a little longer\"). One Kannada form → two English renderings by polarity; needs a rendering rule so it is not ZUT-flagged as a collision. Same treatment as Tamil இன்னும்." },
    { id: 'enaadaruuVsEnuu', rule: "ಏನಾದರೂ (144) is 'something' — free-choice/specific-unknown, fine in a positive declarative (\"I need to ask you something\"). ಏನೂ (42) is 'anything/nothing' — the -ಊ NPI form, requiring a licenser. Likewise ಏನೋ 'something' vs ಯಾರೂ / ಯಾರಿಗೂ 'anyone/nobody'. These are DIFFERENT known items with different English renderings; do not normalise one series to the other, and do not treat the -ಆದರೂ / -ಓ series as NPIs." },
    { id: 'ondu', rule: "ಒಂದು is both the numeral 'one' and the indefinite article 'a/an' (ಒಂದು ಪದವನ್ನು = 'a word', not 'one word'), with the human classifier ಒಬ್ಬ / ಒಬ್ಬರು for people. One Kannada form → two English renderings; the article reading is glue and must not require the numeral's debut." },
    { id: 'avaruIsTheyOrHonorificHe', rule: "ಅವರು is 'they' AND honorific 3sg 'he/she'. Many-Kannada-readings→one-English-form in one direction and an ambiguity in the other: the English rendering must be fixed per prompt from the verb agreement and context, and the same known prompt must never be answerable as both 'they' and 'he'." },
  ],
};

// _lang_tel — LANGUAGE-LEVEL known-side brief for tel-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// The KNOWN/prompt language is Telugu. This is the AGENT-BRIEF dialect: freeClass / npi /
// npiLicensing / negation / knownConstructions / glossRules — no regexes, by design (Tom: "no
// regex for language — this is the agent's reference knowledge, NOT a regex gate config"; Kai's
// 2026-08-17 ruling that for these languages an exact-form matcher is TRIAGE, never pass/fail).
// isMechanicalContract() must return FALSE for this file. Adding freeGlue / negationMarkers /
// constructions[{id,test}] would flip it to mechanical and start BLOCKING submissions on
// morphology the matcher cannot read. Don't.
//
// ── WHAT THIS WAS CALIBRATED ON ──────────────────────────────────────────────────────
// eng_for_tel is the only tel-known course in the estate today (released, 668 seeds).
// Corpus tokenised with the live tokenizeKnown + stemKnownGloss (post-2026-08-17 Unicode fix):
//   • course_legos.known_text        1,504 rows →  3,526 tokens / 1,378 types
//   • course_practice_phrases.known 12,255 rows → 53,681 tokens / 2,372 types
// The free class is derived from the PHRASE corpus (53k tokens), which is what the gate reads.
// Note the type count: 2,372 distinct surface forms, the highest of the three Indic corpora I
// calibrated (mar 1,815 / kan 1,711), which is exactly what you would expect from the language
// with the longest agglutinative verb chains — see below.
// Debut seeds quoted below are the seed at which a form first appears as a LEGO or an M-LEGO
// component — the introduction point the gate actually uses.
//
// ── TYPOLOGICAL PROFILE AND WHAT IT MEANS FOR EXACT-FORM MATCHING ────────────────────
// Telugu (tel) is Dravidian — same family as Tamil and Kannada, so eng_for_tam.contract.cjs is the
// nearest model — and it is the most heavily agglutinating of the three in this estate:
// head-final (SOV), pro-drop, nominative-accusative (NOT ergative), bound case suffixes stacked on
// nouns, and tense + person + number + gender + polarity + modality all FUSED into a single finite
// verb. A whole English clause routinely arrives as ONE Telugu token:
//   మాట్లాడాలనుకుంటున్నాను = మాట్లాడ(speak) + ఆలి(must/want) + అను(quotative-think) +
//                            కుంటున్నాను(1sg-present-progressive-reflexive) = "I want to speak"
//   వెళ్ళగలుగుతారని           = "that you'll be able to go"
//   అనుకుంటున్నావా          = "do you think?" (with the question clitic on the end)
// Consequences for the matcher, in order of how much noise they cause:
//   1. FUSION MAKES EVERY CLAUSE A HAPAX. మాట్లాడటం 'speaking', మాట్లాడాలని 'wanting to speak',
//      మాట్లాడాలనుకుంటున్నాను "I want to speak", మాట్లాడుకోవచ్చా "can we talk?" are four unrelated
//      strings to an exact-form matcher and one verb to a learner. No stem-strip can recover this:
//      the endings are portmanteaux and the stem itself changes. `stemKnownGloss` therefore does no
//      stripping, and that is why a tel sweep is a triage list and not a verdict.
//   2. NEGATION IS A BOUND SUFFIX AND IT IS SUPPLETIVE. లేదు free ('there isn't', 'no'), -లేదు
//      bound (చూడలేదు "didn't see", తెలియలేదు "didn't know", మిగల్లేదు "nothing left"), కాదు for
//      NOMINAL predicates ("isn't easy"), తెలియదు "don't know" (a fused negative-habitual, 233
//      hits), వద్దు "don't want", లేకపోయింది, and a bare -ను on a 1sg habitual negative
//      (ఆనందించను "I don't enjoy", S55). One English 'not' → five or six unrelated Telugu shapes.
//   3. DATIVE SUBJECTS. Experiencers, knowers, likers, needers and possessors take the DATIVE:
//      నాకు is the second commonest token in the corpus (1,985 hits) because "I know", "I like",
//      "I need", "I feel", "I have" and "I don't have" are all నాకు … frames. English uses a
//      nominative subject for every one of them, so నేను (3,314) and నాకు are one English 'I'.
//   4. TELUGU MAKES TWO DISTINCTIONS ENGLISH DOES NOT, both live in this corpus:
//      • 2sg familiar నువ్వు (1,264) vs honorific/plural మీరు (92) — and note the honorific debuts
//        VERY late (S501) while the familiar debuts at S11, so a prompt using మీరు before S501 is
//        a real ordering question, not noise. మీరందరూ 'you all' (77) is a third, separate lexeme.
//      • 1pl INCLUSIVE మనం (386, 'we including you') vs EXCLUSIVE మేము (233, 'we not including
//        you'). Both are English 'we'. This is a genuine many-Telugu→one-English collapse and the
//        prompt carries information the English cannot.
//
// ── ZWNJ: A REAL TOKENISATION DISTORTION IN THIS CORPUS ──────────────────────────────
// 39 of a 1,000-phrase sample carry U+200C ZERO WIDTH NON-JOINER between a Latin-script loanword
// and its Telugu case suffix. ZWNJ is neither \p{L} nor \p{M}, so tokenizeKnown SPLITS there:
//   ఇంగ్లీష్‌లో ("in English") → ["ఇంగ్లీష్", "లో"];  రెస్టారెంట్‌కి → ["రెస్టారెంట్", "కి"]
// Across the whole phrase corpus the stranded tails are లో (171), కి (28), గా (26), కార్డులు (18),
// బాల్ (15), లు (8), కేసు (6), కేసును (5), కార్డుల (2), తో (2). This manufactures ~230 standalone
// bare-case-suffix tokens that would otherwise never exist — and it MATTERS here more than in
// Kannada, because the stranded suffixes debut late as legos: లో debuts S4, but కి debuts only at
// S156 and గా only at S474, so a ZWNJ-stranded కి or గా in an early seed reads as
// "not introduced until 156/474" — a pure tokenisation artefact that would otherwise look like a
// hard vocab breach. లో, కి, గా, లు and తో are therefore in the free class as bound case/plural
// markers. (కార్డులు, బాల్, కేసు are loanword STEMS split off their suffixes and are left out:
// they are content.)
// No parenthetical/authoring tags are baked into this corpus — 0 of 1,504 lego rows carry brackets
// or an `introduce` directive in known_text. The recorded tag leakage for "tel" is REAL but it is
// on the other side of the mirror: 822 of 1,657 tel_for_eng lego rows carry "(obj)" / "(gerund)"
// style tags in their ENGLISH known_text. That is an eng-known course and none of it touches the
// frequencies above.
//
// ── HONEST GAPS: TOKENS I DID NOT PUT IN THE FREE CLASS, AND WHY ─────────────────────
// High-frequency but LEXICAL, each with a real debut, so classing them free would hide breaches:
// తెలుసు (605, 'known' — carrier of the నాకు తెలుసు frame), ఖచ్చితంగా (393, 'definitely/sure'),
// ఇష్టం (261, 'liked'), అవసరం (343, 'need'), సిద్ధంగా (354, 'ready'), సహాయం (322, 'help'), పని
// (279, 'work'), ఆలోచన (105, 'idea'). Temporal and deictic adverbs are OUT too even though they
// behave like glue — ఇప్పుడు (454), ఇక్కడ (404), ఇవాళ (334), మళ్ళీ (248), రాత్రి (134) — because
// each has a debut seed here and freeing them would silently license "tonight" before it was taught.
// Tokens I could NOT confidently classify, and left OUT rather than guess:
//   • ఇంకా (296) is at least THREE things in this corpus — 'still', 'yet', 'more', AND the
//     coordinating 'and' (the lego "ఇంకా | and" is explicit). A conjunction reading argues for the
//     free class and an aspectual/NPI reading argues against, so it is in `npi` with a rendering
//     rule instead, and flagged here as the least settled call in this file.
//   • అని / అనుకోవడం / అనిపించడం (362 / 181 / 76) — the quotative complementizer అని is glue, but
//     its stem అను- also heads the lexical verbs 'think' and 'feel/seem', and the surface forms
//     overlap heavily (అనుకుంటున్నాను 'I think', అనిపిస్తోంది 'I feel'). అని is in the free class;
//     the అను-verbs are not, and separating them by surface form alone is not fully reliable.
//   • ఉంది / ఉన్నాను / ఉన్నాడు / ఉంటుంది (657 / 122 / 65 / …) — the existential-copula ఉండు, which
//     is simultaneously 'is', the possessive 'have' (నాకు … ఉంది), a future/habitual auxiliary and
//     part of the -ాల్సి ఉంది obligation frame. The finite forms are in the free class as copula
//     machinery, but the boundary with the lexical 'stay/remain' reading is genuinely fuzzy.
//   • లేదో (119, 'or not') and ఏమిటో / చెప్పాలో / ఉందో (72 / 68 / …) — the -ఓ embedded-question
//     suffix. It is machinery, but it only ever appears fused to a verb, so per-carrier licensing
//     is safer than an always-free classing. Described as a construction instead.
//   • బహుశా (102, 'maybe'), దాదాపు (4, 'almost'), కేవలం (3, 'only') — modal adverbs; బహుశా is
//     frequent enough to argue for glue but it is a real lexical item with a debut, so it is OUT.
//
// ── HOW TO READ A SWEEP OF THIS CONTRACT ─────────────────────────────────────────────
// Every finding is TRIAGE. The gate is seed-granular, so an intra-seed ordering violation passes
// clean and must still be checked by hand. Expect the overwhelming majority of "unknown gloss" hits
// to be fused verb forms of an introduced verb — Telugu is the worst of the three for this — with
// case-stacked forms of introduced nouns second and ZWNJ artefacts third.
module.exports = {
  course_code: null,          // language-level: serves every tel-known course
  ratified: null,             // advisory until adversarially verified against a real build
  known_lang: 'tel',
  known_lang_name: 'Telugu',

  // Free class — Telugu closed-class function words, corpus-derived from eng_for_tel phrase
  // prompts. Pronouns are listed in every case form the corpus attests, because the matcher cannot
  // relate నేను to నాకు to నన్ను. EVERY entry below was checked to occur as a standalone token in
  // this corpus (tokenizeKnown over all 13,759 lego+phrase rows); candidates that scored 0 —
  // వాళ్ళకి, మిమ్మల్ని — were dropped rather than carried on intuition, and the 3pl dative is
  // therefore not represented here even though the language obviously has one.
  freeClass: [
    // personal pronouns — nominative (note BOTH 2sg registers and BOTH 1pl are real here)
    'నేను', 'మేము', 'మనం', 'నువ్వు', 'మీరు', 'మీరందరూ', 'అతను', 'ఆమె', 'వాళ్ళు', 'అది', 'ఇది', 'తాను',
    // dative (-కు / -కి) — the case of experiencers, knowers, likers, needers, possessors
    'నాకు', 'నీకు', 'మాకు', 'మీకు', 'మనకు', 'అతనికి', 'ఆమెకు', 'అందరికీ',
    // accusative (-ని / -ను)
    'నన్ను', 'నిన్ను', 'మమ్మల్ని', 'దాన్ని', 'వాటిని', 'ఆమెను', 'అతన్ని',
    // genitive
    'నా', 'నీ', 'మా', 'మీ', 'తన', 'దాని', 'అతని',
    // comitative / ablative pronoun forms
    'నీతో', 'నాతో', 'దానితో',
    // demonstratives / deictic determiners
    'ఆ', 'ఈ', 'అదే', 'ఇదే', 'అలా', 'ఇలా',
    // determiners / quantifiers / degree
    'ఒక', 'కొన్ని', 'అన్నీ', 'చాలా', 'ఎక్కువ', 'కొంచెం', 'అంత', 'ఇంత', 'మరీ', 'వేరే', 'మరో',
    // existential-copula machinery (finite forms of ఉండు — 'is' / 'have' / future-habitual aux)
    'ఉంది', 'ఉన్నాను', 'ఉన్నాడు', 'ఉన్న', 'ఉంటుంది', 'ఉండింది',
    // conjunctions, quotative complementizer, discourse glue
    'కానీ', 'ఎందుకంటే', 'కాబట్టి', 'అని', 'అవును', 'కూడా',
    // free postpositions (the bound ones are suffixes — see case_suffix_stacking)
    'గురించి', 'కోసం', 'కంటే', 'నుంచి', 'కలిసి', 'తర్వాత',
    // interrogatives (closed-class machinery, though each debuts as a wh-LEGO)
    'ఏం', 'ఎవరు', 'ఎక్కడ', 'ఎప్పుడు', 'ఎలా', 'ఎంత', 'ఎందుకు',
    // bound case / plural markers stranded as standalone tokens by ZWNJ in this corpus (header)
    'లో', 'కి', 'గా', 'లు', 'తో',
  ],

  // NPI / polarity items — the -ఊ / -ఈ series plus the aspectual ఇంకా. A violation is one of these
  // in a plain POSITIVE DECLARATIVE with no licenser. The -ఐనా / -ఓ free-choice series is
  // deliberately NOT here.
  npi: ['ఏమీ', 'ఎవరూ', 'ఎవరికీ', 'ఎక్కడా', 'ఇంకా', 'ఏ'],
  npiLicensing: {
    rule: "Telugu, like Tamil and Kannada, builds indefinites by suffixing a particle to a wh-word, "
      + "and the particle decides the polarity — so the rule must be stated per series. (A) The "
      + "-ఊ / -ఈ SERIES (ఏమీ 'anything/nothing' 21, ఎవరూ / ఎవరికీ 'anyone/nobody' 32, ఎక్కడా "
      + "'anywhere', and the bare determiner ఏ 'any') is the negative-concord / negative-polarity "
      + "series and in this corpus it is essentially always under a negator: నేను చెప్పడానికి ఏమీ "
      + "మిగల్లేదు \"I have nothing left to say\" (S298); నేను పెద్దగా ఏమీ చేయలేదు \"I didn't do "
      + "much\" (S218); ఎవరికీ వినిపించాలని \"to let anyone hear\" (S71); నీ స్నేహితురాలి నుంచి "
      + "నాకు ఏ కబురు రాలేదు \"I haven't heard anything from your girlfriend\" (S267). The "
      + "aspectual ఇంకా 'yet/still' belongs here for licensing purposes but see the ఇంకా rendering "
      + "rule — it is also a plain conjunction 'and' in this corpus, which no other Indic brief in "
      + "this set has to deal with, and in that use it is NOT an NPI at all. (B) The -ఐనా / -ఓ "
      + "FREE-CHOICE series (ఏదైనా 'something/anything' 167, ఎక్కడైనా 'anywhere' 66, "
      + "ఎవరితోనైనా 'with someone/anyone' 93, ఏదో 'something' 85, ఎవరో 'someone') is "
      + "specific-unknown / free-choice and is PERFECTLY FINE in a positive declarative meaning "
      + "'some-': నేను ఏదో కొత్తది చదవాలని ఉంది \"I'd like to read something new\" (S180); నీకు "
      + "ఏదైనా చూపించాలి \"to show you something\". An -ఐనా or -ఓ item in a positive declarative is "
      + "NEVER a violation and must not be 'corrected' to an -ఊ form. So the only thing the gate "
      + "should treat as an NPI breach is an -ఊ/-ఈ item (or ఏ) standing in a positive declarative "
      + "with no licenser anywhere in the clause. Two Telugu-specific warnings. FIRST, the "
      + "licenser is nearly always a BOUND SUFFIX on the clause-final verb (-లేదు, -దు, -ను, the "
      + "question clitic -ఆ, the conditional -ితే), so there is no free 'not' / 'do' / 'if' word "
      + "to find, and it comes AFTER the NPI — any left-to-right 'negator before the NPI' test "
      + "reports a false breach. Read the verb's fused polarity. SECOND, the negator may be "
      + "SUPPLETIVE rather than affixal: కాదు negates a nominal predicate, తెలియదు is a fused "
      + "negative-habitual 'don't know', వద్దు is 'don't want'. None of them contain లేదు.",
    licensedIn: [
      "Free and bound verbal negation లేదు / -లేదు ('there isn't', 'no', and the past/perfect "
        + "negative: చూడలేదు \"didn't see\", తెలియలేదు \"didn't know\", మిగల్లేదు 'nothing left', "
        + "అనుకోలేదు \"didn't think\", లేకపోయింది 'there wasn't')",
      "The nominal negator కాదు ('is not' — 202: మాట్లాడటం సాధన చేయడం తేలిక కాదు \"it isn't easy "
        + "to practise speaking\" S228; అది కాదు \"that wasn't it\" S151)",
      "The fused negative-habitual -దు / -ను (తెలియదు \"don't know\" 233; ఆనందించను \"I don't "
        + "enjoy\" S55 — a bare 1sg negative with no లేదు in it at all)",
      "The negative desiderative వద్దు ('don't want', 'no thank you' — 41: నాకు విశ్రాంతి వద్దు "
        + "\"I don't want a rest\" S473)",
      "Yes/no questions formed with the clitic -ఆ on the clause-final verb (871 rows: "
        + "చెప్పగలవా? \"can you tell me?\", గడిపావా? \"did you have a good time?\", ఉందా? "
        + "'is it?', ఇబ్బందా? \"do you mind?\", మాట్లాడుకోవచ్చా? \"can we talk?\") and wh-questions",
      "Embedded questions in -ఓ ('whether/what': ఏం చెప్పావో \"what you said\", ఎంత వయసు ఉందో "
        + "\"how old he is\", ఉందో లేదో 'whether or not') — non-assertive contexts",
      "Conditional / counterfactual clauses in -ితే and ఉంటే (నేను నిన్ను అడిగితే \"if I asked "
        + "you\" S190/S203; నువ్వు నాకు చెప్పి ఉంటే \"if you'd told me\"; అతనికి వీలైతే \"if he "
        + "could\" S225)",
      "The obligation/volitional -ాలి / -ాలని / -ాల్సి ఉంది ('must / want to / have to') and the "
        + "ability -గల ('can / be able to')",
      "The permissive -వచ్చు ('may / can': మాట్లాడుకోవచ్చా \"can we talk?\") and the epistemic "
        + "-ఏమో with బహుశా ('might': ఆలస్యం అవుతానేమో \"I might be late\" S270)",
      "Comparatives with కంటే ('than' — 190) and superlative/scalar contexts",
      "Imperatives, hortatives (మాట్లాడుకుందాం \"let's talk\") and the negative gerund -కుండా "
        + "('without': వాదించుకోకుండా 'without arguing')",
    ],
  },

  // Negation markers — reference list for the agent, and the substring cue the brief-dialect
  // negation test uses. In Telugu negation is BOUND and SUPPLETIVE, so most entries here are
  // suffix fragments or whole suppletive forms, not free words.
  // debut: లేదు S12, తెలియదు S10, కాదు S64, వద్దు S173.
  negation: [
    'లేదు', 'లేద', 'లేకపోయింది', 'లేకుండా', 'కాదు', 'తెలియదు', 'తెలియలేదు', 'వద్దు',
    'చేయలేదు', 'చూడలేదు', 'అనుకోలేదు', 'మిగల్లేదు', 'కుండా', 'ఆనందించను',
  ],

  // Telugu machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'two_way_you', marker: 'నువ్వు / మీరు', description: "Telugu is the ONE language in this Indic set whose corpus uses both 2sg registers: familiar నువ్వు (1,264 rows, debut S11) and honorific/plural మీరు (92 rows, debut S501), plus the composite మీరందరూ 'you all' (77) which is a separate lexeme again. Dative నీకు (478) / మీకు (55), accusative నిన్ను / మిమ్మల్ని, genitive నీ / మీ, comitative నీతో. Both render as English 'you' (ZUT many-Telugu→one-English). Because the honorific debuts 490 seeds after the familiar, a మీరు form appearing before S501 is a genuine ordering question and NOT just morphological noise — worth checking by hand rather than dismissing." },
    { id: 'inclusive_exclusive_we', marker: 'మనం / మేము', description: "Two 1pl pronouns: INCLUSIVE మనం ('we, including you' — 386, debut S18: మనం వేరే ఏదైనా గురించి మాట్లాడుకోవచ్చా? \"can we talk about something else?\" S158) and EXCLUSIVE మేము ('we, not you' — 233, debut S107: మేము మంగళవారం బయలుదేరాల్సి వచ్చింది \"we had to leave on Tuesday\" S455). Both are English 'we'. Licensed at each pronoun's debut; the inclusion feature is carried by the prompt and has no English counterpart, so it must never be turned into an English distinction — nor may an English 'we' be tiled by whichever form happens to have debuted." },
    { id: 'dative_subject_experiencer', marker: 'నాకు … తెలుసు / ఇష్టం / అవసరం / ఉంది / లేదు', description: "THE signature Telugu frame, and why నాకు is the second commonest token in the corpus (1,985). Experiencers, knowers, likers, needers and POSSESSORS take the dative -కు/-కి with no nominative subject: నాకు తెలుసు \"I know\" (605), నాకు ఇష్టం \"I like\", నాకు … అవసరం \"I need\", నాకు అనిపిస్తోంది \"I feel\", నాకు ఒక ముఖ్యమైన సమావేశం ఉంది \"I have an important meeting\" (S277), నాకు సమాధానం లేదు \"I don't have the answer\" (S260), నాకు తెలియదు \"I don't know\", నీకు ఇబ్బందా? \"do you mind?\". English uses a NOMINATIVE subject for every one. Licensed at S10; నేను and నాకు are one English 'I', and the choice is made by the Telugu predicate." },
    { id: 'possession_by_dative_existential', marker: 'నాకు … ఉంది / లేదు', description: "There is no verb 'to have'. Possession is dative-possessor + the existential ఉంది ('there is to me'), negated with లేదు: నాకు … ఉంది \"I have\", నాకు లేదు \"I don't have\" (S260). English 'have / haven't got / don't have' therefore corresponds to a case frame plus an existential, never to a possessive verb — and the SAME ఉంది is also plain 'is'. License with the dative-subject construction; do not tile an English 'have' onto anything." },
    { id: 'volitional_and_obligation', marker: '-ాలి / -ాలని / -ాల్సి ఉంది / అవసరం / కావాలి', description: "One tightly-related family covers English want to / would like to / must / should / have to / need to: the bound -ాలి obligative (ఆలోచించాలి \"I should consider\", పని చేయాలి \"we must work\"), the -ాలని volitional (చెప్పాలని 'wanting to say', తెలుసుకోవాలని 'wanting to know', చదవాలని ఉంది \"I'd like to read\"), the fused desiderative -ాలనుకుంటున్నాను (మాట్లాడాలనుకుంటున్నాను \"I want to speak\" — the S1 carrier), -ాల్సి ఉంది / -ాల్సి వచ్చింది 'have to / had to' (వెళ్ళాల్సి రాకముందే \"before I have to go\" S25; బయలుదేరాల్సి వచ్చింది \"had to leave\"), the nominal అవసరం 'need' (343, debut S44) and కావాలి 'want/need' (96). Many-English→one-Telugu and one-English→many-Telugu both happen here. Deontic/volitional machinery, not content." },
    { id: 'ability_gala', marker: '-గల', description: "can / could / be able to — the bound ability infix -గల on the verb stem, 763 rows: నాకు చెప్పగలవా? \"can you tell me?\" (S150), ఎదురుచూడగలవా? \"can you wait?\" (S155), నా పేరు గుర్తుంచుకోగలవా? \"can you remember my name?\", వెళ్ళగలుగుతారని \"that you'll be able to go\" (S668), నమ్మగలిగితే \"if I could believe\" (S501). Unlike Kannada, which shifts the subject into the instrumental, Telugu keeps a nominative subject and infixes the ability — but there is still NO auxiliary word for the matcher to find. Machinery, and an NPI licenser." },
    { id: 'permissive_vachchu', marker: '-వచ్చు', description: "may / can (permission) and 'could' in invitations — the bound modal -వచ్చు (274 rows): మనం … మాట్లాడుకోవచ్చా? \"can we talk about something else?\" (S158). Distinct from -గల ability. Its epistemic neighbour is -ఏమో with బహుశా 'maybe' (ఆలస్యం అవుతానేమో \"I might be late\" S270). Machinery, not content." },
    { id: 'quotative_ani', marker: 'అని / -ని', description: "అని is the quotative complementizer that CLOSES an embedded clause — it follows the reported clause, where English 'that' precedes it, and English usually omits 'that' altogether (362 rows as a standalone token, and it also fuses: మేము స్నేహితులమని \"that we're friends\", మీరు ఆడతారని \"that you'd play\", వెళ్ళగలుగుతారని \"that you'll be able to go\"). Also heads reported speech and thought (అని దిగులు పడుతున్నాను \"I'm worried that…\" S270). Pure grammatical glue, licensed once (debut S44). CAUTION for the agent: the same అను- stem heads the lexical verbs 'think' (అనుకుంటున్నాను) and 'feel/seem' (అనిపిస్తోంది), which are NOT glue — see the header's honest-gaps note." },
    { id: 'embedded_question_o', marker: '-ఓ', description: "Embedded questions and 'whether' clauses are formed with the bound -ఓ on the clause-final verb, not with a complementizer word: నువ్వు ఏం చెప్పావో నాకు చెప్పగలవా? \"can you tell me what you said?\" (S150), అతనికి ఎంత వయసు ఉందో \"how old he is\" (S420), ఏమిటో 'what it is' (72), చెప్పాలో 'what to say' (68), ఉందో లేదో 'whether or not' (లేదో 119). English uses a wh-word or 'whether' plus normal word order; Telugu marks it on the verb. Subordinating machinery, licensed as one construction — and a non-assertive (NPI-licensing) context." },
    { id: 'question_clitic_aa', marker: '-ఆ', description: "Polar (yes/no) questions are formed by the interrogative clitic -ఆ agglutinated onto the clause-final verb (871 rows): నువ్వు బాగా గడిపావా? \"did you have a good time?\" (S214), నువ్వు ముగించాల్సి వచ్చిందా? \"did you have to finish?\", నీకు ఏదైనా కబురు వచ్చిందా? \"have you heard anything?\", అనుకుంటున్నావా? \"do you think?\", ఇబ్బందా? \"do you mind?\". No do-support, no inversion. English do/does/did are absorbed by the clitic plus the verb's own tense and are NOT separate Telugu glosses. The clitic fuses with the preceding suffix, so the whole word looks new to the matcher." },
    { id: 'conditional_ite', marker: '-ితే / ఉంటే', description: "Conditionals and counterfactuals are bound verb suffixes, not an 'if' word: -ితే (95 rows: అడిగితే \"if I asked\" S190/S203, వీలైతే \"if he could\" S225, నమ్మగలిగితే \"if I could believe\" S501) and the periphrastic … ఉంటే (30: చెప్పి ఉంటే \"if you'd told me\"). The counterfactual apodosis is itself a fused habitual-past (చేసేవాడు 'he would do', ఇచ్చేవాడు 'he would give' — 210 rows of -ేవా forms). The agent must read the verb's mood; there is no free 'if'. A key NPI licenser." },
    { id: 'habitual_past_would', marker: '-ేవాడు / -ేవాళ్ళు', description: "English 'would' (habitual past and counterfactual consequent) and 'used to' are a single fused Telugu form -ేవాడు / -ేవాళ్ళు / -ేవారు, agreeing in gender and number: అతను నీకు సహాయం చేసేవాడు \"he would help you\" (S225), ఒక సమాధానం ఇచ్చేవాడు \"he would give an answer\". Not an auxiliary — one form, one English modal band. Licensed as a tense/mood construction." },
    { id: 'fused_tense_agreement', marker: '-ాను / -ావు / -ాడు / -ింది / -ారు / -తున్నాను', description: "Tense, person, number, gender and progressive aspect are FUSED into the finite verb, so the subject pronoun is freely droppable: చూశాను 'I saw' (126), కలిశాను 'I met' (77), చెప్పాడు 'he said' (71), చెప్పింది 'she said / what she said' (127), చెప్పారు 'they said', ఉన్నాను 'I am', ప్రయత్నిస్తున్నాను \"I'm trying\" (99), అనుకుంటున్నాను \"I think\" (283), వచ్చింది 'it came'. English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will) is realised by ONE fused Telugu form, never by a separate auxiliary. One construction, licensed at the first finite verb (S1) — and the single largest source of apparent 'unknown gloss' hits, because every tense of a known verb is a different string." },
    { id: 'gender_number_agreement_3sg', marker: 'అతను / ఆమె / వాళ్ళు', description: "Third person: masculine అతను 'he' (819) / feminine ఆమె 'she' (771) / plural-or-honorific వాళ్ళు 'they' (697), with matching verb agreement (చెప్పాడు 'he said' vs చెప్పింది 'she said' vs చెప్పారు 'they said'), plus the reflexive/anaphoric తాను / తన 'self, his/her own' (114 / 73). Licensed at each pronoun's debut. Note that the FEMININE 3sg and the NEUTER 3sg share the -ఇంది ending, so చెప్పింది is 'she said' or 'it said / what was said' depending on context — an ambiguity English does not have." },
    { id: 'case_suffix_stacking', marker: '-కు/-కి / -ని / -లో / -తో / -నుంచి / కంటే', description: "Grammatical and oblique relations are BOUND suffixes agglutinated onto the noun, and they stack: dative -కు/-కి (3,103 rows — నాకు, కుటుంబానికి 'to the family', ఇంటికి 'home'), accusative -ని/-ను (3,657 — దాన్ని, పదాన్ని), locative -లో (1,149 — ఇంగ్లీష్‌లో 'in English', సమయంలో 'in time'), comitative -తో (1,057 — నీతో 'with you'), ablative నుంచి, adverbial -గా (సంతోషంగా 'happily', సిద్ధంగా 'ready'), plural -లు, plus the free postpositions గురించి 'about', కోసం 'for', కంటే 'than', కలిసి 'together with'. English a / an / the / to / in / with / about / than / of have NO separate Telugu token — they are absorbed here and need no introduction. Mask the case-marked span as a unit; and see the header on ZWNJ, which strands some of these suffixes as standalone tokens." },
    { id: 'verbal_nouns', marker: '-డం / -డానికి / -ఆలని', description: "Productive non-finite forms, all rendering as an English infinitive or gerund: the verbal noun -డం (మాట్లాడటం 'speaking' 169, చేయడం 'doing', నేర్చుకోవడం 'learning', అనుకోవడం 'thinking'), the purposive -డానికి (చెప్పడానికి 'to say' 84, చేయడానికి 'to do', నేర్చుకోవడానికి 'to learn'), and the volitional -ాలని (చెప్పాలని, చేయాలని). One verb, three-plus surface forms, one English 'to V' / 'V-ing'. Licensed as one construction at the first non-finite form (S1/S2)." },
    { id: 'negation_suffixal_and_suppletive', marker: 'లేదు / -లేదు / కాదు / తెలియదు / వద్దు / -ను', description: "Negation is BOUND and SUPPLETIVE, never a free pre-verbal 'not': free లేదు 'there isn't / no' (619) and bound -లేదు for the past/perfect (చూడలేదు, తెలియలేదు, అనుకోలేదు, మిగల్లేదు, చేయలేదు); కాదు for a NOMINAL predicate ('isn't easy' — 202); the fused negative-habitual -దు / -ను (తెలియదు \"don't know\" 233; ఆనందించను \"I don't enjoy\" S55, which contains no లేదు at all); వద్దు 'don't want' (41); లేకపోయింది 'there wasn't'; and the negative gerund -కుండా 'without'. One polarity construction, licensed at లేదు's debut (S12) — but the agent must recognise the suppletive members, because a substring search for లేదు finds neither కాదు nor తెలియదు nor వద్దు nor ఆనందించను. Because the negator is clause-final and bound, any check expecting a free 'not' before the verb finds nothing." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'youTwoRegistersOneEnglish', rule: "నువ్వు (familiar) and మీరు (honorific/plural) and their case forms (నీకు/మీకు, నిన్ను/మిమ్మల్ని, నీ/మీ, నీతో) all render as English 'you'; మీరందరూ is 'you all'. Many-Telugu→one-English: the register is a feature of the prompt, not an English distinction, so never invent a polite-vs-plural English contrast. In the reverse direction hold it constant per carrier — a single English 'you' prompt must not be answerable with either register at will." },
    { id: 'weInclusiveExclusiveCollapse', rule: "మనం (inclusive) and మేము (exclusive) are both English 'we'. Many-Telugu→one-English; the inclusion of the addressee is carried by the Telugu and lost in the English. Keep both carriers, do not manufacture an English contrast, and do not let an English 'we' be tiled by whichever form is introduced." },
    { id: 'dativeSubjectIsEnglishNominative', rule: "నాకు తెలుసు → 'I know'; నాకు ఇష్టం → 'I like'; నాకు … అవసరం → 'I need'; నీకు ఇబ్బందా? → 'do you mind?'; నాకు … ఉంది → 'I have'; నాకు లేదు → \"I don't have\". The Telugu experiencer/possessor is DATIVE and the English subject is NOMINATIVE. నేను and నాకు are one English 'I' — the case is chosen by the Telugu predicate, not by anything in the English. Never gloss నాకు as 'to me' inside these frames, and never read the missing nominative as a missing pronoun." },
    { id: 'noVerbToHave', rule: "English have / has / had / haven't got maps onto dative-possessor + ఉంది / లేదు, and the very same ఉంది is also plain 'is'. So 'have' has no Telugu word: do not tile one, and do not treat ఉంది as ambiguous vocabulary — it is copula machinery whose English rendering is fixed by the frame it sits in." },
    { id: 'obligationVolitionalManyToOne', rule: "-ాలి / -ాలని / -ాలనుకుంటున్నాను / -ాల్సి ఉంది / అవసరం / కావాలి all fall in the English want to / would like to / should / must / have to / need to band, and English 'need to' maps back to అవసరం or -ాల్సి ఉంది depending on whether the need is a state or an imposed requirement. Record the intended English modal per carrier so one known prompt cannot license two English modals — that would break ZUT on the target side." },
    { id: 'abilityIsInfixed', rule: "English can / could / be able to is the bound -గల infix on the verb (చెప్పగలవా 'can you tell', వెళ్ళగలుగుతారని \"that you'll be able to go\"), with -వచ్చు for permission. There is no auxiliary word to tile, and the English tense comes from the fused ending, not from a separate 'could'." },
    { id: 'negationIsSuffixalAndSuppletive', rule: "Negation is bound and suppletive: -లేదు (verbal past/perfect), లేదు (existential), కాదు (nominal predicate), -దు/-ను (negative habitual), వద్దు (desiderative), -కుండా (negative gerund). English don't / doesn't / didn't / isn't / haven't / won't / mustn't all map to whichever form the predicate type, tense and mood dictate — one Telugu negative form per English negation. Do NOT treat కాదు and లేదు as interchangeable: కాదు negates 'X is Y', లేదు negates existence or a verbal event, and choosing the wrong one is a real content error, not a stylistic one." },
    { id: 'questionByClitic', rule: "English do/does/did-support and copular questions correspond to the Telugu clitic -ఆ fused onto the clause-final verb (గడిపావా, వచ్చిందా, అనుకుంటున్నావా). do/does/did are NOT separate Telugu glosses and must never be tiled as such; conversely a -ఆ-final prompt is a question even with declarative word order." },
    { id: 'quotativeAniClosesTheClause', rule: "అని (and its fused -ని) is a quotative complementizer that FOLLOWS its clause, where English 'that' precedes — and English usually omits 'that' altogether. Free grammatical glue: never require an English 'that' for it, never treat its absence in English as a missing gloss, and never gloss it as a copula. Keep it distinct from the lexical అను- verbs 'think' and 'feel'." },
    { id: 'embeddedQuestionMarkedOnTheVerb', rule: "English 'what you said' / 'how old he is' / 'whether or not' are marked in Telugu by the bound -ఓ on the embedded verb (చెప్పావో, ఉందో, లేదో), not by a complementizer word. The English wh-word is carried by the Telugu wh-word; the -ఓ itself has no English counterpart token and must not be glossed as one." },
    { id: 'fusedTenseNotAuxiliary', rule: "English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will, habitual 'would'/'used to') is realised by a SINGLE fused Telugu finite form (చూశాను 'I saw', ప్రయత్నిస్తున్నాను \"I'm trying\", చేసేవాడు 'he would do'). Do not tile English auxiliaries as separate Telugu tokens, and do not require each tense of a known verb to be introduced separately." },
    { id: 'caseSuffixesAreGlue', rule: "English a / an / the / to / in / with / about / than / of are realised as Telugu bound case suffixes (-కు/-కి, -ని/-ను, -లో, -తో, -నుంచి, adverbial -గా, plural -లు) inside a single token, or as the free postpositions గురించి / కోసం / కంటే / కలిసి. They are free on the known side and never need a separate introduced LEGO. Where ZWNJ has stranded a suffix as its own token (లో, కి, గా, లు, తో) it is still glue, which is why those forms are in the free class — without that, a stranded గా would read as 'not introduced until 474'." },
    { id: 'inkaaIsFourThings', rule: "ఇంకా (296) is the least settled item in this contract. It is 'yet' under negation, 'still' or 'more' in a positive/additive clause (ఇంకా ఎక్కువ 'a lot more', ఇంకొంచెం 'a little more'), AND a plain coordinating 'and' — the corpus contains the lego \"ఇంకా | and\" outright. It is listed in npi for licensing purposes, but an ఇంకా in a positive declarative is very often the conjunction and NOT an NPI violation. Needs a polarity- and function-conditioned rendering rule; do not ZUT-flag the readings against each other, and do not let the gate treat the conjunction use as a breach." },
    { id: 'edainaVsEmi', rule: "ఏదైనా (167) is 'something' — free-choice/specific-unknown, fine in a positive declarative. ఏమీ (21) is 'anything/nothing' — the -ఊ NPI form, requiring a licenser. Likewise ఏదో 'something' vs ఎవరూ / ఎవరికీ 'anyone/nobody', and ఎవరితోనైనా 'with someone'. These are DIFFERENT known items with different English renderings; do not normalise one series to the other, and do not treat the -ఐనా / -ఓ series as NPIs." },
    { id: 'oka', rule: "ఒక is both the numeral 'one' and the indefinite article 'a/an' (ఒక పదాన్ని = 'a word' at S6, not 'one word'). One Telugu form → two English renderings; the article reading is glue and must not require the numeral's debut." },
    { id: 'feminineAndNeuterShareAnEnding', rule: "The 3sg feminine and the 3sg neuter both take -ఇంది, so చెప్పింది is 'she said' or 'what was said / it said' by context. English forces a choice (she vs it). Fix the reading per prompt; a gender-UNMARKED Telugu reference (అది 'it/that') must NOT be forced to he/she." },
  ],
};

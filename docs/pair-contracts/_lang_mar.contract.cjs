// _lang_mar — LANGUAGE-LEVEL known-side brief for mar-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// The KNOWN/prompt language is Marathi. This is the AGENT-BRIEF dialect: freeClass / npi /
// npiLicensing / negation / knownConstructions / glossRules. It carries NO regexes, and that is
// deliberate — under Tom's rule ("no regex for language — this is the agent's reference knowledge,
// NOT a regex gate config") and Kai's 2026-08-17 ruling, an exact-form matcher over an
// inflecting language is TRIAGE, not pass/fail. isMechanicalContract() must return FALSE for this
// file; a brief is routed to advisory automatically and can never fail a build. If someone later
// adds freeGlue / negationMarkers / constructions[{id,test}] here, this file starts BLOCKING
// submissions on morphology it cannot actually read. Don't.
//
// ── WHAT THIS WAS CALIBRATED ON ──────────────────────────────────────────────────────
// eng_for_mar is the only mar-known course in the estate today (released, 668 seeds).
// Corpus tokenised with the live tokenizeKnown + stemKnownGloss (post-2026-08-17 Unicode fix):
//   • course_legos.known_text        1,407 rows →  3,288 tokens / 1,212 types
//   • course_practice_phrases.known  12,848 rows → 59,738 tokens / 1,815 types
// The free class below is derived from the PHRASE corpus (the 60k side), because that is what the
// gate actually reads, and because it is 18× the lego corpus. Note that only ~1,800 distinct
// surface types cover 60k tokens: Marathi inflection is largely suffixal on a small closed set of
// pronouns/copulas, which is why a free class helps here at all.
// Debut seeds quoted below are the seed at which a form first appears as a LEGO or an M-LEGO
// component — i.e. what the gate uses as the introduction point.
//
// ── TYPOLOGICAL PROFILE AND WHAT IT MEANS FOR EXACT-FORM MATCHING ────────────────────
// Marathi (mar) is Indo-Aryan (Devanagari), head-final, SOV, pro-drop, with THREE genders
// (masculine / feminine / neuter), postpositional case marking layered on an oblique stem, and
// SPLIT ERGATIVITY: in the perfective, the agent takes the ergative -ने/-नी (तिने 'she(erg)',
// त्याने 'he(erg)', त्यांनी 'they(erg)') and the verb agrees with the OBJECT, while in the
// imperfective the subject is nominative and the verb agrees with it. English shows none of this,
// so ergative and nominative pronoun forms of the same person collapse to one English word — and
// on 1sg the ergative is homophonous with the nominative (मी … केलं), so the split is INVISIBLE
// in first person and only surfaces in the 3rd. Consequences for the matcher:
//   1. One English word has many Marathi surface forms and vice versa. माझा / माझी / माझं /
//      माझ्या are one lexeme 'my' agreeing with the possessum; चांगला / चांगली / चांगलं are one
//      'good'; होता / होती / होतं / होतो are one past copula 'was'. The matcher sees four
//      unrelated strings. Whichever one debuts as the LEGO is "introduced"; the other three read
//      as "unknown gloss" forever. This is the single largest source of noise in a mar sweep and
//      it is NOT a defect in the content.
//   2. Case is a bound postposition on an oblique stem (मला 'to me', त्याबद्दल 'about it',
//      माझ्याशी 'with me', त्यांच्यापेक्षा 'than them'), so the English function words
//      to/of/in/with/about/than have no separate token to match. They are glue, not vocabulary.
//   3. Negation is POST-VERBAL and periphrastic-to-suffixal (नाही / नाहीये / नव्हतं / नको /
//      नये), not a pre-verbal particle, and it inflects for tense and gender (नव्हतं / नव्हती /
//      नव्हतो). Substring detection over the `negation` list below is the right test here; a
//      \b-anchored regex is not, because Devanagari has no ASCII word boundaries.
//   4. Yes/no questions are formed with the clause-final clitic का (929 phrase hits, debut S14),
//      with no do-support and no inversion. English do/does/did have no Marathi counterpart token.
//
// ── HONEST GAPS: TOKENS I DID NOT PUT IN THE FREE CLASS, AND WHY ─────────────────────
// These are high-frequency but are LEXICAL, and the course teaches them as content at a debut, so
// classing them free would hide real breaches: वाटतं (828, 'think/feel' — a verb, and it is also
// the carrier of the whole मला … वाटतं experiencer construction), माहित (471, 'known'), खात्री
// (275, 'sure'), आठवत (268, 'remember'), गरज (351, 'need' — a noun inside the obligation
// construction, debut S44), हरकत (102, 'mind/objection'), कल्पना (131, 'idea'), प्रयत्न (290,
// 'try'), मदत (288, 'help'). Deictic/temporal adverbs are also left out even though they behave
// almost like glue — इथे (508), आज (624), पुन्हा (433), आत्ता (199), आधीच (245), रात्री (316) —
// because each has a real debut seed in this course and treating them as free would silently
// license "tonight" before it was taught.
// Tokens I could NOT confidently classify and therefore left out entirely: असं / अशी / तसं (222 /
// 40 / 3) hover between demonstrative glue ('such', 'thus') and a bound part of the
// अशी … आहे complement frame at S668 — I have included असं and अशी but flag the judgement as
// uncertain; तर (149) is 'then' in जर…तर but also a discourse 'so/well' and a topic particle, and
// I have included it as glue on the strength of "मला विचाराल तर | if you ask me"; ते (1,405) is
// genuinely three things — 'it', 'that', 'they', and the neuter copular subject — and is in the
// free class because all three readings are closed-class; वर (5 in legos) is 'on' but also the
// verb stem 'to raise' in compounds, so it is OUT.
// The `तू` familiar 2sg does NOT occur anywhere in this corpus: तू / तुला / तुझा / तुझी / तुझं
// appear as a standalone token in 0 of 14,255 lego+phrase rows (checked with tokenizeKnown, not
// with a \b regex — JS \b never matches between Devanagari letters, so a \b-anchored probe returns
// a meaningless 0 for every Indic form and must not be trusted). 'you' is uniformly honorific
// तुम्ही (678) / आपण (89). There is no familiar/polite register split to model, unlike Tamil.
// No parenthetical/authoring tags are baked into this corpus: 0 of 1,407 lego rows and 0 phrase
// rows carry brackets or an `introduce` directive in known_text, so the frequencies above are not
// distorted by tag leakage. (The recorded tag problem is real, but it lives on the ENGLISH known
// side of the mirror courses — 822 of 1,657 tel_for_eng lego rows carry "(obj)"-style glosses —
// not here.)
//
// ── HOW TO READ A SWEEP OF THIS CONTRACT ─────────────────────────────────────────────
// The gate is seed-granular: a prompt is checked against everything introduced up to and including
// its own seed, so an intra-seed ordering violation (L1 using a gloss that debuts at L3 of the
// same seed) passes clean and must still be checked by hand. Every finding is triage. Expect the
// bulk of "unknown gloss" hits to be (a) gender/number agreement variants of an introduced stem,
// (b) a verb in a tense/participle form other than the one that debuted, (c) an oblique-stem +
// postposition form of an introduced pronoun or noun.
module.exports = {
  course_code: null,          // language-level: serves every mar-known course
  ratified: null,             // advisory until adversarially verified against a real build
  known_lang: 'mar',
  known_lang_name: 'Marathi',

  // Free class — Marathi closed-class function words, corpus-derived from eng_for_mar phrase
  // prompts. Pronouns are listed in every case form the corpus actually attests, because Marathi
  // case is fusional on pronouns and the matcher cannot relate मी to मला.
  freeClass: [
    // personal pronouns — nominative
    'मी', 'आम्ही', 'आपण', 'तुम्ही', 'तो', 'ती', 'ते', 'त्या', 'तू',
    // ergative (perfective agent) — same lexemes, -ने/-नी
    'तिने', 'त्याने', 'त्यांनी', 'आम्ही', 'तुम्ही',
    // dative/accusative (-ला on the oblique stem)
    'मला', 'आम्हाला', 'आपल्याला', 'तुम्हाला', 'तुम्हा', 'त्याला', 'तिला', 'त्यांना', 'मला',
    // oblique / comitative / genitive-oblique
    'माझ्या', 'तुमच्या', 'आमच्या', 'त्याच्या', 'तिच्या', 'त्यांच्या', 'माझ्याशी', 'तुमच्याशी',
    // genitive, agreeing in gender/number with the possessum
    'माझा', 'माझी', 'माझं', 'तुमचा', 'तुमची', 'तुमचं', 'आमचा', 'आमची', 'आमचं',
    'त्याचा', 'त्याची', 'त्याचं', 'तिचा', 'तिची', 'तिचं', 'त्यांचा', 'त्यांची', 'त्यांचं',
    // demonstratives / deictics
    'हा', 'ही', 'हे', 'या', 'त्याच', 'तीच', 'असं', 'अशी', 'अशा',
    // copula — present, past (3 genders + 1sg), future, habitual
    'आहे', 'आहेत', 'आहात', 'आहोत', 'होतं', 'होती', 'होता', 'होतो', 'असेल', 'असतं', 'असते', 'असती', 'असतो',
    // determiners / quantifiers / degree
    'एक', 'काही', 'काहीतरी', 'कोणी', 'खूप', 'फार', 'जास्त', 'अगदी', 'सगळं', 'सगळे', 'सगळ्या',
    // conjunctions, complementizer, focus and discourse glue
    'आणि', 'पण', 'किंवा', 'फक्त', 'कारण', 'म्हणून', 'की', 'जर', 'तर', 'तरी', 'म्हणजे', 'मग', 'जेव्हा', 'तेव्हा',
    // interrogatives (each debuts as a wh-LEGO, but they are closed-class machinery)
    'का', 'काय', 'कसं', 'कुठे', 'किती', 'कधी', 'कोण', 'कोणती',
  ],

  // NPI / polarity items. A violation is ONE of these standing in a plain POSITIVE DECLARATIVE
  // with no licenser. See npiLicensing.rule — Marathi has two series and only one of them is a
  // true NPI.
  npi: ['काहीही', 'कोणीही', 'कधीही', 'कुठेही', 'अजिबात', 'अजून'],
  npiLicensing: {
    rule: "Marathi builds indefinites by suffixing a particle to a wh-word, and the particle "
      + "chooses the polarity, so the rule has to be stated per series. (A) The -ही SERIES "
      + "(काहीही 'anything', कोणीही 'anyone', कधीही 'ever', कुठेही 'anywhere', plus the scalar "
      + "अजिबात 'at all' and the aspectual अजून 'yet') is the emphatic/negative-polarity series. "
      + "In this corpus it is overwhelmingly licensed by a following negator — काहीही नाही "
      + "'nothing', तिला काहीही वाचायचं नाही \"she doesn't want to read anything\" (S37), मला "
      + "त्याची अजिबात कल्पना नाही \"I don't have the faintest idea\" (S260), तयार नाही अजून "
      + "'not ready yet'. BUT the -ही series is ALSO a genuine free-choice series under a modal, "
      + "and the corpus does that too: कोणीही खेळ जिंकू शकतं \"anyone can win the game\" (S532) is "
      + "positive, declarative and perfectly grammatical. So a bare 'positive declarative' test "
      + "OVER-FLAGS: the licenser may be a modal (शकतो/शकेल 'can'), a conditional (जर…तर), a "
      + "question clitic (का), a comparative (-पेक्षा), an exclusive (फक्त, 24 hits) or a "
      + "'before'-clause, not only a negator. (B) The -तरी SERIES (काहीतरी 'something' 470, "
      + "कुठेतरी 'somewhere' 42, कोणीतरी 'someone' 9) is specific-indefinite and is FINE in a positive "
      + "declarative — काहीतरी is the 4th commonest content token in the whole corpus (470 hits) "
      + "and is 'something', never 'anything'. A -तरी item in a positive declarative is NEVER a "
      + "violation, and must not be 'corrected' to a -ही form. The one thing the gate should "
      + "treat as a real NPI breach is a -ही item (or अजिबात) in a positive declarative with no "
      + "modal, conditional, question clitic, comparative or exclusive anywhere in the clause. "
      + "Because Marathi negation is CLAUSE-FINAL, the licenser typically comes AFTER the NPI — "
      + "a left-to-right 'is there a negator before this token' test finds nothing and reports a "
      + "false breach. Read the whole clause.",
    licensedIn: [
      "Post-verbal negation नाही / नाहीये and its past forms नव्हतं / नव्हती / नव्हता / नव्हतो "
        + "(काहीही नाही 'nothing'; मी कल्पनाही करू शकत नव्हतो \"I couldn't imagine\")",
      "Prohibitive / optative negation नको ('shouldn't', 'let's not': काळजी करायला नको "
        + "\"shouldn't worry\" S100; आपण बाहेर जाऊ नको \"let's not go outside\" S534) and नये "
        + "(त्यांनी वाजवू नये \"I wish they wouldn't play\" S557)",
      "Negated obligation गरज नाही ('don't need to': त्यांना थांबायची गरज नाही S420)",
      "Yes/no questions with the clause-final clitic का (तुम्हाला उत्तर सापडलं का? \"have you "
        + "found the answer?\") and wh-questions",
      "Conditional / counterfactual clauses with जर … तर and the -लं असतं counterfactual "
        + "(जर जमलं असतं \"if he could\" S225)",
      "Ability and permission modals शकतो / शकता / शकेल / शकतं ('can/could/be able to') — the "
        + "free-choice reading (कोणीही … शकतं 'anyone can')",
      "Desiderative -ायचं आहे / हवं आहे ('want to') and obligation पाहिजे / लागेल",
      "Comparatives with -पेक्षा ('than') and superlative सगळ्यात ('the most')",
      "Exclusive / restrictive focus (फक्त, मात्र, -च) and 'before' clauses (-च्या आधी)",
      "Imperatives, hortatives and the polite interrogative future (सांगाल का? 'could you say?')",
    ],
  },

  // Negation markers — reference list for the agent, and the substring cue the brief-dialect
  // negation test uses. Marathi negation is clause-final and inflects for tense/gender/person, so
  // this list is a family, not an enum. debut: नाही S10, नको S100, नव्हतं S86.
  negation: [
    'नाही', 'नाहीये', 'नाहीत', 'नव्हतं', 'नव्हती', 'नव्हता', 'नव्हतो', 'नको', 'नये',
    'नसेल', 'नसतं', 'गरज नाही', 'माहित नाही', 'खात्री नाही',
  ],

  // Marathi machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'honorific_you', marker: 'तुम्ही / आपण', description: "Marathi 'you' in this course is uniformly honorific-plural तुम्ही (678 phrase hits, debut S1) with the extra-polite आपण (89) alongside; the familiar तू does not occur once in 14,255 rows. Dative तुम्हाला / तुम्हा, oblique तुमच्या, genitive तुमचा/तुमची/तुमचं. Licensed at तुम्ही's debut; every English 'you' may be realised by any of these forms and by the agreement suffix -ता/-ाल on the verb." },
    { id: 'inclusive_we', marker: 'आपण / आम्ही', description: "Two 1pl pronouns: exclusive आम्ही ('we, not you') and inclusive/polite आपण ('we including you', also a polite 'you'). Both gloss to English 'we' and आपण additionally to 'you' — आपण बाहेर जाऊ नको \"let's not go outside\" (S534) vs आपल्याला जायचं आहे का मॅडम? \"do you want to go madam?\" (S650). Licensed at each pronoun's debut; the inclusive/exclusive contrast is invisible in English and must not be invented as an English distinction." },
    { id: 'split_ergative_perfective', marker: 'तिने / त्याने / त्यांनी', description: "SPLIT ERGATIVITY. In the perfective the agent takes ergative -ने/-नी and the verb agrees with the OBJECT in gender/number: तिने आत्ताच पाहिली \"she'd just seen (it-fem)\" vs तिने … सुरुवात केली (S37). In the imperfective the subject is nominative and the verb agrees with the subject. 109 तिने / 73 त्याने / 48 त्यांनी hits. On 1sg the ergative is homophonous with the nominative (मी), so the alternation is only visible in the 3rd person. English has no ergative: तो and त्याने are one English 'he'. License the ergative forms as case machinery at the first perfective clause, not as new pronouns." },
    { id: 'three_gender_agreement', marker: 'होता / होती / होतं', description: "Marathi has three genders and adjectives, participles, genitives and the copula all agree: past copula होता (m) / होती (f) / होतं (n) / होतो (1sg-m) — 989 hits combined; genitive माझा/माझी/माझं; adjective चांगला/चांगली/चांगलं. तुमची कल्पना खूप चांगली होती \"your idea was very good\" (S125) shows feminine agreement right through the phrase. This is ONE construction, licensed at the first agreeing form; the other genders' surface forms are the same lexeme and must not be counted as new vocabulary." },
    { id: 'dative_subject_experiencer', marker: 'मला … आहे / वाटतं', description: "Experiencer/possessor subjects stand in the DATIVE, not the nominative: मला हवं आहे 'I want' (S1), मला वाटतं 'I think/it seems to me', मला माहित आहे 'I know', त्याला गरज आहे 'he needs', मला खात्री नाही \"I'm not sure\". मला is the single commonest token in the corpus (3,489 hits) precisely because of this. English renders all of them with a NOMINATIVE subject, so the case mismatch is systematic and invisible on the English side. Licensed at S1 with the first मला … आहे frame." },
    { id: 'want_two_frames', marker: 'हवं आहे / -ायचं आहे', description: "'want' has two frames and the course uses both: (a) nominal desiderative मला हवं आहे 'I want' / तिला मदत हवी आहे \"she wants help\" — हवं agrees in gender with the wanted thing (हवं/हवी/हवे, 382 hits); (b) verbal desiderative on the -ायचं gerund, मला बोलायचं आहे \"I want to speak\", तिला इंग्रजी शिकायचं आहे \"she wants to learn English\" (S17). One English 'want' → two Marathi constructions. Licensed at S1/S17; neither is content vocabulary." },
    { id: 'obligation_modals', marker: 'पाहिजे / लागेल / गरज आहे', description: "Three obligation devices mapping onto English should / need to / have to / must: पाहिजे 'should' (debut S98, मी पाहिजे विचार \"I should think\"), -ावं लागेल / लागणार आहे 'have got to' (मला गप्प राहावं लागणार आहे \"I have got to be quiet\" S549; तुम्हाला काय करावं लागेल? \"what do you need to do?\" S167), and the nominal गरज आहे / गरज नाही 'need to / don't need to' (S44, 351 hits). Many-English→one-Marathi and one-English→many-Marathi both happen here. Deontic machinery, not content." },
    { id: 'ability_shak', marker: 'शकतो / शकता / शकेल / शकतं', description: "Ability/possibility auxiliary शक- on a bare verb stem, agreeing with the subject: मी … मदत करू शकतो \"I can help\" (S660), तुम्ही … देऊ शकता का? \"can you make me…?\" (S489), कोणीही … जिंकू शकतं \"anyone can win\" (S532), करू शकत नव्हतो \"couldn't\" (negated). Covers can / could / be able to. Invariant machinery whose agreement and polarity ride on it; also an NPI licenser." },
    { id: 'question_clitic_ka', marker: 'का', description: "Yes/no questions are formed with the CLAUSE-FINAL clitic का (929 hits, debut S14): तुम्हाला इथे आवडतं का? \"do you like it here?\"; तुम्ही पाहिलं का …? \"did you watch…?\". No do-support, no inversion, no rising word order. English do/does/did are absorbed by this clitic plus the verb's own tense — they are NOT separate Marathi glosses. Homophonous with का 'why' in wh-position, which is a separate reading." },
    { id: 'complementizer_ki', marker: 'की', description: "की is the finite complementizer 'that' heading a following clause (886 hits, debut S10): मला वाटतं की ती इंग्रजी बोलते \"I think that she speaks English\" (S285); मला भीती आहे की … \"I'm afraid that…\" (S521). English routinely OMITS 'that', so की frequently has no English counterpart token at all. Grammatical glue, licensed once. Distinct from the clause-final असं … आहे frame (S668, अशी मला आशा आहे 'I hope'), which wraps the complement instead." },
    { id: 'conditional_jar_tar', marker: 'जर … तर', description: "Conditionals are marked by जर ('if', 42 hits, S225) optionally paired with resumptive तर, and by the -लं असतं counterfactual: जर जमलं असतं \"if he could\"; त्याने उत्तर दिलं असतं जर जमलं असतं \"he would give you an answer if he could\" (S225); मला विचाराल तर \"if you ask me\". The conditional and counterfactual are carried by verb morphology as much as by जर, so the agent must read the -असतं form, not hunt for an 'if' word. Also an NPI licenser." },
    { id: 'temporal_clause', marker: 'जेव्हा / तेव्हा', description: "Temporal subordination uses the correlative pair जेव्हा … तेव्हा ('when … then'), with तेव्हा often standing alone after the clause: काम करता तेव्हा \"when you work\" (75 hits), जेव्हा शिकतो \"when we learn\" (29). Subordinating machinery, licensed as one construction; distinct from the interrogative कधी 'when'." },
    { id: 'case_postpositions', marker: '-ला / -चा / -त / -शी / -बद्दल / -पेक्षा', description: "Grammatical and oblique relations are bound postpositions on an OBLIQUE stem, agglutinated into one token: dative/accusative -ला (मला, त्याला — 6,118 hits), genitive -चा/-ची/-चं agreeing with the possessum (3,496), locative -त (आठवड्यात 'last week' — 3,976), comitative -शी (माझ्याशी 'with me' — 318), 'about' -बद्दल (त्याबद्दल — 287), comparative -पेक्षा (118), partitive -पैकी (ठिकाणांपैकी 'of those places'), benefactive -साठी. English a/the/to/in/with/about/than/of have NO separate Marathi token — they are absorbed here and need no introduction. The matcher sees noun+postposition as one unfamiliar string; mask the case-marked span as a unit." },
    { id: 'verbal_nouns', marker: '-णे / -ायला / -ायचं / -ावं', description: "Marathi has four productive non-finite forms that all render as an English infinitive or gerund: -णे the dictionary/verbal noun (बोलणे 'to speak', शिकणे 'to learn', उठणे 'waking up'), -ायला the purposive/dative infinitive (करायला, भेटायला), -ायचं the desiderative gerund (बोलायचं, जायचं), -ावं the obligative (करावं, राहावं). Same verb, four surface forms, one English 'to V'/'V-ing'. Licensed as one construction at the first non-finite form (S1/S2); the matcher cannot relate them and will read three of the four as new words." },
    { id: 'future_and_habitual_copula', marker: 'असेल / असतं / असती', description: "Tense on the copula is a distinct stem, not an auxiliary: present आहे, past होता/होती/होतं, future असेल (126 hits, मी खूश असेन \"I'll be happy\" S80), habitual असतं/असते, counterfactual असतो/असती (मी तयार झालो असतो \"I would have been ready\"). English will be / would have been / used to be map onto these single forms. Licensed as one tense construction; each English auxiliary is NOT a separate Marathi token." },
    { id: 'negation_postverbal', marker: 'नाही / नको / नये', description: "Negation is CLAUSE-FINAL and inflects: present नाही / नाहीये, past नव्हतं / नव्हती / नव्हता / नव्हतो, prohibitive-optative नको (86) and नये (10), negated obligation गरज नाही. This is one polarity construction licensed at नाही's debut (S10); the tense- and gender-varying forms are the SAME construction, not new vocabulary. Because the negator comes last, any check that requires a negation cue to precede an NPI will mis-fire." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'honorificYouCollapse', rule: "तुम्ही / तुम्हाला / तुमचा-ची-चं / आपण / आपल्याला and the verb agreement -ता/-ाल all render as English 'you' (and आपण also as 'we'). There is no familiar तू in this corpus, so 'you' is always honorific; never split the English into polite vs plural forms, and never treat a case form of तुम्ही as a new pronoun." },
    { id: 'inclusiveWeCollapse', rule: "आम्ही (exclusive 'we') and आपण (inclusive 'we') are many-Marathi→one-English: both are 'we'. The prompt carries an inclusion feature English does not have. Keep both carriers but do not manufacture an English contrast; conversely do not let an English 'we' be tiled by whichever form happens to be introduced." },
    { id: 'ergativeIsNotAnEnglishDistinction', rule: "तो/त्याने, ती/तिने, ते/त्यांनी are one English 'he'/'she'/'they'. The -ने/-नी marking is aspect-driven case (perfective agent), a property of the Marathi clause, NOT an English distinction. Many-Marathi→one-English; license the ergative forms with the perfective construction and never gloss them differently." },
    { id: 'genderAgreementIsOneLexeme', rule: "माझा/माझी/माझं is one 'my'; चांगला/चांगली/चांगलं is one 'good'; होता/होती/होतं is one 'was'. The alternation is agreement with a Marathi gender that English does not have. Treat the set as one introduced item; do NOT render the agreement as an English difference, and do not require each gender form to be separately introduced. Conversely, where English forces a gendered pronoun (he/she) the Marathi prompt must actually supply it — a neuter ते 'it/that' must be rendered 'it/that', not 'he'." },
    { id: 'dativeSubjectIsEnglishNominative', rule: "मला हवं आहे → 'I want'; मला वाटतं → 'I think'; त्याला गरज आहे → 'he needs'; मला माहित नाही → \"I don't know\". The Marathi experiencer is DATIVE and the English subject is NOMINATIVE. One Marathi frame → one English frame; never gloss मला as 'to me' inside these, and never let the case mismatch read as a missing pronoun." },
    { id: 'wantIsTwoConstructions', rule: "English 'want' collapses two Marathi frames: nominal हवं आहे (agreeing: हवं/हवी/हवे) and verbal -ायचं आहे. Many-Marathi→one-English, ZUT-legal in that direction. The reverse must be held constant per prompt: a single known prompt must not be answerable by both frames." },
    { id: 'obligationManyToOne', rule: "पाहिजे, -ावं लागेल/लागणार, गरज आहे all map into the English should / need to / have to / must band, and English 'need to' maps back to गरज आहे or -ावं लागेल depending on whether the need is a state or an imposed requirement. Record the intended English modal per carrier so the same known prompt does not license two English modals (that would break ZUT on the target side)." },
    { id: 'abilityShak', rule: "शक- + subject agreement covers can / could / be able to, and negated करू शकत नव्हतो covers couldn't. One Marathi auxiliary → several English modals; the English tense comes from the agreement suffix and the negator, not from a separate word." },
    { id: 'questionByFinalClitic', rule: "English do/does/did-support and copular questions correspond to the CLAUSE-FINAL Marathi clitic का plus the verb's own tense. do/does/did are NOT separate Marathi glosses and must never be tiled as such; conversely a का-final prompt is a question even with declarative word order." },
    { id: 'kiIsOftenUntranslated', rule: "की 'that' is a finite complementizer that English routinely omits (\"I think she speaks English\" = मला वाटतं की ती बोलते). Free grammatical glue: never require an English 'that' for it, and never treat its absence in English as a missing gloss." },
    { id: 'caseSuffixesAreGlue', rule: "English a / the / to / in / with / about / than / of are realised as Marathi bound postpositions on an oblique stem (-ला, -चा/-ची/-चं, -त, -शी, -बद्दल, -पेक्षा, -पैकी, -साठी) inside a single token. They are free on the known side and never need a separate introduced LEGO; the gate should mask the whole case-marked word." },
    { id: 'nonFiniteFormsAreOneLexeme', rule: "बोलणे / बोलायला / बोलायचं / बोलावं are four non-finite forms of ONE verb and all render 'to speak' / 'speaking'. Do not treat each as separate vocabulary and do not let the English infinitive/gerund choice be driven by which Marathi form appears — English chooses by its own frame." },
    { id: 'negationIsClauseFinal', rule: "Negation is the clause-final नाही / नाहीये / नव्हतं / नव्हती / नव्हता / नको / नये, inflecting for tense and gender, not a pre-verbal 'not'. English don't / doesn't / didn't / isn't / won't / shouldn't all map to whichever final form the tense and mood dictate — one Marathi negative form per English negation. Any left-to-right 'negator before NPI' test is wrong for Marathi." },
    { id: 'ajun', rule: "अजून (290 hits) is polarity-conditioned: under negation it is 'yet' (तयार नाही अजून \"not ready yet\"), in a positive/additive clause it is 'still' or 'more' (अजून एकदा 'once more'). One Marathi form → two English renderings by polarity; needs a rendering rule so it is not ZUT-flagged as a collision. Same treatment as Tamil இன்னும்." },
    { id: 'kahitariVsKahihi', rule: "काहीतरी (470) is 'something' — specific-indefinite, fine in a positive declarative. काहीही (35) is 'anything/nothing' — the emphatic/NPI -ही form, normally under negation, but free-choice 'any' under a modal (कोणीही … शकतं \"anyone can\"). They are DIFFERENT known items with different English renderings; do not normalise one to the other, and do not treat काहीतरी as an NPI." },
    { id: 'ekIsNotJustOne', rule: "एक is both the numeral 'one' and the indefinite article 'a/an' (एक शब्द = 'a word' at S6, not 'one word'). One Marathi form → two English renderings, disambiguated by whether the English needs an article; the article reading is glue and must not require the numeral's debut." },
  ],
};

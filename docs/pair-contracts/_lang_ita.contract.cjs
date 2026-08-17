// _lang_ita — LANGUAGE-LEVEL KNOWN-SIDE BRIEF for ITALIAN AS THE KNOWN/PROMPT LANGUAGE.
// FIRST PASS (2026-08-17), ratified:null. Resolves for every course whose courses.known_lang
// is 'ita' and which has no course-specific <code>.contract.cjs override (loadPairContract
// precedence, validation.cjs). Today that is eng_for_ita (beta) alone; it will cover any future
// *_for_ita — a Sicilian, Neapolitan, Venetian, Friulian or Romansh course taught FROM Italian —
// without further work.
//
// DIALECT: this is an AGENT BRIEF, deliberately. It uses freeClass / npi / npiLicensing /
// negation / knownConstructions[{id,marker,description}] / glossRules, and it contains NO
// `test` regex, NO freeGlue and NO negationMarkers — so isMechanicalContract() returns FALSE
// and the gate routes every finding to ADVISORY. Kai's ruling, 2026-08-17: against a fusional
// Romance verb paradigm an exact-form matcher is TRIAGE, not pass/fail.
//
// ── CALIBRATION ──
// Derived from the LIVE corpus: all 598 course_legos rows of eng_for_ita, the only Italian-known
// course today, tokenised with the repo's own tokenizeKnown/stemKnownGloss — 1,396 known-side
// tokens, 552 distinct stems. Example prompts cited below are real course_practice_phrases
// known_text from eng_for_ita (seed numbers given). EXPLICIT GAP: this is the smallest corpus of
// the four Romance briefs (a quarter the size of the Spanish one), and 552 distinct stems from
// 1,396 tokens is a type/token ratio of 0.40 — i.e. most items are attested ONCE. The free class
// below is therefore a closed-class paradigm completed from the attested core, not a purely
// frequency-derived list, and it should be re-derived when a second Italian-known course exists.
//
// ── TYPOLOGICAL PROFILE, AND WHAT IT DOES TO EXACT-FORM MATCHING ──
// Italian is a Romance, SVO, fusional, PRO-DROP language with a single preverbal negator, clitic
// pronouns that are proclitic to finite verbs and ORTHOGRAPHICALLY BOUND to infinitives/gerunds,
// obligatory gender-and-number concord (including on past participles under auxiliary essere),
// preposition+article fusion, elision before vowels, and a fully live subjunctive. Consequences:
//
//  1. VERB INFLECTION IS THE DOMINANT FALSE-POSITIVE CLASS — say it first. stemKnownGloss does NO
//     stemming (Tom's rule, 2026-06-15: exact form or nothing), so every inflected form is a
//     distinct stem. The corpus proves it even at this size: volere surfaces as voglio(7) vuoi(4)
//     vuole(4) voleva(7) volevo(3) volevi(2) volevamo(2) vogliamo(2) vogliono(1); dovere as devi(2)
//     dovresti(2) dovrei(2) dovevi(2) debba(1); riuscire as riesco(5) riesci(1) riesce(1)
//     riuscirò(3) riuscivo(1) riuscire(2); essere as è(25) sono(16) sei(6) siamo(1) sia(3) fossi(2)
//     era(8) eravamo(1) sarebbe(4) sarò(1) sarai(1) essere(4). Introducing "voglio" at S1 licenses
//     NOTHING about "voleva" at S37. Expect the large majority of `unknown gloss` findings to be
//     inflections of an already-introduced lexeme; only a finding whose LEMMA is absent from the
//     introduced inventory is a candidate real breach.
//  2. ENCLISIS WRITES A PRONOUN INSIDE THE VERB TOKEN. Italian attaches object/reflexive clitics
//     to a non-finite verb with NO space and NO hyphen: chiederti(4), dirmi(2), aiutarti,
//     mostrarmi(2), sentirmi(2), darti, incontrarci(2), preoccuparti, svegliarmi, prendersi. Each
//     is ONE token, reported unknown even when both `chiedere` and `ti` were introduced. As in
//     Spanish (and unlike Portuguese, which hyphenates) there is no orthographic hint at all.
//  3. ELISION AND APOSTROPHE. Before a vowel, articles and some function words elide and fuse:
//     l'inglese, l'ora, l'unico, l'ultima, un'idea, d'accordo, d'acqua, all'inizio, quell'uomo,
//     cos'è, c'era, po'. tokenizeKnown treats the apostrophe as word-internal, so these are single
//     tokens — 15 of the 552 distinct stems here (2.7%, far below French's 13.6% but the same
//     failure mode). freeClass lists only the wholly-functional ones (d'accordo is idiomatic, c'è,
//     cos'è); l'inglese and un'idea cannot be freed without freeing the noun inside them.
//  4. PRO-DROP. "voglio parlare inglese" (S1) has no subject pronoun and needs none; io/tu/lui/lei
//     appear only under contrast. The pronouns are freed below, but the ZUT consequence is real —
//     see glossRules.proDropOptionality.
//
// ── HONEST GAP: NEGATION DETECTION IS SUBSTRING-BASED HERE ──
// Under a brief contract checkKnownSide has no negationMarkers regex, so it decides "is this
// prompt negated?" by testing whether any `negation` string occurs as a SUBSTRING of the prompt.
// Italian's negator `non` is a substring of nonna and — more damagingly — `mai` occurs inside
// domani, mail, ormai, and `no` inside nome, nostro, conosco, nuovo. MEASURED on the 4,982
// build/use/practice prompts of eng_for_ita (2026-08-17): the substring test calls 40.0% of prompts
// negated, while a word-boundary regex over the same marker list calls 26.0% negated — so 699
// prompts (14.0%) are FALSELY read as negated, the joint-worst rate of the four Romance briefs
// alongside French. The NPI check is therefore DEGRADED, not inert: it still fired 41 times on this
// course, but roughly one prompt in seven is silently exempted from it. The true markers are kept
// anyway: the list is also the adjudicator's reference, and dropping them to buy a check would
// misdescribe the language. A real fix needs a mechanical contract with a word-boundary regex
// (/\b(non|mai|né|nessun\w*|niente|nulla|neanche|nemmeno)\b/i) and is out of scope for a brief.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND LEFT OUT OF freeClass ──
//   • `ancora`(4): 'still' / 'yet' (polarity-conditioned) / 'again'. Placed in `npi` for the
//     'yet' reading; the 'still/again' readings are free-standing adverbs the matcher cannot tell
//     apart. See npiLicensing (B).
//   • `più`(13): comparative 'more' AND the negative particle of `non … più` 'no longer'. Freed as
//     a degree word; flagged here because the two readings are indistinguishable to the matcher.
//   • `bene`(5), `così`(7), `già`(2), `poi`, `ecco`: discourse/degree particles that shade into
//     content ('parlare bene' is 'speak well', a real adverb). `già` and `così` are freed;
//     `bene` and `ecco` are NOT.
//   • `qualcosa`(5), `qualcuno`(3), `qualche`(3): free-choice/existential indefinites, NOT NPIs —
//     grammatical in positive declaratives. Deliberately in neither list; see npiLicensing (C).
//   • `niente`(4), `nessuno`(2), `nulla`: negative-concord items, in `npi` not freeClass.
//   • `ci`: locative clitic, partitive-existential (c'è/ci sono) AND 1pl object. Freed — every
//     reading is a function word — but note the conflation.
//   • `ne`: partitive/genitive clitic with frequently NO English realisation. Freed; must never be
//     given an English gloss of its own.
//   • `tutto`/`tutta`/`tutte`: quantifier, pronoun ('everything') and adverb. Freed as quantifier;
//     the pronoun reading is arguably content and I have not split it.
//   • `stesso`/`stessa`(3): 'same' (adjective, content) vs 'self'. Left OUT — the adjectival
//     reading dominates ('È la stessa cosa', S143).
//   • `po'`(3): the apocopated `poco` in 'un po' di'. Freed, because the apostrophe makes it a
//     distinct token from `poco` and both are quantifiers.
module.exports = {
  course_code: '_lang_ita',
  ratified: null,
  known_lang: 'ita',
  known_lang_name: 'Italian',

  // Free class — closed-class Italian function words, corpus-derived where attested and completed
  // to whole paradigms elsewhere (see the calibration gap above).
  // NOTE ON THE COPULAS: PRESENT-tense forms of essere and stare are freed here, exactly as
  // _default_eng frees is/are/am/be. PAST, FUTURE and CONDITIONAL forms (era, eravamo, fu, sarà,
  // sarebbe, fossi) are deliberately NOT freed — SSi teaches tense explicitly, so a past copula is
  // a taught form, not glue. The perfect auxiliary avere (ho, hai, ha, abbiamo, avevo, avrei) is
  // likewise NOT free: it is machinery licensed by the compound-past construction below, mirroring
  // how English 'have' is governed machinery rather than glue in the English contract.
  freeClass: [
    // articles (definite, indefinite, partitive)
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
    // preposition+article fusions (preposizioni articolate)
    'del', 'dello', 'della', 'dei', 'degli', 'delle',
    'al', 'allo', 'alla', 'ai', 'agli', 'alle',
    'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
    'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
    'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'col',
    // simple prepositions
    'di', 'a', 'ad', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
    'senza', 'sotto', 'sopra', 'dopo', 'prima', 'durante', 'verso',
    // subject pronouns (optional — Italian is pro-drop — hence pure glue when present)
    'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'egli', 'essa',
    // object / reflexive / adverbial clitics
    'mi', 'ti', 'si', 'ci', 'vi', 'li', 'ne', 'me', 'te', 'sé',
    // possessive determiners (Italian keeps the article: il mio, la sua)
    'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue',
    'suo', 'sua', 'suoi', 'sue', 'nostro', 'nostra', 'nostri', 'nostre',
    'vostro', 'vostra',
    // demonstratives
    'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
    'quel', 'quest', 'ciò',
    // relatives / complementisers / conjunctions
    'che', 'cui', 'chi', 'e', 'ed', 'o', 'oppure', 'ma', 'se', 'perché', 'anche',
    'però', 'quindi', 'come', 'mentre', 'sia',
    // degree / quantity adverbs and quantifiers
    'molto', 'molta', 'molti', 'molte', 'più', 'meno', 'tanto', 'troppo', 'troppe',
    'poco', "po'", 'abbastanza', 'quasi', 'già', 'così', 'circa',
    'tutto', 'tutta', 'tutti', 'tutte', 'altro', 'altra', 'altri', 'altre',
    'alcune', 'alcuni', 'ogni',
    // present-tense copulas only — see note above
    'sono', 'sei', 'è', 'siamo', 'siete',
    'sto', 'stai', 'sta', 'stiamo', 'state', 'stanno',
    // wholly-functional elided/fused forms
    "c'è", "cos'è", "d'accordo",
  ],

  // NPI / negative-concord items. See the honest gap above: the matcher cannot police these on
  // Italian. This list and its licensing prose are the ADJUDICATOR's reference.
  npi: ['niente', 'nulla', 'nessuno', 'nessun', 'nessuna', 'mai', 'ancora', 'neanche', 'nemmeno', 'neppure', 'affatto'],
  npiLicensing: {
    rule: "Italian is a STRICT NEGATIVE-CONCORD language, and that fact, not the item list, is what an adjudicator must hold. (A) The n-WORDS — niente/nulla 'nothing/anything', nessuno 'nobody/anybody/no', mai 'never/ever', neanche/nemmeno/neppure 'not even/neither', affatto 'at all' — behave in two positions. POSTVERBAL they REQUIRE a preverbal `non` and the double negative is obligatory, not an error: 'non ho detto niente' is 'I didn't say anything', never *'I didn't say nothing'; 'non mi dispiace aspettare' (S155) is the same frame with a psych verb. PREVERBAL they license themselves and `non` must be ABSENT: 'nessuno lo sa'. So an n-word with no `non` is NOT automatically a violation — check its position first. (B) `ancora` is the polarity-conditioned aspectual: under negation it renders 'yet' — 'non mi sento come se fossi pronto ad avere una conversazione ancora' (S115) — and in a positive it renders 'still' or 'again'. One Italian form, polarity-conditioned English rendering, exactly the Tamil-இன்னும் shape; it needs a rendering rule, not an NPI-only restriction. `più` behaves the same way ('non … più' = 'no longer' vs bare 'più' = 'more'). (C) The qualc- SERIES — qualcosa(5), qualcuno(3), qualche(3), qualcos'altro(2) — are FREE-CHOICE / EXISTENTIAL indefinites and are NOT NPIs: they are fully grammatical in a plain positive declarative meaning 'something/someone/some' ('riesco a ricordare come dire qualcosa in inglese', S10; 'voleva l'opportunità di dire qualcosa di diverso', S206), and they ALSO extend to 'anything/anyone' under a question, conditional or want-predicate. A qualc-item in a positive declarative is NEVER a violation, which is why the series appears in neither `npi` nor `freeClass`. The ONLY genuine violation is an n-word standing POSTVERBALLY in a positive clause with no preverbal `non` and no other non-veridical licenser. Read the sentence before recording any NPI finding.",
    licensedIn: [
      "Preverbal `non` — the ordinary sentential negator, obligatory with any postverbal n-word (non vedo l'ora, S29; non devi essere, S74; non conosco, S88; non sono sicura, S94)",
      "A preverbal n-word licensing itself (mai / nessuno / niente before the verb, with no `non`)",
      "Yes/no and wh-questions, formed by intonation alone with declarative word order — no do-support and no obligatory inversion (sei sicuro che vuoi?, S63; cosa stai cercando in inglese?, S68; puoi dirmi perché?, S150)",
      "Embedded interrogatives with se ('whether') and indirect questions",
      "Conditional clauses with se, including counterfactual se + imperfect subjunctive (se fossi, come se fossi pronto, S115)",
      "Volitional / desiderative predicates and their subjunctive complements — volere, piacere/piacerebbe, sperare, avere bisogno di (ho bisogno di finire, S50; spero che…)",
      "Comparatives with più/meno … di/che and the superlative (È più importante parlare spesso che essere perfetti, S137; è meno difficile di…)",
      "Doubt / denial / opinion predicates taking the subjunctive (penso che non dovresti fare questo, S100; non sono sicura che funzionerà, S94; penso che sia, S163)",
      "Restrictive and exclusive focus — solo, soltanto, appena, neanche",
      "Prima che / senza che and other subjunctive-selecting subordinators; and the concessive anche se (anche se non avevo tempo, S178)",
    ],
  },

  // Negation markers — reference list. See the substring-detection gap in the header.
  negation: ['non', 'mai', 'né', 'niente', 'nulla', 'nessuno', 'neanche', 'nemmeno', 'neppure', 'no'],

  // Italian machinery the adjudicator licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'preverbal_negation', marker: 'non', description: "Italian sentential negation is a SINGLE preverbal particle `non`, placed immediately before the finite verb and before any proclitics (non mi sento, S115; non ci sono). Unlike French there is no second element. English don't/doesn't/didn't/won't/can't all collapse onto this one word plus the appropriate verb form — a many-English→one-Italian collapse. It is also obligatory with postverbal n-words (negative concord), where English has only ONE negative. Note `non` (sentential negator) is distinct from `no` (the answer 'no'). Licensed once as the negation construction." },
    { id: 'pro_drop_agreement', marker: '-o / -i / -a / -iamo / -ono', description: "The finite verb carries fused person-and-number agreement, so the subject pronoun is OPTIONAL and normally absent: 'voglio parlare inglese' (S1) is a complete sentence meaning 'I want to speak English'. Pronouns appear for contrast or emphasis ('lui vuole imparare il suo nome', S24). English requires an overt subject in every clause, so English 'I/you/he' correspond to an Italian VERB ENDING, not to an Italian word. Licensed at the first finite verb; the ZUT consequence is in glossRules.proDropOptionality." },
    { id: 'clitic_pronouns_and_enclisis', marker: "mi / ti / si / ci / vi / lo / la / gli / le / ne + dirmi, chiederti", description: "Object, reflexive, dative and adverbial pronouns are PROCLITIC to a finite verb (mi piace, ti sono grato, S143; ci sono) but ENCLITIC — written as part of the same word, with no hyphen — on infinitives, gerunds and affirmative imperatives (dirmi, chiederti, aiutarti, mostrarmi, sentirmi, darti, incontrarci, preoccuparti, svegliarmi, prendersi). Clusters combine and mutate (mi+lo → me lo; ti+ne → te ne). With a periphrasis both positions are legal: 'lo voglio fare' = 'voglio farlo'. `ci` and `ne` are pro-forms with frequently NO English word at all. The enclitic spelling is the most misleading thing on this known side for an exact-form matcher — see the header. Licensed at the first clitic." },
    { id: 'essere_vs_stare', marker: 'essere / stare', description: "Italian's copular labour is split, though less sharply than Spanish's: `essere` is the general copula for identity, properties, origin and state (è importante, S137; sono occupato, S192; sei sicuro, S63), while `stare` covers location, health, the progressive periphrasis (sto iniziando, S41; stai cercando, S68) and fixed expressions (stare in silenzio, S34; stare zitto). One English 'be' → two Italian lemmas with two full paradigms; the choice is a translation-choice decision to be made before decomposition (synonym-choice-architecture.md). Licensed as one copula construction covering both lemmas." },
    { id: 'articulated_prepositions', marker: 'del / al / dal / nel / sul / col', description: "Italian FUSES a preposition with a following definite article into one obligatory word: di+il→del, a+la→alla, da+i→dai, in+le→nelle, su+il→sul, and before a vowel the fused form elides (all'inizio, dell'anno). English 'of the' / 'to the' / 'from the' / 'in the' / 'on the' collapse into these. They are free glue and must never require a separate introduction for the article inside them. Note that di/a also head infinitival complements with no English counterpart (ho bisogno DI finire, riesco A ricordare) — see the infinitival-linker construction." },
    { id: 'infinitival_linkers', marker: 'di / a + infinito', description: "Italian verbs govern a bare infinitive, or an infinitive introduced by `di` or by `a`, and the choice is LEXICALLY fixed by the governing verb with no English counterpart whatever: riesco A ricordare (S10), ho bisogno DI finire (S50), sto iniziando A leggere (S41), ho intenzione DI ricordare (S6), cercare DI, imparare A, continuare A. English simply uses 'to'. The linker is pure grammatical marking, free on the known side, and must never be glossed as English 'of'/'at'. Licensed at the first governed infinitive." },
    { id: 'gender_number_concord', marker: 'occupato / occupata ; sicuro / sicura ; -i / -e', description: "Articles, adjectives, quantifiers, demonstratives and (with auxiliary essere, or with a preceding direct object clitic) past participles agree in gender and number, INCLUDING first-person predicates that agree with the speaker: 'sono occupato' (S192) vs 'non sono sicura' (S94); 'le ho viste in ufficio' (S184 — participle agreeing with the feminine plural clitic). English has ONE form for all of them. Many-Italian→one-English (ZUT-legal), driven by a feature English does not encode. Each agreement variant is the SAME gloss; a matcher that has seen `sicuro` will call `sicura` unknown." },
    { id: 'compound_past_and_auxiliary_selection', marker: 'ho fatto / sono andato', description: "The passato prossimo — avere OR essere in the present + past participle — is the ordinary past of spoken Italian and covers BOTH English simple past and English present perfect ('ho imparato' = 'I learned' / 'I have learned'; ho intenzione, S6; ho bisogno, S50; avevamo bisogno, S212). Auxiliary selection is lexical and unpredictable from English: essere for unaccusatives, motion and all reflexives (sono andato, mi sono svegliato), avere elsewhere; with essere the participle then AGREES in gender and number. avere is MACHINERY — the analogue of the governed English 'have' — and is deliberately kept out of freeClass so its debut is visible. License it once rather than treating ho/hai/ha/abbiamo/avevo as five new content words." },
    { id: 'imperfect_vs_compound_past', marker: 'voleva / era / avevo / conosceva', description: "Italian splits past reference two ways where English uses one simple past: IMPERFETTO for background, habit and states (voleva, S206; era, S126; avevo tempo, S178; il mio amico lavorava come insegnante, S199; conosceva, S105) and passato prossimo for bounded events. 'lui non conosceva' and 'ho conosciuto' are both English 'knew/met'. One English past → two Italian tenses chosen on aspect; the choice must be made deliberately per prompt. Licensed as a tense construction at the first past form. Every imperfect ending (-avo/-evi/-ava/-avamo/-avano) is inflection of an introduced lemma, not new vocabulary." },
    { id: 'future_and_progressive', marker: 'riuscirò / sarò ; sto + gerundio', description: "Two periphrastic/synthetic machineries: (a) the SYNTHETIC future (-rò/-rai/-rà/-remo/-ranno: riuscirò, S-corpus; sarò; farai; chiederò; funzionerà, S94), with the present tense also usable futurally and `stare per` for the imminent future — English 'will' and 'going to' both land here; (b) stare + GERUND for the progressive (sto iniziando a leggere, S41; stai cercando, S68; stiamo, stavo, stavamo parlando), though Italian uses the simple present far more freely than English uses the simple present, so English -ing does NOT always require it. Licensed as one construction each; the auxiliary is machinery, not a gloss." },
    { id: 'subjunctive', marker: 'sia / fossi / fosse / dicessi / debba / vada / piaccia', description: "The congiuntivo is fully live in Italian and obligatory after opinion, doubt, volition and emotion predicates ('penso che sia', S163; 'penso che non dovresti', S100; 'pensavo che questo lavoro fosse molto buono', S126; 'non sono sicura che…', S94), after certain conjunctions (prima che, benché, affinché, come se — 'come se fossi pronto', S115) and in counterfactual conditionals (se fossi, se dicessi). English has no morphological counterpart and uses the plain form, so every subjunctive form — present (sia, vada, debba, finisca, piaccia, funzioni) and imperfect (fossi, fosse, dicessi, avessi) — is a paradigm variant of an already-introduced verb that the matcher will read as new. Licensed as one mood construction." },
    { id: 'conditional_and_politeness', marker: 'vorrei / piacerebbe / dovresti / sarebbe / avrei', description: "The condizionale (-rei/-resti/-rebbe/-remmo/-rebbero) does double duty: hypothetical apodosis ('l'avrei fatto se…') and POLITE/softened assertion ('mi piacerebbe parlare con te', S110; 'dovresti', S100; 'sarebbe molto utile parlare domani mattina', S172; 'dovrei'). English renders the second as 'would like'/'should'/'could'. piacerebbe is not a new word once piace is known, nor dovresti once devi is. Licensed as a mood construction." },
    { id: 'modals', marker: 'potere / volere / dovere / riuscire a / avere bisogno di / sapere', description: "Italian modality is carried by FULL VERBS that inflect for person, tense and mood: potere 'can/may' (posso, puoi, S150; può), volere 'want' (voglio…vorrei), dovere 'must/should' (devi, dovresti, dovrei, dobbiamo, debba), riuscire a 'manage to / be able to' (riesco a ricordare, S10; riuscirò; riuscivo) — note that Italian splits English 'can' between potere (permission/possibility) and riuscire a (achieved ability), a one-English→two-Italian split with no English cue — avere bisogno di 'need' (ho bisogno di, S50), sapere 'know how'. One English modal ⇄ a whole Italian paradigm. These are the highest-frequency verbs in the corpus and hence the highest-volume source of inflection false positives. License the paradigm at the lemma's debut." },
    { id: 'piacere_class_inversion', marker: 'mi piace / mi dispiace / mi sento / ti sono grato', description: "A closed class of psych/experiencer verbs INVERTS the English argument structure: the English subject becomes an Italian DATIVE clitic and the English object becomes the Italian subject, so the verb agrees with the thing, not the person — 'mi piace' is literally 'to-me it-pleases' and glosses 'I like'; likewise 'mi piacerebbe parlare' (S110) 'I'd like to speak', 'non mi dispiace aspettare' (S155) 'I don't mind waiting', 'mi sento' (S115) 'I feel', 'ti sono grato per l'aiuto' (S143) 'I'm grateful to you'. The dative clitic is NOT an English 'me' object. Licensed as a construction; never tile the clitic as an English object pronoun." },
    { id: 'question_by_intonation', marker: '… ?', description: "Italian forms yes/no questions by intonation alone, with fully declarative word order ('sei sicuro che vuoi?', S63; 'puoi dirmi perché?', S150; 'vuoi imparare in fretta', S20); wh-questions front an interrogative (cosa, che cosa, come, quando, dove, perché, quanto, chi, quale) with optional inversion. There is NO do-support: English do/does/did have no Italian counterpart at all and are absorbed by the question frame. Note the '?' is stripped by tokenizeKnown, so the matcher cannot see that a prompt is a question. Licensed once as the question construction." },
    { id: 'reflexive_and_impersonal_si', marker: 'si / mi / ti + verb', description: "`si` is heavily overloaded and each use is machinery, not vocabulary: true reflexive (mi sento, sentirmi, svegliarmi, preoccuparti), inherent/pronominal verbs (accorgersi, prendersi cura), reciprocal (incontrarci), and impersonal/passive ('si dice', 'quando si lavora'). English usually has no reflexive at all ('feel', 'wake up', 'worry'). The person-varying surface (mi/ti/si/ci/vi) plus enclisis multiplies forms of one lemma, and reflexives take auxiliary essere with participle agreement. Licensed at the first reflexive verb." },
    { id: 'elision', marker: "l' / un' / d' / c' / all'", description: "Before a vowel, the definite article, the feminine indefinite article, `di`, `ci` and fused prepositions elide and fuse orthographically: l'inglese, l'ora, l'unico, l'ultima, un'idea, d'accordo, d'acqua, all'inizio, quell'uomo, cos'è, c'era. This is orthography, not morphology, and invisible to English — but tokenizeKnown treats the apostrophe as word-internal, so each is a single token. Licensed at the first elided form; the adjudicator must mentally de-elide before deciding whether a gloss is genuinely new." },
    { id: 'existential_ci_e', marker: "c'è / ci sono", description: "Existential 'there is/there are' is ci + essere, agreeing in number: c'è (sg), ci sono (pl) — 'ci sono troppe idee che mi girano nella testa' (S131) — past c'era, future ci sarà. Non-compositional: `ci` is a locative pro-form with no English counterpart. License as a unit; never gloss `ci` separately as 'us' or 'there'." },
    { id: 'tu_lei_address', marker: 'tu / Lei / voi', description: "The T/V split. `tu` is familiar singular (with -i agreement and possessive tuo); the polite singular is `Lei`, which takes THIRD-person feminine agreement regardless of the addressee's gender and possessive Suo; `voi` is the plural (and an archaic/regional polite singular). All collapse to English 'you'. This course is tu-based, a deliberate register choice. Note that a Lei-prompt is morphologically indistinguishable from a lei ('she') prompt, so a polite sentence can be misread as third person — the capital is the only cue and tokenizeKnown lowercases it away. License each at its own debut and see the ZUT rule below." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'inflectionIsNotNewVocabulary', rule: "THE GOVERNING RULE FOR THIS KNOWN SIDE. An Italian finite verb fuses person, number, tense, aspect and mood into one ending, and the stem alternates (voglio/voleva/vorrei/voglia; posso/potevo/potrei/possa; vado/andavo/andrò/vada; sono/ero/fui/sia/fossi). Every such form is the SAME gloss as the lemma introduced earlier. Because stemKnownGloss is exact-form by design, the gate reports each as `unknown gloss`. Adjudication rule: map the finding to a lemma; if that lemma is in the introduced inventory at or before this seed, the finding is a matcher false positive to be recorded as such, not a defect to fix." },
    { id: 'enclisisIsMorphologyNotVocabulary', rule: "dirmi, chiederti, aiutarti, mostrarmi, sentirmi, darti, incontrarci, preoccuparti, svegliarmi are single orthographic words containing an introduced verb plus an already-free clitic. A finding on an enclitic form is a finding about the VERB STEM only; the pronoun half is free. Never treat an enclitic form as a new gloss, and never rewrite the Italian to avoid enclisis — it is obligatory on infinitives and gerunds." },
    { id: 'elisionIsOrthographyNotVocabulary', rule: "l'inglese, l'ora, un'idea, d'accordo, all'inizio, cos'è, c'era are single tokens containing a free function word plus something else. Treat the FUNCTION half as already-free and adjudicate only the lexical half. A finding on an elided token is a finding about the word after the apostrophe, and nothing else." },
    { id: 'proDropOptionality', rule: "English 'I want' has two well-formed Italian renderings — 'voglio' and 'io voglio' — because the subject pronoun is optional. This is a one-English→many-Italian choice, and ZUT requires the course to FIX it per prompt rather than let both circulate for the same known prompt. Default to the pronoun-less form (the unmarked register); use the overt pronoun only where the English carries genuine contrast or emphasis." },
    { id: 'youIsThreeWaysAmbiguous', rule: "One English 'you' ⇄ tu / Lei / voi, each with its own verb agreement and possessive. Many-Italian→one-English, driven by register and number English does not mark. Do NOT invent an English contrast to carry it; do NOT treat Lei-forms as new vocabulary once tu-forms are introduced. Be aware Lei takes third-person morphology, so 'vuole' is both 'he/she wants' and 'you (polite) want'." },
    { id: 'genderConcordIsNotAnEnglishDistinction', rule: "occupato/occupata, sicuro/sicura, contento/contenta, andato/andata/andati/andate and every -o/-a/-i/-e agreement variant render to ONE English form. The Italian varies with the gender and number of the referent — including the SPEAKER's gender in first-person predicates ('sono occupato' vs 'sono occupata') and the object's gender in participle agreement ('le ho viste', S184). Many-Italian→one-English; keep the variants as one gloss and never manufacture an English distinction to mirror them." },
    { id: 'essereStareIsOneEnglishBe', rule: "English 'be' maps to essere OR stare, and some predicates take only one ('stare in silenzio', S34, is not *essere in silenzio). A one-English→many-Italian split resolved at translation-choice time, before decomposition. Conversely both paradigms gloss to English 'be'/'am'/'is'/'are', so `è` and `sta` are the same gloss on the English side and must not be tiled as two different English words." },
    { id: 'twoPastsOneEnglishPast', rule: "Imperfetto and passato prossimo both render as English simple past ('voleva' = 'wanted'; 'ha voluto' = 'wanted'), and the passato prossimo ALSO covers English present perfect. One English past therefore has two or three legitimate Italian renderings. Fix the choice per prompt on aspect; never let the same English prompt surface with two different Italian tenses across the course, and never gloss the auxiliary avere as an English 'have'." },
    { id: 'canSplitsPotereRiuscire', rule: "English 'can/could/be able to' splits Italian-side into potere (possibility, permission, general ability) and riuscire a (managing, achieved ability): 'riesco a ricordare' (S10) is 'I can remember' in the sense of succeeding, while 'posso' is 'I may/am allowed'. One English modal → two Italian lemmas with no English cue to choose between them. This is a translation-choice decision that must be made and held, and the two must never both circulate for the same English prompt." },
    { id: 'negativeConcordIsOneEnglishNegative', rule: "'non … niente' / 'non … nessuno' / 'non … mai' contain TWO Italian negative words and exactly ONE English negative ('not … anything' / 'not … anyone' / 'never'). The doubling is obligatory Italian grammar, not emphasis, and must never be rendered as an English double negative. Preverbal n-words drop the `non` with no change of meaning." },
    { id: 'piacereInversionKeepsEnglishSubject', rule: "mi piace / mi piacerebbe / mi dispiace / mi sento / ti sono grato invert the argument structure: the Italian dative clitic is the ENGLISH SUBJECT ('I like', 'I'd like', 'I don't mind', 'I feel', 'I'm grateful'). Never gloss the clitic as an English object pronoun, and never let the Italian subject (the liked thing) surface as an English object." },
    { id: 'ancoraAndPiuArePolarityConditioned', rule: "`ancora` renders 'yet' under negation, 'still' or 'again' in a positive; `più` renders 'more' in a comparative but 'no longer' inside non … più. One Italian form, two unrelated English words, disambiguated only by polarity — which the gate cannot read reliably. Any authoring decision involving ancora or più must state which reading is intended." },
    { id: 'infinitivalLinkerHasNoEnglishGloss', rule: "The di/a that introduces a governed infinitive (ho bisogno DI finire, riesco A ricordare, sto iniziando A leggere) is selected by the governing verb and has NO English counterpart — English uses a single 'to' or nothing. It must be free on the known side and must never be glossed as English 'of' or 'at'." },
    { id: 'noDoSupport', rule: "English do/does/did in questions and negatives have NO Italian counterpart: questions are intonation alone, negatives are bare `non` + verb. They must never be tiled as separate Italian glosses, and their absence from an Italian prompt is never a missing word." },
  ],
};

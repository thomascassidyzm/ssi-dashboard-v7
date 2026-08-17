// _lang_spa — LANGUAGE-LEVEL KNOWN-SIDE BRIEF for SPANISH AS THE KNOWN/PROMPT LANGUAGE.
// FIRST PASS (2026-08-17), ratified:null. Resolves for every course whose courses.known_lang
// is 'spa' and which has no course-specific <code>.contract.cjs override (loadPairContract
// precedence, validation.cjs). Today that is eng_for_spa, cat_for_spa and eus_for_spa (all
// beta); it will cover any future *_for_spa without further work.
//
// DIALECT: this is an AGENT BRIEF, deliberately. It uses freeClass / npi / npiLicensing /
// negation / knownConstructions[{id,marker,description}] / glossRules, and it contains NO
// `test` regex, NO freeGlue and NO negationMarkers — so isMechanicalContract() returns FALSE
// and the gate routes every finding to ADVISORY. Kai's ruling, 2026-08-17: against a fusional
// Romance verb paradigm an exact-form matcher is TRIAGE, not pass/fail. It reports lists; it
// never fails a build.
//
// ── CALIBRATION ──
// Derived from the LIVE corpus: all 2,638 course_legos rows of the three Spanish-known courses
// (cat_for_spa 1,411, eng_for_spa 618, eus_for_spa 609), tokenised with the repo's own
// tokenizeKnown/stemKnownGloss — 5,168 known-side tokens, 776 distinct stems. Example prompts
// cited below are real course_practice_phrases known_text from those courses (seed numbers
// given). Every freeClass item is either attested in that frequency list or is a paradigm-mate
// of an attested one.
//
// ── TYPOLOGICAL PROFILE, AND WHAT IT DOES TO EXACT-FORM MATCHING ──
// Spanish is a Romance, SVO, fusional, PRO-DROP language with a single preverbal negator, a
// clitic pronoun system that is proclitic to finite verbs but ORTHOGRAPHICALLY BOUND (written
// as one word) to infinitives/gerunds/imperatives, obligatory gender-and-number concord across
// the noun phrase, two copulas, and a productive subjunctive. Four consequences the gate cannot
// see:
//
//  1. VERB INFLECTION IS THE DOMINANT FALSE-POSITIVE CLASS — state it first. stemKnownGloss does
//     NO stemming (Tom's rule, 2026-06-15: exact form or nothing), so every inflected form is a
//     distinct stem. The corpus proves the scale: querer surfaces as quiero(26) quieres(20)
//     quiere(16) quería(37) queríamos(8) querías(7) querían(6) queremos(6) quieren(6) quieras
//     quiera; estar as estoy(49) estás(20) está(13) estaba(18) estamos(7) estábamos(6) estabas(4)
//     estaré(5) estarás(4); poder as puedo(21) puedes(14) puede(5) podría(4) pudiera(5) pueda(4)
//     puedas(4) podrá. Introducing "quiero" at S1 licenses NOTHING about "quería" at S37. Expect
//     the large majority of `unknown gloss` findings on a Spanish known side to be inflections of
//     an already-introduced lexeme. Only a finding whose LEMMA is absent from the introduced
//     inventory is a candidate real breach.
//  2. ENCLISIS WRITES A PRONOUN INSIDE THE VERB TOKEN. Spanish attaches object/reflexive clitics
//     to a non-finite verb with NO space and NO hyphen: ayudarme(11), decirme(8), preguntarte(8),
//     irme(6), verte(5), sentirme(4), arreglarlo, hacerlo, cansarme, mostrarme, decírmelo. Each is
//     ONE token to the tokenizer, and it will be reported as unknown even when BOTH `ayudar` and
//     `me` were introduced separately. This is the second-largest false-positive class and it is
//     structurally invisible to the matcher — unlike French, there is no apostrophe to hint at it.
//     (Portuguese hyphenates the same construction, so PT does NOT have this problem; Italian does.)
//  3. PRO-DROP MAKES THE SUBJECT PRONOUN OPTIONAL. "quiero" and "yo quiero" are the same prompt.
//     The subject pronouns are freed below, but the CONSEQUENCE is a ZUT one: English "I want" has
//     two legitimate Spanish renderings and the course must not let both circulate for the same
//     prompt (see glossRules.proDropOptionality).
//  4. THE CORPUS CONTAINS GRAMMATICAL METALANGUAGE THAT IS NOT PROMPT VOCABULARY. eus_for_spa
//     annotates its Spanish prompts with parenthetical case/tense tags: "yo (ergativo)" → nik
//     (S169), "te puedo (dativo potencial)" → dizaizuket (S119), "cuando yo (pasado transitivo)"
//     → nuenean (S148), "ese hombre (ergativo)" → gizon horrek (S227). That is why dativo(16),
//     transitivo(9), relativo(9), ergativo(6), subordinado(10), progresivo(5), partitivo(4),
//     genitivo(4), condicional(4), auxiliar(4), sg(8), plural(5) appear in the Spanish frequency
//     list at all. These are disambiguation annotations for the learner-facing card, not Spanish
//     the learner is being prompted in. I have deliberately left every one of them OUT of
//     freeClass: freeing them would launder an authoring artefact into the contract. They will be
//     reported, and the correct adjudication is "corpus annotation, not a vocabulary breach" —
//     related to the standing parenthetical-tag problem in course_legos.known_text.
//
// ── HONEST GAP: NEGATION DETECTION IS SUBSTRING-BASED HERE ──
// Under a brief contract checkKnownSide has no negationMarkers regex, so it decides "is this
// prompt negated?" by testing whether any `negation` string occurs as a SUBSTRING of the prompt.
// Spanish's negator is the two-letter `no`, which is a substring of nosotros, nombre, conocer,
// nota, novia, nuevo… so a large share of positive prompts will read as negated and the NPI check
// (`NPI token X without negation`) is largely inert for Spanish. I have kept the true markers
// anyway: the list is also the adjudicator's reference, and dropping `no` to buy a check would
// misdescribe the language. Fixing this properly needs a mechanical contract with a real
// negationMarkers regex (/\b(no|nunca|jamás|ni|tampoco)\b/i) and is out of scope for a brief.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND LEFT OUT OF freeClass ──
//   • `bien`(16), `así`(13), `ya`(11), `pues`, `entonces`: discourse/degree particles that shade
//     into content ("hablar catalán bien" is 'speak Catalan well', a real adverb). `ya` IS freed;
//     `bien` and `así` are NOT — the adverbial reading dominates this corpus.
//   • `nada`(7) / `nadie`(5) / `ningún`: negative-concord items, placed in `npi` rather than
//     freeClass. `nada` is also the intensifier 'at all', which the matcher cannot distinguish.
//   • `algo`(26) / `alguien`(10) / `alguna`: free-choice indefinites, NOT NPIs — grammatical in
//     positive declaratives ("quiero leer algo esta noche", eng_for_spa S35). Left out of both
//     lists on purpose; see npiLicensing.
//   • `hay`(10): existential 'there is/are'. Freed, but note it is a suppletive form of haber and
//     shares no surface with the perfect auxiliary he/has/ha.
//   • `todo`/`toda`/`todos`(14/7/…): quantifier, pronoun ('everything') and adverb. Freed as a
//     quantifier; the pronoun reading is arguably content and I have not split it.
//   • `mismo`(8), `mejor`(12), `menos`(9), `sólo`/`solo`(7): degree/comparison items that are
//     sometimes adjectives. `menos` and `más` are freed; `mejor`, `mismo` and `solo` are NOT.
//   • `dativo`, `ergativo`, `transitivo`, `relativo`, `subordinado`, `partitivo`, `genitivo`,
//     `condicional`, `auxiliar`, `progresivo`, `sg`, `plural`: corpus annotation, see point 4.
module.exports = {
  course_code: '_lang_spa',
  ratified: null,
  known_lang: 'spa',
  known_lang_name: 'Spanish',

  // Free class — closed-class Spanish function words, corpus-derived.
  // NOTE ON THE COPULAS: PRESENT-tense forms of both ser and estar are freed here, exactly as
  // _default_eng frees is/are/am/be. PAST, FUTURE and CONDITIONAL copula forms (era, fue, estaba,
  // estaré, sería, estábamos) are deliberately NOT freed — SSi teaches tense explicitly, so a past
  // copula is a taught form, not glue. The perfect auxiliary haber (he, has, ha, hemos, había) is
  // likewise NOT free: it is machinery licensed by the compound-past construction below, mirroring
  // how English 'have' is governed machinery rather than glue in the English contract.
  freeClass: [
    // articles
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
    // preposition+article contractions
    'al', 'del',
    // prepositions
    'a', 'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'hasta', 'desde',
    'entre', 'hacia', 'según', 'tras', 'ante', 'bajo', 'durante',
    // subject pronouns (optional — Spanish is pro-drop — hence pure glue when present)
    'yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras',
    'ellos', 'ellas', 'ustedes',
    // object / reflexive / dative clitics
    'me', 'te', 'se', 'le', 'les', 'nos', 'os',
    // prepositional (tonic) pronouns and the comitative fusions
    'mí', 'ti', 'sí', 'conmigo', 'contigo', 'consigo',
    // possessive determiners
    'mi', 'mis', 'tu', 'tus', 'su', 'sus',
    'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra',
    // demonstratives
    'este', 'esta', 'estos', 'estas', 'esto',
    'ese', 'esa', 'esos', 'esas', 'eso',
    'aquel', 'aquella', 'aquellos', 'aquellas', 'aquello',
    // relatives / complementisers / conjunctions
    'que', 'quien', 'cuyo', 'y', 'e', 'o', 'u', 'pero', 'si', 'porque', 'aunque',
    'sino', 'ni', 'como', 'mientras',
    // degree / quantity adverbs
    'muy', 'más', 'menos', 'tan', 'tanto', 'ya', 'también', 'tampoco', 'casi',
    'demasiado', 'bastante', 'poco', 'mucho', 'mucha', 'muchos', 'muchas',
    'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
    // present-tense copulas only — see note above
    'soy', 'eres', 'es', 'somos', 'sois', 'son',
    'estoy', 'estás', 'está', 'estamos', 'estáis', 'están',
    // existential
    'hay',
  ],

  // NPI / negative-concord items. See the honest gap above: the matcher cannot police these on
  // Spanish. This list and its licensing prose are the ADJUDICATOR's reference.
  npi: ['nada', 'nadie', 'ningún', 'ninguna', 'ninguno', 'ningunos', 'jamás', 'todavía', 'aún', 'siquiera'],
  npiLicensing: {
    rule: "Spanish is a STRICT NEGATIVE-CONCORD language, and that fact, not the item list, is what an adjudicator must hold. (A) The n-WORDS — nada 'nothing/anything', nadie 'nobody/anybody', ningún/ninguna 'no/any', nunca/jamás 'never/ever', tampoco 'neither' — behave in two positions. POSTVERBAL they REQUIRE a preverbal `no` and the double negative is obligatory, not a mistake: 'no estoy tratando de hacer nada' (eng_for_spa S50) is 'I'm not trying to do anything', never *'I'm not trying to do nothing'. PREVERBAL they license themselves and `no` must be ABSENT: 'nadie lo sabe'. So the presence of an n-word with no `no` is NOT automatically a violation — check its position first. (B) `todavía`/`aún` are the polarity-conditioned aspectuals: under negation they render 'yet' ('todavía no sé la respuesta', eus_for_spa S86), in a positive they render 'still' — one Spanish form, two English words, exactly the Tamil-இன்னும் shape. (C) The alg- SERIES — algo(26), alguien(10), alguno/alguna(4) — are FREE-CHOICE / EXISTENTIAL indefinites and are NOT NPIs: they are fully grammatical in a plain positive declarative meaning 'something/someone' ('quiero leer algo esta noche', eng_for_spa S35; 'estoy seguro de que es algo bueno', eus_for_spa S63), and they ALSO extend to 'anything/anyone' under a question, conditional or want-predicate. An alg-item in a positive declarative is NEVER a violation, and the corpus already uses the series correctly — which is why they appear in neither `npi` nor `freeClass`. The ONLY genuine violation is an n-word standing POSTVERBALLY in a positive clause with no preverbal `no` and no other non-veridical licenser. Read the sentence before recording any NPI finding.",
    licensedIn: [
      "Preverbal `no` — the ordinary sentential negator, obligatory with any postverbal n-word (no me importa ahora, eus_for_spa S48; no estoy tratando de hacer nada, eng_for_spa S50)",
      "A preverbal n-word licensing itself (nunca / nadie / nada / ninguno before the verb, with no `no`)",
      "Yes/no and wh-questions, formed by intonation and ¿…? punctuation alone — no do-support, no obligatory inversion (¿qué puedes decir más despacio?, eus_for_spa S68; ¿dónde quieres quedar el sábado?, eng_for_spa S154)",
      "Embedded interrogatives with si ('whether') and indirect questions (no sé si podrá ayudar, eng_for_spa S176)",
      "Conditional clauses with si, including counterfactual si + imperfect subjunctive (si he hecho suficientemente en poco tiempo, cat_for_spa S90)",
      "Volitional / desiderative predicates and their subjunctive complements — querer, gustar/gustaría, esperar, necesitar (quiero que me digas algo, eus_for_spa S170; estoy listo para irme cuando quieras, eus_for_spa S97)",
      "Comparatives with más/menos … que and the superlative (más fácil ahora, cat_for_spa S145)",
      "Doubt / denial / emotion predicates taking the subjunctive (no creo que…, me alegra que…)",
      "Restrictive and exclusive focus — sólo, solamente, únicamente, ni siquiera",
      "Before-clauses (antes de que …, eng_for_spa S126) and other subjunctive-selecting temporal conjunctions",
    ],
  },

  // Negation markers — reference list. See the substring-detection gap in the header.
  negation: ['no', 'nunca', 'jamás', 'ni', 'tampoco', 'nada', 'nadie', 'ningún', 'ninguna'],

  // Spanish machinery the adjudicator licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'preverbal_negation', marker: 'no', description: "Spanish sentential negation is a SINGLE preverbal particle `no`, placed immediately before the finite verb and before any proclitic pronouns (no me importa; no estoy tratando; no puedo recordar, eng_for_spa S57). Unlike French there is no second element. English don't/doesn't/didn't/won't/can't all collapse onto this one word plus the appropriate verb form — a many-English→one-Spanish collapse. It is also obligatory with postverbal n-words (negative concord), where English has only ONE negative. Licensed once as the negation construction." },
    { id: 'pro_drop_agreement', marker: '-o / -as / -a / -amos / -an', description: "The finite verb carries fused person-and-number agreement, so the subject pronoun is OPTIONAL and is normally absent: 'quiero' (eng_for_spa S1) is a complete sentence meaning 'I want'. The pronoun appears only for contrast or emphasis ('yo quiero'). English requires an overt subject in every clause, so English 'I/you/he' correspond to a Spanish VERB ENDING, not to a Spanish word. Licensed at the first finite verb; the ZUT consequence is in glossRules.proDropOptionality." },
    { id: 'clitic_pronouns_and_enclisis', marker: 'me / te / se / lo / la / le / nos + ayudarme, decírmelo', description: "Object, reflexive and dative pronouns are PROCLITIC to a finite verb (me gusta, lo estás haciendo, eus_for_spa S72) but ENCLITIC — written as part of the same word, with no hyphen — on infinitives, gerunds and affirmative imperatives (ayudarme, decirme, preguntarte, irme, verte, sentirme, arreglarlo, cansarme). Clusters stack in a fixed dative-before-accusative order and trigger a written accent (decírmelo). With a periphrasis both positions are legal: 'lo quiero hacer' = 'quiero hacerlo'. The enclitic spelling is the single most misleading thing on this known side for an exact-form matcher — see the header. Also covers the leísmo/le-dative and the spurious `se` (se lo dije). Licensed at the first clitic." },
    { id: 'ser_vs_estar', marker: 'ser / estar', description: "Spanish has TWO copulas where English has one: `ser` for identity, defining properties, origin, time and the passive (es importante, cat_for_spa S65; son personas que hablan inglés, eng_for_spa S87; fue estupendo, eus_for_spa S112) and `estar` for location, resultant states and stage-level predicates (estoy cansado, cat_for_spa S100; está en el escritorio; estoy listo, eus_for_spa S97). The same English adjective can take either with a MEANING change (es aburrido 'is boring' vs está aburrido 'is bored'). One English 'be' → two Spanish lemmas with two full paradigms; the choice is a translation-choice decision that must be made before decomposition (synonym-choice-architecture.md). Licensed as one copula construction covering both lemmas." },
    { id: 'gender_number_concord', marker: 'contento / contenta ; listo / lista ; -s / -es', description: "Articles, adjectives, participles, quantifiers and demonstratives agree in gender and number with their noun, INCLUDING first-person predicates that agree with the speaker: 'estoy contento' vs 'estoy contenta' (cat_for_spa S78/S90), 'no me siento lista' (eng_for_spa S115), 'estoy cansado/cansada'. English has ONE form for all of them. This is a many-Spanish→one-English (ZUT-legal) collapse driven by a feature English does not encode. Each agreement variant is the SAME gloss; an exact-form matcher that has seen `contento` will call `contenta` unknown." },
    { id: 'compound_past_haber', marker: 'he / has / ha / hemos + participio', description: "The pretérito perfecto compuesto — haber (present) + invariant past participle — covers English present perfect and, in peninsular usage, recent simple past: 'he hecho' (cat_for_spa S90), 'me temo que no las he visto' (eus_for_spa S183), 'has aprendido'. The participle does NOT agree here (unlike French). haber is MACHINERY, the analogue of the governed English 'have', and is deliberately kept out of freeClass so its debut is visible; license it once rather than treating he/has/ha/hemos/había as four new content words." },
    { id: 'preterite_vs_imperfect', marker: 'fue / era ; dijo / decía ; estaba / estuvo', description: "Spanish splits past reference two ways where English uses one simple past: PRETERITE for bounded events (fue, dijo, dijiste, vi, pensé, tuve) and IMPERFECT for background, habit and ongoing states (era, decía, estaba, quería, esperábamos). 'mi amigo decía' (cat_for_spa S145) and 'dijiste' (cat_for_spa S121) are both English 'said'. One English past → two Spanish tenses chosen on aspect; the choice must be made deliberately per prompt. Licensed as a tense construction at the first past form. Every preterite and imperfect ending is inflection of an introduced lemma, not new vocabulary." },
    { id: 'periphrastic_future_and_progressive', marker: 'voy a + inf ; estoy + -ndo', description: "Two high-frequency periphrases, both auxiliary + non-finite: (a) ir a + infinitive for the near future — 'voy a poder entender catalán' (cat_for_spa S73), 'mañana voy a practicar' (eus_for_spa S12) — competing with the synthetic future (-ré/-rás: estaré, preguntaré, terminaré); (b) estar + gerund for the progressive — 'estoy tratando de aprender' (eng_for_spa S22), 'estás intentando mostrarme' (cat_for_spa S139), 'estoy empezando a cansarme' (eng_for_spa S41). English 'going to'/'will' map to (a) and English -ing to (b), but Spanish also uses the bare present for both, so the mapping is not one-to-one. Licensed as one periphrasis construction; the auxiliary is machinery, not a gloss." },
    { id: 'subjunctive', marker: 'quieras / vayas / pueda / pudiera / termines', description: "The subjunctive is obligatory after volition, doubt, emotion and evaluation predicates ('quiero que me digas algo', eus_for_spa S170), after certain conjunctions ('antes de que te vayas', eng_for_spa S126; 'cuando quieras', eus_for_spa S97; 'para que…', 'hasta que…'), and in counterfactual conditionals (si pudiera, pudiera/pudiese). English has no morphological counterpart and uses the plain form, so every subjunctive form — present (quieras, pueda, guste, vayas, termines) and imperfect (pudiera, quisiera, fuera) — is a paradigm variant of an already-introduced verb that the matcher will read as new. Licensed as one mood construction." },
    { id: 'conditional_and_politeness', marker: 'gustaría / debería / podría / sería', description: "The conditional (-ría) does double duty: hypothetical apodosis ('lo haría', eus_for_spa S152; 'habría') and POLITE/softened assertion ('me gustaría hablar', eus_for_spa S161; 'deberías', 'podría'). English renders the second as 'would like'/'should'/'could'. gustaría and gusta are the same lemma, and debería is not a new word once deber is known. Licensed as a mood construction." },
    { id: 'modals', marker: 'poder / querer / deber / tener que / necesitar / saber', description: "Spanish modality is carried by FULL VERBS that inflect for person, tense and mood, not by invariant particles: poder 'can/be able' (puedo, puedes, puede, podría, pudiera, podrá), querer 'want' (quiero…quisiera), deber 'should/must' (debería, deberías), tener que 'have to' ('tengo que ir', eus_for_spa S139), hay que 'one must', necesitar 'need' (necesito, necesitamos, necesitas), saber 'know how' (sé, sabía). One English modal ⇄ a whole Spanish paradigm; conversely English 'could' splits into podía / podría / pude / pudiera. These are the highest-frequency verbs in the corpus and hence the highest-volume source of inflection false positives. License the paradigm at the lemma's debut." },
    { id: 'gustar_class_inversion', marker: 'me gusta / me importa / me alegra / me queda', description: "A closed class of psych/experiencer verbs INVERTS the English argument structure: the English subject becomes a Spanish DATIVE clitic and the English object becomes the Spanish subject, so the verb agrees with the thing, not the person — 'me gusta aprender' (eus_for_spa S101) is literally 'to-me pleases learning'; likewise no me importa (S48), me alegra mucho (eng_for_spa S122), me queda más por aprender (eng_for_spa S73), me temo, me siento. The dative clitic is NOT an English 'me' object. Licensed as a construction; never tile the clitic as an English object pronoun." },
    { id: 'question_by_intonation', marker: '¿ … ?', description: "Spanish forms yes/no questions by intonation alone, with declarative word order and the inverted opening mark ¿ as the only orthographic cue; wh-questions front an accented interrogative (qué, cómo, cuándo, dónde, quién, cuánto, adónde, cuál) with optional subject–verb inversion. There is NO do-support: English do/does/did have no Spanish counterpart at all and are absorbed by the question frame. Note that the ¿ and ? characters are stripped by tokenizeKnown, so the matcher sees no difference between a question and a statement. Licensed once as the question construction." },
    { id: 'reflexive_and_impersonal_se', marker: 'se / me / te + verb', description: "`se` is heavily overloaded and each use is machinery, not vocabulary: true reflexive (me siento, me alegra, sentirme), inchoative/aspectual (irme 'to leave', quedarse, cansarme), reciprocal, impersonal/passive ('cómo se dice', eng_for_spa S208; 'cuando se trabaja'), and the spurious se replacing le before lo/la. English usually has no reflexive at all ('feel', 'leave', 'remember'). The person-varying surface (me/te/se/nos) plus enclisis multiplies forms of one lemma. Licensed at the first reflexive verb." },
    { id: 'tu_usted_address', marker: 'tú / usted / vosotros / ustedes', description: "The T/V split, four-way in Spanish: tú (familiar sg, with -s agreement and possessive tu), usted (polite sg, taking THIRD-person agreement and su), vosotros (familiar pl, peninsular, -áis/-éis) and ustedes (polite/general pl, third-person plural agreement). All four collapse to English 'you'. These courses are tú-based, which is a deliberate register choice; note that a usted-prompt is morphologically indistinguishable from a él/ella prompt, so an usted sentence can be misread as third person. License each at its own debut and see the ZUT rule below." },
    { id: 'existential_hay', marker: 'hay / había', description: "Existential 'there is/there are' is the invariant, subjectless form `hay` ('hay muchas cosas buenas en mi cabeza', eng_for_spa S131), past había, future habrá. It is a suppletive impersonal of haber and does NOT inflect for number — one form for both English 'there is' and 'there are'. Non-compositional; license as a unit, never as 'has'." },
    { id: 'personal_a', marker: 'a + human object', description: "A direct object that is human and specific takes the preposition `a` with no English counterpart at all ('conozco a tu amigo', 'quiero ver a mi madre'). It is pure grammatical marking, free glue on the known side, and must never be glossed as English 'to'. Licensed at its first appearance." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'inflectionIsNotNewVocabulary', rule: "THE GOVERNING RULE FOR THIS KNOWN SIDE. A Spanish finite verb fuses person, number, tense, aspect and mood into one ending, and the stem alternates (quiero/quería/quisiera; puedo/pude/podría/pueda; voy/iba/fui/vaya; digo/dije/diga). Every such form is the SAME gloss as the lemma introduced earlier. Because stemKnownGloss is exact-form by design, the gate reports each as `unknown gloss`. Adjudication rule: map the finding to a lemma; if that lemma is in the introduced inventory at or before this seed, the finding is a matcher false positive to be recorded as such, not a defect to fix." },
    { id: 'enclisisIsMorphologyNotVocabulary', rule: "ayudarme, decirme, preguntarte, verte, irme, arreglarlo, sentirme, decírmelo are single orthographic words containing an introduced verb plus an already-free clitic. A finding on an enclitic form is a finding about the VERB STEM only; the pronoun half is free. Never treat an enclitic form as a new gloss, and never split the course's known text to avoid enclisis — enclisis is obligatory on infinitives and gerunds, and rewriting around it would falsify the Spanish." },
    { id: 'proDropOptionality', rule: "English 'I want' has two well-formed Spanish renderings — 'quiero' and 'yo quiero' — because the subject pronoun is optional. This is a one-English→many-Spanish choice, and ZUT requires the course to FIX it per prompt rather than let both circulate for the same known prompt. Default to the pronoun-less form (the unmarked register); use the overt pronoun only where the English carries genuine contrast or emphasis, and say so in the prompt." },
    { id: 'youIsFourWaysAmbiguous', rule: "One English 'you' ⇄ tú / usted / vosotros / ustedes, each with its own verb agreement and possessive. Many-Spanish→one-English, driven by register and number that English does not mark. Do NOT invent an English contrast to carry it; do NOT treat usted-forms as new vocabulary once the tú-forms are introduced. Be aware that usted takes third-person morphology, so 'quiere' is both 'he/she wants' and 'you (polite) want' — a genuine ambiguity the English side must resolve by context." },
    { id: 'genderConcordIsNotAnEnglishDistinction', rule: "contento/contenta, listo/lista, cansado/cansada, and every -o/-a/-os/-as agreement variant render to ONE English form. The Spanish varies with the gender and number of the referent — including the SPEAKER's gender in first-person predicates. Many-Spanish→one-English; keep the variants as one gloss and never manufacture an English distinction to mirror them. Where a first-person prompt must pick a gender, that is a casting decision, not a vocabulary one." },
    { id: 'serEstarIsOneEnglishBe', rule: "English 'be' maps to ser OR estar, and the choice changes meaning with some adjectives. This is a one-English→many-Spanish split that must be resolved at translation-choice time, before decomposition. Conversely both Spanish paradigms gloss to English 'be'/'am'/'is'/'are', so es and está are the same gloss on the English side and must not be tiled as two different English words." },
    { id: 'twoPastsOneEnglishPast', rule: "Preterite and imperfect both render as English simple past (dijiste = 'you said'; decía = 'said/used to say'), and the Spanish compound perfect ALSO covers English simple past in peninsular usage. One English past therefore has three legitimate Spanish renderings. Fix the choice per prompt on aspect; never let the same English prompt surface with two different Spanish tenses across the course, and never gloss the auxiliary haber as an English 'have'." },
    { id: 'negativeConcordIsOneEnglishNegative', rule: "'no … nada' / 'no … nadie' / 'no … nunca' contain TWO Spanish negative words and exactly ONE English negative ('not … anything' / 'not … anyone' / 'never'). The doubling is obligatory Spanish grammar, not emphasis, and must never be rendered as an English double negative. Preverbal n-words drop the `no` with no change of meaning." },
    { id: 'gustarInversionKeepsEnglishSubject', rule: "me gusta / me importa / me alegra / me queda / me temo invert the argument structure: the Spanish dative clitic is the ENGLISH SUBJECT ('I like', 'I don't mind', 'I'm glad'). Never gloss the clitic as an English object pronoun, and never let the Spanish subject (the liked thing) surface as an English object." },
    { id: 'noDoSupport', rule: "English do/does/did in questions and negatives have NO Spanish counterpart: questions are intonation + ¿…?, negatives are bare `no` + verb. They must never be tiled as separate Spanish glosses, and their absence from a Spanish prompt is never a missing word." },
    { id: 'metalanguageIsNotPromptVocabulary', rule: "Parenthetical grammatical tags in known_text — '(ergativo)', '(dativo potencial)', '(pasado transitivo)', '(3sg ergativo)' in eus_for_spa — are authoring annotations that disambiguate which target form is wanted. They are NOT Spanish the learner is prompted in, and they are deliberately absent from freeClass so that they surface in the sweep rather than being laundered as glue. Adjudicate every dativo/ergativo/transitivo/relativo/subordinado/genitivo/partitivo/condicional/auxiliar/progresivo/sg/plural finding as 'corpus annotation', and treat their presence as a separate authoring question about parenthetical tags in known_text, not as a vocabulary breach." },
  ],
};

// _lang_por — LANGUAGE-LEVEL KNOWN-SIDE BRIEF for PORTUGUESE AS THE KNOWN/PROMPT LANGUAGE.
// FIRST PASS (2026-08-17), ratified:null. Resolves for every course whose courses.known_lang
// is 'por' and which has no course-specific <code>.contract.cjs override (loadPairContract
// precedence, validation.cjs). Today that is eng_for_por (beta) alone; it will cover any future
// *_for_por without further work.
//
// DIALECT: this is an AGENT BRIEF, deliberately. It uses freeClass / npi / npiLicensing /
// negation / knownConstructions[{id,marker,description}] / glossRules, and it contains NO
// `test` regex, NO freeGlue and NO negationMarkers — so isMechanicalContract() returns FALSE
// and the gate routes every finding to ADVISORY. Kai's ruling, 2026-08-17: against a fusional
// Romance verb paradigm an exact-form matcher is TRIAGE, not pass/fail.
//
// ── CALIBRATION ──
// Derived from the LIVE corpus: all 616 course_legos rows of eng_for_por, the only Portuguese-known
// course today, tokenised with the repo's own tokenizeKnown/stemKnownGloss — 1,668 known-side
// tokens, 502 distinct stems. Example prompts cited below are real course_practice_phrases
// known_text from eng_for_por (seed numbers given). EXPLICIT GAPS, two of them:
//   (a) SIZE. 502 distinct stems from 1,668 tokens is a type/token ratio of 0.30 and most items
//       are attested once or twice. The free class below is a closed-class paradigm completed from
//       the attested core, not a purely frequency-derived list; re-derive it when a second
//       Portuguese-known course exists.
//   (b) VARIETY. This corpus is EUROPEAN Portuguese, unambiguously — autocarro 'bus', connosco,
//       'estou A gostar' (S101), 'está A fazer' (S107), tu-forms with -s agreement (queres,
//       estás, achas, falas, devias), and the pre-AO spelling in places. Brazilian Portuguese
//       differs on exactly the points this brief is about: BP uses estar + GERUND (estou fazendo)
//       where EP uses estar a + infinitive, prefers PROCLISIS where EP uses enclisis, and has
//       largely replaced tu with você (taking third-person agreement). This contract describes EP
//       because EP is what the estate has. If a pt-BR course is ever built, it needs either a
//       course-code override or a revision of the progressive, clitic-placement and address
//       constructions below — do NOT assume this brief covers it.
//
// ── TYPOLOGICAL PROFILE, AND WHAT IT DOES TO EXACT-FORM MATCHING ──
// Portuguese is a Romance, SVO, fusional, PRO-DROP language with a single preverbal negator,
// clitic pronouns that are ENCLITIC-BY-DEFAULT and hyphenated, obligatory gender-and-number
// concord, heavy preposition+article contraction, an INFLECTED (personal) infinitive and a live
// FUTURE SUBJUNCTIVE — the last two being the features that make Portuguese morphologically the
// richest of the four Romance known sides. Consequences the gate cannot see:
//
//  1. VERB INFLECTION IS THE DOMINANT FALSE-POSITIVE CLASS — say it first. stemKnownGloss does NO
//     stemming (Tom's rule, 2026-06-15: exact form or nothing), so every inflected form is a
//     distinct stem. The corpus proves it even at this size: querer surfaces as quero(4) queres(5)
//     quer(7) queria(8) queríamos querias(2) queriam(2) quiser; estar as estou(15) estás(5)
//     está(8) estava(9) estamos(2) estávamos(2); ser as é(29) foi(7) era(2) seria(2) sou; dever as
//     devia(2) devias(2); poder as pode(2) poderia(1) pudesse(2). Introducing "quero" at S1
//     licenses NOTHING about "queria" at S? — and Portuguese has MORE distinct finite forms per
//     lemma than Spanish or Italian, because the personal infinitive and the future subjunctive add
//     two whole paradigms English has no analogue for. Expect the large majority of `unknown gloss`
//     findings to be inflections of an already-introduced lexeme; only a finding whose LEMMA is
//     absent from the introduced inventory is a candidate real breach.
//  2. ENCLISIS IS HYPHENATED — WHICH HELPS, AND THEN HURTS IN A DIFFERENT WAY. Unlike Spanish and
//     Italian, Portuguese writes an enclitic pronoun after a HYPHEN: ajudar-me (S25),
//     encontrar-nos (S18), perguntar-lhe (S141), dizer-me (S156), dar-lhe. The hyphen is a
//     separator for tokenizeKnown, so 'ajudar' and 'me' come out as two clean tokens and this
//     construction does NOT produce the false-positive flood it produces in Spanish and Italian.
//     BUT: when enclisis triggers a stem change the mutilated stem IS a new token — ajudá-lo
//     yields the stem `ajudá` (attested in this corpus), fazê-lo yields `fazê`, dá-lo yields `dá`.
//     Those are real, unavoidable false positives with no lemma spelled that way anywhere.
//     Mesoclisis (dar-lhe-ei) would fragment worse still; it does not occur in this corpus.
//  3. CONTRACTION IS PERVASIVE AND OBLIGATORY. de/em/a/por fuse with articles, demonstratives and
//     pronouns: do, da, dos, das, no, na, nos, nas, ao, à, aos, às, num, numa, pelo, pela, dele,
//     dela, deles, neste, nesta, disso, daquele. Several of these are HOMOGRAPHS of other words —
//     `a` is the feminine article, the preposition 'to' and a clitic; `no` is 'in-the' but also the
//     Spanish-looking negator that Portuguese does NOT use (Portuguese negates with `não`); `nos`
//     is both 'in-the-pl' and the 1pl clitic 'us'. Freed below, but the conflation is real.
//  4. PRO-DROP. 'quero dizer uma palavra em inglês agora' (S6) has no subject pronoun and needs
//     none. Pronouns are freed below; the ZUT consequence is in glossRules.proDropOptionality.
//
// ── HONEST GAP: NEGATION DETECTION IS SUBSTRING-BASED HERE ──
// Under a brief contract checkKnownSide has no negationMarkers regex, so it decides "is this prompt
// negated?" by testing whether any `negation` string occurs as a SUBSTRING of the prompt.
// Portuguese is by a wide margin the LEAST damaged of the four, and this is the one place where
// measuring beat guessing. MEASURED on the 5,104 build/use/practice prompts of eng_for_por
// (2026-08-17): the substring test calls 22.1% of prompts negated, and a word-boundary regex over
// the same marker list calls 22.1% negated — ZERO false positives, an exact match on this corpus.
// Portuguese gets away with it because its markers are long and tilde-bearing (não, nunca, nada,
// ninguém, nenhum) and none of them occurs word-internally in this vocabulary. The consequence is
// that the NPI check as written IS trustworthy on Portuguese in a way it is not on the other three
// (Spanish 10.2% false-negated, Italian 14.0%, French 14.2%). Do NOT generalise this to a
// Brazilian corpus or to a larger vocabulary without re-measuring — `nada` inside 'nadar' and
// `nem` inside 'nenhum' are latent, just unattested here. A mechanical contract with
// /\b(não|nunca|jamais|nem|nada|ninguém|nenhum\w*)\b/i would make the guarantee structural rather
// than accidental; that upgrade is out of scope for a brief and is recorded here as the next step.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND LEFT OUT OF freeClass ──
//   • `bem`(3), `assim`(2), `então`(2), `claro`, `pois`: discourse/degree particles that shade
//     into content ('falar inglês muito bem' is 'speak English very well', a real adverb). Left OUT.
//   • `já`(4): 'already' / 'now' / (under negation) 'no longer'. Freed as a degree adverb; the
//     polarity-conditioned reading is flagged in glossRules.
//   • `nada`(4), `ninguém`(3), `nenhum`: negative-concord items, in `npi` not freeClass. `nada` is
//     also the intensifier 'at all' ('não me importo nada', S191) — the matcher cannot tell them apart.
//   • `algo`(6), `alguém`, `algum`(4), `algumas`(2): free-choice/existential indefinites, NOT NPIs —
//     grammatical in positive declaratives. Deliberately in neither list; see npiLicensing (C).
//   • `só`(2), `mesmo`/`mesma`(3), `melhor`(4): degree/comparison items that are sometimes
//     adjectives. `mais` and `menos` are freed; `só`, `mesmo` and `melhor` are NOT.
//   • `tudo`/`toda`/`todo`(3): quantifier and pronoun ('everything'). Freed as a quantifier; the
//     pronoun reading is arguably content and I have not split it.
//   • `lo`(3): the allomorph of the 3sg clitic `o` after -r/-s/-z (ajudá-LO). It appears as a bare
//     token only because the hyphen split it off. Freed as a clitic.
//   • `há`(7): existential 'there is/are' AND the temporal 'ago' ('há um bocado'). Freed; the
//     conflation is real and both readings are grammatical machinery.
module.exports = {
  course_code: '_lang_por',
  ratified: null,
  known_lang: 'por',
  known_lang_name: 'Portuguese',

  // Free class — closed-class Portuguese function words, corpus-derived where attested and
  // completed to whole paradigms elsewhere (see the calibration gaps above).
  // NOTE ON THE COPULAS: PRESENT-tense forms of ser and estar are freed here, exactly as
  // _default_eng frees is/are/am/be. PAST, FUTURE and CONDITIONAL copula forms (era, foi, estava,
  // estávamos, seria, será) are deliberately NOT freed — SSi teaches tense explicitly, so a past
  // copula is a taught form, not glue. The perfect/pluperfect auxiliary ter (tenho, tem, tinha,
  // teria) is likewise NOT free: it is machinery licensed by the compound-tense construction below,
  // mirroring how English 'have' is governed machinery rather than glue in the English contract.
  freeClass: [
    // articles
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    // preposition+article / preposition+pronoun / preposition+demonstrative contractions
    'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
    'ao', 'à', 'aos', 'às', 'num', 'numa', 'nuns', 'numas',
    'pelo', 'pela', 'pelos', 'pelas',
    'dele', 'dela', 'deles', 'delas', 'nele', 'nela',
    'neste', 'nesta', 'nisto', 'nesse', 'nessa', 'disso', 'disto', 'daquele', 'daquilo',
    // simple prepositions
    'de', 'em', 'com', 'por', 'para', 'sem', 'sobre', 'até', 'desde', 'entre',
    'contra', 'durante', 'após', 'perante',
    // subject pronouns (optional — Portuguese is pro-drop — hence pure glue when present)
    'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
    // object / reflexive / dative clitics and their post-consonantal allomorphs
    'me', 'te', 'se', 'lhe', 'lhes', 'vos', 'lo', 'la', 'los', 'las', 'no-lo',
    // prepositional (tonic) pronouns and the comitative fusions
    'mim', 'ti', 'si', 'comigo', 'contigo', 'consigo', 'connosco', 'conosco',
    // possessive determiners (Portuguese normally keeps the article: o meu, a minha)
    'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
    'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
    // demonstratives
    'este', 'esta', 'estes', 'estas', 'isto',
    'esse', 'essa', 'esses', 'essas', 'isso',
    'aquele', 'aquela', 'aqueles', 'aquelas', 'aquilo',
    // relatives / complementisers / conjunctions
    'que', 'quem', 'cujo', 'e', 'ou', 'mas', 'se', 'porque', 'embora',
    'como', 'enquanto', 'pois', 'nem',
    // degree / quantity adverbs and quantifiers
    'muito', 'muita', 'muitos', 'muitas', 'mais', 'menos', 'tão', 'tanto',
    'já', 'também', 'quase', 'demasiado', 'bastante', 'pouco', 'bocado',
    'todo', 'toda', 'todos', 'todas', 'tudo', 'outro', 'outra', 'outros', 'outras',
    // present-tense copulas only — see note above
    'sou', 'és', 'é', 'somos', 'são',
    'estou', 'estás', 'está', 'estamos', 'estão',
    // existential / temporal 'há'
    'há',
  ],

  // NPI / negative-concord items. See the honest gap above. This list and its licensing prose are
  // primarily the ADJUDICATOR's reference, though Portuguese is the one Romance known side where a
  // mechanical upgrade would make the matcher's NPI check genuinely work.
  npi: ['nada', 'ninguém', 'nenhum', 'nenhuma', 'nenhuns', 'nunca', 'jamais', 'ainda', 'sequer'],
  npiLicensing: {
    rule: "Portuguese is a STRICT NEGATIVE-CONCORD language, and that fact, not the item list, is what an adjudicator must hold. (A) The n-WORDS — nada 'nothing/anything', ninguém 'nobody/anybody', nenhum/nenhuma 'no/any', nunca/jamais 'never/ever', nem 'nor/not even' — behave in two positions. POSTVERBAL they REQUIRE a preverbal `não` and the double negative is obligatory, not an error: 'não me importo nada de falar sobre isso agora' (S191) is 'I don't mind at all talking about this now', never *'I don't mind nothing'; 'nada parece funcionar esta manhã' (S146) shows the same item PREVERBALLY, where it licenses itself and `não` must be ABSENT. So an n-word with no `não` is NOT automatically a violation — check its position first, and note that S146 is a live corpus example of the preverbal pattern. (B) `ainda` is the polarity-conditioned aspectual: under negation it renders 'yet' ('ainda não sei'), in a positive it renders 'still'. One Portuguese form, polarity-conditioned English rendering, exactly the Tamil-இன்னும் shape; `já` mirrors it from the other side ('already' positive, 'no longer' under negation). Both need rendering rules, not NPI-only restrictions. (C) The alg- SERIES — algo(6), alguém, algum(4), algumas(2) — are FREE-CHOICE / EXISTENTIAL indefinites and are NOT NPIs: they are fully grammatical in a plain positive declarative meaning 'something/someone/some' ('quando aprendemos algo novo', S111) and they ALSO extend to 'anything/anyone' under a question, conditional or want-predicate. An alg-item in a positive declarative is NEVER a violation, which is why the series appears in neither `npi` nor `freeClass`. The ONLY genuine violation is an n-word standing POSTVERBALLY in a positive clause with no preverbal `não` and no other non-veridical licenser. Read the sentence before recording any NPI finding.",
    licensedIn: [
      "Preverbal `não` — the ordinary sentential negator, obligatory with any postverbal n-word (ele não quer parar de falar inglês, S34; eu não concordo com o que ela quer fazer, S84; não foi o que eu esperava, S151)",
      "A preverbal n-word licensing itself (nada / ninguém / nunca before the verb, with no `não` — nada parece funcionar esta manhã, S146)",
      "Yes/no and wh-questions, formed by intonation and question order alone, with the EP 'o que é que' frame as the common wh-shape — no do-support (vais ajudar-me?, S25; tem a certeza de que consigo?, S63; o que é que achas disso?, S162; o que é que vais fazer?, S179)",
      "Embedded interrogatives with se ('whether') and indirect questions (vou perguntar-lhe se está no escritório, S184)",
      "Conditional clauses with se, including counterfactual se + imperfect subjunctive (se eu lhe pedisse para falar inglês comigo, S203; seria ótimo se tivesse um pouco mais de tempo, S96)",
      "FUTURE-SUBJUNCTIVE clauses — quando/se/enquanto + future subjunctive (quando quiseres, se puderes, depois de terminares), a non-veridical environment Portuguese marks morphologically and English does not mark at all",
      "Volitional / desiderative predicates and their subjunctive complements — querer, gostar/gostaria, esperar, precisar de (gostaria de ver o que está a fazer, S107; eu preciso de lembrar a frase toda, S44)",
      "Comparatives with mais/menos … (do) que and the superlative (é menos difícil do que o que ela estava a dizer, S132; o mais depressa possível, S50)",
      "Doubt / denial / opinion predicates taking the subjunctive (não acho que…, duvido que…)",
      "Restrictive and exclusive focus — só, apenas, somente, nem sequer",
      "Antes que / sem que and other subjunctive-selecting subordinators",
    ],
  },

  // Negation markers — reference list. See the substring-detection gap in the header.
  negation: ['não', 'nunca', 'jamais', 'nem', 'nada', 'ninguém', 'nenhum', 'nenhuma'],

  // Portuguese machinery the adjudicator licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'preverbal_negation', marker: 'não', description: "Portuguese sentential negation is a SINGLE preverbal particle `não`, placed immediately before the finite verb and before any proclitics (ele não quer parar, S34; não me importo, S191; não há problema, S141). Unlike French there is no second element. English don't/doesn't/didn't/won't/can't all collapse onto this one word plus the appropriate verb form — a many-English→one-Portuguese collapse. `não` is ALSO the standalone answer 'no', and it is obligatory with postverbal n-words (negative concord) where English has only ONE negative. Note it must not be confused with the contraction `no` (= em + o, 'in the'), which is a completely different word. Licensed once as the negation construction." },
    { id: 'pro_drop_agreement', marker: '-o / -s / -mos / -m', description: "The finite verb carries fused person-and-number agreement, so the subject pronoun is OPTIONAL and normally absent: 'quero dizer uma palavra em inglês agora' (S6) is a complete sentence. The pronoun appears for contrast or emphasis, and the corpus shows both ('eu quero', S1, alongside bare 'quero'). English requires an overt subject in every clause, so English 'I/you/he' correspond to a Portuguese VERB ENDING, not to a Portuguese word. Licensed at the first finite verb; the ZUT consequence is in glossRules.proDropOptionality." },
    { id: 'clitic_placement_and_enclisis', marker: 'ajudar-me / perguntar-lhe / dizer-me / ajudá-lo', description: "European Portuguese is ENCLITIC BY DEFAULT: the object/reflexive/dative pronoun follows the verb and is joined by a HYPHEN (vais ajudar-me?, S25; gostaria de encontrar-nos, S18; pode perguntar-lhe, S141; pode dizer-me onde é o restaurante?, S156; quer que eu o ajude, S171). It switches to PROCLISIS after a negator, a wh-word, a subordinating conjunction, certain adverbs and some quantifiers — 'não me importo' (S191), not *'não importo-me'. Before -r/-s/-z the clitic o/a/os/as takes the allomorph lo/la/los/las AND the verb loses its final consonant with a compensatory accent: ajudar+o → ajudá-lo, fazer+o → fazê-lo. The hyphen means tokenizeKnown splits these cleanly — the one place Portuguese is EASIER on the matcher than Spanish or Italian — but the mutilated stem (ajudá, fazê) is an unavoidable false positive. `lhe`/`lhes` is the dative and has no direct English pronoun of its own. Licensed at the first clitic." },
    { id: 'ser_vs_estar', marker: 'ser / estar', description: "Portuguese has TWO copulas where English has one: `ser` for identity, defining properties, origin, time and the passive (é uma boa ideia, S123; é interessante ver, S129; foi a melhor escolha, S117) and `estar` for location, resultant states and stage-level predicates (estou cansada, S39; está ocupada, S198; estás a ir tão bem, S129). The same English adjective takes either with a MEANING change (é aborrecido 'is boring' vs está aborrecido 'is bored'). One English 'be' → two Portuguese lemmas with two full paradigms; the choice is a translation-choice decision to be made before decomposition (synonym-choice-architecture.md). Licensed as one copula construction covering both lemmas." },
    { id: 'contractions', marker: 'do / da / no / na / ao / à / num / pelo / dele / disso', description: "Portuguese obligatorily FUSES a preposition with a following article, demonstrative or third-person pronoun: de+o→do, de+a→da, em+o→no, em+a→na, a+o→ao, a+a→à, em+um→num, por+o→pelo, de+ele→dele, em+este→neste, de+isso→disso. English 'of the' / 'in the' / 'to the' / 'by the' / 'his' / 'about that' collapse into these single words (o mais depressa possível, S50; na próxima semana, S59; ao amigo dele, S54; disso, S162). Free glue; never require a separate introduction for the article inside a contraction, and never gloss `dele` as two English words." },
    { id: 'gender_number_concord', marker: 'cansado / cansada ; ocupado / ocupada ; -s', description: "Articles, adjectives, participles, quantifiers and demonstratives agree in gender and number, INCLUDING first-person predicates that agree with the speaker: 'estou ansiosa' (S29) and 'estou cansada' (S39) are a female speaker's forms; 'está ocupada' (S198) agrees with 'a minha filha'; 'surpreendido' (S77) is masculine. English has ONE form for all of them. Many-Portuguese→one-English (ZUT-legal), driven by a feature English does not encode. Each agreement variant is the SAME gloss; a matcher that has seen `cansado` will call `cansada` unknown." },
    { id: 'compound_tenses_ter', marker: 'tenho feito / tinha dito', description: "Portuguese compounds with `ter` (not haver, and not the Spanish haber): tenho + participle for the pretérito perfeito COMPOSTO — which, unlike Spanish and Italian, denotes a REPEATED or continuing action up to now ('tenho falado' = 'I have been speaking', NOT a simple past) — and tinha + participle for the pluperfect ('tinha', S-corpus). This is a genuine trap for an English author: English present perfect maps to the Portuguese SIMPLE past (pretérito perfeito simples) far more often than to the compound. ter is MACHINERY, the analogue of the governed English 'have', and is deliberately kept out of freeClass so its debut is visible; license it once rather than treating tenho/tem/tinha/teria as new content words. Note `ter` is also the ordinary lexical verb 'to have' (tem a certeza, S63)." },
    { id: 'preterite_vs_imperfect', marker: 'foi / era ; disse / dizia ; estava / esteve', description: "Portuguese splits past reference two ways where English uses one simple past: PRETÉRITO PERFEITO SIMPLES for bounded events (foi, S117; fiz, disse, vi, saí, conversámos, tentámos, esqueci, aprendi) and IMPERFEITO for background, habit and ongoing states (era, estava, S132; queria, S-corpus; devia, costumava, tinha). 'estava a dizer' (S132) and 'disse' are both English past. One English past → two Portuguese tenses chosen on aspect; the choice must be made deliberately per prompt. Licensed as a tense construction at the first past form. Every preterite and imperfect ending is inflection of an introduced lemma, not new vocabulary." },
    { id: 'progressive_estar_a_infinitivo', marker: 'estar a + infinitivo', description: "THE DIAGNOSTIC EUROPEAN-PORTUGUESE CONSTRUCTION. EP forms the progressive with estar + a + INFINITIVE, not with a gerund: 'estou a gostar de descobrir mais' (S101), 'gostaria de ver o que está a fazer' (S107), 'é interessante ver como estás a ir tão bem' (S129), 'do que o que ela estava a dizer' (S132). Brazilian Portuguese uses estar + GERUND (estou fazendo) instead — see the variety gap in the header. English -ing maps here, but Portuguese also uses the simple present far more freely than English does, so the mapping is not one-to-one. The `a` is grammatical marking with no English counterpart and must never be glossed as 'to'. Licensed once as the progressive construction." },
    { id: 'periphrastic_future', marker: 'vou + infinitivo', description: "Near future = ir (present) + infinitive: 'vou tentar conhecer pessoas mais tarde' (S22), 'vou tentar fazer isso na próxima semana' (S59), 'vou perguntar-lhe' (S184), vais(2), vai(7). It competes with the synthetic future (-rei/-rás/-rá) and with the present used futurally. English 'going to' and 'will' both map here; the choice is a register/immediacy distinction English does not mark. Licensed as one future construction covering both formations." },
    { id: 'inflected_infinitive', marker: 'terminares / terminarmos / falarmos', description: "PORTUGUESE-SPECIFIC, AND THE FEATURE MOST LIKELY TO CONFUSE AN ENGLISH AUTHOR. Portuguese has a PERSONAL (inflected) INFINITIVE: the infinitive itself takes person-number endings when its subject differs from the main clause's — 'quero praticar falar inglês depois de terminares' (S11, 'after YOU finish'), 'até terminarmos' ('until WE finish'), 'para falarmos'. No other Romance language in this estate has it and English has nothing like it. Every inflected infinitive is a paradigm variant of an introduced verb that the matcher will read as new, and an author who does not know the form exists may mistake it for a typo. Licensed as one construction at its first appearance." },
    { id: 'subjunctive_including_future', marker: 'pedisse / tivesse / ajudasse / pudesse ; quiser / puderes', description: "Portuguese has THREE subjunctive tenses where English has none. PRESENT subjunctive after volition, doubt, emotion and evaluation predicates and after certain conjunctions ('quer que eu o ajude', S171; 'não há problema', 'embora'). IMPERFECT subjunctive in counterfactual conditionals ('se eu lhe pedisse', S203; 'seria ótimo se tivesse um pouco mais de tempo', S96; ajudasse, pudesse, contasses, fizeste/fizesse). And — distinctively — a FUTURE SUBJUNCTIVE after se/quando/enquanto/assim que referring to future contingency (se quiser, quando puderes, se for). English uses the plain present for all three. Every such form is a paradigm variant of an already-introduced verb that the matcher will read as new. Licensed as one mood construction." },
    { id: 'conditional_and_politeness', marker: 'gostaria / seria / poderia / devia / faria', description: "The conditional (-ria) does double duty: hypothetical apodosis ('seria ótimo se tivesse…', S96; 'farias', 'teria') and POLITE/softened assertion ('gostaria de encontrar-nos esta noite', S18; 'gostaria de ver', S107; 'poderia'). Colloquial EP also uses the IMPERFECT for the same softening ('devia', 'devias', 'queria' = 'I'd like'), which is why 'queria'(8) is so frequent in this corpus and must not be read as a plain past. English renders these as 'would like'/'should'/'could'. gostaria is not a new word once gosto is known. Licensed as a mood construction." },
    { id: 'modals', marker: 'poder / querer / dever / ter de / precisar de / conseguir / saber', description: "Portuguese modality is carried by FULL VERBS that inflect for person, tense and mood: poder 'can/may' (pode, S141/S156; poderia; pudesse), querer 'want' (quero/queres/quer/queria), dever 'should/must' (devia, devias), ter de/que 'have to', precisar de 'need' (eu preciso de lembrar, S44; precisava, precisas, precisamos), conseguir 'manage to / be able to' (tem a certeza de que consigo?, S63; consegue; conseguir) — note that Portuguese splits English 'can' between poder (permission/possibility) and conseguir (achieved ability), a one-English→two-Portuguese split with no English cue — and saber 'know how' (sabia). One English modal ⇄ a whole Portuguese paradigm. These are the highest-frequency verbs in the corpus and hence the highest-volume source of inflection false positives. License the paradigm at the lemma's debut." },
    { id: 'gostar_de_and_psych_verbs', marker: 'gostar de / importar-se / apetecer', description: "Portuguese `gostar` REQUIRES the preposition `de` before its complement ('gosto de falar', 'estou a gostar de descobrir', S101) — the `de` is grammatical marking with no English counterpart and must never be glossed as 'of'. A related closed class inverts or reflexivises where English does not: importar-se 'to mind' ('não me importo nada', S191), apetecer, doer, faltar, parecer ('nada parece funcionar', S146). The clitic in 'não me importo' is NOT an English 'me' object. Licensed as a construction." },
    { id: 'question_formation', marker: 'o que é que … / intonation', description: "Portuguese forms yes/no questions by intonation alone, with declarative word order ('vais ajudar-me?', S25; 'tem a certeza de que consigo?', S63); wh-questions front an interrogative (o que, que, quem, quando, onde, porque, como, quanto, qual) and EP very commonly uses the reinforcing frame 'o que é que' / 'quem é que' ('o que é que achas disso?', S162; 'o que é que vais fazer?', S179), which is non-compositional and must be licensed whole rather than tiled as 'what is it that'. There is NO do-support: English do/does/did have no Portuguese counterpart. The '?' is stripped by tokenizeKnown, so the matcher cannot see that a prompt is a question. Licensed once as the question construction." },
    { id: 'reflexive_and_impersonal_se', marker: 'se / me / te + verb', description: "`se` is heavily overloaded and each use is machinery, not vocabulary: true reflexive (sentir-se, lembrar-se, esqueci-me), inherent/pronominal verbs (importar-se, ir-se), reciprocal, and impersonal/passive ('quando se trabalha em algo difícil', S136; 'diz-se'). English usually has no reflexive at all ('feel', 'remember', 'mind'). The person-varying surface (me/te/se/nos) plus enclisis multiplies forms of one lemma. `se` is ALSO the conjunction 'if' and the complementiser 'whether' — three unrelated functions on one string, which the matcher cannot separate. Licensed at the first reflexive verb." },
    { id: 'existential_ha', marker: 'há', description: "Existential 'there is/there are' is the invariant, subjectless form `há` ('não há problema', S141), past havia, future haverá. It does NOT inflect for number — one form for both English 'there is' and 'there are' — and it is ALSO the temporal 'ago' ('há um bocado' = 'a while ago'). Non-compositional; license as a unit, never as 'has'." },
    { id: 'tu_voce_address', marker: 'tu / você / o senhor', description: "The T/V split, and it differs by variety. European Portuguese uses `tu` for the familiar singular with distinctive second-person agreement (queres, estás, achas, falas, devias, terminares — all attested here), reserves `você` for a middle register, and uses `o senhor`/`a senhora` or a bare third-person verb for the polite ('tem a certeza…?', S63; 'pode dizer-me…?', S156 — polite forms with NO pronoun at all). Brazilian Portuguese has largely replaced tu with você. All of them collapse to English 'you'. Note that a você/o-senhor prompt is morphologically indistinguishable from an ele/ela prompt, so a polite sentence can be misread as third person. License each at its own debut and see the ZUT rule below." },
    { id: 'personal_a_absent', marker: '(no personal a)', description: "Recorded as a NEGATIVE fact because it is a live cross-Romance trap: unlike Spanish, Portuguese does NOT mark a human direct object with `a` ('conheço o teu amigo', not *'conheço ao teu amigo'). An author working across the estate's Spanish and Portuguese courses must not carry the Spanish personal `a` across. The `a` that does appear before an infinitive is the progressive marker (estar a + inf), a different thing entirely." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'inflectionIsNotNewVocabulary', rule: "THE GOVERNING RULE FOR THIS KNOWN SIDE. A Portuguese finite verb fuses person, number, tense, aspect and mood into one ending, and Portuguese has MORE paradigms than its Romance siblings — three subjunctives plus a personal infinitive. Every such form (quero/queria/quisesse/quiser; posso/podia/poderia/pudesse/puder; sou/era/fui/seja/fosse/for) is the SAME gloss as the lemma introduced earlier. Because stemKnownGloss is exact-form by design, the gate reports each as `unknown gloss`. Adjudication rule: map the finding to a lemma; if that lemma is in the introduced inventory at or before this seed, the finding is a matcher false positive to be recorded as such, not a defect to fix." },
    { id: 'hyphenatedEnclisisSplitsCleanly', rule: "ajudar-me, encontrar-nos, perguntar-lhe, dizer-me tokenise into a clean verb plus a clean clitic, because the hyphen is a separator. Portuguese therefore does NOT suffer the enclitic false-positive flood that Spanish (ayudarme) and Italian (dirmi) suffer, and a finding on one of these halves is about that half alone. The EXCEPTION is the -r/-s/-z allomorph, where the verb is mutilated: ajudá-lo → `ajudá`, fazê-lo → `fazê`, dá-lo → `dá`. Those stems exist nowhere in any inventory and are unavoidable false positives — adjudicate them by restoring the infinitive (ajudá → ajudar)." },
    { id: 'proDropOptionality', rule: "English 'I want' has two well-formed Portuguese renderings — 'quero' and 'eu quero' — because the subject pronoun is optional, and this corpus contains BOTH ('eu quero', S1; 'quero dizer…', S6). This is a one-English→many-Portuguese choice, and ZUT requires the course to FIX it per prompt rather than let both circulate for the same known prompt. Default to the pronoun-less form; use the overt pronoun only where the English carries genuine contrast or emphasis." },
    { id: 'youIsVarietyDependent', rule: "One English 'you' ⇄ tu / você / o senhor / vocês, each with its own agreement, AND the split differs between European and Brazilian Portuguese. Many-Portuguese→one-English, driven by register, number and variety that English does not mark. Do NOT invent an English contrast to carry it; do NOT treat você-forms as new vocabulary once tu-forms are introduced. Be aware você and o senhor take third-person morphology, so 'quer' is both 'he/she wants' and 'you (polite) want'. Keep one variety per course — this corpus is EP and must stay EP." },
    { id: 'genderConcordIsNotAnEnglishDistinction', rule: "cansado/cansada, ocupado/ocupada, ansioso/ansiosa, surpreendido/surpreendida and every -o/-a/-s agreement variant render to ONE English form. The Portuguese varies with the gender and number of the referent — including the SPEAKER's gender in first-person predicates ('estou cansada', S39, is a female speaker). Many-Portuguese→one-English; keep the variants as one gloss and never manufacture an English distinction to mirror them. Where a first-person prompt must pick a gender, that is a casting decision, not a vocabulary one." },
    { id: 'serEstarIsOneEnglishBe', rule: "English 'be' maps to ser OR estar, and the choice changes meaning with some adjectives. A one-English→many-Portuguese split resolved at translation-choice time, before decomposition. Conversely both paradigms gloss to English 'be'/'am'/'is'/'are', so `é` and `está` are the same gloss on the English side and must not be tiled as two different English words." },
    { id: 'compoundPerfectIsNotTheEnglishPerfect', rule: "THE HIGHEST-RISK ZUT TRAP ON THIS KNOWN SIDE. Portuguese 'tenho falado' does NOT mean English 'I have spoken' — it means 'I have been speaking (repeatedly, up to now)'. English present perfect normally corresponds to the Portuguese SIMPLE preterite ('falei'). An author transferring the Spanish or French compound-past mapping will systematically mis-render every English perfect. Fix the mapping explicitly: English simple past AND English present perfect both usually → pretérito perfeito simples; reserve ter + participle for genuinely iterative/continuing readings." },
    { id: 'twoPastsOneEnglishPast', rule: "Pretérito perfeito simples and imperfeito both render as English simple past ('disse' = 'said'; 'dizia' = 'said/used to say'), and colloquial EP also uses the imperfect where English uses 'would' ('queria' = 'I'd like'). One English past therefore has several legitimate Portuguese renderings. Fix the choice per prompt on aspect; never let the same English prompt surface with two different Portuguese tenses across the course." },
    { id: 'estarAInfinitivoIsTheProgressive', rule: "EP 'estou a fazer' and BP 'estou fazendo' are the SAME gloss — English 'I'm doing'. The `a` is not English 'to' and must never be tiled as a separate gloss. Do not mix the two formations within one course: this corpus is European Portuguese and uses estar a + infinitive throughout." },
    { id: 'canSplitsPoderConseguir', rule: "English 'can/could/be able to' splits Portuguese-side into poder (possibility, permission) and conseguir (managing, achieved ability): 'consigo' (S63) is 'I can' in the sense of succeeding, while 'posso' is 'I may/am allowed'. One English modal → two Portuguese lemmas with no English cue to choose between them. A translation-choice decision that must be made and held; the two must never both circulate for the same English prompt." },
    { id: 'negativeConcordIsOneEnglishNegative', rule: "'não … nada' / 'não … ninguém' / 'não … nunca' contain TWO Portuguese negative words and exactly ONE English negative ('not … anything' / 'not … anyone' / 'never'). The doubling is obligatory Portuguese grammar, not emphasis, and must never be rendered as an English double negative. Preverbal n-words drop the `não` with no change of meaning ('nada parece funcionar', S146)." },
    { id: 'governedPrepositionsHaveNoEnglishGloss', rule: "Portuguese verbs govern fixed prepositions with no English counterpart: gostar DE, precisar DE, lembrar-se DE, estar A + infinitive, começar A, ter DE. English uses a bare complement or a single 'to'. These prepositions are free grammatical marking on the known side and must never be glossed as English 'of'/'at'/'to'." },
    { id: 'aAndNosAreHomographs', rule: "`a` is simultaneously the feminine definite article, the preposition 'to', the progressive marker and a clitic; `nos` is both 'in the (pl)' and the 1pl clitic 'us'; `no` is 'in the', never a negator; `se` is a reflexive clitic, 'if' and 'whether'; `há` is 'there is' and 'ago'. The matcher sees one string for each and cannot separate the readings. Every one of them is a function word in every reading, so freeing them is safe — but an adjudicator reading a finding NEAR one of them must not assume which reading is in play." },
    { id: 'jaAndAindaArePolarityConditioned', rule: "`já` renders 'already'/'now' in a positive but 'no longer' under negation ('já não'); `ainda` renders 'still' in a positive but 'yet' under negation ('ainda não'). One Portuguese form, two unrelated English words, disambiguated only by polarity. Any authoring decision involving já or ainda must state which reading is intended." },
    { id: 'noDoSupport', rule: "English do/does/did in questions and negatives have NO Portuguese counterpart: questions are intonation or the 'o que é que' frame, negatives are bare `não` + verb. They must never be tiled as separate Portuguese glosses, and their absence from a Portuguese prompt is never a missing word." },
  ],
};

// _lang_deu — LANGUAGE-LEVEL known-side BRIEF for deu-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// AGENT-BRIEF DIALECT, DELIBERATELY. This file uses freeClass / npi / npiLicensing / negation /
// knownConstructions[{id,marker,description}] / glossRules — NOT freeGlue / negationMarkers /
// constructions[{id,test}]. That is what makes isMechanicalContract() return false, and under Kai's
// ruling (2026-08-17) a brief contract is ADVISORY: the exact-form matcher reports lists, it never
// fails a build. For German that is not a concession, it is the only honest setting — see below.
//
// ── CALIBRATION ──────────────────────────────────────────────────────────────────────────────
// Calibrated 2026-08-17 on the ONE deu-known course that has content: eng_for_deu (status beta,
// 300 seeds, 630 course_legos rows, 5,880 course_practice_phrases rows). Token counts through
// tokenizeKnown + stemKnownGloss as of the 2026-08-17 Unicode-aware tokenizer: 1,731 tokens /
// 543 types from the LEGO known_text, and 33,545 tokens / 685 types from the practice-phrase
// known_text. The freeClass below was derived by walking that 685-type frequency list top-down
// and keeping only closed-class items; every entry marked as corpus-attested appears in it.
// There is no second deu-known course to cross-check against — that is an explicit gap, and any
// item here that is German grammar rather than eng_for_deu usage is flagged as such.
//
// ── ESZETT AND UMLAUTS: WHAT I ACTUALLY MEASURED ─────────────────────────────────────────────
// The repo trap is real but it is NOT in the current tokenizer. Verified directly:
//   tokenizeKnown('Ich weiß, daß es groß ist') → ["ich","weiß","daß","es","groß","ist"]
//   tokenizeKnown('Ich möchte über Straßen sprechen') → ["ich","möchte","über","straßen","sprechen"]
// ß, ä/ö/ü and the NFC pass all behave: \p{L} admits ß and the umlauted vowels, and NFC folds a
// decomposed u+U+0308 onto ü so the prompt and the inventory hash alike. Before the 2026-08-17
// fix the class was [^a-z'], which would have split "weiß" into "wei" and "" and "möchte" into
// "m|chte" — i.e. the historic undercount. It is fixed.
// TWO RESIDUAL FACTS, both real, neither fixable from a contract file:
//   (a) ß and ss do NOT unify. stemKnownGloss('weiß')='weiß' but stemKnownGloss('WEISS')='weiss'.
//       A Swiss-orthography course (deu_ch) writing "weiss/gross/dass" where the parent course
//       writes "weiß/groß" would read as an entirely separate lexeme set. I checked eng_for_deu
//       for this: 7 ß-types (weiß:90, weißt:27, genieße:40, spaß:22, fußball:14, heißt:9,
//       genießt:1) and ZERO of them also occurs in an ss spelling, so this course is internally
//       consistent and the risk is dormant here. It is live for any future deu_ch/deu_at course.
//   (b) expandContractions() is English and fires on German apostrophes:
//       tokenizeKnown("Wie geht's dir?") → ["wie","geht","is","dir"] — the colloquial 's clitic
//       (es) is rewritten to the ENGLISH word "is", inventing a token that is not German at all.
//       eng_for_deu has ZERO apostrophes in 5,880 prompts, so this is currently harmless; it will
//       fire the day a course writes "gibt's / wie's / hab's". Noted here, not fixed here.
//
// ── WHY EXACT-FORM MATCHING CANNOT ADJUDICATE GERMAN ─────────────────────────────────────────
// German is fusional-inflecting, and the SSi known side is prose, so almost every prompt word
// appears in a form that is not the form the LEGO taught. Four machines do this at once:
//   1. VERB AGREEMENT + ABLAUT. One lexeme, many surfaces, no shared prefix to key on:
//      wissen / weiß / weißt / wusste / wussten / gewusst — six strings, one word. Likewise
//      sprechen/spreche/sprichst/spricht/gesprochen, treffen/treffe/triffst/trifft/getroffen,
//      geben/gibst/gegeben, sein/bin/bist/ist/sind/war/waren/warst/wäre/wärst/gewesen.
//   2. SEPARABLE PREFIXES, and the ZU-INFIX. anfangen → ich fange an (prefix stranded at the
//      clause end, so the matcher sees "fange" and a loose "an") → anzufangen (zu INSIDE the
//      word). Corpus-attested: anzufangen:18, aufzupassen:6, fernzusehen:2, anzurufen:2,
//      auszugehen:2, anzufühlen:1, aufzuhören:1 — e.g. "ich bin noch nicht bereit anzufangen"
//      (practice phrase), "es war schön, am Samstagabend auszugehen". No amount of exact-form
//      matching relates anzufangen to a LEGO that taught "anfangen".
//   3. ADJECTIVE AND DETERMINER DECLENSION. Strong/weak/mixed × 4 cases × 3 genders × 2 numbers
//      off one stem: corpus has wichtig / wichtige / wichtiger / wichtigen / wichtigem, blau /
//      blaue / blaues, gut / gute / gutes, ander- as anderes/andere/anderen/anderem.
//   4. TENSE BUILT FROM AUXILIARY + PARTICIPLE, with ge-…-t / ge-…-en and a moved participle:
//      gesagt, gesehen, gemacht, gehört, gelernt, angefangen, getroffen, gesprochen, verändert.
// MEASURED CONSEQUENCE. Building the introduced-gloss inventory from eng_for_deu's 630 legos
// (545 stems) and testing all 5,880 practice prompts against it yields 432 raw "unknown gloss"
// hits over 141 distinct types. Hand-classifying all 141: ~106 types / ~337 hits (78% of hits)
// are an inflected, declined, participial or prefix-shifted form of a lexeme the course DID
// teach; of the 35 remaining, most are also morphology my prefix heuristic simply failed to
// pair up (gefragt←fragen, übe←üben, waren/warst/wärst←sein, triffst/trifft←treffen,
// fängt←anfangen, geredet←reden, sag←sagen, geht←gehen, gibst←geben) or are closed-class glue
// this freeClass now absorbs (zur, denen, wem, wieder, dafür, davon, bis, denn, einige, sonst,
// sofort). What is left as a plausible GENUINELY untaught lexeme is roughly a dozen types —
// erledigen:16, trinken/trinke:12, abreisen:3, merken:2, sache:2, dauern:1, beenden:1,
// einladen:1, nett:1 — i.e. on the order of 40–50 hits, ~10% of the raw count. THAT is the real
// signal, and it is buried under a 9:1 morphological noise floor. Hence advisory, always.
//
// ── POST-CONTRACT SWEEP, MEASURED WITH THIS FILE IN PLACE ────────────────────────────────────
//   node tools/course-optimization/known-side-sweep.cjs eng_for_deu
//   · eng_for_deu  known=deu via lang:_lang_deu  triage  phrases=4937  raw=486
//     (vocab 486, adv 0)  distinct-unknown=122        →  0 CONFIRMED breaches, exit 0.
// The 486 split by kind: 380 "unknown gloss" and 106 "gloss not introduced until seed N", and the
// NPI advisories are now 0 (they were 28 before the npi array was cut — see the note on npi).
// The 106 ordering findings are a DIFFERENT and more interesting class than the 380: they are
// phrases using a gloss whose LEGO debuts later in the same course — 'ich denke, …' at S26/S38/S46
// against a 'denke' debut at S47; 'es tut mir leid' at S84 against a S139 debut; 'etwas
// Interessantes' at S53 against S164. Those are not morphology and an adjudicator should look at
// them first. The 380 unknown-gloss hits are dominated by exactly the four machines above —
// spreche:32, hören:23, anzufangen:18, erledigen:16, wollen:12, trinken:10, hilfst:9, gehe:9 …
// The freeClass here absorbed 19 of the 141 pre-contract types (zur, denen, wem, wieder, dafür,
// davon, bis, denn, einige, sonst, sofort, auch, wirklich, alle, ihre, ihrer, will, sollen, wem).
//
// ── WHAT I COULD NOT CONFIDENTLY CLASSIFY (left OUT of freeClass, on purpose) ────────────────
// * TIME AND FREQUENCY ADVERBS — heute:166, morgen:148, gestern:62, oft:70, bald:43, früh:36,
//   jetzt:69, später:24, gerade:34, schnell:74, langsam:1. Arguably glue, but the SSi method
//   teaches them as content LEGOs and they ARE in eng_for_deu's inventory, so admitting them to
//   the free class would hide a genuine breach in a course that had not taught them yet.
// * DEGREE/STANCE ADVERBS I judged lexical rather than glue — wirklich:2, definitiv:21,
//   wahrscheinlich, hoffentlich, leider, unbedingt. Left out for the same reason.
// * "gerne" (149) — a particle in effect ("ich würde gerne" = "I'd like to"), but it is the
//   carrier of the whole would-like construction in this corpus and is taught as a LEGO, so it
//   belongs to the würde-gerne construction below, not to the always-free class.
// * "mal" (32) and "doch" — genuine modal particles with no English gloss at all. I left "mal"
//   in freeClass (it is pure glue) but NOT "doch": I could not tell from this corpus whether
//   "doch" is being used as the contradicting-yes answer word (a real gloss the learner must be
//   given) or as the unglossable particle, and there were too few tokens to decide.
// * FORMAL "Sie". ZERO mid-sentence capital-Sie in 5,880 prompts — eng_for_deu is a du-only
//   course. The formal-address construction is documented below because it is German, but it is
//   UNCALIBRATED: no deu-known course in the estate currently exercises it.
module.exports = {
  course_code: '_lang_deu',
  ratified: null,
  known_lang: 'deu',
  known_lang_name: 'German',

  // Free class — German closed-class glue, never introduced. Corpus-derived (see header) and then
  // completed paradigm-wise: where the corpus attests one case form of a determiner or pronoun,
  // the whole paradigm is admitted, because which case surfaces is governed by the preposition or
  // verb and is not a vocabulary choice the learner makes.
  freeClass: [
    // personal pronouns, all cases
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man',
    'mich', 'dich', 'ihn', 'uns', 'euch',
    'mir', 'dir', 'ihm', 'ihnen', 'sich', 'einander',
    // possessives (all gender/case endings)
    'mein', 'meine', 'meinen', 'meinem', 'meiner', 'meines',
    'dein', 'deine', 'deinen', 'deinem', 'deiner', 'deines',
    'sein', 'seine', 'seinen', 'seinem', 'seiner', 'seines',
    'ihre', 'ihren', 'ihrem', 'ihrer', 'ihres',
    'unser', 'unsere', 'unseren', 'unserem', 'unserer',
    // definite / indefinite / negative articles, all cases
    'der', 'die', 'das', 'den', 'dem', 'des',
    'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
    'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines',
    // demonstratives and correlatives
    'dies', 'diese', 'dieser', 'dieses', 'diesen', 'diesem',
    'jene', 'jener', 'jenes', 'derselbe', 'dasselbe', 'dieselbe',
    'denen', 'dessen', 'deren',
    // prepositions + their contracted article forms (im/am/zum/zur/beim/vom/ins/ans)
    'in', 'an', 'auf', 'unter', 'über', 'vor', 'hinter', 'neben', 'zwischen',
    'mit', 'ohne', 'für', 'gegen', 'um', 'durch', 'bei', 'von', 'zu', 'nach', 'aus', 'seit',
    'bis', 'ab', 'gegenüber', 'wegen', 'trotz', 'während', 'statt', 'außer', 'mitten',
    'im', 'am', 'zum', 'zur', 'beim', 'vom', 'ins', 'ans', 'aufs', 'fürs', 'durchs',
    // coordinators + subordinators
    'und', 'oder', 'aber', 'sondern', 'denn', 'dass', 'ob', 'weil', 'wenn', 'als', 'wie',
    'obwohl', 'damit', 'bevor', 'nachdem', 'sobald', 'falls', 'bis', 'solange', 'indem',
    'also', 'dann', 'deshalb', 'deswegen', 'darum', 'trotzdem', 'dennoch', 'außerdem',
    // interrogatives (incl. the wo(r)- prepositional series)
    'was', 'wer', 'wen', 'wem', 'wessen', 'wo', 'wohin', 'woher', 'wann', 'warum', 'wieso',
    'weshalb', 'welche', 'welcher', 'welches', 'welchen', 'welchem',
    'wonach', 'worüber', 'wofür', 'womit', 'worauf', 'woran', 'wovon', 'wozu',
    // da(r)- pronominal adverbs (a preposition + a resumptive pronoun, fused — pure glue)
    'darüber', 'dafür', 'damit', 'davon', 'danach', 'dazu', 'daran', 'darauf', 'dabei',
    'dadurch', 'dagegen', 'darin', 'daraus', 'hierfür', 'hierbei',
    // quantifiers, degree and scope particles
    'nur', 'auch', 'noch', 'schon', 'mal', 'so', 'sehr', 'mehr', 'weniger', 'wenig', 'viel',
    'ganz', 'ziemlich', 'etwas', 'nichts', 'alles', 'alle', 'allem', 'allen', 'jeder', 'jede',
    'jedes', 'jeden', 'jedem', 'beide', 'beiden', 'einige', 'einigen', 'manche', 'mehrere',
    'selbst', 'sogar', 'wieder', 'sonst', 'überhaupt', 'eigentlich', 'zwar',
    'jemand', 'jemanden', 'jemandem', 'niemand', 'niemanden', 'niemandem',
    // the irgend- FREE-CHOICE indefinite series. Deliberately here and NOT in npi — see
    // npiLicensing.rule: these are 'some-' in a positive declarative and 'any-' only under a
    // licenser, exactly like Tamil's -ஆவது series, so a positive-declarative occurrence is never
    // a violation. Measured: putting them in npi produced 12 false NPI reports on eng_for_deu
    // ('ich möchte irgendwo mit dir sprechen', 'ich würde gerne irgendwo üben') and zero true ones.
    'irgendetwas', 'irgendwas', 'irgendwer', 'irgendjemand', 'irgendwen', 'irgendwem',
    'irgendwo', 'irgendwohin', 'irgendwie', 'irgendwann', 'irgendein', 'irgendeine',
    // answer words / interjections
    'ja', 'nein', 'okay', 'bitte',
  ],

  // NPI items + WHEN they are licensed. Violation = an NPI in a plain POSITIVE DECLARATIVE only.
  // DELIBERATELY SHORT, and calibrated by measurement rather than by analogy with the English
  // contract. The first draft of this file listed überhaupt / irgend- / noch / mehr / sonst /
  // länger here; sweeping eng_for_deu with that list produced 28 NPI advisories and ALL 28 were
  // false positives — 17 on 'länger' in the plain comparative ('kannst du ein bisschen länger mit
  // mir sprechen?') and 12 on 'irgendwo' in a positive declarative ('ich möchte irgendwo mit dir
  // sprechen'). 'noch' (78 unlicensed occurrences) and 'mehr' (139) never surfaced at all, because
  // checkKnownSide tests freeClass BEFORE npi and they are glue — which means listing them in npi
  // was inert as well as wrong. All of them are now handled in prose below instead, and the sweep
  // reports zero NPI advisories on German. 'jemals' ('ever') is the one item that is genuinely
  // marked in a plain positive declarative; it does not occur in the corpus at all.
  npi: ['jemals'],
  npiLicensing: {
    rule: "German is NOT an NPI-heavy language in the English sense, and this is the single most important thing for a gate to understand about it: English 'any' has NO German counterpart. German expresses 'anything/anyone/anywhere' with the SAME irgend- series it uses for 'something/someone/somewhere' (irgendetwas / irgendjemand / irgendwo) and, far more often, with a BARE PLURAL or a bare mass noun and no determiner at all — 'hast du Fragen?' is 'do you have any questions?' with no 'any' word to license. So a German prompt that translates an English NPI usually contains no NPI-shaped token whatsoever, and any gate written by analogy with the English contract will look for something that is not there. The items that ARE genuinely polarity-sensitive in German are (a) the scalar/temporal residuals — 'noch' in the sense 'yet' (only under negation: 'ich bin noch nicht bereit', corpus S-many), 'mehr' in 'nicht mehr' ('not any more'), 'länger' in 'nicht länger', and 'sonst' in the sense 'else/otherwise'; and (b) 'jemals' ('ever'), which is fine in questions and conditionals and marked in a plain positive declarative. CRITICAL CAVEAT, and the reason these should almost never be reported: 'noch' and 'mehr' are RAMPANT in positive declaratives in a completely different, non-NPI sense — 'noch' = 'still' ('ich möchte noch üben' = 'I still want to practise'), 'mehr' = 'more' ('ein bisschen mehr Zeit'). In eng_for_deu 'noch' occurs 121 times and 'mehr' 176 times, and the great majority are the positive 'still'/'more' senses. An NPI-without-negation report on 'noch' or 'mehr' is therefore a FALSE POSITIVE by default and must be treated as such: only the specific collocations 'nicht mehr', 'nicht länger', 'noch nicht', 'kein … mehr' are the polarity uses, and those all already carry their own negator. They are therefore documented HERE and kept OUT of the npi array (see the note above it) — an adjudicating agent needs to know the sense split exists, but the matcher must not report it. The irgend- series is likewise in freeClass and not in npi: like Tamil's -ஆவது series it is a FREE-CHOICE indefinite that means 'some-' in a positive declarative and extends to 'any-' only under a licenser, so a positive occurrence is never a violation. What is left in npi is 'jemals' alone, and the licensing environments below are what would free it.",
    licensedIn: [
      "Sentential negation with 'nicht' (post-verbal, and its position is what scopes it) — 'ich bin mir nicht sicher', 'ich weiß noch nicht, wie man das sagt' (corpus S10/S60).",
      "Determiner negation with 'kein/keine/keinen/keinem/keiner' — the negated indefinite article, which is how German negates a noun phrase (72 prompts in eng_for_deu): 'du solltest dir keine Sorgen darum machen'.",
      "Negative quantifiers and adverbs — 'nichts', 'niemand', 'nie', 'niemals', 'nirgendwo', 'kaum' ('hardly', a weak licenser).",
      "Yes/no questions, formed by VERB-FIRST INVERSION and nothing else — 'Möchtest du lernen?' There is no do-support and no question particle, so the licenser is WORD ORDER, not a word; a matcher looking for a token will not find one.",
      "Wh-questions and embedded interrogatives with 'ob' ('whether', 141 tokens) — 'ich weiß nicht, ob …'.",
      "Conditional clauses with 'wenn' / 'falls', and the verb-first conditional without 'wenn' ('Hättest du Zeit, …').",
      "Konjunktiv II / irrealis — 'würde', 'wäre', 'hätte', 'könnte', 'möchte', 'sollte' and their 2sg forms; the whole irrealis mood is non-veridical.",
      "Comparatives with 'als' and equatives with 'so … wie'.",
      "'bevor' ('before') clauses, and the restrictive/exclusive particles 'nur' and 'erst'.",
      "Imperatives, and modal 'müssen/sollen/dürfen' under negation ('du musst nicht' = 'you don't have to').",
    ],
  },

  // Negation markers (reference list; negation detection is the adjudicator's judgment). German
  // negation is a FREE WORD ('nicht') or a NEGATIVE DETERMINER ('kein-'), not a bound suffix —
  // unlike Tamil — but 'kein-' inflects for case/gender, so all its forms are listed.
  negation: ['nicht', 'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines',
    'nichts', 'niemand', 'niemanden', 'niemandem', 'nie', 'niemals', 'nirgendwo',
    'weder', 'ohne', 'nein'],

  // German machinery licensed at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'v2_word_order', marker: 'finite verb in position 2', description: "German main clauses are VERB-SECOND: exactly one constituent precedes the finite verb and everything else follows it, so the subject is routinely NOT first — 'heute möchte ich lernen', 'am Samstagabend war es schön'. English has no equivalent, so a fronted adverbial in the prompt is a WORD-ORDER fact, not vocabulary. Licensed at the first non-subject-initial prompt. A gate must never read the resulting order as evidence of a missing gloss." },
    { id: 'verb_final_subordinate', marker: 'dass / weil / wenn / ob + … + verb', description: "In a subordinate clause the finite verb moves to the END: 'ich weiß noch nicht, wie man das sagt' (S60), 'dass du gerne mit dem Bus fährst' (S120), 'wenn du langsamer sprechen kannst, kann ich verstehen' (S90). One clause type, two verb positions. Licensed with the first subordinator ('dass' 392, 'weil' 60, 'wenn' 210, 'ob' 141, 'obwohl' 40 in the corpus). The consequence for the gate is that the same lexeme legitimately appears in two positions and, in a modal chain, with a different finite/infinitive split." },
    { id: 'separable_prefix_verbs', marker: 'anfangen → fange … an → anzufangen', description: "A separable-prefix verb is ONE lexeme with three surface shapes: infinitive joined (anfangen), finite with the prefix stranded at the clause end (ich fange heute an), and zu-infinitive with 'zu' INFIXED between prefix and stem (anzufangen). Corpus-attested infixed forms: anzufangen:18, aufzupassen:6, fernzusehen:2, anzurufen:2, auszugehen:2, anzufühlen:1, aufzuhören:1, plus the stranded 'fern' + 'gesehen' pair. THE headline exact-form failure for German: none of these strings contains the taught form. Licensed at the first separable verb; an adjudicator must resolve prefix+stem back to the lexeme before calling anything unknown." },
    { id: 'zu_infinitive', marker: 'zu + infinitive / um … zu', description: "Non-finite complements take bare 'zu' + infinitive ('bereit anzufangen', 'ich versuche zu verstehen') and purpose clauses take 'um … zu'. 'zu' (986 tokens — the third most frequent token in the corpus) is doing double duty as this infinitival particle AND as the dative preposition 'to'; both are free glue. Licensed at the first zu-infinitive." },
    { id: 'four_case_system', marker: 'der/den/dem/des · ein/einen/einem/einer', description: "Nominative / accusative / dative / genitive are marked on the ARTICLE and the adjective, not on the noun, and the case is selected by the verb or the preposition ('mit dem Bus' dative, 'für den Freund' accusative, two-way prepositions alternating by motion). English 'the/a' therefore corresponds to up to six German strings apiece. All are in freeClass; licensed as one construction at the first non-nominative article so the gate does not treat 'dem' as a new word after 'der'." },
    { id: 'adjective_declension', marker: 'wichtig → wichtige / wichtiger / wichtigen / wichtigem', description: "Attributive adjectives take strong, weak or mixed endings by gender × case × number × determiner type; predicative adjectives take NO ending. Corpus-attested one-stem families: wichtig/wichtige/wichtiger/wichtigen/wichtigem, blau/blaue/blaues, gut/gute/gutes, ander-/anderes/andere/anderen/anderem, letzte/letzten, nächste/nächsten, ganzen. Licensed at the first attributive adjective. Exact-form matching cannot relate a declined form to the taught predicative one — this and separable prefixes are the two biggest noise sources in the finding count." },
    { id: 'perfect_with_participle', marker: 'habe/bin + ge-…-t / ge-…-en', description: "The spoken past is auxiliary + past participle, with the participle at the clause end and a circumfix ge-…-t (weak) or ge-…-en (strong, often with a vowel change), and NO ge- on prefixed verbs (verändert, beantwortet, erklärt). Corpus: gesagt:68, angefangen:63, gesehen:44, gemacht:49, gehört:36, gesprochen:36, getroffen:35, gelernt:22, verändert:30. Auxiliary choice is haben vs sein by verb class (bin gegangen, habe gesagt) and English has no such split. Licensed at the first perfect." },
    { id: 'preterite_and_ablaut', marker: 'war / hatte / wusste / sagte / wollte', description: "German also has a synthetic preterite, used in this corpus mainly for sein/haben/modals and a few weak verbs: war:160, hatte:32, wollte:191, wollten:42, wolltest:43, musste:10, musstest:20, wusste:7, hoffte:5, dachte:22, sagte:35, fand:21. Strong verbs change the stem vowel (wissen→wusste, finden→fand, denken→dachte), so the preterite shares no reliable prefix with the infinitive. Licensed at the first preterite; ZUT-wise it collapses with the perfect onto ONE English past (see glossRules.pastIsTwoGermanTenses)." },
    { id: 'konjunktiv_ii_irrealis', marker: 'würde / wäre / hätte / könnte / möchte / sollte', description: "The irrealis mood: 'würde' + infinitive as the general workhorse, plus the synthetic forms wäre/hätte/könnte/müsste/sollte and the fossilised 'möchte' (795 tokens — by frequency the single most important verb form in the corpus, and formally a Konjunktiv II of 'mögen'). Corpus: würde:121, wäre:32, hätte:36, könnte:32, könntest:24, würdest:4, sollte:23, solltest:66. Licensed as one mood construction; note that 'möchte' is taught as a unit LEGO and its stem 'mögen'/'mag' is a DIFFERENT thing the learner may not have." },
    { id: 'wuerde_gerne_would_like', marker: 'würde gerne / hätte gerne / möchte', description: "'Would like to' has three German realisations that the corpus uses interchangeably: 'möchte' (795), 'würde gerne' (würde:121 + gerne:149), and 'hätte gerne'. 'gerne' is the particle that turns a bare conditional into a wish and has no independent English gloss. Licensed together with the irrealis; the three must not be treated as three separate vocabulary items competing for one English gloss (see glossRules.wouldLikeThreeWays)." },
    { id: 'modal_plus_bare_infinitive', marker: 'kann / muss / soll / darf / will / mag + infinitive', description: "Modals take a BARE infinitive (no 'zu') at the clause end and are irregular in the singular present: können→kann/kannst, müssen→muss/musst/musste, wollen→will/willst/wollte, sollen→soll/solltest, dürfen→darf, mögen→mag/möchte. Corpus: kann:142, kannst:86, muss:93, musst:18, können:63, müssen:60, mag:51, will:2. Licensed at the first modal. The 1sg/3sg form has no -e and often an umlaut-loss, so 'muss' and 'müssen' look unrelated to an exact matcher." },
    { id: 'question_by_inversion', marker: 'Möchtest du …? / Wie fühlst du dich?', description: "Yes/no questions are formed by moving the finite verb to FIRST position; wh-questions put the wh-word first and the verb second. There is NO do-support and no question particle — 'do/does/did' correspond to NOTHING in the German prompt. Corpus: 'wie fühlst du dich?' (S40), 'wie fühlst du dich, wenn du müde bist?'. Licensed at the first question; the gate must not expect a token for English do-support (see glossRules.noDoSupport)." },
    { id: 'reflexive_verbs', marker: 'sich / mich / dich / mir / dir + verb', description: "A large class of German verbs is obligatorily reflexive where English is not: sich fühlen ('feel', fühle:56, fühlst, fühlen:32), sich erinnern ('remember', erinnern:78), sich sicher sein ('be sure' — 'ich bin MIR nicht sicher', S10), sich Sorgen machen ('worry'), sich entspannen. The reflexive is accusative or dative depending on the verb, so mich/mir and dich/dir alternate for the same person. Licensed at the first reflexive verb; the reflexive pronoun itself is free glue but its PRESENCE is a construction, and a missing one is a target-side error, not a known-side one." },
    { id: 'nicht_vs_kein_negation', marker: 'nicht · kein/keine/keinen', description: "German splits negation by what is negated: 'nicht' negates a verb, adjective or whole clause and sits AFTER the finite verb and its objects; 'kein-' is the negated indefinite article and replaces ein/∅ before a noun, inflecting for case and gender. 'Ich habe keine Zeit' not '*nicht Zeit'. Corpus: nicht:945, plus 72 prompts using a kein- form. Licensed as one negation construction; both spellings map to English not/no/don't/doesn't (see glossRules.negationTwoWays)." },
    { id: 'werden_future_and_passive', marker: 'werde / wirst / wird / werden', description: "'werden' + infinitive is the future ('ich werde lernen'), and 'werden' + participle is the passive; German also uses the plain PRESENT for future time far more than English does ('ich lerne morgen' = 'I'll learn tomorrow'). Corpus: werde:133, wird:76, werden:40, wirst:26. Licensed at the first 'werden'; one German auxiliary underlies two English constructions and one English construction (will-future) is often absent from the German entirely." },
    { id: 'impersonal_man', marker: 'man', description: "'man' is the impersonal subject pronoun ('one/you/people/they'), a dedicated closed-class word with no English single equivalent, taking 3sg agreement: 'ich weiß noch nicht, wie man das sagt' (S60). Corpus: man:96. Licensed at its debut. Note it is not 'ein Mann' — homographs at the token level after lowercasing, and 'mann' (78) IS a separate content noun in this corpus." },
    { id: 'comparative_superlative', marker: '-er / am -sten / so … wie / als', description: "Comparison is suffixal and often umlauting: gut→besser→am besten, viel→mehr, gern→lieber, schnell→schneller, wichtig→wichtiger, leicht→leichter, lang→länger, früh→früher. Corpus: besser:98, mehr:176, schneller:5, leichter:22, länger:2, früher:23, besten:2. The comparand is 'als' ('than') and the equative is 'so … wie'. Licensed at the first comparative; the umlauting/irregular forms (gut/besser, viel/mehr, lang/länger) share no stem with the positive at all." },
    { id: 'formal_address_sie', marker: 'Sie / Ihnen / Ihr-', description: "German has a T/V split: familiar du/ihr vs formal Sie (capitalised, 3pl agreement, dative Ihnen, possessive Ihr-). Both collapse to English 'you'. UNCALIBRATED AND UNATTESTED: I found ZERO mid-sentence capital-Sie in all 5,880 eng_for_deu prompts — that course is du-only. Documented so the construction exists if a future deu-known course teaches formal address; do not read its absence here as a defect. NOTE the lowercase collision: stemKnownGloss discards case, so 'Sie'(formal you), 'sie'(she) and 'sie'(they) are ONE token 'sie' (333 occurrences) to this gate, and it cannot tell them apart." },
    { id: 'noun_capitalisation', marker: 'every noun is capitalised', description: "German capitalises ALL nouns, mid-sentence, always (Zeit, Freund, Wörter, Englisch). stemKnownGloss lowercases, so this is invisible to the gate and creates no findings — recorded because it is the one place where a case-sensitive audit of German would produce a different answer from this gate's, and because it means capitalisation carries NO information the gate can use (unlike Sie/sie, where it would have)." },
  ],

  // Known-side ZUT/rendering rules.
  glossRules: [
    { id: 'duIhrSieCollapse', rule: "German du (familiar sg), ihr (familiar pl) and Sie (formal) all render English 'you'. Many-German→one-English, ZUT-legal. eng_for_deu uses du throughout (du:1000, dir:210, dich:108, deinen:23) and never Sie; a course adding Sie adds a carrier, not an English contrast. Never invent an English politeness distinction to mirror it." },
    { id: 'pastIsTwoGermanTenses', rule: "One English simple past corresponds to EITHER the German perfect (habe/bin + participle: 'ich habe gesagt') OR the preterite ('ich sagte', 'ich war', 'ich wollte'), chosen by verb class and register, not by meaning. The English perfect ('I have said') ALSO maps onto the German perfect. So English past and English perfect collapse onto one German form while one English past splits across two German forms — this is the single biggest ZUT pressure point on the German known side. Each German form is demonstrated once at its own carrier; do not tile English 'have' as a separate German token." },
    { id: 'presentCoversProgressive', rule: "German has NO progressive aspect. 'ich spreche' is both 'I speak' and 'I am speaking'; 'ich lerne morgen' is also 'I'm learning tomorrow' and 'I'll learn tomorrow'. One German present → several English forms. English '-ing' and 'am/are/is' have no German counterpart tokens and must never be expected in the prompt." },
    { id: 'noDoSupport', rule: "English do/does/did in questions and negatives correspond to NOTHING in German: questions are verb-first inversion ('Möchtest du lernen?') and negation is 'nicht' after the verb ('ich weiß nicht'). The known side supplies no gloss for do-support, and a gate must not look for one. Conversely a German 'tun/tut/getan' IS the content verb 'do' and is separate vocabulary." },
    { id: 'negationTwoWays', rule: "English not/no/don't/doesn't/didn't/won't/can't all map onto EITHER 'nicht' (verbal/clausal) or a 'kein-' form (nominal), determined by German syntax rather than by which English negator was used. One English negation → two German realisations, each case-inflected in the kein- branch. Both are the same negation construction and neither is new vocabulary once that construction is licensed." },
    { id: 'wouldLikeThreeWays', rule: "English 'would like (to)' has three German renderings in this corpus — 'möchte' (795), 'würde gerne' and 'hätte gerne' — plus plain 'würde' for bare 'would'. These are ONE known-side meaning with three carriers, not three competing vocabulary items; 'gerne' in particular is a wish-particle with no standalone English gloss and must not be ZUT-flagged as an unglossed word." },
    { id: 'separablePrefixIsOneLexeme', rule: "anfangen / fange … an / anzufangen — and aufpassen / passe … auf / aufzupassen, fernsehen / sehe … fern / fernzusehen — are ONE known-side lexeme in three shapes. When adjudicating a finding on any of these strings, resolve prefix+stem back to the lexeme first. A stranded prefix ('an', 'auf', 'fern') sitting alone at the clause end is ALSO not a separate word; note that 'an' and 'auf' are additionally prepositions in freeClass, so the stranded prefix is absorbed silently while the infixed form is reported — an asymmetry the adjudicator must expect." },
    { id: 'caseAndDeclensionAreGlue', rule: "English a/an/the/to/of/for/with/in/at correspond to German case-inflected articles and prepositions (der/den/dem/des, ein/einen/einem/einer, im/am/zum/zur/beim/vom) and to adjective endings. All are free on the known side and require no separate introduced LEGO; which case form surfaces is dictated by the governing verb or preposition. The gate must treat a declined determiner or adjective ending as the same item as its citation form even though the strings differ." },
    { id: 'werdenIsFutureAndPassive', rule: "One German 'werden' underlies English future 'will' AND the English passive 'be + participle'; and German frequently uses the bare present where English requires 'will'. So English 'will' has no reliable German token, and a German 'werde/wird' may render either. Polarity/tense machinery, not vocabulary." },
    { id: 'manIsNotHeSheYou', rule: "'man' renders English generic 'you', 'one', 'people' or 'they' according to English idiom, with 3sg agreement in German. One German form → several English pronouns; do not force it to a specific person, and do not conflate it with the noun 'Mann' ('man'), which lowercases to the same token." },
    { id: 'nochUndMehrSenseSplit', rule: "'noch' and 'mehr' each carry a positive and a negative-polarity sense on one form: 'noch' = 'still' positive ('ich möchte noch üben') but 'yet' under negation ('ich bin noch nicht bereit'); 'mehr' = 'more' positive but 'any more' in 'nicht mehr'; 'länger' = 'longer' positive but 'any longer' in 'nicht länger'. All three are freeClass glue and are deliberately NOT in npi — measured on eng_for_deu, 78 unlicensed 'noch', 139 'mehr' and 17 'länger', with the positive sense in every case sampled. The polarity uses ('noch nicht', 'nicht mehr', 'nicht länger', 'kein … mehr') all carry their own negator, so nothing is lost by leaving them out." },
    { id: 'irgendIsFreeChoiceNotNpi', rule: "The irgend- series (irgendetwas / irgendwas / irgendjemand / irgendwer / irgendwo / irgendwie / irgendwann / irgendein) is a FREE-CHOICE indefinite, not a negative-polarity item: it means 'some-' in a plain positive declarative ('ich möchte irgendwo mit dir sprechen' = 'I'd like to speak somewhere with you') and extends to 'any-' under a question, conditional or negation. Structurally identical to Tamil's -ஆவது series. It is freeClass glue and never an NPI violation; treating it as one produced 12 false reports on this corpus and zero true ones." },
    { id: 'eszettIsNotSs', rule: "ß and ss are DIFFERENT strings to this gate (stemKnownGloss('weiß')≠stemKnownGloss('weiss')) and there is no folding step. eng_for_deu is internally consistent (7 ß-types, no ss doublets), so no findings arise from it today. Any future Swiss-orthography deu-known course, which writes ss for ß throughout, would read as a wholly separate lexeme inventory — that would be an orthography artefact, never a vocabulary breach." },
    { id: 'umlautIsPartOfTheStem', rule: "Umlaut is morphological, not decorative: wissen/weiß, muss/müssen, fahren/fährst, lang/länger, gut/besser, viel/mehr, denken/dachte, finden/fand. An exact-form matcher sees unrelated strings. When adjudicating, derive the lexeme by ablaut/umlaut class and never conclude 'untaught word' from a vowel change alone — this rule plus separablePrefixIsOneLexeme plus caseAndDeclensionAreGlue account for roughly nine of every ten raw findings on this known side." },
  ],
};

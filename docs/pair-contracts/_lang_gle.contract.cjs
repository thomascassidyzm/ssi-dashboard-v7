// _lang_gle — LANGUAGE-LEVEL known-side BRIEF for gle-known (Irish-known) courses.
// FIRST PASS (2026-08-17), ratified:null.
//
// AGENT-BRIEF DIALECT, DELIBERATELY. freeClass / npi / npiLicensing / negation /
// knownConstructions[{id,marker,description}] / glossRules — NOT freeGlue / negationMarkers /
// constructions[{id,test}]. isMechanicalContract() must return FALSE here: under Kai's ruling
// (2026-08-17) a brief contract is ADVISORY, and for Irish that is the only defensible setting.
// Séimhiú and urú change the START of a word, and Irish inflects prepositions, verbs and nouns
// synthetically, so a correctly-used, already-taught word routinely reaches the prompt as a string
// the exact-form matcher has never seen.
//
// ── CALIBRATION: THIS IS A VERY THIN BASE, AND THAT IS AN EXPLICIT GAP ────────────────────────
// There is exactly ONE gle-known course in the estate: zho_for_gle (status beta, courses.seed_count
// 5). Its content is:
//   15 course_legos rows — 34 known-side tokens, 28 distinct types.
//   127 course_practice_phrases rows — 879 known-side tokens, 40 distinct types.
// That is the whole corpus. FORTY WORD TYPES. Counted through the 2026-08-17 Unicode-aware
// tokenizeKnown + stemKnownGloss.
// WHAT THIS MEANS, stated plainly rather than papered over: this contract is NOT corpus-derived in
// the sense that _lang_deu is. The corpus was enough to (a) confirm which constructions the SSi
// Irish known side actually leans on in its opening seeds, (b) attest a handful of real mutation
// pairs, and (c) measure a finding count. It was NOT enough to derive a free class — 40 types
// cannot populate the Irish pronoun, article, copula, substantive-verb, preposition and
// inflected-preposition paradigms. The freeClass below is therefore MOSTLY PARADIGM COMPLETION
// from Irish grammar, with the corpus-attested items marked (·). Roughly 25 of ~230 entries are
// attested. Every unattested entry is a place where I have asserted Irish grammar rather than
// measured this estate's usage, and a finding on one of them should be adjudicated, not trusted.
// Re-derive this file the moment a gle-known course passes seed 50.
// A further gap: the corpus is one dialect-neutral opening sequence. Irish has three living
// dialects (Ulster / Connacht / Munster) that differ in exactly the closed class this file is
// about — 'muid' vs 'sinn', synthetic vs analytic verb endings, 'chun' vs 'le' for purpose. I have
// admitted all three where I know them, and I cannot tell you which one this course is written in.
//
// ── THE HEADLINE PROBLEM: INITIAL MUTATION ───────────────────────────────────────────────────
// Irish mutates word-initially, in two systems:
//   SÉIMHIÚ (lenition) — an h is INSERTED after the initial consonant: b→bh, c→ch, d→dh, f→fh,
//     g→gh, m→mh, p→ph, s→sh, t→th. Triggered by: the possessives mo/do/a(his); the object particle
//     'a' before a verbal noun; the prepositions de, do, faoi, ó, roimh, trí, ar, mar, gan, um;
//     the past-tense particles do/níor/ar/nár; the copula 'ba'; the vocative 'a'; 'sa' (Connacht);
//     numerals aon/dhá/trí…sé; a preceding feminine singular noun on its adjective.
//   URÚ (eclipsis) — the initial consonant is REPLACED by a nasal/voiced cluster: b→mb, c→gc,
//     d→nd, f→bhf, g→ng, p→bp, t→dt, and a vowel takes n-. Triggered by: the interrogative 'an';
//     'go', 'nach', 'ná'; 'dá'; 'sa' (standard); the possessives ár/bhur/a(their); 'i'.
// Neither is recoverable by a string rule without knowing the word is mutated: 'bhaint' could be a
// lenited 'baint' or a bh-initial lexeme, and 'ngaeilge' could be eclipsed 'Gaeilge' or not.
// MEASURED, on zho_for_gle: inventory built from its 15 legos (38 stems), all 127 practice prompts
// tested → 58 raw unknown-gloss hits over 12 types. All twelve, classified by hand:
//   CLOSED-CLASS GLUE the old (contract-less) run had no free class for — 26 hits / 4 types (45%):
//     chomh:8 ('as', equative — "chomh minic agus is féidir", S3), tú:6, é:6, ar:6.
//     This freeClass absorbs all of them.
//   SÉIMHIÚ of a radical the course DID teach — 6 hits / 3 types (10%):
//     shínis:4  ← Sínis  (s→sh, after the preposition 'ar': "cleachtadh a dhéanamh ar Shínis a
//                         labhairt", S5)
//     fhoghlaim:1 ← foghlaim (f→fh, after the object particle 'a': "rud éigin a fhoghlaim", S4)
//     chleachtadh:1 ← cleachtadh (c→ch, same trigger: "tá tú ag iarraidh Sínis a chleachtadh", S5)
//     Plus two mutation-ONLY forms whose radical never appears in the corpus at all, so they were
//     absorbed into the inventory as if they were lexemes: dhéanamh:18 (< déanamh, "cleachtadh a
//     dhéanamh") and bhaint:21 (< baint, "triail a bhaint as"). Those two do not show up in the
//     finding count precisely BECAUSE they are the only form the course ever shows — which means
//     the inventory now contains a mutated form as a headword, and the day a prompt uses the
//     radical 'déanamh' it will be reported as unknown. That inversion is worth stating: exact-form
//     matching does not merely miss mutations, it can enshrine one.
//   VERBAL MORPHOLOGY the matcher cannot see — 21 hits / 4 types (36%):
//     rá:18 ('saying', the verbal noun of the irregular 'abair' — "rá as Sínis go minic", S4;
//            shares not one letter with 'abair' or 'deir')
//     deirim:1 (1sg present of 'abair': "deirim as Sínis é go minic", S4)
//     labhraím:1 (1sg present of 'labhair', where the course taught the verbal noun 'labhairt')
//     déanann:1 (3sg present of 'déan', where the course taught 'dhéanamh')
//   PLAUSIBLY GENUINE UNTAUGHT VOCABULARY — 5 hits / 1 type (9%):
//     staidéar:5 ('study' — "staidéar a dhéanamh go minic", "déanann tú staidéar go minic", S3).
//     I could not find it in the lego inventory in any form. This is the one finding I would put in
//     front of a human. Note the honest caveat: with a 15-lego inventory, "not in the inventory"
//     is weak evidence — the course is 5 seeds old and its LEGO coverage is itself incomplete.
// So: ~45% of the raw count is glue this file now absorbs, ~10% is mutation, ~36% is invisible
// verbal morphology, and at most ~9% is the thing the gate exists to catch.
//
// ── POST-CONTRACT SWEEP, MEASURED WITH THIS FILE IN PLACE ────────────────────────────────────
//   node tools/course-optimization/known-side-sweep.cjs zho_for_gle
//   · zho_for_gle  known=gle via lang:_lang_gle  triage  phrases=117  raw=35 (vocab 35, adv 0)
//     distinct-unknown=8        →  0 CONFIRMED breaches, exit 0.
// Down from 58 raw pre-contract: the freeClass absorbed all 23 glue hits (chomh, tú, é, ar). The
// 35 remaining are 32 "unknown gloss" over 8 types — rá:18, staidéar:5, shínis:4, deirim:1,
// fhoghlaim:1, chleachtadh:1, déanann:1, labhraím:1 — plus 3 "dhéanamh not introduced until 5"
// ordering findings (prompts at S3 using a form whose lego debuts at S5, e.g. 'staidéar a
// dhéanamh go minic'). Read against the classification above: 21 of the 35 are verbal morphology
// the matcher cannot see, 6 are séimhiú, 3 are intra-course ordering, and 5 — 'staidéar' — are the
// one thing worth a human's attention. No NPI advisories, and none should be expected: there is
// not a single negative prompt in the corpus.
//
// ── TOKENISER ARTEFACTS SPECIFIC TO IRISH ORTHOGRAPHY (measured, not fixable from here) ───────
//   tokenizeKnown('an tSínis anois')  → ["an","tsínis","anois"]   — the t- prefix on a feminine
//     noun after the article FUSES into the token, so 'tsínis' is a different string from 'sínis'.
//     A real and silent source of findings.
//   tokenizeKnown('ár n-athair')      → ["ár","n","athair"]        — the HYPHENATED n-/t- prefixes
//     split, leaving a stray one-letter token "n" (or "t") that will be reported as an unknown
//     gloss, while the bare word behind it matches correctly. Benign-ish, but it inflates counts.
//   tokenizeKnown("b'fhéidir")        → ["b'fhéidir"]              — apostrophe elision is KEPT
//     inside the token (good: b'/d'/m'/dh' forms survive intact), so "b'fhéidir" and "d'fhoghlaim"
//     are single tokens distinct from 'féidir' and 'fhoghlaim'.
//   tokenizeKnown("tae 's caife")     → ["tae","is","caife"]       — expandContractions is ENGLISH
//     and rewrites 's to the English word "is". For Irish this is a lucky accident, because 'is' is
//     itself the Irish copula and a real word; for German it is not (see _lang_deu). Recorded so
//     nobody mistakes it for correct handling.
module.exports = {
  course_code: '_lang_gle',
  ratified: null,
  known_lang: 'gle',
  known_lang_name: 'Irish',

  // Free class — Irish closed-class glue. (·) marks a corpus-attested item; everything else is
  // paradigm completion from Irish grammar and is NOT calibrated (see header). Mutated forms of
  // function words are listed beside their radicals, because the gate matches exact strings.
  freeClass: [
    // personal pronouns, subject + object + emphatic (· mé, tú, é)
    'mé', 'tú', 'sé', 'sí', 'sinn', 'muid', 'sibh', 'siad',
    'é', 'í', 'iad', 'muidne',
    'mise', 'tusa', 'seisean', 'eisean', 'sise', 'ise', 'sinne', 'sibhse', 'siadsan', 'iadsan',
    // possessives and their apostrophe-elided forms
    'mo', 'do', 'a', 'ár', 'bhur', "m'", "d'", "'ár",
    // article (Irish has no indefinite article at all) + the fused t-/n- prefix shapes
    'an', 'na', 'ant', 'tsínis', 'na',
    // copula 'is' — a separate verb from 'bí', with its own paradigm (· is, ní)
    'is', 'ní', 'ba', 'ab', 'arb', 'gur', 'gurb', 'nach', 'nár', 'níorbh', 'níor', 'cé',
    // substantive verb 'bí' — present/past/future/conditional/habitual + negative + interrogative
    // (· tá) — pure machinery, no English lexical gloss
    'tá', 'táim', 'táimid', 'atá', 'níl', 'nílim', 'níilim', 'bhfuil', 'fuil',
    'bhí', 'raibh', 'beidh', 'bheidh', 'bheadh', 'bhíodh', 'bíonn', 'bíodh', 'bheith', 'bhí',
    'bheas', 'beadh', 'bhímid', 'táthar',
    // verbal particles: progressive 'ag', object/relative/vocative 'a', adverbial/complement 'go'
    // (· ag, a, go, chun, le)
    'ag', 'a', 'go', 'ar', 'do', 'á', 'dhá', 'nár', 'níor', 'ná',
    // prepositions, plain (· as, ar, le, chun, i)
    'as', 'le', 'leis', 'i', 'in', 'ó', 'de', 'do', 'faoi', 'roimh', 'thar', 'trí', 'um',
    'chuig', 'chun', 'idir', 'gan', 'mar', 'seachas', 'timpeall', 'tar éis', 'sa', 'san', 'sna',
    'ón', 'don', 'den', 'faoin', 'leis', 'tríd', 'thart',
    // inflected ("pronominal") prepositions — PARADIGM COMPLETION, unattested in this corpus
    // except 'leat'. Irish has no verb 'to have': possession is 'tá … agam'.
    'agam', 'agat', 'aige', 'aici', 'againn', 'agaibh', 'acu',
    'liom', 'leat', 'leis', 'léi', 'linn', 'libh', 'leo',
    'orm', 'ort', 'air', 'uirthi', 'orainn', 'oraibh', 'orthu',
    'dom', 'duit', 'dó', 'di', 'dúinn', 'daoibh', 'dóibh',
    'uaim', 'uait', 'uaidh', 'uaithi', 'uainn', 'uaibh', 'uathu',
    'asam', 'asat', 'aisti', 'asainn', 'asaibh', 'astu',
    'díom', 'díot', 'dínn', 'díbh', 'díobh',
    'ann', 'inti', 'ionainn', 'ionaibh', 'iontu', 'ionam', 'ionat',
    'fúm', 'fút', 'faoi', 'fúithi', 'fúinn', 'fúibh', 'faoi',
    'romham', 'romhat', 'roimhe', 'roimpi', 'chugam', 'chugat', 'chuige', 'chuici', 'chugainn',
    // conjunctions and subordinators (· agus, is, go)
    'agus', 'ach', 'nó', 'má', 'dá', 'mar', 'nuair', 'sula', 'sular', 'ó', 'cé', 'cé go',
    'ionas', 'toisc', 'mar gheall', 'freisin', 'áfach', 'mar sin',
    // interrogatives (· conas)
    'cad', 'céard', 'cé', 'cén', 'cathain', 'cá', 'cár', 'conas', 'cén fáth', 'cé mhéad',
    'cad chuige', 'an', 'ar',
    // degree, quantifier and scope words (· chomh, go, oiread, eile, éigin, is, féidir)
    'chomh', 'níos', 'ró', 'an-', 'sách', 'beagán', 'roinnt', 'cuid', 'oiread', 'níos mó',
    'gach', 'uile', 'aon', 'ar bith', 'éigin', 'eile', 'féin', 'fós', 'cheana', 'amháin',
    'seo', 'sin', 'siúd', 'araon', 'go léir', 'ar fad', 'níos lú',
    // existential/indefinite pronouns
    'rud', 'duine', 'aon duine', 'aon rud', 'aoinne', 'tada', 'faic', 'dada', 'ceann',
    // 'is féidir' — the possibility copula frame (· is, féidir)
    'féidir',
    // answer/response words (Irish has no yes/no — see glossRules.noYesNoWords)
    'sea', 'ní hea', 'tá', 'níl', 'ea',
  ],

  // NPI items + WHEN they are licensed. Violation = an NPI in a plain POSITIVE DECLARATIVE only.
  npi: ['aon', 'ar bith', 'aoinne', 'aon duine', 'aon rud', 'tada', 'faic', 'dada',
    'riamh', 'choíche', 'go fóill', 'ach oiread', 'níos mó'],
  npiLicensing: {
    rule: "Irish polarity works differently from English in two ways that a mechanical rule cannot survive. FIRST, Irish has NEGATIVE CONCORD, and the negative words are not inherently negative on their own: 'ní fhaca mé aon duine' is 'I didn't see anyone', and 'tada'/'faic'/'dada' mean 'anything' under negation and 'nothing' as bare answers. A negative word co-occurring with 'ní'/'níl'/'nach' is correct Irish, never a double negative to flag. SECOND, and more consequentially, the licenser in Irish is very often A MUTATION OR A VERB FORM, NOT A WORD. Negation is fused into the verb ('níl' = 'ní' + 'fuil', one token; 'níor' + séimhiú for the past), the interrogative is the particle 'an' plus URÚ ('an bhfuil tú?'), and the negative interrogative is 'nach' plus urú. So a gate scanning for a free negator will miss 'níl' if it only knows 'ní', and will miss the question entirely because 'an bhfuil' looks like two ordinary words. The genuine NPIs are the 'aon …' and '… ar bith' series ('any'), 'aoinne'/'aon duine' ('anyone'), 'aon rud'/'tada'/'faic'/'dada' ('anything'), 'riamh' ('ever', past) and 'choíche' ('ever', future), 'go fóill' ('yet'), 'ach oiread' ('either'), and 'níos mó' in the sense 'any more'. THREE ITEMS NEED A SENSE SPLIT, NOT AN NPI RULE: 'aon' is also the numeral 'one'; 'go fóill' is 'yet' under negation but 'still' in a positive declarative; and 'níos mó' is plainly 'more' in a positive comparative. In the 879-token corpus available there is NOT ONE clear licensed NPI, so the list below is Irish grammar, not a measurement — an explicit gap.",
    licensedIn: [
      "Verbal negation — 'ní' + séimhiú, the fused present 'níl'/'nílim', the past 'níor' + séimhiú, and 'nach'/'nár' in subordinate and interrogative negatives.",
      "Negative concord items themselves — 'tada', 'faic', 'dada', 'aoinne', 'riamh' — which carry the negation and license each other.",
      "Yes/no questions, formed by the particle 'an' + URÚ ('an bhfuil tú ag iarraidh …?'), past 'ar' + séimhiú, negative 'nach' + urú. The licenser is a particle plus a mutation, not a free word, and there is NO do-support.",
      "Wh-questions with cad/céard/cé/cén/cathain/cá/conas ('conas' attested, 27 tokens) and embedded interrogatives with 'an'/'cé acu'.",
      "Conditional clauses with 'má' (indicative/real) and 'dá' + urú (counterfactual), and the conditional mood '-fadh/-feadh'.",
      "The copula in its non-assertive shapes — 'an ea?', 'nach ea?', 'ní hea' — and the possibility frame 'is féidir' (attested: 'chomh minic agus is féidir', S3), which is non-veridical.",
      "Comparatives with 'níos … ná' and equatives with 'chomh … le/agus' — both attested in the corpus's 'chomh minic agus is féidir' and 'a oiread agus is féidir'.",
      "'sula' ('before') clauses, and the restrictive 'ach' ('only/but') and 'amháin'.",
      "Imperatives, the modal frames 'caithfidh' ('must'), 'ba cheart' ('should'), 'is féidir'/'féadfaidh' ('can/may'), and 'ag iarraidh' ('wanting', 58 tokens — the corpus's dominant desiderative and a free-choice licenser).",
    ],
  },

  // Negation markers (reference list). Irish negation is a PREVERBAL PARTICLE that also MUTATES the
  // verb, and for 'bí' it FUSES into the verb form. All three shapes listed; note that 'ní' as a
  // standalone token and 'níl' as a fused token are the same negator.
  negation: ['ní', 'níl', 'nílim', 'níor', 'níorbh', 'nach', 'nár', 'ná', 'cha', 'chan',
    'tada', 'faic', 'dada', 'aoinne', 'riamh', 'choíche', 'ní hea', 'gan'],

  // Irish machinery licensed at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'seimhiu_lenition', marker: 'b→bh c→ch d→dh f→fh g→gh m→mh p→ph s→sh t→th', description: "THE defining problem for an exact-form matcher, together with urú. An h is inserted after the initial consonant, triggered by mo/do/a(his), the object particle 'a' before a verbal noun, the prepositions de/do/faoi/ó/roimh/trí/ar/mar/gan/um, the past particles do/níor/ar/nár, the copula 'ba', the vocative 'a', numerals, and a feminine noun on its adjective. Corpus-attested, with the radical also present: Sínis→Shínis (after 'ar', S5), foghlaim→fhoghlaim (after object 'a', S4), cleachtadh→chleachtadh (after object 'a', S5). Corpus-attested mutation-ONLY, radical never shown: dhéanamh (< déanamh, 18 tokens), bhaint (< baint, 21 tokens) — so the inventory has enshrined the lenited form as the headword, and a future prompt using the radical will be reported as unknown. Licensed as ONE construction at the first lenition." },
    { id: 'uru_eclipsis', marker: 'b→mb c→gc d→nd f→bhf g→ng p→bp t→dt, vowel→n-', description: "The second mutation: the initial consonant is replaced rather than aspirated, after the interrogative particle 'an', 'go', 'nach', 'ná', 'dá', 'sa', the possessives ár/bhur/a(their), and 'i'. 'an bhfuil tú?' ('are you?') is 'an' + eclipsed 'fuil'; 'i nGaeilge' ('in Irish') eclipses G→nG. UNATTESTED in the present corpus — 5 seeds is too early for the interrogative-particle frame, and the corpus asks its questions with 'conas' and bare word order. Documented because it is unavoidable in any Irish course past the opening seeds, and because 'bhfuil' looks like an entirely new lexeme rather than a form of 'tá'. Note the vowel case takes a HYPHEN ('ár n-athair'), which the tokenizer splits into a stray one-letter token." },
    { id: 'copula_vs_substantive_split', marker: 'is (copula) vs tá (substantive verb)', description: "Irish has TWO verbs 'to be' and English has one. The COPULA 'is' classifies and identifies ('is múinteoir mé' = 'I am a teacher'; 'is féidir' = 'it is possible' — attested, 11 tokens), is defective (only present 'is' and past 'ba', negative 'ní', interrogative 'an', dependent 'gur'), and takes an inverted order. The SUBSTANTIVE verb 'bí' ('tá' 69 tokens, 'níl', 'bhí', 'beidh', habitual 'bíonn') predicates existence, location and temporary state, and carries the progressive. Choosing between them is Irish grammar with no English reflex, and the two share no forms whatsoever. Licensed as one construction at the first copula; both paradigms are in freeClass." },
    { id: 'vso_word_order', marker: 'Tá mé ag iarraidh …', description: "Irish main clauses are VERB–SUBJECT–OBJECT: 'tá mé ag iarraidh labhairt leat' = be-I at wanting to-speak with-you (corpus S1-ish). The verb is absolutely first; there is no auxiliary inversion for questions because the verb is already there — questions add the particle 'an' plus urú instead. English SVO has no equivalent, so prompt order is grammar, not a clue about a missing word. Licensed at the first finite clause." },
    { id: 'progressive_ag_plus_verbal_noun', marker: 'tá … ag foghlaim / ag iarraidh / ag labhairt', description: "The progressive is 'bí' + the preposition 'ag' ('at') + a VERBAL NOUN: 'tá mé ag foghlaim' = 'I am learning'. Corpus: ag:58, iarraidh:58, foghlaim:27 — 'tá mé ag iarraidh' ('I want', literally 'I am at wanting') is the single most frequent frame in the whole corpus. English '-ing' and 'am/is/are' both live inside this frame with no separate Irish tokens. Licensed at its debut." },
    { id: 'verbal_noun_not_infinitive', marker: 'labhairt / foghlaim / cleachtadh / rá / dhéanamh', description: "Irish has no infinitive; the non-finite form is a VERBAL NOUN, which is a real noun taking the article and possessives. Its shape is unpredictable from the verb stem — labhair→labhairt, foghlaim→foghlaim, déan→déanamh, bain→baint, abair→RÁ (no shared letters at all). Corpus: labhairt:65, rá:18, dhéanamh:18, bhaint:21, cleachtadh:14, foghlaim:27. This is why 36% of the measured findings are verbal morphology: the course teaches a verbal noun and a prompt uses a finite form, or vice versa, and the strings are unrelated. Licensed with the progressive." },
    { id: 'object_particle_a_plus_lenition', marker: 'rud éigin a fhoghlaim · triail a bhaint as · cleachtadh a dhéanamh', description: "When a verbal noun takes an object, Irish FRONTS the object and joins it with the particle 'a', which LENITES the verbal noun: 'Sínis a labhairt' ('to speak Chinese'), 'rud éigin a fhoghlaim' ('to learn something', S4), 'Sínis a chleachtadh' ('to practise Chinese', S5), 'triail a bhaint as' ('to try', S2), 'cleachtadh a dhéanamh ar Shínis a labhairt' (S5), 'staidéar a dhéanamh' (S3). This is BY FAR the highest-yield mutation trigger in the corpus — it produces the fhoghlaim / chleachtadh / dhéanamh / bhaint forms and drives the whole object-fronting word order. Licensed at its debut; 'a' is free glue." },
    { id: 'synthetic_vs_analytic_verb_forms', marker: 'labhraím vs labhraíonn mé · deirim vs deir sé', description: "Irish finite verbs fuse person into the ending (SYNTHETIC: 'labhraím' = 'I speak', 'deirim' = 'I say', 'táim' = 'I am') or use a bare form plus a pronoun (ANALYTIC: 'labhraíonn mé', 'déanann tú' — attested, S3). Dialects differ in which they prefer, and the standard mixes them. Corpus: labhraím:1, deirim:1, déanann:1, táim (in 'tá mé' analytic form). Licensed at the first finite verb. The consequence for the gate: one lexeme yields both a bare stem+ending form and a fused portmanteau, and neither matches the verbal noun the course taught." },
    { id: 'irregular_verbs', marker: 'abair → deir / dúirt / rá · déan → déanann / rinne / dhéanamh · tá → bhí / beidh', description: "Irish has eleven irregular verbs and they are the commonest ones. Their stems change completely across tense and polarity: abair ('say') → present 'deir/deirim', past 'dúirt', verbal noun 'rá', negative past 'ní dúirt'; déan ('do/make') → 'déanann', past 'rinne', negative past 'ní dhearna', verbal noun 'déanamh'; tá → 'bhí' / 'beidh' / 'níl' / 'bhfuil'. Corpus attests rá:18, deirim:1, déanann:1, dhéanamh:18, tá:69. No morphological rule and no string similarity connects these; only a lexicon does. Licensed as one construction at the first irregular verb, and it is the main reason the verbal-morphology share of the finding count (36%) cannot be reduced by better stemming." },
    { id: 'inflected_prepositions', marker: 'ag→agam/agat/aige · le→liom/leat/leis · ar→orm/ort/air', description: "Irish prepositions fuse with pronouns into single words: ag→agam/agat/aige/aici/againn/agaibh/acu, le→liom/leat/leis/léi/linn/libh/leo (corpus: 'leat' in 'labhairt leat', S1), ar→orm/ort/air/uirthi, do→dom/duit/dó/di, as→asam/asat/aisti. English 'with you' is ONE Irish word sharing only a fragment with 'le'. CRUCIALLY, Irish has NO VERB 'TO HAVE': possession is 'tá … agam' ('is … at-me'), so an English 'I have' prompt contains no Irish verb the learner can map to 'have'. All forms are free glue; almost all are paradigm completion here, unattested in a 40-type corpus." },
    { id: 'negation_by_particle_and_mutation', marker: 'ní + séimhiú · níl · níor + séimhiú · nach + urú', description: "Negation is a preverbal particle that ALSO mutates the verb: 'ní' + lenition in the present, 'níor' + lenition in the past, 'nach'/'nár' + eclipsis in subordinate and negative-interrogative clauses. For 'bí' the particle FUSES: 'ní' + 'fuil' = 'níl', one token that shares nothing with 'tá'. Licensed as one negation construction covering all shapes. Unattested in this corpus — 127 prompts across 5 seeds and not one negative — which is itself worth recording as a gap in the calibration." },
    { id: 'question_by_particle_an', marker: 'an bhfuil …? · ar labhair …? · conas …?', description: "Yes/no questions take the particle 'an' (+ urú) in the present/future, 'ar' (+ lenition) in the past, negative 'nach' (+ urú); wh-questions front cad/céard/cé/cén/cathain/cá/conas. There is NO do-support: English do/does/did have no Irish counterpart. Corpus attests only the wh-form ('conas':27) and bare-order questions. Licensed at the first question." },
    { id: 'equative_and_comparative', marker: 'chomh … agus/le · a oiread agus · níos … ná', description: "Equatives use 'chomh X agus/le Y' and 'a oiread agus' ('as much as'): corpus 'chomh minic agus is féidir' ('as often as possible', S3), 'Sínis a labhairt a oiread agus is féidir' (S3). Comparatives use 'níos' + a special comparative form of the adjective + 'ná' ('than'), and the comparative form is often irregular (maith→fearr, mór→mó, beag→lú) — no string relation to the positive. Licensed at the first comparison; 'chomh', 'oiread', 'níos', 'ná' are all free glue (and 'chomh' alone accounted for 8 of the 58 measured findings before this file existed)." },
    { id: 'article_and_t_prefix', marker: 'an tSínis · an t-am · na n-', description: "Irish has a definite article ('an' singular, 'na' plural) and NO indefinite article at all — 'duine' is both 'person' and 'a person'. The article triggers mutation and, on a feminine noun beginning with s, prefixes t: 'Sínis' → 'an tSínis'; on a masculine vowel-initial noun it prefixes t- with a hyphen ('an t-am'); the genitive plural takes n-. MEASURED ARTEFACT: tokenizeKnown('an tSínis') gives the tokens 'an' + 'tsínis' — the t- fuses into the token and 'tsínis' is a different string from 'sínis', so it will be reported. The hyphenated forms instead SPLIT, leaving a stray 't' or 'n' token. Licensed as one construction; recorded chiefly so an adjudicator recognises both artefacts on sight." },
    { id: 'noun_case_and_genitive', marker: 'Gaeilge → na Gaeilge · fear → an fhir', description: "Irish nouns inflect for case (nominative/genitive/vocative/dative-remnant) and number, by palatalising or adding an ending and often lenting after the article: 'foghlaim na Gaeilge' ('the learning of Irish'). English 'of' corresponds to a case ending, not a word. Unattested in this corpus's 5 seeds. Licensed at the first genitive; the practical effect for the gate is one more form of an already-taught noun that shares only a stem fragment." },
    { id: 'chun_purpose_clause', marker: 'chun … a dhéanamh · le … a rá', description: "Purpose is 'chun' (or dialectal 'le') + a fronted object + 'a' + lenited verbal noun: 'Tá mé chun cleachtadh a dhéanamh ar Shínis a labhairt' (S5, chun:13). English 'to' / 'in order to' maps onto this whole frame; 'chun' is free glue. Licensed at its debut. Dialect note: 'chun' is Munster-leaning and 'le' is commoner elsewhere — I cannot tell from 5 seeds which register this course intends." },
  ],

  // Known-side ZUT/rendering rules.
  glossRules: [
    { id: 'mutationIsNotVocabulary', rule: "A mutated form is the SAME known-side word as its radical. Séimhiú: strip the h after the initial consonant (bh→b, ch→c, dh→d, fh→f, gh→g, mh→m, ph→p, sh→s, th→t) — Shínis=Sínis, fhoghlaim=foghlaim, chleachtadh=cleachtadh, dhéanamh=déanamh, bhaint=baint. Urú: undo the cluster (mb→b, gc→c, nd→d, bhf→f, ng→g, bp→p, dt→t, and drop a leading n- before a vowel) — bhfuil=fuil. Which form appears is dictated by the preceding particle or preposition and the learner makes no vocabulary choice. UNMUTATE BEFORE ADJUDICATING ANY FINDING. Beware the inverse case measured here: where a course only ever shows the lenited form (dhéanamh, bhaint), the inventory holds a mutated headword and it is the RADICAL that will be reported." },
    { id: 'twoVerbsForBe', rule: "English 'is/am/are/was/will be' map across the COPULA (is/ní/ba/an/gur) and the SUBSTANTIVE verb (tá/níl/bhí/beidh/bíonn/bheith/bhfuil), chosen by whether the predicate classifies-or-identifies (copula) or locates-or-describes-a-state (substantive). The two paradigms share no forms. Many-Irish→one-English, and the choice is Irish grammar with no English reflex; never treat a new 'bí' or copula form as new vocabulary." },
    { id: 'noVerbToHave', rule: "There is no Irish verb 'to have'. 'I have a book' is 'tá leabhar agam' ('a book is at-me'). So an English 'have/has/had' prompt corresponds to a 'tá' plus an inflected preposition, and English 'have' has NO Irish gloss to tile. The same applies to English 'there is/are' (also 'tá')." },
    { id: 'progressiveIsAgPlusVerbalNoun', rule: "'tá mé ag foghlaim' is 'I am learning'; 'tá mé ag iarraidh' is 'I want' (literally 'I am at wanting'). English '-ing', 'am/is/are' and, in the 'ag iarraidh' case, the verb 'want' itself, are all carried by one Irish frame. Do not expect separate tokens for the English auxiliary or the participle." },
    { id: 'verbalNounIsUnpredictable', rule: "The verbal noun is the citation form and its shape is not derivable from the finite stem: labhair→labhairt, bain→baint, déan→déanamh, abair→rá. So 'labhraím' (1sg) and 'labhairt' (VN), or 'deirim' and 'rá', are the same lexeme with no shared substring. This plus irregularVerbStemsAreLexical is the 36% of the finding count that no stemmer can recover — only a lexicon can." },
    { id: 'irregularVerbStemsAreLexical', rule: "The eleven irregular verbs supply the commonest words and change stem completely: abair→deir/dúirt/rá, déan→déanann/rinne/dhéanamh/dhearna, tá→bhí/beidh/níl/bhfuil, téigh→chuaigh/dul, tar→tháinig/teacht, faigh→fuair/fáil, feic→chonaic/feiceáil, clois→chuala, ith→d'ith, beir, tabhair→thug/tabhairt. Each is one known-side lexeme across all its forms." },
    { id: 'noDoSupport', rule: "English do/does/did in questions and negatives correspond to NOTHING in Irish: questions take the particle 'an'/'ar' plus a mutation, and negation takes 'ní'/'níor'/'níl' plus a mutation. The known side supplies no gloss for do-support and a gate must not look for one. Conversely Irish 'déan/déanann/dhéanamh' IS the content verb 'do/make' and is separate vocabulary — and it appears in the fixed frame '… a dhéanamh' ('to do/carry out'), where it is machinery rather than a lexical choice." },
    { id: 'noYesNoWords', rule: "Irish has no 'yes' or 'no'. An answer ECHOES the verb of the question: 'an bhfuil tú?' → 'tá' / 'níl'; 'ar labhair tú?' → 'labhair' / 'níor labhair'; copular questions answer 'is ea'/'ní hea' (colloquially 'sea'). So English yes/no map to a whole paradigm chosen by the question's verb, and an Irish 'tá' or 'sea' standing alone in a prompt is an answer form, not new vocabulary." },
    { id: 'inflectedPrepositionsAreGlue', rule: "English 'with you / at me / on him / to her' are each ONE Irish word (leat, agam, air, di) sharing at most a fragment with the bare preposition. All are free glue. Honest caveat: only 'leat' is attested in this corpus, so the rest of the paradigm in freeClass is asserted Irish grammar, and a finding on one of them deserves adjudication rather than automatic dismissal." },
    { id: 'noIndefiniteArticle', rule: "Irish has no indefinite article: 'duine' is 'person' and 'a person'; 'rud éigin' is 'something/anything'. English a/an correspond to nothing in the prompt, and conversely the definite 'an'/'na' brings mutation and the t-/n- prefixes with it (an tSínis, an t-am) — those are the same noun, differently spelled." },
    { id: 'aonSenseSplit', rule: "'aon' is BOTH the numeral 'one' and the NPI determiner 'any'. It is in the npi list to record the split; a positive-declarative 'aon' meaning 'one' is NEVER an NPI violation. Likewise 'go fóill' is 'yet' under negation but 'still' positive, and 'níos mó' is 'more' in a plain comparative and 'any more' only under negation." },
    { id: 'tPrefixAndHyphenAreArtefacts', rule: "'an tSínis' tokenises to 'tsínis' (a different string from 'sínis'), while 'ár n-athair' and 'an t-am' tokenise to a stray one-letter token plus the correctly-matching bare word. Both are TOKENIZER-LEVEL artefacts of Irish orthography, recorded here and not fixable from a contract file. Strip a leading 't'/'n' prefix, and discard stray one-letter 't'/'n' tokens, before deciding anything is unknown." },
    { id: 'dialectVariationIsNotVocabulary', rule: "Irish has three living dialects that differ precisely in the closed class: 'muid' (Connacht/Ulster) vs 'sinn' (Munster) for 'we'; synthetic 'labhraím' vs analytic 'labhraíonn mé'; 'chun' vs 'le' for purpose; Ulster 'cha/chan' for 'ní'. All variants render the same English and all are free glue. EXPLICIT GAP: with 40 word types I cannot determine which dialect this estate's Irish courses are written in, so all three are admitted and none is calibrated." },
  ],
};

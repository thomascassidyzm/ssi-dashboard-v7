// _lang_cym — LANGUAGE-LEVEL known-side BRIEF for cym-known (Welsh-known) courses.
// FIRST PASS (2026-08-17), ratified:null.
//
// AGENT-BRIEF DIALECT, DELIBERATELY. freeClass / npi / npiLicensing / negation /
// knownConstructions[{id,marker,description}] / glossRules — NOT freeGlue / negationMarkers /
// constructions[{id,test}]. isMechanicalContract() must return FALSE for this file, because under
// Kai's ruling (2026-08-17) a brief contract is routed to ADVISORY: the exact-form matcher reports
// a list, it never fails a build. For Welsh that is not caution, it is correctness — initial
// consonant mutation guarantees that a large fraction of correctly-used, already-taught words
// appear in the prompt as strings the matcher has never seen (measured below: 69% of raw findings).
//
// ── CALIBRATION, AND ITS LIMITS ───────────────────────────────────────────────────────────────
// Nine cym-known courses exist (ita_for_cym, spa_for_cym, ara_for_cym, deu_for_cym, zho_for_cym,
// jpn_for_cym, por_for_cym, kor_for_cym, fra_for_cym); ALL are status 'draft' and only TWO have
// any content at all:
//   ita_for_cym — 58 course_legos, 465 course_practice_phrases; prompts reach seed 16.
//   spa_for_cym —  7 course_legos,  26 course_practice_phrases; prompts reach seed ~2.
// Token counts through the 2026-08-17 Unicode-aware tokenizeKnown + stemKnownGloss:
//   LEGO known_text across both courses: 152 tokens / 80 types.
//   Practice-phrase known_text: 2,558 tokens / 90 types (ita) + 129 tokens / 11 types (spa).
// So the entire calibration base is ~2,840 known-side tokens and ~90 distinct word types, from
// the first SIXTEEN seeds of one early build. EXPLICIT GAP: this is a thin, early corpus. Roughly
// half the freeClass below is corpus-attested; the rest is paradigm completion (the full pronoun
// set, the inflected-preposition forms, the bod paradigm beyond the three tenses attested) and is
// marked as such in the comments. Nothing here has been checked against a mature Welsh course,
// because none exists. Treat this as a first pass to be re-derived when a cym-known course passes
// seed 100.
//
// ── REGISTER: THIS CORPUS IS COLLOQUIAL NORTH WELSH, NOT LITERARY WELSH ───────────────────────
// The corpus is unambiguously spoken northern Welsh, and a contract written from literary Welsh
// would miss most of it. Attested: 'dw i' (not 'rwyf i'), 'isio' (not 'eisiau'), 'efo' (not
// 'gyda'), 'chdi' (not 'ti' as object), 'rŵan' (not 'nawr'), 'licio' (not 'hoffi'), 'deud' (not
// 'dweud'), 'fedra i' (not 'gallaf i'), 'chydig' (not 'ychydig'), "'swn i'n" (not 'baswn i'n'),
// 'be' (not 'beth'), 'dyfalu', 'sbio'. Both dialect words AND their literary equivalents are in
// freeClass where they are function words, so a southern course does not fail — but the southern
// forms are UNATTESTED here and are paradigm completion, not measurement.
//
// ── THE HEADLINE PROBLEM: INITIAL CONSONANT MUTATION ─────────────────────────────────────────
// Welsh mutates the first consonant of a word according to what precedes it. Three systems:
//   TREIGLAD MEDDAL (soft):    p→b  t→d  c→g  b→f  d→dd  g→(nothing)  m→f  ll→l  rh→r
//   TREIGLAD TRWYNOL (nasal):  p→mh t→nh c→ngh b→m   d→n  g→ng          (after 'yn' = in, 'fy')
//   TREIGLAD LLAES (aspirate): p→ph t→th c→ch                           (after 'a', 'â', 'gyda',
//                                                                        'tri', 'chwe', fem. 'ei')
// A mutated form of an introduced word IS A DIFFERENT STRING. stemKnownGloss does no unmutating
// (and could not: 'gofio'→'cofio' is not derivable without knowing 'gofio' is mutated rather than
// a g-initial lexeme in its own right), so every mutation is a candidate "unknown gloss".
// MEASURED, on ita_for_cym: building the introduced-gloss inventory from its 58 legos (80 stems)
// and testing all 465 practice prompts gives 42 raw unknown-gloss hits over 11 types. Classified
// by hand, every one of the eleven:
//   MUTATION of a radical the course DID teach — 29 hits / 7 types = 69% of the count:
//     ddeud:8  ← deud   (d→dd, soft, after 'i': "dw i'n mynd i ddeud rhywbeth", S5)
//     drio:7   ← trio   (t→d, soft, after 'i': "dw i'n mynd i drio mor galed â phosib", S7)
//     ddysgu:4 ← dysgu  (d→dd, soft, after 'i': "sut i ddysgu rhywbeth", S4)
//     gofio:3  ← cofio  (c→g, soft, as object of a mutating verb: "fedra i gofio", S10)
//     gofio'r:3← cofio  (same, plus the fused article — two defects on one token)
//     ddyfalu:2← dyfalu (d→dd: "dw i'n mynd i ddyfalu be sy'n mynd i ddigwydd", S12)
//     ddod:2   ← dod    (d→dd: "dw i'n mynd i ddod yn ôl rŵan", S16)
//   FUSED DEFINITE-ARTICLE CLITIC 'r — 12 hits / 3 types = 29% of the count:
//     cofio'r:8, gofio'r:3, esbonio'r:1, o'n:3 — the tokenizer keeps the apostrophe inside the
//     token (it is in the \p{L}\p{M}' class), so "cofio'r frawddeg" = "remember THE sentence"
//     yields the token "cofio'r", which is a content word welded to a function word. THIS IS NOT
//     FIXABLE FROM A CONTRACT FILE: I can put the pure clitic forms (i'n, o'r, sy'n, ti'n) in
//     freeClass, but "cofio'r" would need an unbounded list of content-word+'r pairs. Reported as
//     a tokenizer-level gap; see glossRules.articleCliticFusesToTheHostWord.
//   GENUINE UNSEEN MORPHOLOGY — 1 hit / 1 type = 2%:
//     wyt:1 ← the 2sg present of 'bod' ("wyt ti'n siarad Eidaleg drwy'r dydd?", S14), where the
//     course had taught 'dw' (1sg) and 'mae' (3sg). Real, invisible, and not a defect.
//   GENUINELY UNTAUGHT WELSH VOCABULARY: ZERO. Not one of the 42 hits is a word the learner had
//     not been given in some form.
// So on the only cym corpus that exists, the exact-form matcher's precision for the thing the
// gate is FOR — a learner prompted with a word they were never given — is 0 out of 42. That is
// the whole argument for advisory, in one number.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY (left OUT of freeClass) ───────────────────────────
// * 'ôl' (34) — bound inside 'yn ôl' ('back'/'according to') and never free; left to its carrier.
// * 'nes ymlaen' (nes:17, ymlaen:17) — a two-word 'later'; 'nes' is also 'until' and a comparative
//   'nearer'. Too few tokens to separate the senses, so both words are left as content.
// * 'mor' (16) / 'â' (16) / 'phosib' (16) — the equative frame 'mor X â phosib' ('as X as
//   possible'). 'mor' and 'â' are in freeClass as the equative machinery; 'phosib' is NOT, because
//   it is the aspirate-mutated content adjective 'posib' and belongs to the mutation construction.
// * 'chydig' (15) — colloquial clipping of 'ychydig' ('a little'). Both spellings are in freeClass
//   as a quantifier, but I am not certain the clipped form is not being taught as a LEGO here.
// * 'dan' (22) / 'ni' (22) — 'dan ni' is the northern 1pl 'we are'; 'dan' is ALSO the preposition
//   'under'. Homographs at the token level. Both are in freeClass, which means a genuine misuse of
//   the preposition would be masked — an accepted, stated cost.
// * 'iawn' (13) — 'very' (postposed) and also 'right/fine'. In freeClass as the intensifier; the
//   'right/fine' sense is arguably content.
module.exports = {
  course_code: '_lang_cym',
  ratified: null,
  known_lang: 'cym',
  known_lang_name: 'Welsh',

  // Free class — Welsh closed-class glue. Corpus-attested items are marked (·); the rest is
  // paradigm completion. MUTATED forms of function words are listed alongside their radicals,
  // because the gate matches exact strings and a mutated function word is a different string.
  freeClass: [
    // personal pronouns, independent + affixed + colloquial (· i, fi, ti, chdi, o, hi, ni)
    'i', 'fi', 'mi', 'ti', 'chdi', 'chi', 'o', 'fo', 'e', 'fe', 'hi', 'ni', 'chdi', 'nhw',
    'innau', 'finnau', 'tithau', 'yntau', 'hithau', 'ninnau', 'chithau', 'nhwythau',
    // possessive determiners + their contracted clitics (·ei, ·y)
    'fy', 'dy', 'ei', 'ein', 'eich', 'eu', "'i", "'w", "'n", "'m",
    // definite article and its clitic (· y, o'r, drwy'r, ydy'r)
    'y', 'yr', "'r",
    // ── clitic-fused tokens the tokenizer emits WHOLE (· all of these) ──
    // The apostrophe is inside the token class, so 'yn'→'n and 'yr'→'r fuse to the host word.
    // These are the pronoun/verb hosts; a CONTENT word + 'r cannot be enumerated (see header).
    "i'n", "o'n", "o'r", "ti'n", "sy'n", "mae'n", "ydy'r", "drwy'r", "chi'n", "ni'n", "nhw'n",
    "hi'n", "fo'n", "dw i'n", "'swn", "'sa", "'san", "'sat", "'ma", "'na",
    // ── the bod paradigm: pure auxiliary, no English lexical gloss (· dw, mae, wyt, dan, ydy, sy)
    'dw', 'dwi', 'wyt', 'ydw', 'ydy', 'yw', 'mae', 'maen', 'dan', 'dach', 'ydych', 'ydyn',
    'oes', 'sydd', 'sy', 'nag', 'oedd', 'roedd', 'doedd', 'dydy', 'dydw', 'does',
    'bydd', 'fydd', 'fyddai', 'byddai', 'baswn', 'basa', 'faswn', 'fasa', 'taswn', 'tasa',
    'bod', 'fod', 'bo',
    // aspect / predicative particles (· yn, wedi)
    'yn', 'wedi', 'newydd', 'am', 'ar', 'heb',
    // preverbal + interrogative + relative particles (· a)
    'mi', 'fe', 'a', 'ac', 'y', 'yr', 'na', 'nad',
    // prepositions, radical + soft-mutated (· i, o, ar, am, efo, â, dan, drwy, gan)
    'i', 'o', 'ar', 'am', 'at', 'gan', 'gyda', 'efo', 'wrth', 'dros', 'tros', 'dan', 'tan',
    'drwy', 'trwy', 'rhwng', 'heb', 'hyd', 'erbyn', 'ers', 'cyn', 'nes', 'ynghylch', 'â', 'ag',
    'ddros', 'ddan', 'ddrwy', 'wrtho', 'ato',
    // inflected prepositions — PARADIGM COMPLETION, unattested in this corpus. Welsh prepositions
    // conjugate for person (i→imi/iddo/iddi, ar→arna/arnat/arno/arni, gan→gen/gennyt/gynno).
    'imi', 'iti', 'iddo', 'iddi', 'inni', 'ichi', 'iddyn',
    'arna', 'arnat', 'arno', 'arni', 'arnon', 'arnoch', 'arnyn',
    'gen', 'gennyt', 'gynno', 'gynni', 'gennyn', 'gennych', 'gennyn',
    'amdana', 'amdanat', 'amdano', 'amdani', 'wrtha', 'wrthat', 'ohono', 'ohoni', 'ohonyn',
    // conjunctions and subordinators (· ond, a)
    'ond', 'neu', 'os', 'pan', 'tra', 'am', 'gan', 'oherwydd', 'achos', 'felly', 'hefyd',
    'petai', 'pe', 'tra', 'nes', 'cyn', 'wedyn', 'serch',
    // interrogatives (· be, sut)
    'be', 'beth', 'pwy', 'pryd', 'lle', 'ble', 'sut', 'pam', 'faint', 'pa', 'sawl', "p'un",
    // quantifiers, degree, scope (· mor, chydig, iawn, arall, pawb, rhywbeth, rhywun)
    'mor', 'mwy', 'llai', 'iawn', 'rhy', 'digon', 'dipyn', 'chydig', 'ychydig', 'llawer',
    'gyd', 'pob', 'pawb', 'popeth', 'rhywbeth', 'rhywun', 'rhywle', 'unrhyw', 'neb', 'byd',
    'arall', 'eraill', 'yr un', 'hyn', 'hynny', 'hwn', 'honno', 'hwnnw', 'dyma', 'dyna',
    'eto', 'dal', 'dim ond', 'jest', 'braidd', 'prin',
    // negation particles, radical + mutated (· ddim, dim)
    'ddim', 'dim', 'mo', 'nid', 'ni',
    // answer words (Welsh has no plain yes/no — see glossRules.noYesNoWords)
    'ia', 'ie', 'naddo', 'nage', 'do', 'oes', 'nac', 'iawn',
    // numeral 'one' as an article-ish determiner
    'un',
  ],

  // NPI items + WHEN they are licensed. Violation = an NPI in a plain POSITIVE DECLARATIVE only.
  npi: ['neb', 'dim', 'ddim', 'byd', 'erioed', 'eto', 'unrhyw', 'chwaith', 'o gwbl', 'mwyach'],
  npiLicensing: {
    rule: "Welsh polarity items are built on 'dim' ('nothing/any'), and the crucial fact for a gate is that WELSH NEGATION IS ITSELF A 'dim' WORD: colloquial Welsh negates with the postverbal particle 'ddim' ('dw i ddim yn siŵr' — attested, S10 'dw i ddim yn siŵr fedra i gofio gair'), so the licenser and the licensee are the same lexical stem in different syntactic slots. Any mechanical rule keyed on the STRING 'dim'/'ddim' will therefore either license everything or flag the negator itself, which is why this is a brief and not a regex. The genuine NPIs are: 'neb' ('anyone/nobody'), 'dim byd' ('anything/nothing'), 'erioed' ('ever', past) and 'byth' ('ever', non-past), 'unrhyw' ('any' + noun), 'chwaith' ('either'), 'o gwbl' ('at all'), 'mwyach' ('any more'). Welsh, like Irish and unlike English, uses NEGATIVE CONCORD: 'does neb yma' is literally 'there-is-not nobody here' and means 'there isn't anyone here' — the negative word co-occurring with the negator is correct Welsh, not a double negative to be flagged. Two further items need a sense split rather than an NPI rule: 'eto' is 'yet' under negation but 'again/still' in a positive declarative ('unwaith eto' = 'once again'), and 'dal' is 'still'. And Welsh very often expresses English 'any' with NOTHING AT ALL — a bare noun, no determiner ('oes gen ti amser?' = 'do you have any time?') — so a Welsh rendering of an English NPI prompt frequently contains no NPI-shaped token for a gate to find. In the 2,687-token corpus available here, 'ddim' occurs 39 times as the NEGATOR and there is not one clear instance of a licensed NPI, so the licensing list below is Welsh grammar, NOT a measured calibration.",
    licensedIn: [
      "Postverbal negation with 'ddim' (colloquial) or 'dim' — 'dw i ddim yn siŵr' (corpus S10), and the negated-verb forms 'does', 'dydy', 'doedd', 'dydw', 'fydd ddim'.",
      "Literary/formal negation with the preverbal particle 'ni'/'nid' plus soft or aspirate mutation of the verb ('nid wyf', 'ni chysgais') — unattested in this corpus.",
      "Negative concord items themselves — 'neb', 'dim byd', 'byth', 'erioed', 'mo' — which carry the negation and license each other.",
      "Yes/no questions, formed by an interrogative particle plus mutation, or in the colloquial by the inflected verb form alone with rising intonation — 'wyt ti'n siarad Eidaleg drwy'r dydd?' (corpus S14), 'fedra i?' (S10, soft-mutated 'medra').",
      "Wh-questions with be/beth/pwy/pryd/sut/pam/faint, and the embedded interrogative 'os'/'ai'.",
      "Conditional clauses with 'os' ('if', indicative) and 'pe'/'petai'/'taswn' (counterfactual) — the corpus's \"'swn i'n licio\" is the conditional of 'bod' and is a licenser.",
      "The conditional/irrealis mood generally — 'baswn/'swn', 'fyddwn', 'hoffwn', 'licio' under a conditional auxiliary ('\\'swn i'n licio cofio'r frawddeg gyfan', S11).",
      "Comparatives with 'na'/'nag' ('than') and equatives with 'mor … â' ('mor galed â phosib', S7) — the equative frame in this corpus.",
      "'cyn' ('before') clauses and the restrictive 'dim ond' / 'ond' ('only').",
      "Imperatives, and the ability modals 'gallu'/'medru' ('fedra i gofio', S10) under question or negation.",
    ],
  },

  // Negation markers (reference list). Welsh negation is a FREE POSTVERBAL PARTICLE in the
  // colloquial ('ddim'), a PREVERBAL PARTICLE plus mutation in the literary ('ni'/'nid'), and is
  // FUSED INTO the verb form for 'bod' (does/dydy/doedd/dydw). All three shapes listed.
  negation: ['ddim', 'dim', 'mo', 'ni', 'nid', 'na', 'nac', 'nad',
    'does', 'dydy', 'dydw', 'dwyt', 'doedd', 'fydd ddim', 'neb', 'dim byd', 'byth', 'erioed',
    'naddo', 'nage'],

  // Welsh machinery licensed at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'initial_consonant_mutation', marker: 'treiglad meddal / trwynol / llaes', description: "THE defining fact of the Welsh known side for an exact-form matcher. The first consonant of a word changes according to the preceding word: SOFT (p→b t→d c→g b→f d→dd g→∅ m→f ll→l rh→r) after 'i', 'o', 'am', 'ar', 'at', 'gan', 'dan', 'dros', 'drwy', 'wrth', 'hyd', 'yn' (predicative), 'dy', 'ei'(masc), 'dau/dwy', 'yn'+adjective, a feminine singular noun after 'y', the object of an inflected verb, and sentence-initially in the colloquial affirmative; NASAL (p→mh t→nh c→ngh b→m d→n g→ng) after 'yn' ('in') and 'fy'; ASPIRATE (p→ph t→th c→ch) after 'a'/'ac', 'â', 'gyda', 'tri', 'chwe', and feminine 'ei'. Corpus-attested pairs where BOTH members appear: deud/ddeud, trio/drio, dysgu/ddysgu, cofio/gofio, dod/ddod, dyfalu/ddyfalu, o/o'n. Corpus-attested mutation-only forms whose radical never surfaces: ddim(dim), fedra(medra), feddwl(meddwl), phosib(posib, aspirate after 'â' — 'mor galed â phosib', S7), galed(caled), gyfan(cyfan), frawddeg(brawddeg), dda(da), ddigwydd(digwydd), orffen(gorffen, g→∅). Licensed as ONE construction at the first mutation; it accounts for 69% of the raw finding count on ita_for_cym and it is the single reason this contract must never hard-block." },
    { id: 'periphrastic_bod', marker: "dw i'n / mae o'n / wyt ti'n + verbal noun", description: "Welsh has almost no simple tenses in the colloquial: nearly every verb is AUXILIARY 'bod' + the aspect particle 'yn' + a VERBAL NOUN. 'dw i'n siarad' = 'I speak'/'I am speaking'; 'dw i'n mynd i ddeud' = 'I'm going to say'; \"dw i'n licio\" = 'I like'. Corpus: dw:204, i'n:128, mae:32, wyt:1, dan ni:22, ti'n:11. The 'bod' form encodes person+tense and the verbal noun carries the lexeme, so the ENGLISH subject pronoun and copula both live in one Welsh word that the learner never glosses separately. Licensed at the first periphrastic clause. Note that 'yn' contracts to 'n and welds to the preceding pronoun, which is why 'i'n' is one token." },
    { id: 'verbal_noun_not_infinitive', marker: 'siarad / dysgu / cofio as a NOUN', description: "Welsh has no infinitive. The non-finite form is a VERBAL NOUN — genuinely a noun, taking the definite article and possessive pronouns — and it is the citation form. English 'to speak', 'speaking' and 'speech' can all be 'siarad'. This matters to the gate because the verbal noun is what carries mutation ('i ddeud', 'i ddysgu', 'a chleachtadh'-style patterns), so the LEGO teaches the radical and the prompt almost always shows the mutated form. Licensed with the periphrastic construction." },
    { id: 'copula_vs_substantive_split', marker: 'mae / ydy / yw / sy(dd) vs the identificatory frame', description: "Welsh splits 'to be' by function, and English collapses it. The SUBSTANTIVE verb 'bod' (mae/oedd/bydd) predicates existence, location and, with 'yn', a property: 'mae o'n dda' = 'he is good'. The IDENTIFICATORY/emphatic order fronts the complement and uses 'ydy'/'yw': 'Aran ydy fy enw i' = 'my name is Aran' — no 'yn', different word order, different verb form. The relative 'sy'/'sydd' is a third form used when the subject is relativised: 'be sy'n mynd i ddigwydd' = 'what is going to happen' (corpus S12). Corpus also has \"ydy'r ateb\" ('is the answer'). So one English 'is' maps to at least mae / ydy / yw / sy / sydd, chosen by clause type. Licensed as one construction at the first non-'mae' copula form; all forms are in freeClass." },
    { id: 'vso_word_order', marker: 'mae + subject + yn + verbal noun', description: "Welsh main clauses are VERB–SUBJECT–OBJECT: the finite verb (usually a 'bod' form) comes FIRST, then the subject, then everything else. 'mae o'n siarad Eidaleg' = verb-he-speaking-Italian. Questions in the colloquial are the same order with a mutated or interrogative verb form. English SVO has no equivalent, so the order of the prompt is grammar, not a hint about which word is missing. Licensed at the first finite clause." },
    { id: 'mynd_i_future', marker: "dw i'n mynd i + soft-mutated verbal noun", description: "The commonest future/intentional in the corpus is 'bod' + 'yn' + 'mynd' + 'i' + verbal noun, and the 'i' triggers SOFT MUTATION on that verbal noun: \"dw i'n mynd i ddeud\" (S5), \"i ddysgu\" (S4), \"i drio\" (S7), \"i ddyfalu\" (S12), \"i ddod\" (S16). This one frame produces 21 of the 29 mutation hits measured — it is the highest-yield mutation trigger in the corpus by a wide margin. Licensed at 'mynd i' (mynd:47 in the corpus)." },
    { id: 'conditional_baswn_licio', marker: "'swn i'n licio / baswn i'n hoffi", description: "'Would like' is the conditional of 'bod' plus 'licio'/'hoffi': colloquial northern \"'swn i'n licio\" (corpus: 'swn:46, licio:46 — \"'swn i'n licio cofio'r frawddeg gyfan\", S11), literary 'baswn i'n hoffi'. The auxiliary is a clipped conditional form that shares no string with 'dw' or 'mae', so it looks like a new word; and the initial apostrophe is preserved by the tokenizer, giving the token \"'swn\". Licensed at its debut; it is also an NPI licenser (irrealis)." },
    { id: 'gallu_medru_ability', marker: 'medru / gallu → fedra i / alla i', description: "Ability is 'gallu' (general) or northern 'medru', and in the colloquial affirmative/interrogative the finite form MUTATES sentence-initially: 'fedra i' (< medra i) = 'I can' / 'can I?' (corpus: fedra:10, medru:9 — 'fedra i gofio', S10). Its object verbal noun ALSO mutates ('gofio' < 'cofio'), so one short prompt carries two mutations, neither of which matches its LEGO. Licensed at the first ability modal." },
    { id: 'negation_by_ddim', marker: 'dw i ddim / does dim', description: "Colloquial negation is the postverbal particle 'ddim' after the subject: 'dw i ddim yn siŵr' (corpus S10, ddim:39). For 'bod' the negation additionally FUSES into the verb (does/dydy/doedd/dydw). Literary Welsh instead uses a preverbal 'ni'/'nid' plus mutation of the verb. Licensed as one negation construction covering all three shapes; note 'ddim' is itself the soft mutation of 'dim', so the negator and the NPI stem are one lexeme (see npiLicensing.rule)." },
    { id: 'interrogative_by_particle_and_mutation', marker: "wyt ti'n …? / fedra i? / be sy'n …?", description: "Welsh forms yes/no questions with a preverbal particle ('a' + soft mutation in the literary) or, colloquially, with the interrogative form of the verb alone plus mutation and intonation: 'wyt ti'n siarad Eidaleg drwy'r dydd?' (S14), 'fedra i?' (S10). Wh-questions front be/beth/pwy/pryd/sut/pam/faint and take the relative 'sy'/'a'. There is NO do-support: English do/does/did correspond to nothing in the Welsh prompt. Licensed at the first question." },
    { id: 'clitic_contraction', marker: "yn→'n · y/yr→'r · ei→'i · fy→'y", description: "Welsh function words contract onto the preceding word and the apostrophe stays inside the token: 'yn'→'n gives i'n / ti'n / sy'n / mae'n / o'n; 'yr'→'r gives o'r / drwy'r / ydy'r AND, fatally for the gate, cofio'r / gofio'r / esbonio'r; 'ei'→'i; 'fy'→'y. Licensed as one orthographic construction. The pronoun/verb hosts are enumerable and are in freeClass; a CONTENT word + 'r is not, and produces 12 of the 42 raw findings measured (29%). See glossRules.articleCliticFusesToTheHostWord." },
    { id: 'possessive_sandwich', marker: 'fy … i · dy … di · ei … o/hi', description: "Possession is a preposed determiner plus an optional echoing pronoun after the noun, with mutation on the noun: 'fy enw i' ('my name'), 'ei enw o' ('his name'), corpus 'ei enw' (ei:12, enw:12). The echoing pronoun is not a second occurrence of the possessor for the learner to gloss. Licensed at the first possessive; 'fy' additionally triggers NASAL mutation, which is the rarest and least recoverable of the three." },
    { id: 'gender_and_feminine_mutation', marker: 'y ferch vs y bachgen', description: "Welsh nouns are masculine or feminine, and a FEMININE singular noun soft-mutates after the definite article 'y' ('brawddeg' → 'y frawddeg'; corpus has 'frawddeg gyfan' with the adjective 'cyfan' mutated to 'gyfan' in agreement). Adjectives following a feminine singular also mutate, and a handful have distinct feminine forms. Licensed at the first feminine noun phrase. English has no gender, so this whole machine is invisible on the English side and shows up only as unmatched strings." },
    { id: 'colloquial_north_register', marker: 'chdi · isio · efo · rŵan · licio · deud · be', description: "The dialect layer, stated as machinery because it is systematic and because a literary-Welsh contract would mis-handle every prompt in this corpus. Northern colloquial: 'chdi' for object/emphatic 'ti' (chdi:65), 'isio' for 'eisiau' (isio:158 — and note it takes NO 'yn': 'dw i isio siarad', not '*dw i'n isio'), 'efo' for 'gyda' (efo:87), 'rŵan' for 'nawr' (rŵan:42), 'licio' for 'hoffi', 'deud' for 'dweud', 'be' for 'beth', 'chydig' for 'ychydig', 'dan ni' for 'rydyn ni', \"'swn i\" for 'baswn i'. Licensed as a register, not word by word; the southern equivalents are in freeClass where they are function words but are UNATTESTED here." },
    { id: 'equative_mor_a', marker: 'mor + soft-mutated adj + â + aspirate-mutated noun', description: "The equative frame 'mor X â Y' ('as X as Y'): corpus 'mor galed â phosib' ('as hard as possible', S7) and 'mor aml â phosib' ('as often as possible'). 'mor' soft-mutates what follows (caled→galed) and 'â' ASPIRATE-mutates what follows (posib→phosib) — two different mutation systems in five words. Licensed at the first equative. This frame is the only aspirate mutation attested in the whole corpus." },
  ],

  // Known-side ZUT/rendering rules.
  glossRules: [
    { id: 'mutationIsNotVocabulary', rule: "A mutated form is the SAME known-side word as its radical: ddeud=deud, drio=trio, ddysgu=dysgu, gofio=cofio, ddod=dod, ddyfalu=dyfalu, galed=caled, gyfan=cyfan, frawddeg=brawddeg, dda=da, phosib=posib, feddwl=meddwl, orffen=gorffen. Which form appears is dictated entirely by the preceding word, and the learner makes no vocabulary choice. When adjudicating any finding on this known side, UNMUTATE FIRST (soft: b←p, d←t, g←c, f←b/m, dd←d, l←ll, r←rh, ∅←g; nasal: mh←p, nh←t, ngh←c, m←b, n←d, ng←g; aspirate: ph←p, th←t, ch←c) and only then ask whether the radical was taught. 69% of raw findings die at this step." },
    { id: 'articleCliticFusesToTheHostWord', rule: "The definite-article clitic 'r welds to whatever precedes it and the tokenizer keeps it inside the token, so 'cofio'r frawddeg' ('remember the sentence') produces the token \"cofio'r\", and 'esbonio'r' likewise. These are NOT new words and they are NOT enumerable in freeClass — the list would have to contain every content word × 'r. 12 of 42 raw findings on ita_for_cym (29%) are exactly this. It is a TOKENIZER-LEVEL gap, recorded here and not fixable from a contract: any adjudicator must strip a trailing \"'r\"/\"'n\"/\"'i\"/\"'w\" before deciding a token is unknown." },
    { id: 'tiChdiChiCollapse', rule: "Welsh 'ti' (familiar sg), 'chdi' (northern object/emphatic sg), 'chi' (plural AND formal singular) all render English 'you'. Many-Welsh→one-English, ZUT-legal. This corpus uses chdi/ti; a formal 'chi' course adds a carrier, not an English contrast." },
    { id: 'thirdPersonAndGender', rule: "'o'/'fo' (northern) and 'e'/'fe' (southern) are 'he' AND inanimate 'it'; 'hi' is 'she' AND 'it'. Welsh has no neuter, so every noun is he or she and English renders many of them 'it'. Do not force a gendered English pronoun where the referent is a thing, and do not treat o/fo/e/fe as four vocabulary items." },
    { id: 'presentCoversProgressive', rule: "\"dw i'n siarad\" is both 'I speak' and 'I am speaking'; there is no aspectual contrast in the Welsh present for English to mirror. One Welsh periphrastic form → several English forms. English 'am/is/are' and '-ing' have no separate Welsh tokens: both live in the 'bod' form plus the particle 'yn'." },
    { id: 'myndIIsWillAndGoingTo', rule: "\"dw i'n mynd i ddeud\" renders English 'I'm going to say' and, idiomatically, 'I'll say'. The literal 'mynd' ('go') is not a lexical choice here — it is future machinery. Do not gloss 'mynd' as motion inside this frame, and do not expect an English 'will' token to correspond to anything." },
    { id: 'wouldLikeIsOneUnit', rule: "\"'swn i'n licio\" = 'I would like'. The conditional auxiliary \"'swn\" carries 'would' and the subject; 'licio' carries 'like'. English 'would' has no independent Welsh gloss, and \"'swn\" is not a form of 'dw' the learner can derive. One unit, licensed once." },
    { id: 'noYesNoWords', rule: "Welsh has no all-purpose 'yes' or 'no'. An answer ECHOES the verb of the question in the appropriate form: ydw/nac ydw, oes/nac oes, do/naddo, ia/nage. So English 'yes'/'no' map to a whole paradigm chosen by the question's verb, and conversely a Welsh 'oes' or 'do' in a prompt is an answer form, not new vocabulary. Never tile English yes/no as a single Welsh gloss." },
    { id: 'oneEnglishIsManyWelshBe', rule: "English 'is/are/am/was/will be' map across mae/ydy/yw/sy/sydd/oedd/bydd/dan/dw/wyt plus the negated fusions does/dydy/doedd, chosen by clause type (predicative vs identificatory vs relative), person, tense and polarity — not by meaning. All are machinery in freeClass; a new 'bod' form is never new vocabulary, and 'wyt' (the one genuine morphology finding measured) is exactly this case." },
    { id: 'isioTakesNoYn', rule: "'isio'/'eisiau' ('want') is syntactically a NOUN and takes no aspect particle: 'dw i isio siarad' — never '*dw i'n isio'. Corpus: isio:158, always without 'yn'. A gate must not read the missing 'yn' as an error, and must not expect English 'to' before the verbal noun to correspond to anything." },
    { id: 'inflectedPrepositionsAreGlue', rule: "Welsh prepositions conjugate for person (i→imi/iddo/iddi, ar→arna/arno/arni, gan→gen/gynno/gynni, am→amdana/amdano), so English 'to me/for him/with her' is ONE Welsh word that shares only a stem fragment with the bare preposition. There is also no verb 'to have': possession is 'mae … gen i' ('there is … with me'). All these forms are free glue; the inflected forms listed in freeClass are PARADIGM COMPLETION and are unattested in the present corpus, so a finding on one of them should be adjudicated, not trusted." },
    { id: 'galluMedruBothCan', rule: "'gallu' and northern 'medru' both render English 'can/be able to', and their finite forms are irregular AND initially mutated ('fedra i', 'alla i'). Many-Welsh→one-English; the mutated finite form is not a separate item from the verbal noun that was taught." },
    { id: 'etoSenseSplit', rule: "'eto' is 'yet' under negation and 'again/still' in a positive declarative; 'dal' is 'still'. It is in the npi list only to record the split — a positive-declarative 'eto' meaning 'again' is NEVER an NPI violation. Same shape as the German noch/mehr problem: one form, two polarity-conditioned English glosses." },
  ],
};

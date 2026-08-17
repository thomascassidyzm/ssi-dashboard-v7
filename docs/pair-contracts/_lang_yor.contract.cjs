// _lang_yor — LANGUAGE-LEVEL known-side contract for yor-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// AGENT-BRIEF DIALECT, DELIBERATELY (Kai's ruling 2026-08-17). freeClass / npi / npiLicensing /
// negation / knownConstructions[{id,marker,description}] / glossRules only — NO freeGlue, NO
// negationMarkers, NO constructions[].test — so isMechanicalContract() is FALSE and every finding is
// routed to TRIAGE, never to a build failure. For Yoruba that is not a concession, it is the only
// defensible setting: see the calibration gap below.
//
// ── CALIBRATION, AND THE GAP, STATED UP FRONT ────────────────────────────────────────────────────
// There is exactly ONE yor-KNOWN course on the estate: cym_for_yor (draft). It has 28 course_legos and
// 194 course_practice_phrases, which tokenise to 77 tokens / 43 types across TEN seeds. That is not a
// calibration base; it is a sample. Everything in this file that rests on cym_for_yor alone is marked
// as such, and there is very little of it.
// So I calibrated instead on the largest authored Yoruba corpus in the database, which is the TARGET
// side of yor_for_eng: 668 course_seeds rows of full Yoruba sentences, tokenised with the live
// tokenizeKnown/stemKnownGloss to 5,928 tokens / 598 types. Those are Yoruba sentences authored for
// this course estate by the same pipeline, covering the same 668-seed communicative arc that every
// other course covers, so their function-word distribution is the right prior for a yor-KNOWN course
// — but they were authored as TARGET text, not as known-side prompts, and no one has yet checked them
// against a known-side vocabulary budget. Every frequency figure below is from that corpus; every
// cited example prompt is verbatim yor_for_eng target_text with its English seed alongside.
// WHAT IS *NOT* CORPUS-DERIVED, and is general Yoruba linguistics I am asserting from knowledge:
// the tone-allomorphy account of the subject pronouns (mo/mi/n, o/ o/ ó), the vowel-harmony rule for
// the 3sg object pronoun, the ní → l- contraction rule, the reduplication-nominalisation rule, and the
// claim that tone is lexically contrastive. The corpus is consistent with all five and I cite corpus
// instances of each, but the RULES are mine, not measured. Treat them as hypotheses a Yoruba speaker
// should ratify before this file's `ratified` field is ever set.
//
// ── WHY EXACT-FORM MATCHING IS TRIAGE-ONLY FOR YORUBA ────────────────────────────────────────────
// Yoruba (yor, Niger-Congo / Volta-Niger) is ISOLATING and almost entirely uninflected: the verb never
// changes for person, number or tense. That sounds like the easy case for an exact-form matcher, and
// for the verb itself it is. The difficulty is elsewhere, and it is severe:
//   1. TONE IS PART OF THE WORD. Yoruba writes three tones (high ´, mid unmarked, low `) and they are
//      lexically and grammatically contrastive: kọ́ 'learn' vs kọ 'write' vs kò 'not'; ọkọ̀ 'vehicle' vs
//      ọkọ 'husband'; ó 'he/she/it (subject)' vs o 'you (subject)' vs ò 'not'. Any normalisation that
//      dropped tone would merge a negator with a verb. It does not (verified below), but it means the
//      matcher is comparing 6-8 codepoint keys where a one-codepoint difference is a different word.
//   2. GRAMMAR IS SUPRASEGMENTAL AND CLITIC, NOT AFFIXAL. Tense/aspect/mood is a string of PREVERBAL
//      PARTICLES (ń, ti, máa, yóò, ì bá, bá) that stand as separate tokens, and the subject pronoun
//      changes SHAPE with them (mo fẹ́ 'I want' vs mi ò fẹ́ 'I don't want' vs kí n ṣe 'that I do').
//      The matcher sees mo, mi and n as three unrelated words. They are one pronoun.
//   3. VOWEL-INITIAL FUNCTION WORDS CONTRACT ONTO THEIR HOST. ní 'at/in/to' fuses: ní ọwọ́ → lọ́wọ́, ní
//      ilé → nílé, ní ọjọ́ → lọ́jọ́, ní èyí → nínú. So the same preposition surfaces as ní, l-, n- and as
//      part of a word that looks like new vocabulary.
//   4. SERIAL VERB CONSTRUCTIONS spread one English verb across several Yoruba verbs (ràn … lọ́wọ́
//      'help', fi … hàn 'show', bẹ̀rẹ̀ sí í 'start to'), so the known side has tokens the English target
//      has no counterpart for.
// CONSEQUENCE: a raw finding count on a Yoruba course is an UPPER BOUND. Read the list, not the number.
//
// ── THE NFC / COMBINING-MARK CAVEAT, VERIFIED EMPIRICALLY (2026-08-17) ───────────────────────────
// A recorded repo caveat says Yoruba NFC still carries combining marks because no precomposed
// dot-below-plus-tone codepoint exists, so any normalisation stripping U+0300–U+036F kills tone on
// ẹ/ọ/ṣ ONLY, making the damage look random. I tested the live stemKnownGloss, which does
// .normalize('NFC') and keeps \p{M}. RESULT — the caveat is real about the codepoints, and the current
// implementation is SAFE:
//   • ẹ̀ is U+1EB9 (ẹ, precomposed) + U+0300 (combining grave). NFC leaves it exactly there: there is no
//     single codepoint for ẹ-with-grave, so composition has nothing to compose. NFD would decompose it
//     further to U+0065 U+0323 U+0300. Confirmed by direct codepoint inspection.
//   • Plain-vowel tone letters ARE precomposed and single: í = U+00ED, ò = U+00F2, ú = U+00FA. So a word
//     mixing both classes is a mix of 1-codepoint and 2-codepoint graphemes. That is exactly the
//     asymmetry the caveat warns about.
//   • stemKnownGloss ROUND-TRIPS EVERY YORUBA WORD I THREW AT IT UNCHANGED (identical to the lowercased
//     input, codepoint for codepoint): pẹ̀lú, gbìyànjú, túmọ̀, ṣàlàyé, ọ̀rọ̀, lóòrèkóòrè, ẹlòmíràn.
//     tokenizeKnown on a full sentence returns ['mo','fẹ́','láti','sọ','èdè','welsh','ṣùgbọ́n','ń','kò',
//     'rántí','ọ̀rọ̀','náà'] — tone intact throughout. \p{M} is doing exactly the job its comment claims.
//   • NFC is not merely harmless here, it is USEFUL: it unifies a decomposed e+U+0323+U+0300 written by
//     one tool with the U+1EB9+U+0300 written by another, so prompt and inventory hash alike.
//   THE STANDING DANGER is therefore NOT in this gate but in anything downstream that strips
//   U+0300–U+036F to "remove accents": that would silently turn ọ̀ into ọ and ẹ́ into ẹ while leaving
//   ó and è untouched — tone destroyed on exactly the dotted vowels and nowhere else. Do not do it.
// ONE MEASURED TOKENISER ARTEFACT: the hyphen is a separator, so the intensifier gan-an 'very/really'
// (yor_for_eng seeds 142, 147, 339, 574) tokenises to two keys, 'gan' and 'an'. Both appear in the
// frequency list as if they were words. They are one word. Discount them.
module.exports = {
  course_code: '_lang_yor',
  ratified: null,
  known_lang: 'yor',
  known_lang_name: 'Yoruba',

  // Free class — Yoruba function words. Corpus-derived from the yor_for_eng target corpus
  // (668 seeds / 5,928 tokens); every entry below occurs there, counts in the comments.
  freeClass: [
    // subject pronouns (all three tone-shapes of 1sg, see subject_pronoun_allomorphy)
    'mo', 'mi', 'n', 'o', 'ó', 'a', 'ẹ', 'wọ́n', 'ẹ̀yin', 'àwa',
    // object / possessive pronouns, incl. the harmonising 3sg object allomorphs
    'mí', 'ọ', 'ọ́', 'i', 'í', 'é', 'un', 'rẹ', 'rẹ̀', 'wa', 'yín', 'wọn',
    // preverbal tense/aspect/mood particles — machinery, never vocabulary
    'ń', 'ti', 'máa', 'yóò', 'á', 'bá', 'ì', 'kàn',
    // complementisers, relativiser, subordinators, infinitival marker
    'láti', 'pé', 'tí', 'kí', 'tó', 'bí', 'bíi', 'nígbà', 'lẹ́yìn', 'nítorí',
    // copulas / identificational + focus particle
    'ni', 'jẹ́', 'wà', 'ló', 'ń',
    // prepositions (and the contracted ní forms that are visibly ní + host)
    'ní', 'sí', 'fún', 'pẹ̀lú', 'nípa', 'nínú', 'inú', 'lórí', 'láìsí',
    // determiners, demonstratives, quantifiers, plural marker
    'náà', 'yìí', 'yẹn', 'ìyẹn', 'èyí', 'wọ̀nyẹn', 'àwọn', 'kan', 'gbogbo',
    // coordinators, discourse particles, polarity answers
    'sì', 'àti', 'ṣùgbọ́n', 'tàbí', 'bẹ́ẹ̀', 'rárá', 'síbẹ̀',
    // interrogative particle (question formation, not a wh-word)
    'ṣé', 'ǹjẹ́',
    // comparative / degree glue
    'ju', 'jù', 'jùlọ', 'síi', 'nìkan',
  ],

  // NPI items + WHEN they are licensed. A violation is an NPI in a plain POSITIVE DECLARATIVE only.
  npi: ['ẹnikẹ́ni', 'ohunkóhun', 'nǹkankan', 'rí', 'mọ́', 'láéláé', 'síbẹ̀'],
  npiLicensing: {
    rule: "Yoruba negative polarity is licensed by an overt PREVERBAL NEGATOR — kò / ò / kì (í) / má / ò ní — or by one of the non-veridical environments below. The corpus's NPI series is small and clear: ẹnikẹ́ni 'anyone' occurs four times and EVERY occurrence is in a licensed environment (A kò fẹ́ láti jẹ́ kí ẹnikẹ́ni gbọ́ òótọ́ \"we didn't want to let anyone hear the truth\", s71; Mi ò rí ẹnikẹ́ni tí mo mọ̀ \"I didn't see anyone that I knew\", s370; Lẹ́yìn náà mi ò ní gbẹ́kẹ̀lé ẹnikẹ́ni mọ́ láéláé \"then I will never trust anyone ever again\", s490; Kò jẹ́ òótọ́ pé ẹnikẹ́ni lè borí eré náà \"it isn't true that anyone can win the game\", s531 — this last one is licensed by a negator in the MATRIX clause over an embedded NPI, which the gate must allow). TWO TRAPS, both of which will otherwise generate false findings. (A) rí is a HOMOGRAPH. As a main verb it is 'see' (Mi ò rí ẹnikẹ́ni) and it is ordinary, positive-legal vocabulary; as a clause-FINAL particle after a negator it is the experiential 'ever/never' (Rárá mi ò rí i rí \"no I've never seen her before\", s309 — where the FIRST rí is the verb 'see', the pronoun i is its object, and the SECOND rí is the polarity particle). The gate cannot tell them apart and will treat every positive 'see' as an unlicensed NPI unless the adjudicator does. 36 occurrences, and the majority are the verb. (B) mọ́ 'any more / no longer' and láéláé 'ever (again)' are genuine NPIs and both are rare (5 and 1). síbẹ̀ 'yet/still' is two-faced exactly as English 'still' is: positive 'still' and negative 'yet'. THE ONLY THING WORTH REPORTING is ẹnikẹ́ni / ohunkóhun / mọ́ / láéláé standing in a plain positive declarative with no negator and no licenser anywhere in the sentence — and given how rarely those items occur, a nonzero count here is much more likely to be a rí homograph than a real defect.",
    licensedIn: [
      "Preverbal negation kò (used with a full NP or a high-tone pronoun subject: Kò fẹ́ láti dakẹ́ \"he doesn't want to be quiet\", s34; A kò nílò láti rílárà inú dùn \"we don't need to feel happy\", s106)",
      "Preverbal negation ò with the LOW-TONE 1sg subject allomorph mi (Mi ò fẹ́ dáwọ́ sísọ dúró \"but I don't want to stop talking\", s19; Mi ò rò pé mo lè ràn ọ́ lọ́wọ́ \"I'm not sure if I can help you\", s62)",
      "The negative copula kì í ṣe 'is not / was not' (Èyí kì í ṣe yíyàn tí ó dára jùlọ \"this isn't the best choice\", s116; Ìyẹn kì í ṣe ìdí tí mo fẹ́ ríi \"that isn't why I wanted to see you\", s127)",
      "Negative future ò ní / kò ní (Mi ò ní lè rántí ní ìrọ̀rùn \"I'm not going to be able to remember easily\", s24; Mi ò ní lè wà níbẹ̀ ní oṣù tó ń bọ̀ \"I won't be able to be there next month\", s157)",
      "Prohibitive má / máṣe ('don't …') — imperative negation, distinct from kò and NOT to be confused with the future particle máa, from which it differs only in vowel length",
      "Polar questions with Ṣé (73 occurrences, clause-initial: Ṣé o ń sọ èdè Yorùbá gbogbo ọjọ́? \"do you speak Yoruba all day?\", s14) or ǹjẹ́ — non-assertive",
      "Wh-questions with the … ni frame: Kí ni 'what' (Kí ni o ń wá? \"what are you looking for?\", s68), Báwo ni 'how' (Báwo ni o ṣe rílárà? s40), Nígbà wo ni 'when' (s79), Níbo 'where', Kí ló dé tí 'why' (s21), Fún ìgbà wo ni 'how long' (s33)",
      "Conditional bá — the irrealis particle between subject and verb (tí o bá parí \"after/if you finish\", s11; nígbà tó bá yá \"later on\", s16; tó bá ṣeé ṣe \"as … as possible\", s3)",
      "Counterfactual ì bá 'would have' (Mi ì bá ti sọ ọ́ ní ọ̀nà kan náà gangan \"I wouldn't have said it in exactly the same way\", s153; Ó ì bá fún ọ́ ní ìdáhùn tí ó bá lè \"he would give you an answer if he could\", s225)",
      "Desiderative / deontic contexts: fẹ́ 'want' (131), nílò 'need' (40), lè 'can/be able' (81), yẹ kí 'should' — free-choice readings",
      "Comparatives with ju … lọ 'more than' and the superlative jùlọ",
      "The subjunctive/purposive complementiser kí (Ó fẹ́ kí n sọ fún ọ \"he wanted me to tell you\", s237) — non-veridical mood",
    ],
  },

  // Negation markers (reference list; negation detection is the agent's judgment, and the gate's
  // fallback substring test over this list over-fires — see glossRules.negationSubstringOverreach).
  negation: ['kò', 'ò', 'kì', 'má', 'máṣe', 'kọ́ọ̀', 'láì', 'àì'],

  // Yoruba machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'tone_is_lexical', marker: '´ / ` / (unmarked mid)', description: "THE governing fact. Yoruba writes three tones and they distinguish words, not just pronunciations: kọ́ 'learn/teach' vs kọ 'write' vs kò 'not'; ọkọ̀ 'vehicle' vs ọkọ 'husband'; ó 'he/she/it' vs o 'you' vs ò 'not'; ni 'is/FOCUS' vs ní 'at/in/have'. The corpus writes tone consistently and the gate preserves it (verified — see header). Two consequences. (1) The exact-form matcher IS the right granularity here: two words differing by one tone mark genuinely are two words, and merging them would be an error, not a kindness. (2) Any tone-stripping normalisation anywhere downstream silently turns negators into verbs. This is a standing licence over the whole lexicon, not a debut-gated construction." },
    { id: 'subject_pronoun_allomorphy', marker: 'mo / mi / n · o / ó · a / ẹ / wọ́n', description: "Subject pronouns change SHAPE with the syntactic environment, and the matcher cannot connect the shapes. 1sg is mo before a plain verb (Mo fẹ́ 'I want', 229 occurrences), mi before the negator ò (Mi ò fẹ́ 'I don't want', and mi is also the object/possessive 'me/my', 138), and n after the subjunctive kí (Ó fẹ́ kí n ṣe 'he wants me to do', s169/s171/s237). 3sg is ó (253) with NO gender (see genderlessThirdPerson) and contracts with the focus particle to ló (11). 2sg is o (139); 1pl a (74); 2pl/polite ẹ (17); 3pl wọ́n (65). All shapes are in the free class, and this construction records WHY: they are one pronoun paradigm, and finding 'mi' unintroduced after 'mo' has debuted is an artefact." },
    { id: 'preverbal_tam_particles', marker: 'ń / ti / máa / yóò / á', description: "Tense, aspect and mood are PREVERBAL PARTICLES between subject and verb; the verb itself never inflects. ń = progressive/habitual (104: Mo ń gbìyànjú \"I'm trying\", s2; O ń sọ èdè Yorùbá dáadáa \"you speak Yoruba very well\", s13). ti = perfect/anterior (65: Mo ti bẹ̀rẹ̀ sí í rílárà dáadáa \"I was starting to feel better\", s42; ti ń together = 'have been' — Mo ti ń kọ́ fún bíi ọ̀sẹ̀ kan \"I've been learning for about a week\", s38). máa = future/prospective (67: Mo máa gbìyànjú \"I'm going to try\", s8). yóò = future, more formal (9: ohun tí yóò ṣẹlẹ̀ \"what's going to happen\", s12). English -s/-ed/-ing/will/have-V-ed are ALL realised here and never on the Yoruba verb. Licence the particle system at its first member (ń at s2); do not require a separate debut per English tense." },
    { id: 'bare_verb_is_past', marker: 'Ø', description: "A bare verb with no preverbal particle is interpreted as PAST (perfective) for a dynamic verb and PRESENT for a stative: Mo fẹ́ 'I want / I wanted', A fẹ́ láti pàdé 'we want(ed) to meet' (s18 English 'we want', s54 'we wanted' — same Yoruba shape). English past-vs-present is therefore frequently NOT distinguished on the Yoruba side at all. Two English seeds can legitimately share one Yoruba prompt shape here; a ZUT sweep must not read that as a collision, because the direction is many-English→one-Yoruba, which is legal." },
    { id: 'genderless_third_person', marker: 'ó / rẹ̀ / un', description: "Yoruba has NO grammatical gender. ó is 'he', 'she' and 'it'; rẹ̀ is 'his', 'her' and 'its'; the 3sg object is likewise genderless. The corpus proves it: Ó fẹ́ láti padà 'HE wants to come back' (s16) and Ó fẹ́ mọ̀ ohun tí ìdáhùn náà jẹ́ 'SHE wants to find out what the answer is' (s17) are the same pronoun; O fẹ́ kọ́ orúkọ rẹ̀ 'his name' (s20) and Kí ló dé tí o ń kọ́ orúkọ rẹ̀? 'her name' (s21) are the same possessive. Many-English→one-Yoruba, ZUT-legal. Never invent a Yoruba gender contrast to carry an English one, and never flag the he/she pair as an ambiguity." },
    { id: 'object_pronoun_vowel_harmony', marker: 'ṣe é / rí i / fún un / sọ ọ́ / ràn mí', description: "The 3sg object pronoun COPIES THE FINAL VOWEL of the verb it follows and carries the appropriate tone. Same pronoun, four surface forms in this corpus: ṣe é 'do it' (s152, s443, s444), rí i 'see her' (s309), fún un 'give her/him' (s241, s242, s464), sọ ọ́ 'say it' (s153). Non-3sg objects are mí 'me' and ọ / ọ́ 'you'. To the matcher these are five unrelated one-letter words, all of which appear in the frequency list looking like noise; they are one paradigm. Licence at the first object pronoun. THIS IS A RULE I AM ASSERTING FROM LINGUISTICS, not measured — the corpus is consistent with it in every instance I checked, but a speaker should ratify it." },
    { id: 'ni_contraction', marker: 'ní → l- / n-', description: "The preposition ní 'at/in/on/to' (155 as a free token) CONTRACTS onto a vowel-initial host and disappears as a separate word: ní ọwọ́ → lọ́wọ́ (31 occurrences: ràn mí lọ́wọ́ 'help me', s25; béèrè nǹkan lọ́wọ́ rẹ 'ask you something', s30), ní ilé → nílé, ní ọjọ́ → lọ́jọ́, ní èyìn → lẹ́yìn 'after' (10), ní ọ̀la → lọ́la 'tomorrow', ní alẹ́ → lálẹ́ 'at night' (10), ní ibẹ̀ → níbẹ̀ 'there' (8), ní ibo → níbo 'where'. The contracted forms are the SURFACE VOCABULARY of the course and will be introduced as such; the matcher cannot see the ní inside them. Licence the contraction once. This rule is asserted from linguistics; the instances are corpus." },
    { id: 'serial_verb_constructions', marker: 'ràn … lọ́wọ́ · fi … hàn · bẹ̀rẹ̀ sí í · dáwọ́ … dúró', description: "One English verb is regularly several Yoruba verbs in sequence sharing a subject, with the object sitting INSIDE the series: ràn mí lọ́wọ́ 'help me' (lit. assist me at-hand, s25/s62/s147), fi nǹkan hàn mi 'show me something' (lit. take something appear to-me, s32), bẹ̀rẹ̀ sí í sọ 'start talking' (s23/s42), dáwọ́ sísọ dúró 'stop talking' (lit. cease speaking stand, s19), fún ọ ní àkókò 'give you time' (s54/s161/s225). Consequence for known-side tiling: the Yoruba prompt contains tokens with NO English counterpart, so they can never be justified by an English gloss and will be reported as unknown for as long as the course runs. Licence the SVC as a construction at its first instance and treat its non-head members as glue." },
    { id: 'negation_paradigm', marker: 'kò / ò / kì í ṣe / ò ní / má', description: "Negation is a PREVERBAL PARTICLE and its shape depends on the subject and the clause: kò with a full NP or a high-tone pronoun (Kò fẹ́ láti dakẹ́, s34), ò with the low-tone subject allomorph (Mi ò fẹ́, s19), kì í ṣe as the negative identificational copula 'is not/was not' (Èyí kì í ṣe yíyàn tí ó dára jùlọ, s116), ò ní / kò ní for the negative future (Mi ò ní lè rántí, s24), má/máṣe for the prohibitive. English don't/doesn't/didn't/isn't/won't all map into this small set. Licence the negation SYSTEM at its first member, not each shape separately — a course teaching kò at s34 has taught negation, and mi ò at s19 is the same word." },
    { id: 'question_formation_se_and_ni_frame', marker: 'Ṣé / ǹjẹ́ · Kí ni / Báwo ni / Nígbà wo ni', description: "Polar questions are formed by clause-initial Ṣé (73) or ǹjẹ́ with NO word-order change and no do-support: Ṣé o ń sọ èdè Yorùbá gbogbo ọjọ́? 'do you speak Yoruba all day?' (s14), Ṣé o máa ràn mí lọ́wọ́? 'are you going to help me?' (s25), Ṣé o fẹ́ láti fi nǹkan hàn mi? 'did you want to show me something?' (s32). Wh-questions use the FOCUS frame: wh-word + ni + clause — Kí ni o ń wá? 'what are you looking for?' (s68), Báwo ni o ṣe rílárà? 'how do you feel?' (s40), Nígbà wo ni o bẹ̀rẹ̀? 'when did you start?' (s79), Fún ìgbà wo ni o ti ń kọ́? 'how long have you been learning?' (s33), Kí ló dé tí … 'why …' (s21). English do/does/did-support has NO Yoruba token; ni here is the focus copula, not a verb. Licence at s14 and s21." },
    { id: 'focus_ni_and_relative_ti', marker: 'ni / ló · tí', description: "ni (90) is the identificational copula AND the focus marker that fronts a constituent (Èyí ni ọ̀nà kan ṣoṣo tí yóò ṣiṣẹ́ 'this is the only way it will work', s94; Bẹ́ẹ̀ ni 'yes' is literally 'thus it-is'). With a pronoun subject it contracts: ó + ni → ló (11). tí (201, the second most frequent token in the corpus) is the all-purpose relativiser and clause-linker: ohun tí mo túmọ̀ sí 'what I mean' (s8), àwọn ènìyàn tí ó ń sọ èdè Yorùbá 'people who speak Yoruba' (s22), nígbà tí ẹ bá ṣiṣẹ́ papọ̀ 'when you work together' (s133). English who/which/that/what-relative all collapse onto tí. Both are pure glue and are freed; recorded here because their ZUT profile (one Yoruba form, many English realisations) can look like an ambiguity." },
    { id: 'complementisers_pe_ki_lati', marker: 'pé / kí / láti', description: "Three distinct complementisers where English has 'to' and 'that'. pé (119) heads a declarative complement (Mo rò pé ó lè fi i sórí tábìlì 'I think that she could put it on the table', s314; Mi ò rò pé 'I'm not sure that/if'). kí (73) heads a subjunctive/purposive complement with an overt subject (Ó fẹ́ kí n sọ fún ọ 'he wanted me to tell you', s237; Àti pé mo fẹ́ kí o sọ … 'and I want you to speak …', s15) and also forms 'before' with tó (kí mo tó lọ 'before I go', s25). láti (178) is the infinitival marker before a bare verb (Mo fẹ́ láti sọ 'I want to speak', s1). English 'to' therefore splits three ways depending on whether the complement has its own subject — machinery, licensed once each." },
    { id: 'conditional_ba_and_counterfactual_i_ba', marker: 'bá / ì bá', description: "bá (64) is the irrealis particle sitting between subject and verb in conditional, temporal-future and 'as … as possible' clauses: tí o bá parí 'after you finish' (s11), nígbà tó bá yá 'later on' (s16), tó bá ṣeé ṣe 'as … as possible' (s3), tí ó bá lè 'if he could' (s225). ì bá is the COUNTERFACTUAL 'would have': Mi ì bá ti sọ ọ́ … 'I wouldn't have said it …' (s153), Mo ìbá ti ṣe é yàtọ̀ 'I would have done it differently' (s152), Mi ò bá ti gboyà 'I wouldn't have dared' (s621). Note the corpus writes it BOTH as two tokens (ì bá) and solid (ìbá) — an inconsistency the matcher will report and a human should normalise. English 'if', 'when', 'would' and 'would have' route through here; a major NPI licenser." },
    { id: 'reduplication_nominalisation', marker: 'sọ → sísọ · ṣe → ṣíṣe · kọ → kíkọ', description: "A verb is nominalised ('speaking', 'doing', 'making') by REDUPLICATING its initial consonant with the vowel i and a high tone: sọ 'speak' → sísọ 'speaking' (7: Mo máa kọ sísọ pẹ̀lú ẹlòmíràn 'I'm going to practise speaking with someone else', s5; bẹ̀rẹ̀ sísọ 'start talking', s28), ṣe 'do' → ṣíṣe 'doing/making' (7: nípa ṣíṣe àṣìṣe 'about making mistakes', s46), yàn 'choose' → yíyàn 'choice' (s116). English gerunds in -ing land here. The reduplicated form shares only its tail with the base, so the matcher treats sọ and sísọ as unrelated — cym_for_yor's own seed 5 introduces sísọ as a fresh lego even though sọ debuted at seed 1, which is exactly this artefact. This rule is asserted from linguistics; the instances are corpus." },
    { id: 'plural_awon_and_no_number_marking', marker: 'àwọn', description: "Nouns do not inflect for number; plurality, when marked at all, is the preposed àwọn (47: àwọn ènìyàn 'people', s22; àwọn ẹlòmíràn 'other people', s34; gbogbo àwọn yòókù 'everyone else', s16). àwọn is also the 3pl independent pronoun. English plural -s has no Yoruba suffix counterpart. Licensed at s16." },
    { id: 'modal_verbs_le_nilo_ye', marker: 'lè / nílò / yẹ kí / fẹ́', description: "Modality is carried by ordinary preverbal VERBS, not by a closed auxiliary class: lè 'can/could/be able to' (81: mo lè rántí 'I can remember', s10; ó lè ṣe é 'it could be done', s444), nílò 'need' (40: A kò nílò láti rílárà inú dùn 'we don't need to feel happy', s106), yẹ kí 'should/ought' (Ó yẹ kí n ronú nípa … 'I should consider …', s98), fẹ́ 'want/would like' (131), retí 'hope/expect' (11). English can/could/be-able-to all collapse onto lè (many-English→one-Yoruba). Their negatives are the ordinary preverbal negator plus the same verb (mi ò lè 'I can't', ò ní lè \"won't be able to\"). Licence each at its debut as a modal, not as content." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'toneMustSurvive', rule: "VERIFIED 2026-08-17. stemKnownGloss does .normalize('NFC') and keeps \\p{M}, and every Yoruba word tested round-trips codepoint-for-codepoint (pẹ̀lú, gbìyànjú, túmọ̀, ṣàlàyé, ọ̀rọ̀, lóòrèkóòrè, ẹlòmíràn). The recorded caveat is nonetheless accurate about the codepoints: ẹ̀ is U+1EB9 + U+0300 because NO precomposed dot-below-plus-tone codepoint exists, whereas ó/ò/í are single precomposed codepoints. So a normalisation that stripped U+0300–U+036F would kill tone on ẹ/ọ/ṣ and nowhere else — damage that looks random and is not. The current gate does not do that. Nothing downstream should." },
    { id: 'genderlessThirdPerson', rule: "One Yoruba ó / rẹ̀ renders English he, she and it (and his, her, its). Many-Yoruba→one-English does not apply; the direction is one-Yoruba→many-English, which is ZUT-legal only because the Yoruba side is the prompt. Never split a Yoruba pronoun to carry an English gender contrast, and never flag the he/she pair of seeds (s16 vs s17, s20 vs s21) as a collision — the pipeline chose the English gender freely and the Yoruba is identical by design." },
    { id: 'noTenseOnTheVerb', rule: "The Yoruba verb never inflects. English tense/aspect (-s, -ed, -ing, will, going to, have V-ed, was V-ing) is a PREVERBAL PARTICLE (ń / ti / máa / yóò) or nothing at all. A bare verb covers both past and present for dynamic verbs. So two English seeds differing only in tense can legitimately share one Yoruba prompt; that is not a ZUT breach and must not be reported as one." },
    { id: 'pronounShapesAreOneWord', rule: "mo / mi / n are one pronoun (1sg), selected by environment: mo before a plain verb, mi before the negator ò and as the object/possessive, n after subjunctive kí. Likewise ó / ló and the 3sg object's four vowel-harmonic shapes (é / i / un / ọ́). A finding that a later shape is 'not introduced' after an earlier shape debuted is an artefact of exact-form matching, not a vocabulary breach." },
    { id: 'niContractionIsGlue', rule: "The preposition ní fuses onto a vowel-initial host and vanishes as a token: lọ́wọ́, nílé, lọ́la, lálẹ́, lẹ́yìn, níbẹ̀, níbo. English at/in/on/to/for is therefore sometimes a free ní and sometimes invisible inside a word. The contracted forms are surface vocabulary and will be taught as such; do not expect the matcher to relate them to ní, and do not require a separate English preposition gloss for them." },
    { id: 'serialVerbSpansOneEnglishVerb', rule: "ràn … lọ́wọ́ = 'help'; fi … hàn = 'show'; bẹ̀rẹ̀ sí í = 'start to'; dáwọ́ … dúró = 'stop'; fún … ní = 'give'. The Yoruba prompt carries tokens the English target has no word for. Those tokens cannot be justified by an English gloss and will be reported as unknown for the life of the course. Adjudicate them once against this list and dismiss them thereafter." },
    { id: 'reduplicationBreaksIdentity', rule: "sọ / sísọ, ṣe / ṣíṣe, yàn / yíyàn are the same lexeme; the nominalising reduplication changes the front of the word, so nothing an exact-form matcher does can connect them. cym_for_yor introduces sísọ at seed 5 having introduced sọ at seed 1 — that is the artefact showing up in the only yor-known course we have." },
    { id: 'riIsAHomograph', rule: "rí (36 occurrences) is BOTH the main verb 'see' and the clause-final experiential polarity particle 'ever/never'. Rárá mi ò rí i rí 'no I've never seen her before' (s309) contains both, with the object pronoun i between them. rí is in the npi list so its polarity reading is covered, but that guarantees false positives on the verb reading in positive clauses. Check which rí a finding is about before believing it; the verb is the more common reading." },
    { id: 'negationSubstringOverreach', rule: "MEASURED IMPLEMENTATION CAVEAT, not a fact about Yoruba. checkKnownSide, given a brief contract with no negationMarkers regex, decides whether a prompt is negated by testing whether the prompt STRING CONTAINS any word in the `negation` list. Yoruba negators are one and two characters (ò, kò, kì, má), and those sequences occur inside ordinary words (lóòrèkóòrè contains ò; máa contains má; nǹkan does not, but ìkàn-type words do). So `negated` will read TRUE for many positive prompts. The error direction is SAFE — it suppresses NPI findings rather than inventing them — but a zero NPI count on a Yoruba course is NOT evidence the NPI rule was checked. Do not report it as one." },
    { id: 'hyphenSplitsGanAn', rule: "MEASURED TOKENISER ARTEFACT. The hyphen is a separator, so the intensifier gan-an 'very/really' (s142, s147, s339, s574) becomes two keys, 'gan' and 'an', both of which appear in the frequency list as if they were words. Any finding naming 'gan' or 'an' alone is this artefact." },
    { id: 'ibaIsWrittenTwoWays', rule: "AUTHORING INCONSISTENCY, found in the corpus and worth fixing at source rather than in the contract. The counterfactual is written as two tokens ì bá at s153 and s225 and solid as ìbá at s152. The matcher sees three keys for one construction. A Yoruba speaker should pick one spelling." },
    { id: 'oneYouTwoForms', rule: "Yoruba 2sg is o (subject) / ọ / ọ́ (object) / rẹ (possessive), and the 2pl-or-polite is ẹ / yín. English has one 'you'. Many-Yoruba→one-English, ZUT-legal; do not invent an English politeness contrast to carry it. The corpus does use the polite ẹ in fixed courtesy formulae (Ẹ ṣé púpọ̀ 'thank you very much', s73/s74) alongside singular o elsewhere — that is register, not a collision." },
  ],
};

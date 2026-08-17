// _lang_ara — LANGUAGE-LEVEL known-side contract for ara-known courses. FIRST PASS (2026-08-17), ratified:null.
//
// AGENT-BRIEF DIALECT, DELIBERATELY (Kai's ruling 2026-08-17). This file uses freeClass / npi /
// npiLicensing / negation / knownConstructions[{id,marker,description}] / glossRules and contains NO
// freeGlue, NO negationMarkers and NO constructions[].test — so isMechanicalContract() returns FALSE
// and the known-side sweep routes every finding to TRIAGE, never to a build failure. That is the
// correct setting for Arabic and the reason is in the next paragraph: an exact-form matcher applied to
// Arabic is a reporting instrument, not a verdict machine. Writing this contract in the mechanical
// dialect would turn a list of things worth a human's eye into a gate that blocks legitimate submissions.
//
// ── WHY EXACT-FORM MATCHING CANNOT ADJUDICATE ARABIC ─────────────────────────────────────────────
// Arabic (ara, Semitic) is NON-CONCATENATIVE: the lexeme is a consonantal ROOT (usually triliteral) and
// the word is that root interleaved with a vocalic/affixal PATTERN. كتب k-t-b 'write' yields كتب kataba
// 'he wrote', يكتب yaktubu 'he writes', كاتب kātib 'writer', مكتوب maktūb 'written', كتاب kitāb 'book',
// مكتب maktab 'office', كتابة kitāba 'writing'. These share a root but NO CONTIGUOUS SUBSTRING that any
// stemmer of the kind this gate has (stemKnownGloss lowercases and strips non-letters — that is the whole
// of it) could find. There is no prefix to strip and no suffix to strip that recovers a shared key.
// CONSEQUENCE: every inflected or derived form of an introduced word is, to this matcher, a brand-new
// unknown word. On top of that Arabic is templatic in the verb too — person, number, gender, mood and
// voice are prefix+suffix circumfixes on a stem that itself alternates (أكتب / تكتب / يكتب / نكتب /
// كتبت / كتبنا) — so a single introduced verb generates a dozen surface forms the gate will each report
// separately. A raw finding count on an Arabic course is therefore an UPPER BOUND on real defects, and
// the great majority of it is morphology the matcher cannot see. Read the list, do not read the number.
//
// ── ORTHOGRAPHIC HAZARDS, MEASURED ON THIS CORPUS (not asserted) ─────────────────────────────────
// A recorded repo caveat says Latin-only punctuation stripping once made an Arabic audit read 1,126 ZUT
// defects where the true count was 0. That specific failure is FIXED and I verified it directly against
// the current tokenizer (2026-08-17):
//   • Arabic comma ، U+060C, question mark ؟ U+061F and semicolon ؛ U+061B are NOT \p{L} and NOT \p{M},
//     so tokenizeKnown's /[^\p{L}\p{M}']+/u class treats them as separators, exactly as it treats a Latin
//     comma. "هل تريد، أن تتكلم؟" → ["هل","تريد","أن","تتكلم"]. Correct. The old [^a-z'] class deleted
//     every Arabic letter instead, which is how the 1,126 arose.
//   • RTL/LRM marks U+200E/U+200F and ZWNJ U+200C are likewise separators and vanish. Correct.
//   • Arabic-Indic digits ٠-٩ are \p{N}, deliberately excluded, so they are separators like ASCII digits.
//     Consistent with the tokenizer's stated policy; this corpus contains zero of them anyway.
// TWO HAZARDS REMAIN, and both are real:
//   1. TATWEEL ـ U+0640 is a MODIFIER LETTER (\p{L}), so it SURVIVES stemKnownGloss. كتـــب and كتب are
//      different keys. This is not hypothetical here: eng_for_ara uses tatweel as an "attach here" mark
//      when a bound morpheme is taught alone — بـ 'in/after' (seeds 4, 55, 69), هـ 'his' (seed 20),
//      7 occurrences in all. Those debut forms can NEVER match the fused surface forms the prompts
//      actually use (بالحافلة, اسمه), so the gate will report the fused word as unknown and will also
//      never retire the standalone debut. This is a KNOWN, UNFIXABLE-FROM-A-CONTRACT limitation: it wants
//      a tokenizer-level tatweel strip, which is out of scope for a contract file and is flagged here so
//      the next person does not rediscover it.
//   2. HARAKAT (short vowels, U+064B–U+0652) are \p{M} and also SURVIVE. Measured over all 7,188
//      eng_for_ara known-side rows: 1,929 harakat characters, of which 1,855 are tanwīn fatḥ ـً — the
//      adverbial accusative (جداً 'very', شكراً 'thanks', وقتاً 'time-ACC', شيئاً 'something-ACC'), which is
//      standard orthography and consistently written, so it is harmless as long as it is consistent.
//      The other 59 are genuine disambiguating vowels on otherwise-ambiguous verbs (لم تُرد 'she didn't
//      want', لم نُرد 'we didn't want', لم أُرد 'I didn't want', لم يبقَ 'there is not left'), plus one
//      bare pronominal suffix taught alone as كَ 'you' (seed 15). Zero shadda, zero superscript alef.
//      So the corpus is UNVOWELLED except for tanwīn and a handful of deliberate disambiguations — which
//      is the good case. The residual risk is that شيء / شيئاً and وقت / وقتاً are separate keys to the
//      matcher though they are one word; expect those pairs in the triage list and dismiss them.
//   Also measured: 487 alif maqṣūra ى vs 9,971 yāʾ ي and 2,420 tāʾ marbūṭa ة — i.e. the corpus does NOT
//   collapse ى→ي or ة→ه, which is correct Arabic orthography but means the matcher sees إلى and إلي,
//   or مدرسة and مدرسته, as unrelated. No normalisation is applied and none should be from here.
//
// ── CALIBRATION ──────────────────────────────────────────────────────────────────────────────────
// Derived from the ONLY live ara-known course, eng_for_ara (beta, 300-seed target, 668 seed rows):
// 600 course_legos + 5,920 course_practice_phrases + 668 course_seeds = 7,188 known-side rows,
// tokenised with the live tokenizeKnown/stemKnownGloss to 36,760 tokens / 1,814 types. The freeClass
// below is the function-word tail of that ranked list, hand-classified; every entry occurs in the
// corpus and its corpus count is given in the comment blocks. Example prompts cited in the
// constructions and rules are verbatim eng_for_ara known_text.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND SO LEFT OUT OF freeClass ────────────────────────
// Honesty is part of the deliverable. These are frequent and arguably functional, but each has a
// content reading in this corpus that would make blanket freeing wrong:
//   • ما (412) — three distinct words written identically: the negator ما ('not', with a past verb), the
//     interrogative/relative ما ('what'), and the ما of ما زال. It is in `negation` (below) but NOT in
//     freeClass, because freeing it would silently free the wh-word 'what' before it is taught.
//   • كل (107) 'all/every' and بعض (38) 'some' — quantifiers; taught as vocabulary in this corpus.
//   • جداً (301) 'very', كثيراً (61) 'a lot', قليلاً (92) 'a little', بشكل (161) 'in a … way' — degree and
//     manner adverbials. I freed جداً and بشكل only (they are pure intensity/manner glue that never
//     carries a lexical English word of its own); كثيراً and قليلاً DO carry 'a lot'/'a little' and are
//     left as content.
//   • بعد (207) — 'after' (preposition, free) and 'yet' (NPI, under negation) and بعد الظهر 'afternoon'
//     (content) are one string. Freed as a preposition, and ALSO listed in npi, which means the gate can
//     never flag its 'yet' reading. Accepted: a false-negative here is cheaper than a false alarm on
//     every 'after' prompt.
//   • كان/كانت/كنت/يكن/أكن (341/120/263/135/68) — the verb 'to be'. Grammatically these are pure tense
//     machinery (see kana_periphrasis) but they are a conjugating verb with a lexical past-copula
//     meaning, so I left them OUT of freeClass and covered them as a construction instead. They will
//     appear in the triage list before their debut seed; that is the honest answer, not a bug.
//   • الأمر (115) 'the matter/thing', الشيء (54), شيء (218) — semi-grammaticalised light nouns used the
//     way English uses 'it'/'thing'. Genuinely borderline; left as content.
module.exports = {
  course_code: '_lang_ara',
  ratified: null,
  known_lang: 'ara',
  known_lang_name: 'Arabic',

  // Free class — Arabic function words, corpus-derived from eng_for_ara (counts in parentheses).
  // Complementiser/subordinators, prepositions, demonstratives, independent pronouns, the
  // pronoun+preposition portmanteaus the corpus writes as one word, deictics, and the yes-particle.
  freeClass: [
    // complementiser + subordinators — أن alone is the single most frequent token in the corpus (2,598)
    'أن', 'أنه', 'أنك', 'أنني', 'إنه', 'إنني', 'الذي', 'التي', 'الذين', 'إذا', 'لو', 'عندما', 'منذ',
    'لأن', 'لأنني', 'لأنه', 'لكن', 'لكنني', 'ولكنني', 'أو', 'حتى', 'كأنني',
    // prepositions
    'في', 'من', 'إلى', 'على', 'عن', 'مع', 'قبل', 'بعد', 'عند', 'بين', 'بشأن', 'بما',
    // preposition + pronominal-suffix portmanteaus written solid in this corpus
    'لي', 'لك', 'له', 'لها', 'لهم', 'لدي', 'لديك', 'معك', 'معي', 'معه', 'معها', 'معهم',
    'منك', 'منه', 'منها', 'عنه', 'عنها', 'عنهم', 'به', 'بها', 'بهم', 'فيه', 'فيها',
    // complementiser/conjunction + pronominal suffix, same portmanteau pattern
    // (added after the FIRST SWEEP — see the calibration note in the header)
    'أنها', 'أنهم', 'أنكم', 'إنها', 'إنهم', 'لكنه', 'لكنها', 'ولكنه', 'ولكنها', 'أم', 'إن', 'لذا',
    // independent pronouns
    'أنا', 'أنت', 'هو', 'هي', 'نحن', 'هم', 'أنتم',
    // demonstratives
    'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء',
    // deictics + discourse particles
    'هنا', 'هناك', 'الآن', 'نعم', 'لقد', 'قد', 'فقط', 'أيضاً', 'إذن', 'لذلك', 'جداً', 'بشكل',
    // interrogative particle (question formation, not a wh-word)
    'هل',
  ],

  // NPI items + WHEN they are licensed. A violation is an NPI in a plain POSITIVE DECLARATIVE only.
  npi: ['أي', 'أحد', 'أحداً', 'أبداً', 'بعد', 'مطلقاً', 'شيئاً'],
  npiLicensing: {
    rule: "Arabic negative polarity is licensed by an OVERT NEGATOR ELSEWHERE IN THE CLAUSE, and the negator's form is chosen by TENSE AND CLAUSE TYPE, not by polarity alone — so the licensing test must look for a set of five distinct words (ما / لا / لم / لن / ليس + its person-inflected paradigm), never for one 'not'. The corpus's NPI series is: أي (81 occurrences, 'any', always prenominal: أي شيء 'anything', أي وقت 'any time'), أحد/أحداً ('anyone', licensed only under negation — لم يكن أحد متأكداً 'nobody was sure', لم نُرد أن ندع أحداً يسمع 'we didn't want to let anyone hear'), أبداً ('ever/never' — لن أثق بأحد أبداً 'I will never trust anyone ever again'), and بعد in its temporal-polarity reading ('yet' — لست مستعداً بعد 'I'm not ready yet', لا أعرف بعد 'I don't know yet'). CRITICAL ASYMMETRY the gate must respect: أي شيء is genuinely two-faced. Under negation it is the NPI 'anything' (لا تريد أن تقرأ أي شيء 'she doesn't want to read anything'; لا يبدو أن أي شيء ينجح 'nothing seems to be working'), but in a POSITIVE declarative it is the free-choice 'any(thing at all)' and is perfectly grammatical, and the corpus also uses bare شيء/شيئاً as the POSITIVE 'something' (أردت أن تريني شيئاً 'you wanted to show me something'). So: a bare شيئاً in a positive declarative is NEVER a violation — it is 'something' — and I have listed شيئاً in npi only so that its negative-context reading is not counted twice; treat a positive شيئاً as clean. The one thing that should be reported is أحد/أحداً or أبداً standing in a plain positive declarative with no licenser anywhere in the clause. Note also that Arabic uses NEGATIVE CONCORD: the negator does not disappear when a negative indefinite is present (لم يكن أحد 'nobody was' is literally 'not was anyone'), so the presence of a negator alongside an NPI is the NORM, not a double negative to be flagged.",
    licensedIn: [
      "Verbal negation by tense: لا + imperfect (present/general — لا أعرف 'I don't know', لا أريد 'I don't want'); لم + jussive (PAST negative — لم أفعل 'I didn't do', لم نُرد 'we didn't want', لم يكن 'was not'); لن + subjunctive (FUTURE negative — لن أستطيع \"I won't be able to\", لن أنتظرك \"I'm not going to wait for you\"); ما + perfect (past negative, less frequent in this corpus)",
      "Copular/nominal negation by ليس and its person-inflected paradigm ليس / ليست / لست / لسنا ('is not / am not / are not' — تعلم الإنجليزية ليس سهلاً \"learning English isn't easy\", لست مستعداً \"I'm not ready\", هذه ليست أفضل خيار \"this isn't the best choice\")",
      "Prohibitive لا + jussive ('don't …') and the negated deontic لا يجب أن / لا يجب عليك ('you shouldn't' — لا يجب أن تقلق \"you shouldn't worry\")",
      "Polar questions with هل (514 occurrences) or the proclitic interrogative أ- — non-assertive (هل تريد أن تفعل شيئاً؟)",
      "Wh-questions: ماذا / ما / لماذا / متى / أين / كيف / كم — non-assertive",
      "Conditional and counterfactual clauses: إذا (212) and لو (66), including لو كنت + past for the counterfactual (كنت سأفعله بشكل مختلف لو كنت أعرف \"I would have done it differently if I had known\")",
      "Desiderative / volitional and deontic modals: أريد أن، أود أن، يجب أن، أحتاج أن، بحاجة إلى، يمكن أن، أستطيع أن — 'want/need/must/can' contexts license the free-choice reading of أي",
      "Comparatives with من / أكثر من / أفضل من and superlatives with أفضل / أكثر",
      "Restrictive/exclusive focus: فقط, إلا … (the ما … إلا 'only' frame), and 'before' clauses headed by قبل أن",
      "Imperatives and the subjunctive after أن (non-veridical mood)",
    ],
  },

  // Negation markers (reference list; negation detection is the agent's judgment, and the gate's
  // fallback substring test over this list is DELIBERATELY over-permissive — see glossRules.negationSubstringOverreach).
  negation: ['لا', 'لم', 'لن', 'ما', 'ليس', 'ليست', 'لست', 'لسنا', 'ليسوا', 'يكن', 'أكن', 'غير', 'بدون', 'دون'],

  // Arabic machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'root_and_pattern', marker: 'ك-ت-ب → كتب / يكتب / كاتب / مكتوب / كتاب', description: "THE governing fact for this contract. Arabic derivation is non-concatenative: a consonantal root is interleaved with a vocalic/affixal pattern, so morphologically related words share no contiguous substring (كتب 'he wrote' / يكتب 'he writes' / كاتب 'writer' / مكتوب 'written' / كتاب 'book' / مكتب 'office'). Neither prefix- nor suffix-stripping recovers a shared key, and stemKnownGloss does neither anyway. Every derived form of an introduced word therefore looks like a new word to the matcher. This is not a construction to license at one debut — it is a standing licence covering the whole lexicon, and the reason this contract is advisory." },
    { id: 'definite_article_al', marker: 'ال-', description: "The definite article ال- is a BOUND PROCLITIC written solid with its noun: كتاب 'a book' → الكتاب 'the book'; إنجليزية → الإنجليزية 'English' (414 occurrences); وقت → الوقت. It also assimilates in pronunciation to a following coronal (الشمس ash-shams) without changing the spelling. English a/an/the map onto its presence or absence and need no separate introduction, but to an exact-form matcher الكتاب and كتاب are two unrelated tokens. Licence the definite/indefinite alternation once, at the first definite noun (S1, الإنجليزية), for every noun in the course." },
    { id: 'proclitic_prepositions_conjunctions', marker: 'بـ / لـ / كـ / و / فـ', description: "Single-consonant prepositions and conjunctions are bound proclitics written solid: بـ 'in/with/by' (بالإنجليزية 'in English', بالحافلة 'by bus', بسرعة 'quickly'), لـ 'to/for' (للذهاب 'to go', للتو 'just now', لأنني 'because I'), كـ 'like/as', و 'and' (almost never a free token — 11 occurrences standalone against hundreds fused), فـ 'so/then'. They stack with the article (بـ+ال → بال-). eng_for_ara sometimes teaches one alone with a tatweel placeholder (بـ at S4/S55/S69, هـ at S20) — a debut form that can never match its own fused uses. Licence the whole proclitic system at its first appearance; do not expect a word-level match." },
    { id: 'pronominal_suffixes', marker: 'ـي / ـك / ـه / ـها / ـنا / ـكم / ـهم', description: "Possessors and verb/preposition objects are BOUND SUFFIXES, not free words: كتاب+ي → كتابي 'my book' (S180), اسم+ه → اسمه 'his name' (S20), مع+ك → معك 'with you' (90), مساعدت+ي → مساعدتي 'helping me', أعرف+هم → أعرفهم 'I know them', تخبر+ني → تخبرني 'tell me'. English my/your/his/her/me/you/him/them are realised this way and need no separate LEGO. The freeClass above lists the preposition+suffix portmanteaus the corpus actually writes (لي، لك، لدي، معك، عنه، به …); the noun+suffix ones cannot be enumerated and will surface in triage as unknown forms of known nouns." },
    { id: 'imperfect_prefix_conjugation_prodrop', marker: 'أ- / تـ- / يـ- / نـ-', description: "The imperfect (non-past) conjugates by PREFIX for person plus suffixes for number/gender, on a stem that alternates: أتكلم 'I speak' (207) / تتكلم 'you speak' (156) / يتكلم 'he speaks' (41) / نتحدث 'we talk' / يتكلمون 'they speak' (42). Because person is on the verb, the subject pronoun is droppable and usually dropped — أريد 'I want' (440) far outnumbers أنا أريد. Licence at the first finite imperfect (S1, أريد أن أتكلم). Consequence for the matcher: ONE English verb generates four to six unrelated Arabic surface keys, each reported separately." },
    { id: 'perfect_suffix_conjugation', marker: '-تُ / -تَ / -ـ / -ت / -نا', description: "The perfect (past) conjugates by SUFFIX on a different stem: أردت 'I wanted' (153) / أراد 'he wanted' (101) / أرادت 'she wanted' (37) / كنت 'I was' (263) / قابلت 'I met' / شاهدت 'I watched' / سمعت 'I heard'. English past -ed is this, not an auxiliary. Licence at the first perfect form; expect each person of a taught verb to be reported once." },
    { id: 'kana_periphrasis', marker: 'كان / كانت / كنت / يكن', description: "كان and its 'sisters' are the tense-shifting auxiliary of the nominal/verbal clause: كنت أعرف 'I knew/used to know', كان يعمل 'he was working', لم يكن 'was not' (135), ستكون 'it will be' (44), سأكون 'I will be' (43), أكون 'I be' (79). English past progressive, past habitual, pluperfect and the past copula all route through it. It is machinery, but it is also an inflecting verb — I deliberately left it OUT of freeClass (see the header) so it is licensed here at its debut rather than silently freed everywhere." },
    { id: 'nominal_sentence_no_copula', marker: 'Ø (zero copula)', description: "Present-tense 'is/are/am' is NOT expressed: الأمر هكذا 'it's like this', هذا مهم 'this is important', المشكلة صعبة 'the problem is hard'. Its negation, by contrast, IS overt (ليس / ليست / لست). Consequence for known-side tiling: there is no Arabic token for English 'is'/'are'/'am', so an English target teaching the copula has no known-side carrier — the gate must not look for one. Licensed from S1." },
    { id: 'future_sa_sawfa', marker: 'سـ / سوف', description: "Future is the proclitic سـ (or free سوف, absent from this corpus) prefixed to the imperfect: سأتدرب 'I'm going to practise' (S5), ستكون 'it will be', سيحدث \"what's going to happen\" (45), ستفعل 'you're going to do', سأكون 'I'll be'. English will / going to / shall all map to it (many-English→one-Arabic). Negated it is replaced wholesale by لن + subjunctive, not by adding a negator to سـ. Licence at S5." },
    { id: 'an_subjunctive_complement', marker: 'أن', description: "أن is the subjunctive complementiser and, at 2,598 occurrences, the most frequent token in the corpus by a factor of three. It heads the complement of nearly every modal and volitional verb (أريد أن أتكلم 'I want to speak', يجب أن 'must/have to', أستطيع أن 'I can', قبل أن أجيب 'before I answer') and takes a subjunctive verb. It carries English 'to' (infinitival) AND English 'that' (complementiser) AND is often unexpressed in English at all. Pure glue — freed above — but recorded here because its ZUT profile (one Arabic form, three English realisations) is what makes it look like an ambiguity when it isn't." },
    { id: 'polar_question_hal', marker: 'هل / أ-', description: "Yes/no questions are formed by clause-initial هل (514) or the proclitic أ-, with NO change of word order and NO do-support: هل تتكلم الإنجليزية طوال اليوم؟ 'do you speak English all day?', هل ستساعدني؟ 'are you going to help me?', هل أردت أن تريني شيئاً؟ 'did you want to show me something?'. English do/does/did/are/is-questions all collapse onto هل. Licensed at S14; also an NPI licenser." },
    { id: 'wh_questions', marker: 'ماذا / ما / لماذا / متى / أين / كيف / كم', description: "Wh-words are clause-initial and, unlike English, need no auxiliary: ماذا تريد أن تفعل؟ 'what do you want to do?', لماذا (143) 'why', كيف تشعر؟ (139) 'how do you feel?', متى (92) 'when', أين (69) 'where', كم 'how much/many'. Each is a taught item, not free class — ما in particular is ambiguous between the wh-word and the negator and must not be blanket-freed. Non-assertive, so an NPI licenser." },
    { id: 'idafa_construct_state', marker: 'N N-GEN', description: "Possession/genitive is the ʾiḍāfa: two juxtaposed nouns with no preposition, the first losing its article and any tanwīn — نهاية الأسبوع 'the weekend' (lit. end-of the-week), بعد الظهر 'afternoon', صباح الأحد 'Sunday morning', رقم غرفتي 'my room number'. English 'of' and possessive 's have no Arabic token. Licence at the first ʾiḍāfa; the matcher sees two ordinary nouns and will not object, which is the desired behaviour." },
    { id: 'agreement_gender_number_dual', marker: 'ـة / ـان / ـين / ـون / broken plurals', description: "Adjectives, verbs and pronouns agree in gender AND number, and Arabic has a DUAL alongside singular and plural: مستعد / مستعدة / مستعدون, رجل / رجلان / رجال, أنت / أنتِ / أنتما / أنتم / أنتن. Nouns pluralise both by suffix (sound plural معلمون) and by internal vowel change (BROKEN plural: كتاب → كتب, رجل → رجال) — the broken plural is the root-and-pattern problem again, in the noun. Non-human plurals take FEMININE SINGULAR agreement. English collapses all of this: one 'you', one 'they', one plural. Licence the agreement system once; expect every gender/number variant of a taught adjective in triage." },
    { id: 'negation_by_tense_and_clause_type', marker: 'لا / لم / لن / ما / ليس', description: "Arabic has FIVE negators, selected by tense and clause type, not by polarity: لا + imperfect = present negative (855); لم + jussive = PAST negative (415, e.g. لم أفعل 'I didn't do'); لن + subjunctive = FUTURE negative (60, لن أستطيع \"I won't be able to\"); ما + perfect = past negative (rarer here); ليس/ليست/لست + nominal predicate = 'is not/am not' (140/47/148). English don't/doesn't/didn't/won't/isn't map onto whichever of these the tense dictates — one English 'not' has five Arabic realisations. Licence the negation SYSTEM at the first negator, not each negator separately, or a course teaching لا at S1 will look as if it never taught 'not' when لم arrives at S24." },
    { id: 'modal_yajib', marker: 'يجب أن', description: "must / have to / should / need to — the deontic modal (167 occurrences). Invariant يجب plus أن plus a subjunctive verb (يجب أن أدفع 'I have to pay', لا يجب أن تقلق \"you shouldn't worry\"). One Arabic modal covers several English modals (many-English→one-Arabic). Machinery, not content; its negation is the negated modal لا يجب, part of the same construction." },
    { id: 'modal_astatee', marker: 'أستطيع / يمكن / يمكنك', description: "can / could / be able to — the ability/possibility modal, appearing both as the conjugating verb استطاع (أستطيع 233, تستطيع 81) and as the impersonal يمكن + dative (يمكنك 116 'you can', يمكنني 44 'I can'). Both surface forms carry the same English modal; treat them as one construction so the alternation isn't read as two competing glosses." },
    { id: 'modal_want_need', marker: 'أريد أن / أود أن / أحتاج / بحاجة إلى', description: "want / would like / need — the volitional-desiderative family: أريد (440) 'I want', أود (116) 'I'd like' (the conditional/polite grade), أحتاج (145) 'I need', بحاجة إلى (78) 'in need of'. Closed modal set, each licensed at its own debut; together they are the main NPI-licensing environment in this corpus (أريد أن أعرف شيئاً آخر 'I want to know something else')." },
    { id: 'conditional_idha_law', marker: 'إذا / لو', description: "Conditionals split by realis: إذا (212) for open/real conditions ('if you can speak more slowly, that would be great'), لو (66) for counterfactual/irrealis, typically with كنت + a past verb (كنت سأفعله بشكل مختلف لو كنت أعرف 'I would have done it differently if I had known'). English 'if' covers both. Grammatical glue and an NPI licenser; licensed once as the conditional construction." },
    { id: 'kaanna_simulative', marker: 'كأن / كأنني', description: "as if / as though / like — كأن plus a pronominal suffix (كأنني 45 'as if I', كأنك 'as if you'). A single bound simulative complementiser carrying an English three-word phrase (أشعر كأنني أسير بشكل أسوأ 'I feel as if I'm doing worse'). Licence as a construction so the English multiword expression is not tiled against a single Arabic token." },
    { id: 'adverbial_accusative_tanwin', marker: 'ـاً', description: "Manner and time adverbials are marked with the accusative tanwīn ـً, which is one of the very few diacritics this corpus writes consistently (1,855 occurrences): جداً 'very', شكراً 'thanks', كثيراً 'a lot', قليلاً 'a little', وقتاً 'time-ACC', شيئاً 'something-ACC', غداً 'tomorrow', قريباً 'soon', تماماً 'exactly', مبكراً 'early'. English adverbs in -ly and bare adverbs both land here. The matcher treats شيء and شيئاً, وقت and وقتاً as unrelated keys — an artefact, not a defect." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'rootPatternInvisibleToStemmer', rule: "The single most important rule for reading a sweep of an Arabic course. Related words share a ROOT, not a substring: كتب / يكتب / كاتب / مكتوب / كتاب. stemKnownGloss lowercases and strips non-letters and does nothing else, so it cannot connect them. Any 'unknown gloss' finding on an Arabic course must be checked against the ROOT of the already-introduced vocabulary before it is believed. Expect the large majority of findings to fail that check — i.e. to be morphology, not vocabulary." },
    { id: 'boundMorphemesAreGlue', rule: "English a/an/the/to/for/with/in/by/my/your/his/her/me/him/them/and/so are realised as BOUND Arabic morphemes written solid with their host (ال-، بـ، لـ، كـ، و، فـ، ـي، ـك، ـه، ـها، ـنا، ـهم). They are free on the known side and must never require a separate introduced LEGO. The corollary is that the host word's surface form changes with them (كتاب → كتابي → بكتابي), and the matcher sees each as a new word." },
    { id: 'noPresentCopula', rule: "There is no present-tense 'to be' token in Arabic. An English target teaching is/are/am has NO known-side carrier, and a known-side tiling check must not demand one. Negative present copular clauses DO have a token (ليس/ليست/لست) — the asymmetry is real Arabic, not an authoring error." },
    { id: 'negationIsFiveWordsNotOne', rule: "One English negation maps to five Arabic negators chosen by tense and clause type (لا present, لم past, لن future, ما past-perfect, ليس nominal). Many-English→one-Arabic does NOT hold here; it is one-English→many-Arabic, which is the ZUT-legal direction only if each Arabic negator is demonstrated once. Treat the negation SYSTEM as a single licensed construction; do not require a separate debut per negator." },
    { id: 'negationSubstringOverreach', rule: "MEASURED IMPLEMENTATION CAVEAT, not a fact about Arabic. checkKnownSide, given a brief contract with no negationMarkers regex, decides whether a prompt is negated by testing whether the prompt STRING CONTAINS any word in the `negation` list. Arabic negators are one and two letters long (لا، ما، لم، لن), and those sequences occur inside ordinary content words (الاسترخاء contains لا; الكلام contains لا followed by م). So `negated` will read TRUE for a great many positive prompts. The direction of the error is SAFE — it suppresses NPI findings rather than inventing them — but it means a zero NPI count on an Arabic course is NOT evidence that the NPI rule was checked. Do not report it as one." },
    { id: 'tatweelBreaksIdentity', rule: "MEASURED IMPLEMENTATION CAVEAT. Tatweel ـ U+0640 is Unicode category Lm, so it passes stemKnownGloss's \\p{L} filter and survives into the key. eng_for_ara teaches three bound morphemes with an attached tatweel (بـ at seeds 4/55/69, هـ at seed 20). Those debut keys can never match the fused forms in the prompts, so the fused forms are reported as unknown for the whole course and the debut itself never retires. Fixing it needs a tokenizer-level strip of U+0640; it cannot be fixed from a contract file. Discount any finding of this shape." },
    { id: 'harakatBreakIdentity', rule: "MEASURED IMPLEMENTATION CAVEAT. Harakat are \\p{M} and survive by design (stripping them would merge distinct words). This corpus is unvowelled except for 1,855 adverbial tanwīn ـً and 59 deliberate disambiguating vowels (لم تُرد / لم نُرد / لم أُرد / لم يبقَ, and كَ taught alone at seed 15). The practical effect is that the accusative and bare forms of the same noun are separate keys — شيء vs شيئاً, وقت vs وقتاً — and the vowelled أُرد never matches the unvowelled أرد. Both are artefacts. NFC is applied and is correct: Arabic has no precomposed letter+haraka codepoints, so NFC is a no-op here and does not damage anything." },
    { id: 'arabicPunctuationIsHandled', rule: "VERIFIED 2026-08-17, contradicting the older repo caveat that an Arabic audit once read 1,126 false ZUT defects. Under the current Unicode tokenizer the Arabic comma ، (U+060C), question mark ؟ (U+061F) and semicolon ؛ (U+061B) are neither \\p{L} nor \\p{M} and are treated as separators exactly like their Latin counterparts, as are the bidi marks U+200E/U+200F and ZWNJ U+200C. Arabic-Indic digits ٠-٩ are \\p{N} and excluded, consistent with the tokenizer's stated digit policy; this corpus contains none. The 1,126 figure belongs to the old ASCII-only class and must not be re-cited against the current gate." },
    { id: 'oneYouManyForms', rule: "Arabic 'you' inflects for gender and number (أنت m.sg / أنتِ f.sg / أنتما dual / أنتم m.pl / أنتن f.pl) and drives verb agreement (تريد / تريدين / تريدون) and the suffix (ـك / ـكِ / ـكم). English has one 'you'. Many-Arabic→one-English: all of them render 'you', and a course must not invent an English contrast to carry the Arabic one. eng_for_ara is predominantly masculine-singular but does teach the feminine at the tail (ما قلتِه يا سيدتي 'what you said madam', seed 648) and the plural (ما قلتموه جميعاً 'what you all said', seed 663) — those are deliberate, not ZUT collisions." },
    { id: 'dualCollapsesToPlural', rule: "Arabic marks a DUAL distinct from the plural on nouns, pronouns and verbs. English has no dual. Many-Arabic→one-English is ZUT-legal in this direction; never split an English rendering to carry it." },
    { id: 'anIsToAndThat', rule: "أن carries English infinitival 'to' (أريد أن أتكلم 'I want to speak'), English complementiser 'that' (أعتقد أن 'I think that'), and frequently nothing at all in the English rendering. One Arabic form, several English realisations — a rendering rule, not a collision. It is in the free class, so it never needs introducing." },
    { id: 'baadIsAfterAndYet', rule: "بعد is 'after' (preposition, positive), 'yet' (under negation), and part of بعد الظهر 'afternoon' (content). Three readings, one string, 207 occurrences. I freed it as a preposition and also listed it under npi, which means the gate can never flag its 'yet' reading; the alternative was a false alarm on every 'after' prompt. Adjudicating 'yet' is a human job on this corpus." },
    { id: 'maIsNotAndWhat', rule: "ما is both the past-tense negator ('not') and the interrogative/relative pronoun ('what'), written identically and unvowelled. It is in `negation` but deliberately NOT in freeClass, so that freeing the negator does not silently free the wh-word before it is taught. Expect ما to appear in triage on wh-prompts; check which reading is meant before believing the finding." },
  ],
};

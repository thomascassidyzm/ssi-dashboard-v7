// _known_ara — KNOWN-LANGUAGE BRIEF for the Arabic known-side agent. FIRST PASS (2026-08-18), ratified:null.
// KNOWN-LANGUAGE-level contract (is_known_default), not per-course: the loader falls back to this for every
// course whose KNOWN/prompt language is Arabic. Today that is exactly one course — eng_for_ara (target
// English, known Modern Standard Arabic) — and this file is derived wholly from that corpus.
// Authored by an Opus agent from the real eng_for_ara corpus: 600 legos (+ their components) and 5,920
// practice phrases across seeds 1–300 = 7,492 known-side strings, 34,193 tokens, 1,223 distinct token types.
// RULE (Tom): no regex for language — this is the agent's REFERENCE KNOWLEDGE, not a regex gate config.
// The known-side check is an agent that reads this brief + the introduced-vocab list + the prompt and judges.
// See docs/course-optimization/eng-for-x-known-side-pilot.md; the three calibration fixes are applied here.
//
// ── TYPOLOGY ────────────────────────────────────────────────────────────────────────────────────────────
// Modern Standard Arabic is a Central Semitic, VSO/SVO, prepositional, root-and-pattern language written in
// the Arabic script (RTL, ISO 15924 'Arab'). Words ARE separated by whitespace, so segmentation is 'space'
// — but the orthographic word is not the morphological word. Arabic is *nonconcatenative fusional* at its
// core (a triliteral root interdigitated with a vowel-consonant template: k-t-b → كتاب / كتب / يكتب) and
// *clitic-agglutinating* at both edges: an orthographic token routinely carries PROCLITICS on the left and
// ENCLITICS on the right around a templatic stem. `بالإنجليزية` is bi- + al- + إنجليزية ("in English", 189×);
// `ولكنني` is wa- + lākinna + -nī ("but I", 76×). morphology is therefore declared 'fusional': a token that
// fails exact match against an introduced gloss may NEVER be called a violation on that failure alone.
//
// ── THE PROCLITIC PROBLEM: what stemStrip cannot do, stated plainly ─────────────────────────────────────
// The gate's stemStrip strips SUFFIXES ONLY. Arabic's most productive bound morphemes are PREFIXES, and the
// gate structurally cannot touch them. The affixes it therefore CANNOT handle:
//   ال-  definite article ("the")           138 token types / 3,884 tokens (11.4% of the corpus)
//   لـ-  preposition "to/for", + لِأَنّ "because"  90 types / 1,226 tokens
//   بـ-  preposition "in/by/with"             67 types / 1,139 tokens
//   سـ-  future proclitic ("will")            51 types /   675 tokens
//   وَ-  conjunction "and"                    66 types /   429 tokens
//   كـ-  "like/as" (+ كأن "as if")            25 types /   556 tokens
//   فـ-  "so/then"                            19 types /   151 tokens
//   plus the stacked combinations لل- (26 types/229 tok), بال- (23/415), وال- (2/18).
// What that COSTS, measured rather than asserted: for 57 of the 138 ال-tokens the bare noun is attested in
// the same corpus and would match an introduced gloss if the article could be removed — الأسبوع/أسبوع (165×),
// اليوم/يوم (117×), الوقت/وقت (112×), الإجابة/إجابة (107×), الأمر/أمر (104×), الليلة/ليلة (96×). The same
// holds for بـ (37 types / 608 tok: بالإنجليزية→الإنجليزية 189×, بشكل→شكل 151×, بسرعة→سرعة 72×), لـ (44 types
// / 608 tok: لماذا→ماذا 140×, لأنني→أنني 127×, لذلك→ذلك 43×) and سـ (31 types / 407 tok: سيحدث→يحدث 44×,
// ستكون→تكون 43×, سأكون→أكون 41×). Summed and de-duplicated that is roughly 3,900 tokens — ~11% of the whole
// known side — where a real, already-introduced lemma sits behind a prefix the stemmer cannot reach. The
// consequence is NOT false violations (morphology:'fusional' forbids that): it is a large residue of tokens
// that resolve to neither an exact match nor a stem match, i.e. a large UNCHECKED(morphology_unresolved)
// surface. That is the honest state of this gate for Arabic and it should be read as coverage loss, not as
// silence. Two mitigations are baked in below: (a) the highest-frequency proclitic-bearing FUNCTION words
// are enumerated verbatim in freeClass (لماذا, لأنني, لأنه, لذلك, ولكنني, بالإنجليزية-class items are content
// so they are not), and (b) the proclitics that the corpus itself exposes as standalone components — لـ (6×,
// glossed "to/of/for"), بـ (10×, "in/after"), كـ (14×) — are listed as free so a split-out proclitic
// component is never read as new vocabulary. Neither mitigation reaches a proclitic fused to a content stem.
//
// ── TASHKEEL ───────────────────────────────────────────────────────────────────────────────────────────
// The estate already strips U+064B–U+0652 in normalizeForContainment (text-normalization.cjs:33) — that is
// correct and this brief assumes it. Measured: 1,573 of 7,492 known-side rows (21.0%) carry a diacritic, and
// the ONLY marks present are tanwīn fatḥ U+064B (1,925×), ḍamma U+064F (49), kasratān U+064D (16), fatḥa
// U+064E (13), kasra U+0650 (2) — all five inside the stripped range. There is no U+0670 superscript alef and
// no U+0653/0654. Two consequences worth naming: (1) the corpus is effectively UNVOCALISED, so person/voice
// syncretism (كنتُ "I was" / كنتَ "you were") is unresolvable in the text itself, not merely lost to
// stripping — the agent must read the English gloss, never the Arabic vowels; (2) tanwīn stripping does NOT
// merge شيئاً with شيء, because the alef seat survives — the corpus carries شيء (207×) and شيئا (182×) as two
// distinct tokens for one lemma "thing". That pair is recovered by the final 'ا' entry in stemStrip, not by
// tashkeel stripping. Tatweel U+0640 (10×) is NOT stripped by normalizeForContainment; it is rare enough to
// leave alone but it will produce unmatchable tokens where it occurs.
//
// ── stemStrip: NOT empty, and here is the evidence ─────────────────────────────────────────────────────
// Unlike Hindi (empty by design), Arabic ENCLITIC stripping is strongly rewarded, because the enclitics are
// segmentable pronoun forms and not agreement morphology. Measured over the corpus: 4,874 tokens (14.3%)
// end in a pronominal enclitic, and stripping produces a form that is ITSELF an attested corpus token in 136
// type-pairs — and on inspection nearly all of them are correct lemma recoveries: معك→مع (87×), منك→من (26×),
// أنه/أنك/أنني/أننا/أنها/أنهم→أن, أعرفهم→أعرف (27×), تريدني→تريد (26×), صديقي→صديق (48×), عنه→عن (34×),
// فيها→في (10×). Adding the final tanwīn-alef 'ا' recovers a further 55 types / 1,271 tokens
// (مستعدا→مستعد 129×, متأكدا→متأكد 128×, قليلا→قليل 87×, وقتا→وقت 80×, جيدا→جيد 78×). Ordering is
// LONGEST-FIRST so that a ها-clitic is removed before the bare 'ا' is tried (لأنها→لأن ✓, قولها→قول ✓).
// What is deliberately NOT stripped, and why: ة (feminine marker — صديقة→صديق would collapse "female friend"
// into "friend"), ت / تِ / وا / ون / ين / ات (subject-agreement and plural morphology — كانت→كان collapses
// she-was into he-was; these are exactly the contrasts the gender/person gloss rules below must inspect,
// so stripping them destroys the evidence), and every proclitic (the field cannot express them at all).
// stemMinLen is 2, not 3, because Arabic's highest-frequency lemmas are two-letter (مع، عن، من، في، أن، لا،
// ما) and a minimum of 3 would block precisely the prepositions that the clitic strip exists to recover.
// The four mis-merges this configuration is KNOWN to produce, all named rather than hidden:
//   هناك "there" → هنا "here"  (84×)   — neutralised: both are in freeClass, so exact match wins first.
//   لديك/لديه "you/he has" → لدي "I have"  and  عليك/عليه → علي  — person collapse on a clitic-bearing
//        preposition; neutralised the same way, all six forms are in freeClass.
//   أنهي "I finish" → أنه "that it's"  (10×) — NOT neutralised. أنه is free, so أنهي leaks as free. This is
//        a real 10-occurrence hole and it is the price of keeping the 'ي' strip (which buys معي 40×,
//        صديقي 48×, كتابي 15×, اسمي 11×).
//   مهماً "important" → مه  (31×) — the ها rule fires before the ا rule and lands on a non-word, so these 31
//        tokens simply fail to lemmatise to مهم (54×). Coverage loss, not a false violation.
//
// ── THE TWO PERVASIVE KNOWN-SIDE ZUT PRESSURES IN THIS PAIR ────────────────────────────────────────────
// (1) t-PREFIX SYNCRETISM. The imperfect prefix تـ marks BOTH 2nd-person-masculine-singular and 3rd-person-
//     feminine-singular. One Arabic form therefore carries two English glosses that are not synonyms:
//     the corpus glosses تريد as "she wants" (S17) AND "you want" (S20); تتكلم as "you speak" (S13/S14).
//     This is a legal one-known→many-target mapping fixed per seed by context, NOT a ZUT conflict, and the
//     gate must be told so or it will reject correct content. Note the direction: Arabic is more ambiguous
//     than English here, the opposite of the Hindi वह case.
// (2) TENSE LIVES IN THE NEGATOR AND IN كان, NOT IN THE VERB. Arabic negates past with لم + JUSSIVE, which is
//     a prefix-conjugated (present-shaped) verb: لم أنم = "I didn't sleep" (S55), لم أكن أفكر = "I wasn't
//     thinking" (S43). The verb أنم looks present; only لم makes it past. Likewise كان/كانت/كنت + imperfect
//     builds past-progressive and habitual (كنت أبدأ "I was starting" S42, كنت "I used to"). An agent reading
//     the Arabic verb alone will mis-tense the English gloss every time; it must read the negator/كان first.
// A third, smaller pressure: the definite article is NOT co-extensive with English "the". الإنجليزية glosses
//     as bare "English" (407×), not "the English"; بالفعل is "already", not "in the deed". ال↔the is
//     many-to-one in both directions and must never be tiled as a separate "the" gloss.
// Register is conveniently FIXED, exactly as Bengali's তুমি-only: the corpus contains NO feminine addressee
//     (تريدين، أنتِ، تتكلمين all absent), NO plural addressee (أنتم absent), no dual anywhere, and no سوف
//     (future is the سـ proclitic only). Every English "you" maps to masculine-singular أنت + تـ-forms.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY (honest gaps) ──────────────────────────────────────────────
//  • مهما (31×) — spelled identically to مهماً "important" once tashkeel is stripped. In THIS corpus all 31
//    occurrences are the adjective ("something important", S102/S104/S119/S131); the genuine free-relative
//    مهما "whatever/however" does not occur. I therefore left it OUT of freeClass, because admitting it would
//    make the adjective "important" free vocabulary. If a later seed introduces the free-relative, it needs a
//    construction entry, not a freeClass entry. Flagging rather than guessing.
//  • أن (2,516×, rank 1) — after tashkeel stripping this single token conflates at least three grammatical
//    words: أَنْ (subjunctive complementiser, "to": أريد أن أتكلم), أَنَّ (nominal complementiser, "that":
//    أعتقد أن), and — via the same skeleton — إِنَّ (19×, emphatic "indeed/that", written إن). I put all of them
//    in freeClass because each is pure machinery, but I could NOT partition the 2,516 occurrences between
//    them, and the أن/إن hamza alternation (أنه 130 / إنه 29; أنني 108 / إنني 28; أنها 10 / إنها 9) means the
//    orthography itself is inconsistent. Any rule that needs to distinguish "to" from "that" cannot use the
//    token; it must use the English side.
//  • على vs علي (126× vs 14×) — these are a genuine three-way tangle: على "on/upon", علي "on me / I have to",
//    and علي as a plain misspelling of على (alef maqṣūra written as yāʾ). I classified both as free
//    prepositions, but I cannot tell, per occurrence, which of the three is meant, and the ك/ه enclitic strip
//    additionally folds عليك/عليه onto علي.
//  • بعد (197×) — I could not settle it as one item. It is the preposition "after" (بعد أن تنتهي S11), the
//    NPI "yet" (لا أعرف بعد "I don't know yet" S60), and the first half of the compound noun بعد الظهر
//    "afternoon" (S35). I listed it in BOTH freeClass (preposition) and npi ("yet"), which is correct for a
//    homograph but means the agent must disambiguate by environment on every hit; the بعد الظهر reading is
//    neither and will read as a free preposition plus a noun.
//  • أحد (20×) / أحداً (21×) — "anyone" under a licensor (S71 ندع أحداً "let anyone", S202 لم يكن أحد "nobody
//    was") but ALSO the weekday الأحد "Sunday" (43×, S161/S179). The definite form disambiguates in practice,
//    but the bare أحد does not, and I have not made that a rule.
//  • كيفية (49×, "how to / the manner of") — a deverbal noun of كيف. Grammatical enough to be machinery,
//    lexical enough to be a taught word; the corpus glosses it inside larger units (S202 من كيفية الإجابة
//    "how to answer"). I left it out of freeClass rather than guess.
//  • جدا (284×, "very"), قليلا (87×), بسرعة (72×), جيدا (78×), كثيرا (59×), الآن (220×), اليوم (117×),
//    أمس (90×), غدا (62×), نعم (62×) — high-frequency but DELIBERATELY excluded from freeClass. These are
//    taught as legos in this course (S13 "very", S1 "now", S97 "yes"), so making them free would silently
//    disable the gate on real introduced vocabulary. They are classified — as content, not as function.
//  • ف- (19 types / 151 tokens) — I could not reliably identify this proclitic at all. The naive test finds
//    فكرة "idea" → كرة "ball" (70×), which is spurious: فكرة is a root-f-k-r noun, not فـ + كرة. Only فإنه,
//    فمتى, فلست, فهذا (11 tokens total) are real فـ-proclitic cases. I am recording this specifically because
//    it is the clearest demonstration in this corpus that Arabic proclitics cannot be handled by string
//    operations — which is exactly why the estate rule forbids a stemmer making the language judgment.
module.exports = {
  course_code: '_known_ara',
  ratified: null,
  known_lang: 'ara',
  known_lang_name: 'Arabic',
  is_known_default: true,

  // ── Tokenizer / outcome machinery ────────────────────────────────────────────────────────────────────
  script: 'Arab',
  segmentation: 'space',          // whitespace-delimited; the orthographic word is NOT the morphological word
  morphology: 'fusional',         // root-and-pattern + edge clitics: exact-match failure is NEVER a violation

  // SUFFIX/ENCLITIC strip only — see header for what this cannot do (all proclitics) and the four known
  // mis-merges. Ordered LONGEST FIRST so a ها/ني enclitic is removed before the bare tanwīn 'ا'.
  stemStrip: ['هما', 'كما', 'كم', 'هم', 'نا', 'ها', 'ني', 'ه', 'ك', 'ي', 'ا'],
  stemMinLen: 2,                  // 2 not 3: مع/عن/من/في/أن/لا/ما are the lemmas this strip exists to recover

  // ── Free class ───────────────────────────────────────────────────────────────────────────────────────
  // Corpus-derived; every item below is attested in eng_for_ara. Includes the enclitic-bearing forms of the
  // complementisers, negators, prepositions and copulas verbatim, so that exact match fires BEFORE the
  // stemmer and the known mis-merges (هناك→هنا, لديك→لدي, عليك→علي) can never be reached.
  freeClass: [
    // complementisers أنْ / أنَّ / إنَّ and their enclitic forms (see header: not partitionable)
    'أن', 'أنه', 'أنك', 'أنني', 'أننا', 'أنها', 'أنهم', 'إن', 'إنه', 'إنني', 'إنها', 'إنهم',
    // negators (see negation[] and the four negation constructions)
    'لا', 'لم', 'لن', 'ليس', 'ليست', 'لست', 'ولا',
    // interrogatives / wh
    'هل', 'ما', 'ماذا', 'لماذا', 'كيف', 'متى', 'أين', 'كم', 'أي',
    // prepositions (free-standing and clitic-bearing forms)
    'في', 'من', 'إلى', 'على', 'علي', 'عليك', 'عليه', 'مع', 'معك', 'معي', 'عن', 'قبل', 'بعد', 'منذ', 'حتى',
    'ل', 'ب', 'ك',
    // conjunctions / subordinators (incl. the لـ- and وـ- proclitic forms that are pure machinery)
    'و', 'أو', 'أم', 'لكن', 'ولكن', 'لكنه', 'لكنني', 'ولكنني', 'لأن', 'لأنني', 'لأنه', 'لأنها', 'لذلك',
    'إذا', 'لو', 'عندما', 'كأنني',
    // demonstratives, pronouns, relativisers, existential
    'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء', 'هو', 'هي', 'هم', 'أنا', 'أنت', 'نحن',
    'الذي', 'التي', 'الذين', 'هناك', 'هنا',
    // copula كان and possession لدى — machinery, not content
    'كان', 'كانت', 'كنت', 'كنا', 'يكون', 'تكون', 'أكون', 'لدي', 'لديك', 'لديه',
    // quantifiers / degree machinery
    'كل', 'بعض', 'أكثر', 'أقل', 'المزيد', 'فقط',
  ],

  // ── NPI ──────────────────────────────────────────────────────────────────────────────────────────────
  npi: ['أي', 'أي شيء', 'أي مكان', 'أحد', 'أحدا', 'بعد', 'أي من'],
  npiLicensing: {
    rule: "Arabic negative-polarity / free-choice items — أي 'any' and its phrasal forms أي شيء 'anything' (S35), أي مكان 'anywhere' (S182), أي من 'any of' (S283); أحد / أحداً 'anyone' (S71, S202); and بعد in its 'yet' reading (لا أعرف بعد 'I don't know yet', S60) — are licensed ONLY in NON-VERIDICAL / downward-entailing environments. In every environment listed below they are FREE and need no introduction; the ONLY violation is one of them standing in a plain POSITIVE DECLARATIVE that asserts existence. The agent must judge the prompt's environment, not pattern-match. Two Arabic-specific splits govern this. (1) The EXISTENTIAL vs FREE-CHOICE split: a positive 'something / someone / somewhere' is the bare indefinite شيء / شيئاً 'thing, something' (S4, S111) or شخص / شخصاً 'someone' (S5, S234) or شخص ما, whereas the أي-marked forms أي شيء / أي مكان and أحداً are the any-forms and require a licensor. So 'I want to read something' = شيئاً, but 'she doesn't want to read anything' = لا تريد أن تقرأ أي شيء (S35) and 'do you want to show me anything?' = هل تريد أن تريني أي شيء؟ (S35) — the same أي شيء, licensed by negation in the first and by the polar question in the second. (2) The بعد split: بعد is an NPI only in its 'yet' reading under negation; its far more common reading is the plain preposition 'after' (بعد أن تنتهي 'after you finish', S11) which is veridical, always free, and unrelated — and بعد الظهر 'afternoon' is a third, lexical reading that is neither. Do NOT flag a licensed NPI as unintroduced vocabulary, and do NOT let an أي-form or أحداً pass in a bare positive assertion.",
    licensedIn: [
      "Present/general clausal negation with لا (لا تريد أن تقرأ أي شيء 'she doesn't want to read anything' S35; لا يريد أن يقرأ أي شيء بالإنجليزية S35; لا أريد أن أدع أحداً يتوقف 'I don't want to let anyone stop' S71)",
      "Past negation with لم + jussive (لم يرد أن يقرأ أي شيء 'he didn't want to read anything' S69; لم نُرد أن ندع أحداً 'we didn't want to let anyone' S71; لم يكن أحد متأكداً 'nobody was sure' S202)",
      "Future negation with لن (لن أستطيع أن... 'I'm not going to be able to...' S24/S157) — irrealis future is non-veridical in its own right, negated or not",
      "Copular / predicate negation with ليس / ليست / لست (لست متأكداً 'I'm not sure' S10; ليس من الصعب أن تدع أحداً يساعدك 'it's not difficult to let anyone help you' S71; هذه ليست أفضل S116)",
      "Prohibitive imperatives with لا + jussive (لا تدع أحداً يتكلم 'don't let anyone speak' S71; لا تدع أحداً يخبرك كيف تتكلم S71; لا تدع أحداً يسمع ذلك S71)",
      "Polar yes/no questions with هل, and tag/echo questions (هل تريد أن تريني أي شيء؟ 'do you want to show me anything?' S35; هل تعرف صديقة أختي 'do you know my sister's friend' S284)",
      "Content wh-questions with لماذا / ماذا / كيف / متى / أين / كم (لماذا تريد أن تقرأ أي شيء هذا بعد الظهر؟ S67; لماذا تريد أن تدع أحداً يقرأ ذلك؟ S71)",
      "Conditionals and counterfactuals with إذا (إذا كنت تستطيع 'if you can' S90) and لو (لو كنت أعرف ما تريده 'if I had known what you wanted' S152; لو استطاع 'if he could' S225) — the protasis licenses any/anyone/ever",
      "Desiderative and volitional scope under أريد / تريد / يريد / أود 'want / would like' and their أن-complements (أريد أن أقرأ أي شيء; لا أود أن... S12) — wanting is non-veridical even when the matrix clause is positive",
      "Ability, possibility and permission modals — أستطيع / تستطيع / استطاع 'can, be able' (S7, S90, S174), يمكن + enclitic 'can/could' (هل يمكنك أن تخبرني 'can you tell me' S150), ممكن 'possible' (S28, S50), and the causative-permissive دع / ندع 'let' (S71) which is the single densest NPI host in this corpus",
      "Obligation / necessity modals: يجب أن 'should, must' (S98, S99, S109), أحتاج أن / نحتاج أن 'need to' (S45, S59, S106), بحاجة إلى 'need to' (S44, S139) — non-veridical deontic scope",
      "Comparatives with من / أكثر من 'than, more than' (أكثر 181×; من الليلة الماضية 'than last night' S42), superlatives with أفضل 'the best' (S116), and restrictive/scalar فقط 'only, just' (S106, S280)",
      "Not-yet-realised temporal clauses: قبل أن 'before' (قبل أن تغادر 'before you leave' S119, قبل أن تبدأ S281) and حتى 'until' (حتى بعد أن ننتهي 'until after we finish' S251)",
      "Explicit free-choice أي + bare indefinite ('any whatsoever'), which is inherently any-type and is licensed by want / ability / permission / imperative / generic contexts even without an overt negator",
    ],
  },

  // Negation markers (reference list; negation detection is the agent's judgment, never a regex).
  // NOTE: ما is NOT a negator anywhere in this corpus — all 386 occurrences are the interrogative/relative
  // 'what'. Classical negative ما and غير/بدون do not appear; do not assume them.
  negation: ['لا', 'لم', 'لن', 'ليس', 'ليست', 'لست', 'ولا'],

  // ── Arabic machinery the agent licenses at a carrier's debut ─────────────────────────────────────────
  knownConstructions: [
    { id: 'an-subjunctive-complement', marker: 'أن (أن أتكلم، أن تنتهي)', description: "Subjunctive complementiser أنْ + imperfect verb — the single most frequent token in the corpus (2,516×) and the backbone of every control structure: أريد أن أتكلم 'I want to speak' (S1), أحاول أن 'I'm trying to' (S2), يجب أن 'I should' (S98), قبل أن تغادر 'before you leave' (S119). English infinitival 'to' has no separate Arabic word — it IS this particle plus a finite-looking verb. Pure machinery; licensed at its S1 debut and free thereafter." },
    { id: 'anna-nominal-complement', marker: 'أنّ / أنه / أنك / أنني / أننا / أنها / أنهم', description: "Nominal complementiser أنَّ 'that', obligatorily carrying a pronominal enclitic when its subject is pronominal: أعتقد أن 'I think that' (S47), أعتقد أنك 'I think that you're' (S72), أنه جيد جداً 'that it's so good' (S135), لكنني لست متأكداً إذا كان ذلك 'but I'm not sure if it's' (S165). English 'that' is optional; Arabic's is obligatory and fused to its subject pronoun. Same consonantal skeleton as أنْ once tashkeel is stripped — see the header gap note." },
    { id: 'imperfect-prefix-conjugation', marker: 'أ- / تـ- / يـ- / نـ- (أتكلم، تتكلم، يتكلم، نتكلم)', description: "The imperfect conjugates by PREFIX, not suffix: أ- 1sg, تـ- 2sg-masc AND 3sg-fem, يـ- 3sg-masc, نـ- 1pl. This is why stemStrip cannot recover a verb lemma in Arabic, and why morphology is 'fusional': أتكلم/تتكلم/يتكلم/نتكلم are one lemma 'speak' with four different first letters. All four are licensed as one lemma at the verb's debut; the agent must resolve them by prefix, and the gate may never treat a prefix variant as new vocabulary." },
    { id: 'tprefix-syncretism', marker: 'تـ- (تريد، تتكلم، تبدأ، تفعل)', description: "The تـ- prefix is ambiguous between 2sg-masculine and 3sg-feminine. The corpus glosses تريد as BOTH 'she wants' (S17) and 'you want' (S20). This is a legal one-known→many-target mapping resolved per seed by context, NOT a ZUT conflict; see the gloss rule of the same name. Licensed with the imperfect conjugation." },
    { id: 'definite-article-al', marker: 'الـ (الإنجليزية، الكلام، الأسبوع، الوقت)', description: "The definite article is a PROCLITIC, 138 token types / 3,884 tokens (11.4% of the corpus). It is obligatory in many contexts where English has no article at all — الإنجليزية glosses as bare 'English' (407×), الكلام as 'speaking' (185×). It also assimilates to following sun letters in pronunciation, invisibly in writing. It CANNOT be removed by stemStrip. License it once at the first definite noun's debut; never tile it as a separate 'the'." },
    { id: 'proclitic-prepositions', marker: 'بـ / لـ / كـ (بالإنجليزية، لماذا، كأنني)', description: "The one-letter prepositions bi- 'in/by/with' (67 types / 1,139 tok), li- 'to/for' (90 types / 1,226 tok) and ka- 'like/as' (25 types / 556 tok) attach directly to their host and stack with الـ: بالإنجليزية = bi+al+English 'in English' (189×), بشكل جيد 'well' (151×), لأنني = li+anna+nī 'because I' (127×). The corpus itself splits them out as standalone components (لـ glossed 'to/of/for' 6×, بـ glossed 'in/after' 10×, كـ 14×), which is why the bare letters are in freeClass. Licensed at first debut; the gate cannot detach them from a fused host." },
    { id: 'future-sa', marker: 'سـ (سأبدأ، سيكون، ستساعدني)', description: "Future is the proclitic sa- on an imperfect verb — 51 types / 675 tokens (سأبدأ 'I'm going to start' S23, سيكون ذلك رائعاً 'that would be great' S90, ستساعدني 'you're going to help me' S25, لن as its negative counterpart). سوف, the free-standing variant, does NOT occur in this corpus. English 'will / going to / would' all map here. Licensed at S23; unreachable by stemStrip." },
    { id: 'conjunction-proclitic-wa', marker: 'وـ (ولكنني، وأنا، ولا)', description: "The conjunction wa- 'and' is a proclitic, never a free word in running text (66 types / 429 tok): ولكنني 'but I' (76×), وأنا 'and I' (29×), ولا نقلق 'and not worry' (S106), وبعدها 'and then' (S168). The single free و in the corpus (11×) is a component gloss, not running text. English 'and' is a separate word; Arabic's is bound. Licensed at first debut." },
    { id: 'zero-copula-present', marker: '∅ (أنا سعيد، هذه ليست مشكلة)', description: "Affirmative present 'is / are / am' has NO Arabic word: the nominal sentence is verbless (أنا سعيد جداً 'I'm very happy' S76, كل شيء بخير 'everything is okay' S141, هذا هو المكان 'this is the place' S138). Only the NEGATIVE present has an overt carrier (ليس/ليست/لست) and only the PAST has one (كان/كانت/كنت). English 'is/are/am' must therefore be treated as free — supplied on the English side, never required as a prompt word." },
    { id: 'kaana-past-copula-auxiliary', marker: 'كان / كانت / كنت / كنا / يكون / أكون', description: "كان is both the past copula ('was': كان ذلك ممتعاً 'that was very interesting' S112, كانت جيدة 'was good' S125) and the past AUXILIARY: كان + imperfect builds past-progressive and habitual (كنت أبدأ 'I was starting' S42, كنت 'I used to' S199, لم أكن أفكر 'I wasn't thinking' S43, لو كنت أعرف 'if I had known' S152). It is also the complement of إذا/لو in conditionals (إذا كنت تستطيع S90). Machinery, not content; note كنتُ 'I was' and كنتَ 'you were' are the SAME string in this unvocalised corpus." },
    { id: 'negation-la-present', marker: 'لا', description: "General present/imperfective negator لا (783×), preceding the verb: لا أريد 'I don't want' (S19), لا أعرف 'I don't know' (S60), لا يريد 'he doesn't want' (S34), لا نريد 'we don't want' (S36). Also the PROHIBITIVE with the jussive (لا تدع أحداً 'don't let anyone' S71). English don't/doesn't converge here. Licenses the whole NPI set." },
    { id: 'negation-lam-past-jussive', marker: 'لم', description: "Past negator لم (384×) + JUSSIVE — a present-shaped verb made past by the particle alone: لم أنم جيداً 'I didn't sleep very well' (S55), لم أكن أفكر 'I wasn't thinking' (S43), لم يكن يعرف الإجابة 'he didn't know the answer' (S105), لم أفعل الكثير 'I didn't do much' (S218), لم أرهم 'I haven't seen them' (S183). English didn't/wasn't/haven't all converge on لم + jussive. THE most important construction for tense correctness: the verb after لم carries no past morphology at all." },
    { id: 'negation-lan-future', marker: 'لن', description: "Future negator لن (52×) + subjunctive: لن أستطيع أن أكون هناك 'I won't be able to be there' (S157), لن أنتظرك 'I'm not going to wait for you' (S82). The negative counterpart of the سـ- proclitic; English won't / not-going-to map here, never to لا + سـ." },
    { id: 'negation-laysa-copular', marker: 'ليس / ليست / لست', description: "Copular/predicate negator ليس, inflecting for person and gender (ليس 3sg-masc 135×, ليست 3sg-fem 45×, لست 1sg/2sg-masc 142×): لست متأكداً 'I'm not sure' (S10), ليس سهلاً 'isn't easy' (S64), ليست مشكلة 'it's not a problem' (S134), أن الأمر ليس كذلك 'that it's not like that' (S102). It is the ONLY overt present-tense copula in the language and it exists only in the negative — see zero-copula-present." },
    { id: 'polar-question-hal', marker: 'هل', description: "Polar question particle هل (464×), clause-initial, with no word-order change and no do-support: هل تتكلم 'do you speak' (S14), هل تتعلم 'are you learning' (S21), هل يمكنك أن 'could you' (S61), هل ستساعدني 'are you going to help me' (S25). It is the known-side analogue of English do-support and auxiliary inversion, and it licenses the NPI set. Alternative questions use أم 'or' (S75, S162)." },
    { id: 'pronominal-enclitics', marker: '-ني / -ك / -ه / -ها / -نا / -هم (تخبرني، معك، أعرفهم)', description: "Object and possessive pronouns are ENCLITICS on the verb, preposition or noun: تخبرني 'tell me' (71×), معك 'with you' (87×), صديقي 'my friend' (48×), أعرفهم 'I know them' (27×), أسألك 'I ask you' (47×), عنه 'about it' (34×). One orthographic word = verb + object, or preposition + object, or noun + possessor. These ARE the stemStrip list; they are the one Arabic affix class the gate can actually see. Licensed at first debut per host class." },
    { id: 'laday-possession', marker: 'لدي / لديك / لديه', description: "Arabic has no verb 'to have': possession is the preposition لدى + a pronominal enclitic in a verbless sentence (لدي المزيد لأتعلمه 'I've got more to learn' S73, هل لديك المزيد 'have you got more' S75, لم يكن لدي وقت 'I didn't have time' S178). English have/has/had maps onto this preposition, negated by ليس/لم يكن rather than by a verbal negator." },
    { id: 'modal-yajib', marker: 'يجب أن', description: "Deontic modal 'should / must' — impersonal يجب + أن-clause (يجب أن أفكر في 'I should consider' S98, يجب أن تسأل 'you should ask' S99, يجب أن نعمل بجد 'we must work hard' S109). Invariant in form, takes no subject agreement; the person is carried by the embedded verb. Pure machinery — this is the Arabic चाहिए-class item and it is classified here precisely so it cannot leak as vocabulary." },
    { id: 'modal-yumkin', marker: 'يمكن + enclitic (يمكنك، يمكنني، يمكننا)', description: "Possibility/permission modal 'can / could / may' — impersonal يمكن with the experiencer as an enclitic: هل يمكنك أن 'could you' (S61), يمكنك أن تسألها 'you can ask her' (S136), هل يمكنني أن أسألك 'can I ask you' (S119). Note the enclitic marks the SUBJECT of the English modal, not an object. Related adjectival ممكن 'possible' (S28, S50) and أمكن. Machinery, not content." },
    { id: 'modal-istataa', marker: 'أستطيع / تستطيع / استطاع / سيستطيع', description: "Ability modal 'can / be able to', fully conjugated (unlike يجب/يمكن): أستطيع الكلام 'to be able to speak' (S11), إذا كنت تستطيع 'if you can' (S90), لن أستطيع أن 'not going to be able' (S24), لو استطاع 'if he could' (S225), إذا كان سيستطيع المساعدة 'if he'll be able to help' (S176). One lemma across all prefix-conjugated forms; an NPI-licensing environment." },
    { id: 'need-haaja', marker: 'أحتاج أن / بحاجة إلى', description: "Necessity 'need to', expressed two ways in this corpus: the verb أحتاج/نحتاج/تحتاج + أن (لا أحتاج أن 'I don't need to' S45, نحتاج فقط أن نعمل بجد 'we just need to work hard' S106) and the nominal بحاجة إلى (كنت بحاجة إلى 'I need to' S44, بحاجة للمغادرة 'need to leave' S139). Both are deontic machinery in the same class as يجب, and both license NPIs." },
    { id: 'relative-alladhi', marker: 'الذي / التي / الذين', description: "The relativiser agrees in gender and number with its head AND is used ONLY when the head is definite: الذي تركته على الطاولة 'that I left on the table' (S195), الطريقة الوحيدة التي أعرفها 'the only way that I know' (S94), الناس الذين يحبون 'people who like' (S286). An INDEFINITE head takes NO relativiser at all — the relative clause simply follows. English 'that/who/which' is optional in a different set of cases; the two systems do not line up." },
    { id: 'idafa-genitive', marker: 'X Y (نهاية الأسبوع، بعد الظهر، صباح الأحد)', description: "Possession and 'of' are expressed by juxtaposition (iḍāfa): the possessed noun comes FIRST and loses its article, the possessor follows in the genitive — نهاية الأسبوع 'the weekend' (S214), بعد الظهر 'the afternoon' (S35), صباح الأحد 'Sunday morning' (S161), صديقة أختي 'my sister's friend' (S284). English 's and 'of' both map here, in opposite constituent orders. Nothing marks the construction overtly, so the agent must recognise it structurally." },
    { id: 'accusative-tanwin', marker: 'ـاً (شيئاً، جداً، وقتاً، مستعداً)', description: "The indefinite accusative/adverbial ending -an, written as tanwīn fatḥ on a final alef seat: شيئاً 'something' (182×), جداً 'very' (284×), وقتاً 'time' (80×), مستعداً 'ready' (129×), متأكداً 'sure' (128×). Once tashkeel is stripped the alef seat REMAINS, so شيء and شيئا are two tokens for one lemma; the final 'ا' in stemStrip is what reunites them. Predicate adjectives after كان/ليس take this ending obligatorily (ليس سهلاً 'isn't easy' S64) — it is agreement, not vocabulary." },
    { id: 'conditional-idha-law', marker: 'إذا / لو', description: "Two conditionals with different modality: إذا 'if' for real/open conditions (إذا كنت تستطيع 'if you can' S90) and لو for counterfactual/hypothetical ones (لو كنت أعرف ما تريده 'if I had known what you wanted' S152, ماذا ستفعل لو 'what would you do if' S203, لو استطاع 'if he could' S225). English 'if' collapses both; the choice is fixed by whether the antecedent is counterfactual. Both are NPI licensors." },
  ],

  // ── Known-side ZUT / rendering rules ─────────────────────────────────────────────────────────────────
  glossRules: [
    { id: 'tprefix-you-she-collapse', rule: "The imperfect prefix تـ- is syncretic between 2nd-person-masculine-singular and 3rd-person-feminine-singular, so ONE Arabic form legitimately carries TWO English glosses that are not synonyms: the corpus glosses تريد as 'she wants' (S17) and 'you want' (S20), and تتكلم as 'you speak' (S13/S14). This is a legal one-known→many-target mapping fixed per seed by context, NOT a ZUT conflict — do not reject a seed for reusing تريد with a different English pronoun. The mirror-image of the Hindi वह case: here the KNOWN side is the ambiguous one, so the disambiguating information exists only in the English gloss and in the surrounding prompt." },
    { id: 'addressee-register-fixed-masc-sg', rule: "Every second person in this corpus is masculine SINGULAR: أنت / -ك / تـ-forms. The feminine addressee forms (تريدين، أنتِ، تتكلمين) do not occur, the plural أنتم does not occur, and the dual occurs nowhere at all. Every English 'you / your' therefore maps deterministically to the أنت paradigm with no per-phrase formality or gender decision — exactly as Bengali is fixed to তুমি. If a feminine or plural addressee is ever introduced it becomes a NEW construction license, not a silent variant, and every existing تـ-form seed must be re-checked because the syncretism above would then be three-way." },
    { id: 'tense-lives-in-the-particle', rule: "Do not read tense off the Arabic verb. Past negation is لم + JUSSIVE, and the jussive is prefix-conjugated and looks present: لم أنم = 'I didn't sleep' (S55), لم أكن أفكر = 'I wasn't thinking' (S43), لم يكن يعرف = 'he didn't know' (S105). Future is the سـ proclitic (سأبدأ 'I'm going to start' S23) or its negation لن (لن أستطيع S24). Past progressive and habitual are كان/كنت + imperfect (كنت أبدأ 'I was starting' S42, كنت 'I used to' S199). Fix the English rendering per particle cluster: لم→simple past / present perfect negative; لن→won't / not going to; سـ→will / going to; كان + imperfect→was -ing / used to; bare imperfect→simple present or present progressive. An agent that glosses the verb alone will mis-tense every negated past in the course." },
    { id: 'al-is-not-the', rule: "The definite article الـ and English 'the' are NOT co-extensive in either direction. Arabic requires الـ where English has no article — الإنجليزية glosses as bare 'English' (407×), الكلام as 'speaking' (185×), بالفعل as 'already' (72×), الآن as 'now' (220×). Conversely English 'the' appears where Arabic uses the article-less first member of an iḍāfa (نهاية الأسبوع = 'the weekend'). Never tile الـ as a separate 'the' gloss and never require an English 'the' because الـ is present. Because الـ is a PROCLITIC the gate cannot strip it, so a definite noun and its bare form are two unrelated tokens to the tokenizer (الأسبوع 165× vs أسبوع) — treat a definite/indefinite pair of the same noun as ONE introduced lemma when judging." },
    { id: 'zero-copula-english-side-only', rule: "Affirmative present 'is / are / am' has no Arabic carrier. It must be treated as free on the known side — supplied English-side — and never demanded as a prompt word. Only three things carry it overtly: ليس/ليست/لست in the negative present, كان/كانت/كنت in the past, and هناك for existential 'there is/are' (S131). Do not read a verbless Arabic prompt as missing a word." },
    { id: 'an-to-vs-that', rule: "أن renders BOTH English infinitival 'to' (أريد أن أتكلم 'I want to speak' S1) and the complementiser 'that' (أعتقد أن 'I think that' S47), and after tashkeel stripping the two are the same string — the underlying أنْ and أنَّ are distinguished only by vowels this corpus does not write. Do not attempt to split them on the Arabic side; take the reading from the English gloss. Corollary: an English infinitive is never a separate known-side word, so 'to' must not be tiled." },
    { id: 'accusative-vs-bare-same-lemma', rule: "شيء (207×) and شيئاً (182×) are ONE lemma 'thing / something'; likewise جيد/جيداً, وقت/وقتاً, مستعد/مستعداً, متأكد/متأكداً, قليل/قليلاً, شخص/شخصاً. The difference is the indefinite accusative/adverbial ending, which is agreement forced by the syntactic slot (predicate of كان/ليس, adverbial, object of a verb), not a lexical choice. Never treat the -aN form as new vocabulary once the bare form is introduced, and never treat their co-occurrence as a ZUT conflict. This is the one place where the final 'ا' of stemStrip is doing real work — and where it is spelled ـهاً (مهماً) it fails, see the header." },
    { id: 'idafa-mirror-order', rule: "Possession and 'of' are juxtaposition, not a preposition: the POSSESSED comes first and drops its article, the possessor follows — نهاية الأسبوع 'the weekend', صباح الأحد 'Sunday morning', صديقة أختي 'my sister's friend' (S284), كرة القدم 'the football' (S221). English 's inverts the order and English 'of' preserves it. When matching an English possessive against an Arabic prompt, expect a bare two-noun sequence with no connecting word at all, and do not read the second noun as an unintroduced extra." },
    { id: 'baad-three-readings', rule: "بعد (197×) has three readings that must be kept apart: the preposition 'after' (بعد أن تنتهي 'after you finish' S11 — free, veridical), the NPI 'yet' under negation (لا أعرف بعد 'I don't know yet' S60 — licensed, see npiLicensing), and the first member of the compound بعد الظهر 'afternoon' (S35, S167, S179 — lexical, and the noun الظهر is introduced vocabulary in its own right). Judge by environment; do not let the 'afternoon' reading license an NPI, and do not flag the preposition as an unlicensed NPI." },
    { id: 'ala-ali-orthographic-tangle', rule: "على 'on/upon' (126×) and علي (14×) are entangled three ways: على is the preposition; علي is 'on me / I have to' (عليه 'on him', عليك 'on you'); and علي is ALSO a common misspelling of على, since final alef maqṣūra ى is routinely written as yāʾ ي. The estate does not normalise ى→ي, so the two spellings are distinct tokens. Treat all of these as one free prepositional lemma and take the person from the English gloss; do not raise a vocabulary finding on the spelling variant. The same alternation affects تري/ترى and أبدأ/أبدا." },
    { id: 'hamza-spelling-variance', rule: "The corpus is orthographically inconsistent about hamza seats: أن/إن (2,516 / 19), أنه/إنه (130 / 29), أنني/إنني (108 / 28), أنها/إنها (10 / 9), أنهم/إنهم (16 / 15), أسأل/اسأل, أنتظر/انتظر, أكتشف/اكتشف, آخذ/أخذ, بدأ/بدا. Fourteen such variant groups exist across 1,223 token types. Normalization does not fold أ/إ/آ/ا onto one another, so each spelling is a separate token to the tokenizer. Treat hamza-variant spellings of the same word as ONE introduced lemma; never report the variant as unintroduced vocabulary, and never treat the pair as a ZUT collision." },
    { id: 'existential-hunaak', rule: "Existential 'there is / there are' is هناك (84×, S131 هناك أفكار كثيرة جداً 'there are too many ideas'), which is the same word as the locative adverb 'over there'. Its minimal pair هنا 'here' (91×) differs by a single final ك — which is also the 2sg enclitic, so the stemmer folds هناك onto هنا. Both are in freeClass so exact match fires first, but if a prompt's meaning turns on here-vs-there the agent must read the letter, not the stem. English 'there is/are' has no verb here; do not expect a copula." },
    { id: 'ma-is-never-negation-here', rule: "ما (386×) is exclusively the interrogative and relative 'what' in this corpus — ما أقصده 'what I mean' (S8), ما هي الإجابة 'what the answer is' (S17), بكل ما أستطيع 'as hard as I can' (S7), and the indefinite-forming ما in شخص ما 'someone'. Classical Arabic's negative ما does NOT occur, and neither does غير nor بدون as a negator. Do not read ما as negation, and do not treat a ما-clause as an NPI-licensing environment on negation grounds (a wh-question environment licenses it, on other grounds)." },
    { id: 'indefinite-someone-something', rule: "The positive existential 'someone / something' is the BARE indefinite — شيء / شيئاً 'something' (S4, S111 عندما نتعلم شيئاً جديداً 'when we learn something new'), شخص / شخصاً 'someone' (S5 مع شخص آخر 'with someone else', S234 قابلت شخصاً 'I met someone'), optionally with ما. The أي-marked forms أي شيء / أي مكان and أحداً are the ANY-forms and require a licensor. Rendering 'something' as أي شيء in a positive declarative, or 'anything' as bare شيئاً under a licensor, are both errors — the first is the NPI violation the gate exists to catch, the second is a rendering weakness." },
  ],
};

// _lang_kor — LANGUAGE-LEVEL known-side BRIEF for kor-known courses. FIRST PASS (2026-08-17), ratified:null.
// The KNOWN/prompt language is Korean; the target is whatever the course teaches.
//
// DIALECT: this is an AGENT BRIEF, not a mechanical contract. It uses
// freeClass / npi / npiLicensing / negation / knownConstructions[{id,marker,description}] /
// glossRules and NO freeGlue, negationMarkers or constructions[{id,test}], so
// isMechanicalContract() returns false and every finding is routed to ADVISORY. Deliberate
// (Kai's ruling, 2026-08-17): against an agglutinative language an exact-form matcher is
// TRIAGE — it reports a list for a human or an agent to adjudicate, it never fails a build.
//
// ── CALIBRATION ─────────────────────────────────────────────────────────────
// Tokenised with this gate's own tokenizeKnown + stemKnownGloss over the ONE kor-known course
// that exists: eng_for_kor.
// 546 course_legos rows → 1,106 tokens / 643 types.
// 5,408 course_practice_phrases rows → 22,382 tokens / 1,505 types.
// EXPLICIT GAP: 1,505 types from 22,382 tokens is a type/token ratio of 1 in 15 — for
// comparison, jpn-known is 1 in 194 and zho-known 1 in 91. That ratio is not a property of
// Korean vocabulary; it is the agglutination showing up as type inflation (see below). It also
// means this free class is calibrated on a SINGLE course with a single author's style. When a
// second kor-known course lands, the free class should be re-derived, not assumed.
//
// ── TYPOLOGICAL PROFILE, and what it does to exact-form matching ────────────
// Korean is head-final, agglutinative, pro-drop, and its grammar lives almost entirely in
// BOUND SUFFIXES: case and information-structure particles on nouns (은/는 topic, 이/가
// nominative, 을/를 accusative, 에/에게 dative, 와/과/하고 comitative, 의 genitive, 도 'also',
// 만 'only', 부터/까지 'from/to'), and a stacked chain of suffixes on the verb carrying
// honorification, tense, aspect, modality, polarity, speech level and clause type:
//   말하다 → 말하고 싶어요 → 말하고 싶지 않아요 → 말하고 싶었어요
//   ("to speak" → "I want to speak" → "I don't want to speak" → "I wanted to speak")
// The dictionary form 말하다 is essentially NEVER what appears in a prompt.
//
// The consequence for an EXACT-FORM matcher is severe and is visible directly in the corpus
// frequency list. The bound noun 것 ("thing/fact", the general nominaliser) appears as FIVE
// distinct tokens because five different particles attach to it:
//   것 99 · 것을 315 · 것이 153 · 것은 67 · 것에 56 · 것보다 27
// The same happens to every pronoun (저 37 · 저는 1,294 · 제가 83 · 저를 41 · 저에게 51 ·
// 저와 26 · 제 112), every noun (시간 26 · 시간을 65 · 시간이 59 · 시간에), and every verb
// (싶어요 646 · 싶지 145 · 싶었어요 114 · 싶어해요 81 · 싶어하지 29 · 싶다고 26 · 싶었던 26).
// stemKnownGloss does no stemming by design (Tom, 2026-06-15) and there is no honest crude
// strip for Korean either: the suffix chain is ordered and the stem itself undergoes
// irregular alternation (ㅂ/ㄷ/ㅅ/르 irregulars, vowel harmony in 아/어). So an inflected use of
// an introduced word is, to this matcher, indistinguishable from a brand-new word — and that
// is the dominant content of any raw finding count on a kor-known course.
//
// ── TOKENIZATION STRATEGY (required statement) ──────────────────────────────
// Korean is the exception among the three CJK known languages: it HAS word spaces, and Hangul
// (U+AC00–U+D7AF) is deliberately NOT in SCRIPTLESS_RE. So Korean does NOT go through
// Intl.Segmenter at all — it takes tokenizeKnown's other branch, `t.split(/[^\p{L}\p{M}']+/u)`,
// which splits on spaces and punctuation. Verified empirically on real corpus prompts:
//   저는 영어를 말하고 싶어요            → 저는 | 영어를 | 말하고 | 싶어요
//   당신이 무엇을 말하고 싶은지 알고 싶어요 → 당신이 | 무엇을 | 말하고 | 싶은지 | 알고 | 싶어요
//   하지만 저는 말하는 것을 멈추고 싶지 않아요 → 하지만 | 저는 | 말하는 | 것을 | 멈추고 | 싶지 | 않아요
// The unit produced is the EOJEOL (the orthographic word: stem + all its bound particles and
// endings), not the morpheme. This is a clean, correct, deterministic split — there are no
// garbage segments the way there are for Japanese, and no greedy bigram merges the way there
// are for Chinese. Korean's tokenisation is the most trustworthy of the three.
//
// But it is also the one where exact-form matching helps least, and the two facts are the same
// fact. Because the token is the eojeol, the particle is INSIDE the token: 것 and 것을 are two
// unrelated strings to this matcher, and a course that introduces the LEGO 것 has given the
// learner nothing the matcher can use when the prompt says 것을. The crucial consequence still
// holds — the introduced-gloss inventory is tokenised by the SAME function, so prompt and
// inventory compare like for like — but "like for like" here means eojeol-against-eojeol, so
// a match requires the prompt to reuse the exact particle-marked form the LEGO introduced.
// Bluntly: for 은/는/이/가/을/를/에/에게/와/과/의/도/만, exact-form matching CANNOT see that
// 저는 and 저를 are the same word, and it cannot see that 싶어요 and 싶었어요 are the same verb.
// The free class below compensates for the closed classes (every particle-bearing form of every
// pronoun, demonstrative and bound noun is enumerated explicitly, which is why it is long),
// but nothing compensates for content words: every content noun and verb in a kor-known course
// will flag once per particle/ending it ever appears with.
//
// ── HONESTY: what I left out, and why ──────────────────────────────────────
// (1) I did NOT enumerate inflected forms of content words into the free class. It would have
//     driven the finding count down and meant nothing.
// (2) The auxiliary/copular verbs 있어요 (391), 없어요 (83), 해요 (240), 거예요 (274), 않아요
//     (269), 같아요 (72), 돼요, 아니에요 ARE listed free, because in this corpus they are almost
//     entirely grammatical machinery (-ㄹ 수 있어요 'can', -ㄹ 거예요 future, -지 않아요 negation,
//     -것 같아요 'seems'). That is a deliberate loss: a prompt that genuinely means "there is" or
//     "I do it" as new lexical content will not be caught. Their -ㅆ- past and -지 forms are
//     listed too, for the same reason.
// (3) Tokens I could NOT confidently classify and therefore left OUT: 한 (108 — both the
//     adnominal of 하다 'done', the numeral 'one', and the second half of 가능한 한 'as … as
//     possible'), 데 (39 — bound noun 'place/case' and the -는데 connective), 든 (35 — part of
//     -든지 'whether' and of 어떻든), 지 (the -는지 complementiser vs the -지 negation base vs the
//     bound noun 'since'), 이 (29 — the nominative particle standing alone, the demonstrative
//     'this', and the bound noun 'tooth'), and 말 / 일 / 것 in their genuinely lexical uses
//     ('word/speech', 'work/matter', 'thing'). Korean's homography across morpheme boundaries is
//     exactly what a whitespace tokeniser cannot resolve, and guessing would hide real findings.
// (4) EXPLICIT DEFECT, out of scope for this file but found while calibrating: 39 of
//     eng_for_kor's 5,408 practice-phrase rows (0.7%, spread over 11 seeds between S40 and
//     S300) have NO Hangul at all — known_text is byte-identical to the English target_text
//     ("I want to go to the party with my friends"). Those rows are untranslated, not merely
//     unmatched. The gate will report them as a wall of English "unknown gloss" findings on a
//     Korean course; that is the tokeniser telling the truth about a content defect, and it
//     should be escalated rather than adjudicated away. All 546 lego rows are clean.
module.exports = {
  course_code: '_lang_kor',
  ratified: null,
  known_lang: 'kor',
  known_lang_name: 'Korean',

  // Free class — Korean function words. Because the tokeniser produces EOJEOL, every closed-class
  // item must be listed in each particle-marked form it actually takes in the corpus; that is
  // why the pronoun block is long. Corpus-derived from eng_for_kor's top ~250 types.
  freeClass: [
    // 1st person (저 humble / 나 plain) with case particles
    '저', '저는', '저도', '제', '제가', '저를', '저에게', '저와', '저의', '저한테',
    '나', '나는', '내', '내가', '나를', '나에게',
    '우리', '우리는', '우리가', '우리를', '우리의', '우리에게',
    // 2nd person
    '당신', '당신은', '당신이', '당신을', '당신에게', '당신과', '당신의', '당신도', '너', '너는', '네',
    // 3rd person
    '그', '그는', '그가', '그를', '그에게', '그의', '그와',
    '그녀', '그녀는', '그녀가', '그녀를', '그녀에게', '그녀의',
    '그들', '그들은', '그들이', '그들을', '그들에게',
    // demonstratives / inanimate pronouns
    '그것', '그것이', '그것을', '그것은', '그것에', '그것도',
    '이것', '이것이', '이것을', '이것은', '저것', '이런', '그런', '저런', '이렇게', '그렇게',
    // wh-words
    '무엇', '무엇을', '무엇이', '무슨', '누가', '누구', '누구를', '어디', '어디에', '어디에서',
    '언제', '왜', '어떻게', '얼마나', '어떤', '몇',
    // bound nouns and their case forms (the 것 paradigm is the clearest case of type inflation)
    '것', '것을', '것이', '것은', '것에', '것보다', '것으로', '것도',
    '수', '때', '때에', '적', '줄', '뿐', '만큼', '대로', '중',
    // temporal / relational postpositional nouns
    '전에', '후에', '동안', '때문에', '대해', '대한', '위해', '위한', '부터', '까지', '보다',
    // conjunctions / connectives
    '그리고', '하지만', '그래서', '그런데', '왜냐하면', '또', '또는', '만약', '그러면', '그래도', '및',
    // degree / frequency / quantity adverbs
    '더', '너무', '아주', '정말', '잘', '많이', '조금', '별로', '아직', '이미', '곧', '다시',
    '함께', '같이', '모든', '다른', '다음', '가장', '충분히', '자주', '빨리', '항상', '거의', '좀',
    // auxiliary / copular machinery (see honesty note 2)
    '있어요', '있었어요', '있으면', '있을', '있는', '있고', '있지',
    '없어요', '없었어요', '없을', '없는', '없이',
    '해요', '했어요', '하고', '하는', '한다', '할', '하지', '해야', '해서',
    '거예요', '거라고', '겁니다',
    '않아요', '않았어요', '않을', '않는', '않다고', '않고', '않지',
    '같아요', '같은', '돼요', '됐어요', '될', '되는', '아니에요', '아니라', '입니다', '예요', '이에요',
  ],

  // NPI / negative-polarity items + WHEN they are licensed.
  npi: ['아무도', '아무것도', '아무', '아무나', '아무데도', '전혀', '절대', '결코', '별로', '하나도', '밖에', '조금도'],
  npiLicensing: {
    rule: "Korean NPIs are the 아무- series (아무도 'anyone/no one', 아무것도 'anything/nothing', 아무데도 'anywhere') plus the scalar adverbs 전혀/절대/결코/하나도/조금도 ('at all / ever / never') and the exceptive particle 밖에. All of them require a negative licenser and are ungrammatical in a plain positive declarative — Korean has strict NEGATIVE CONCORD, so 아무도 몰라요 is literally 'no-one doesn't know' and the negation is obligatory, not optional. The licenser is almost always BOUND: the long-form negation -지 않다, the short-form 안 before the verb, the potential-negative 못 ('can't'), the existential 없다, or the copular 아니다. So negation must be detected by SUBSTRING over the prompt, never by a word-boundary regex and never by a token test: 말하고 싶지 않아요 carries its negation split across two eojeol (싶지 + 않아요), and 없어요 carries it inside one. The negation list below therefore includes the bare stems 않 / 못 / 없 / 아니 as well as the inflected forms, so any member of the paradigm is caught. TWO CAUTIONS. (1) 별로 ('(not) particularly') is listed as an NPI and is correct — it is genuinely negative-requiring — but it appears 36 times in eng_for_kor and its licenser is sometimes several eojeol away; read the clause. (2) The free-choice counterpart of the 아무- series is the 어떤/무슨 + 이든지 pattern and the plain indefinite reading of 뭐/누구 ('something/someone'), which ARE correct in positive declaratives (무언가를 말하는 법 'how to say something') and must never be flagged.",
    licensedIn: [
      "Long-form negation -지 않다 (말하고 싶지 않아요 'I don't want to speak') and its past -지 않았어요",
      "Short-form negation 안 before the verb (안 해요)",
      "Potential negation 못 / -지 못하다 ('can't', 못했어요)",
      "Existential negation 없다 ('there isn't / doesn't have', 없어요/없었어요/없을)",
      "Copular negation 아니다 (아니에요 'is not')",
      "Prohibitive -지 마세요 ('don't …')",
      "Yes/no and wh-questions (-요? / -까? / -나요? / -는지) — non-assertive context",
      "Conditional clauses -(으)면 / -(으)ㄹ 때 / 만약 …면 ('if / when', 있으면)",
      "Desiderative -고 싶다 and 원하다 ('want') — free-choice reading",
      "Comparatives with -보다 ('than', 것보다) and superlative 가장",
      "Restrictive focus -만 ('only'), -밖에 …없다 ('nothing but'), and -기 전에 ('before') clauses",
      "Epistemic hedges -것 같아요 ('seems'), -(으)ㄹ지 모르겠어요 ('not sure whether') — the latter is itself negated",
    ],
  },

  // Negation markers — bare bound stems FIRST, so the brief contract's substring test catches the
  // whole paradigm (않아요/않았어요/않을/않는/않고, 못해요/못했어요, 없어요/없었어요/없을).
  negation: ['않', '못', '없', '아니', '말고', '않아요', '않았어요', '않지', '없어요', '없었어요', '아니에요', '못했어요', '안 '],

  // Korean machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'case_particles', marker: '은/는 · 이/가 · 을/를 · 에/에게 · 와/과/하고 · 의 · 도 · 만', description: "Grammatical relations are BOUND particles suffixed to the noun, allomorphically selected by whether the noun ends in a consonant or a vowel (저는/그는 but 그것은; 것을 but 저를). Topic 은/는, nominative 이/가, accusative 을/를, dative/locative 에/에게/한테, comitative 와/과/하고, genitive 의, additive 도 'also', restrictive 만 'only'. English a/the/to/at/with/of/also/only correspond to these suffixes — they are free on the known side and need no separate introduced gloss. Because the particle is inside the token, this is also the single largest source of exact-form mismatches: 것/것을/것이/것은/것에/것보다 are six tokens for one noun. Licensed as a block from S1." },
    { id: 'topic_vs_nominative', marker: '은/는 vs 이/가', description: "은/는 marks topic and contrast; 이/가 marks a (new or focused) subject. English marks neither, so 저는 말하고 싶어요 and 제가 말하고 싶어요 both render 'I want to speak'. Known-side-only: never invent an English contrast, and never treat a 은/는 ↔ 이/가 alternation as a ZUT collision." },
    { id: 'pro_drop', marker: '(zero subject)', description: "Subjects and objects recoverable from context are simply absent: 말하고 싶어요 alone is 'I want to speak' (eng_for_kor S1 build). The English gloss therefore contains pronouns the Korean prompt does not; the gate must not expect one Korean token per English pronoun." },
    { id: 'speech_level_haeyo', marker: '-요 / -습니다', description: "Politeness is grammaticalised in the verb ending: the 해요-form (polite informal, which this course uses throughout), the 합니다-form (formal), and the 해체 plain form. One English rendering covers all three registers (ZUT many-Korean→one-English). 말해요 and 말합니다 and 말해 are all 'speak'. Licensed at S1." },
    { id: 'honorific_si', marker: '-(으)시-', description: "Subject honorification is an infix on the verb (하시다, 말씀하시다) with suppletive honorific vocabulary (있다→계시다, 먹다→드시다) and honorific particles (께서, 께). English has no equivalent at all, so an honorific and a plain form gloss identically. Licensed at its first carrier." },
    { id: 'humble_first_person', marker: '저 vs 나', description: "First person splits by register: humble 저/제 (used throughout this course) vs plain 나/내. Both render English 'I'. Many-Korean→one-English; keep the carriers distinct but do not invent an English contrast." },
    { id: 'desiderative_go_sipda', marker: '-고 싶다 / -고 싶어하다', description: "'want to V' is -고 싶다 (말하고 싶어요), and it is RESTRICTED TO THE SPEAKER: third-person desire must use -고 싶어하다 (그녀는 알고 싶어해요 'she wants to find out', S17). English 'want' has no such person restriction, so one English form maps to two Korean constructions selected by the subject — a genuine known-side grammatical constraint the gate cannot see. Note the construction spans TWO eojeol, so it can never match a single introduced token." },
    { id: 'potential_l_su_itda', marker: '-(으)ㄹ 수 있다 / 없다', description: "'can / be able to' is the three-part pattern -(으)ㄹ 수 있어요, negated -(으)ㄹ 수 없어요, with 못 as the alternative negative. It appears in the corpus as an adnominal verb form + 수 (355 occurrences) + 있어요/없어요 — three tokens for one English modal, so it is machinery to license, never vocabulary to tile." },
    { id: 'future_l_geoyeyo', marker: '-(으)ㄹ 거예요', description: "Future/intention is the adnominal -(으)ㄹ plus the bound noun 거 plus the copula (할 거예요 'I'm going to do', 274 occurrences). English will / be going to maps onto this two-eojeol pattern. Also -(으)ㄹ게요 for a speaker's commitment (물어볼게요 \"I'll ask him\")." },
    { id: 'past_tense_ss', marker: '-았/었-', description: "Past is the infix -았/었- inside the verb, selected by vowel harmony and fusing with the ending (했어요, 봤어요, 만났어요, 싶었어요, 시작했어요). It stacks with negation (않았어요) and with the desiderative (싶었어요). There is no auxiliary; each English past form maps to one fused Korean form." },
    { id: 'negation_long_and_short', marker: '-지 않다 / 안 / 못', description: "THREE negations with different scope and register: long-form -지 않다 (말하고 싶지 않아요), short-form 안 before the verb, and 못 for inability ('can't', not 'don't'). Plus the suppletive negatives 없다 (not 있다) and 아니다 (not 이다). English 'not' is one word; Korean chooses among five patterns, and all of them are bound or clitic — there is no free 'not' to match." },
    { id: 'progressive_go_itda', marker: '-고 있다', description: "Progressive is -고 있어요 (이야기하고 있어요 'is talking'), and resultative state is -아/어 있다. English -ing also covers habitual and near-future readings that Korean renders with the plain present instead, so -ing and -고 있다 are not in one-to-one correspondence." },
    { id: 'obligation_and_permission', marker: '-아/어야 하다 · -아도 되다 · -(으)면 안 되다', description: "Deontic modality is periphrastic and multi-eojeol: -아/어야 해요/돼요 ('must/have to', 일해야 해요), -아/어도 돼요 ('may'), -(으)면 안 돼요 ('mustn't'), -는 게 좋겠어요 ('had better'). Each English modal maps to a whole pattern, so it can never match token-for-token. License the pattern at its carrier." },
    { id: 'adnominal_endings', marker: '-는 / -(으)ㄴ / -(으)ㄹ / -던', description: "Korean relative clauses PRECEDE the noun and the verb takes an adnominal ending that also marks tense: -는 (present, 말하는 것), -(으)ㄴ (past, 말한), -(으)ㄹ (prospective, 말할), -던 (retrospective, 이야기하던). English postposes its relative clause and uses who/which/that. One Korean verb yields four adnominal forms, all distinct tokens to this matcher." },
    { id: 'nominalizers', marker: '-는 것 / -기 / -(으)ㅁ / -지', description: "Clauses become noun phrases with -는 것 (말하는 것을 'speaking', + case particle), -기 (배우기, 말하기), or -(으)ㅁ; the complementiser -는지/-(으)ㄹ지 introduces embedded questions (있을지, 말하는지, 대답할지). This is how English gerunds, that-clauses and whether-clauses are rendered — always as a bound ending, never as a separate 'that'/'whether' word." },
    { id: 'connective_endings', marker: '-고 · -지만 · -(으)면 · -아서/어서 · -(으)려고 · -는데', description: "Clause linkage is a SUFFIX on the non-final verb, not a conjunction between clauses: -고 'and', -지만 'but', -(으)면 'if', -아서/어서 'so/because', -(으)려고 'in order to' (설명하려고), -(으)ㄹ 때 'when', -는데 'and/but (background)'. The free words 그리고/하지만/그래서 exist too and are in the free class, but most linkage in this corpus is suffixal and has no English word opposite it." },
    { id: 'benefactive_and_auxiliary_verbs', marker: '-아/어 주다 · -아/어 보다 · -아/어 버리다', description: "A second verb attaches to the -아/어 form of the main verb to add benefaction ('do for someone', 도와줄, 말해줄), attempt ('try V-ing', 물어볼게요), or completion. English uses 'for me', 'try to' or nothing. Two eojeol per English phrase; license the pattern." },
    { id: 'no_plural_no_articles', marker: '-들 (optional)', description: "Korean marks neither definiteness nor obligatory number: 사람 is 'a person', 'the person' or 'people', and -들 is optional and largely human-restricted (사람들, 그들). English a/an/the/-s have no Korean token to tile against." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'speechLevelCollapse', rule: "해요-form, 합니다-form and plain form are ONE English rendering. 말해요 / 말합니다 / 말해 all gloss 'speak'; the -요 politeness ending is invisible in English. Many-Korean→one-English is ZUT-legal and must never be reported as a collision, nor split into two English forms." },
    { id: 'humbleAndHonorificCollapse', rule: "저/제 (humble 'I') and 나/내 (plain 'I') both render 'I'; an honorific -(으)시- verb and its plain counterpart both render the same English verb; 당신/너 both render 'you'. These are register features carried by the prompt, not English distinctions. (Note that 당신 as a literal 'you' is stylistically marked in real Korean — its use throughout this course is a pedagogical choice, not idiomatic register, and is worth revisiting at ratification.)" },
    { id: 'particleIsInsideTheToken', rule: "ADJUDICATION RULE, not a language rule. Because the tokeniser produces eojeol, a finding on a form that differs from an introduced LEGO only by a case particle (것 vs 것을 vs 것이; 시간 vs 시간을 vs 시간이; 저 vs 저는 vs 저를) is a MORPHOLOGY artefact, not untaught vocabulary. Strip the trailing 은/는/이/가/을/를/에/에게/와/과/의/도/만/부터/까지/보다 and re-check the bare stem against the inventory before recording the finding as real." },
    { id: 'verbEndingIsInsideTheToken', rule: "ADJUDICATION RULE. The same applies to verbs, and more severely, because the ending carries tense, polarity, honorification and clause type at once: 싶어요 / 싶지 / 싶었어요 / 싶어해요 / 싶어하지 / 싶다고 / 싶었던 are seven tokens for one verb. A finding whose token shares a stem with an introduced verb but differs in ending is morphology. Note the stem itself alternates irregularly (ㅂ/ㄷ/ㅅ/르 irregulars, 아/어 harmony), so a naive prefix comparison will both over- and under-match — read the prompt." },
    { id: 'tenseAndModalityAreMultiEojeol', rule: "English tense and modality are rendered by multi-eojeol Korean patterns (-(으)ㄹ 수 있어요 'can', -(으)ㄹ 거예요 'will', -아/어야 해요 'must', -고 있어요 '-ing', -고 싶어요 'want to'). A single introduced gloss can therefore NEVER match a modal prompt token-for-token. Do not tile English auxiliaries against Korean tokens in either direction." },
    { id: 'negationIsBound', rule: "Negation is bound or clitic (-지 않다, 안, 못) or suppletive (없다, 아니다) — there is no free 'not'. The negation cue for the NPI gate is a SUBSTRING of the prompt, and it may straddle two eojeol (싶지 않아요). A word-boundary regex or a token-set test will report a negated Korean clause as positive and then falsely flag its NPIs." },
    { id: 'thirdPersonDesiderative', rule: "One English 'want' maps to -고 싶다 for a first-person subject and -고 싶어하다 for a third-person subject. This is a grammatical constraint on the KNOWN side with no English counterpart: a prompt that uses 싶어요 with a 그/그녀 subject is a real Korean error, and a prompt that uses 싶어해요 with 저 is too. Neither is a vocabulary breach, and neither is visible to the exact-form matcher — flag them at authoring." },
    { id: 'proDropPronounAsymmetry', rule: "The Korean prompt routinely omits the pronoun the English gloss requires, and an explicit 저는/당신은 is often topic-marking or contrast that English does not express. Never count English pronouns against Korean tokens in either direction." },
    { id: 'amuSeriesPolarity', rule: "아무도/아무것도 ('anyone/anything') REQUIRE negation — Korean has strict negative concord — while 무언가/누군가 and the plain indefinite readings of 뭐/누구 ('something/someone') are correct in positive declaratives. One English 'anything' therefore corresponds to either, chosen by polarity. A rendering rule, not a collision." },
    { id: 'englishLeakIsADefect', rule: "A kor-known prompt containing NO Hangul is not a vocabulary finding to be adjudicated — it is untranslated known_text (39 such rows in eng_for_kor, 11 seeds between S40 and S300, known_text byte-identical to the English target). Escalate as a content defect; do not waive, and do not add English words to the free class to silence it." },
  ],
};

// _lang_zho — LANGUAGE-LEVEL known-side BRIEF for zho-known courses. FIRST PASS (2026-08-17), ratified:null.
// The KNOWN/prompt language is Mandarin Chinese; the target is whatever the course teaches.
//
// DIALECT: this is an AGENT BRIEF, not a mechanical contract. It uses
// freeClass / npi / npiLicensing / negation / knownConstructions[{id,marker,description}] /
// glossRules and NO freeGlue, negationMarkers or constructions[{id,test}], so
// isMechanicalContract() returns false and every finding is routed to ADVISORY.
// That is deliberate (Kai's ruling, 2026-08-17): an exact-form matcher over a language whose
// words are cut by a statistical segmenter is TRIAGE — it reports a list, it never fails a build.
// NOTE the neighbour file zho_for_eng.contract.cjs is a MECHANICAL contract; it is not this
// language's contract at all — there the known language is ENGLISH and the target is Chinese.
// This file is the mirror image: Chinese on the KNOWN side.
//
// ── CALIBRATION ─────────────────────────────────────────────────────────────
// Tokenised with this gate's own tokenizeKnown + stemKnownGloss over all five zho-known
// courses that hold content: fra_for_zho, spa_for_zho, eng_for_zho, deu_for_zho, ita_for_zho.
// (Six further zho-known course codes exist — por_for_zho, jpn_for_zho, kor_for_zho,
// ara_for_zho and the regional variants — and hold ZERO lego rows today; nothing in this
// contract is calibrated on them.)
// 3,094 course_legos rows → 5,634 tokens / 721 types.
// 26,070 course_practice_phrases rows → 114,796 tokens / 1,257 types.
// The free class is the function-word layer of the top ~250 types of that combined count.
//
// ── TYPOLOGICAL PROFILE, and what it does to exact-form matching ────────────
// Mandarin is analytic and isolating: there is NO inflection at all. No tense, no agreement,
// no case, no plural on nouns, no verb conjugation. In that one respect it is the FRIENDLIEST
// known language this gate has: a word introduced as 说 appears in every later prompt as 说,
// so exact-form matching is not defeated by morphology the way Japanese, Korean or Tamil
// defeat it. Grammatical work is done instead by (a) free particles — aspectual 了/过/着,
// structural 的/得/地, modal-final 吗/呢/吧 — (b) word order, and (c) coverbs (把/被/给/跟/对).
// What DOES defeat exact-form matching in Chinese is not morphology but TOKENIZATION, below.
//
// ── TOKENIZATION STRATEGY (required statement) ──────────────────────────────
// Chinese has no word spaces. SCRIPTLESS_RE matches CJK ideographs, so Chinese prompts are
// routed through Intl.Segmenter; segmenterFor() finds no kana/Thai/Lao/Khmer/Burmese and
// therefore selects the **'zh'** segmenter, which cuts the string with ICU's Chinese
// dictionary. Without that routing, splitting on non-letters would return the whole sentence
// as ONE token and every prompt would produce exactly one bogus "unknown gloss <sentence>".
//
// The CRUCIAL consequence, and the reason this works at all: the introduced-gloss inventory
// is tokenised by the SAME function. Whatever ICU decides a word is, it decides identically
// on both sides, so prompt and inventory always compare like for like. A LEGO 说话 yields the
// inventory token 说话 and matches a prompt token 说话.
//
// Where it is COARSE OR WRONG — measured on real corpus strings, printed and judged:
//   我想说       → 我想 | 说         ← pronoun and verb MERGED into one token
//   我不想说     → 我不 | 想说
//   我在努力     → 我在 | 努力
//   你有时间吗   → 你有 | 时间 | 吗
//   我知道那是什么 → 我知道 | 那是 | 什么
//   他说得很好   → 他 | 说得 | 很好
//   我看了那个电影 → 我 | 看了 | 那个 | 电影
//   我们应该开始了 → 我们 | 应该 | 开始 | 了
//   没有人知道   → 没有 | 人 | 知道
//   你为什么不试试 → 你 | 为什么 | 不 | 试 | 试
// ICU's Chinese dictionary contains high-frequency BIGRAMS — 我想, 你想, 他想, 她想, 我在,
// 你在, 我不, 我要, 我能, 我知道, 不想, 不知道, 那是, 好了, 看了, 做了, 说的, 说得, 做得,
// 想说, 很好, 怎么说 — and greedily prefers them. It is INCONSISTENT: the very same 想 that
// merges in 我想 (2,213 occurrences) is a standalone token in 我们想停止说话 (eng_for_zho S19).
// The effect on finding counts is direct and large: a course introduces 想 as a LEGO, so the
// inventory holds 想; every prompt that says 我想 produces the token 我想, which matches
// nothing, and the gate reports "unknown gloss 我想". Summing the frequencies of this merged
// class in the phrase corpus gives on the order of 8,000 tokens — a substantial fraction of
// any raw finding count on a zho-known course is this artefact and nothing else.
//
// I did NOT paper over it by putting the merged bigrams in the free class. 我想 contains 想
// ("want"), a real content verb the course teaches and orders; declaring 我想 free would
// silently exempt "want" from the check entirely. Instead: merged forms whose parts are ALL
// already free (那是, 我不, 你不, 我在, 你在, 这是, 不是, 就是, 也是, 都是) ARE listed free,
// because nothing is lost; every other merged bigram is left to flag, and the adjudication
// rule `segmentationMergedBigrams` below tells the reader to split the token before judging.
// That keeps the noise visible and labelled rather than invisible.
//
// ── HONESTY: what is not covered ───────────────────────────────────────────
// Modals (会/能/可以/要/想/应该/必须) are in knownConstructions, NOT in freeClass, so they
// must still be introduced as glosses; that is intentional, since the many-to-one modal
// mapping is exactly what the known side has to get right. 很 IS free, because in Chinese it
// is a near-obligatory filler before a predicate adjective and is usually silent in English
// (他很好 = 'he is good', not 'he is very good') — treating it as content would generate
// findings for a word that carries no English meaning. Tokens I could not confidently
// classify and therefore left OUT of the free class: 事/事情 ('thing/matter'), 时候 ('time/
// when'), 样/一样 ('same/like'), 得 (structural complement marker, but also the verb 'must'
// děi and part of 觉得/记得 — homography this matcher cannot resolve), 儿 (144 occurrences,
// almost all the erhua suffix of 一点儿/那儿 but occasionally the noun '儿子'), 过 (aspect
// marker vs the verb 'to pass'), and 就/才/都/也 in their focus-adverb uses, which are
// genuine meaning-bearing operators in some prompts and pure glue in others.
module.exports = {
  course_code: '_lang_zho',
  ratified: null,
  known_lang: 'zho',
  known_lang_name: 'Mandarin Chinese',

  // Free class — Chinese particles, pronouns, demonstratives, wh-words, conjunctions,
  // classifiers and the all-free merged bigrams (see header). Corpus-derived.
  freeClass: [
    // structural / aspectual / modal-final particles
    '的', '了', '着', '地', '吗', '呢', '吧', '啊', '呀', '嘛', '的话',
    // copula, negation-as-glue, existentials
    '是', '不是', '就是', '也是', '都是', '这是', '那是', '有',
    // pronouns and their merged bigrams whose parts are all free
    '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '大家', '自己', '别人',
    '我的', '你的', '他的', '她的', '我们的', '我不', '你不', '我在', '你在', '他在',
    // demonstratives / determiners / classifiers
    '这', '那', '哪', '这个', '那个', '哪个', '这里', '那里', '哪里', '这些', '那些', '这样', '这么', '那么',
    '一', '一个', '个', '些', '一些', '几个', '件', '点', '一点', '每', '每个', '所有', '别的', '其他',
    // wh-words
    '什么', '谁', '怎么', '为什么', '什么时候', '哪儿', '多少', '怎么样',
    // prepositions / coverbs / connectives
    '在', '和', '跟', '与', '或', '或者', '但是', '但', '因为', '所以', '如果', '虽然', '而且',
    '给', '对', '从', '到', '向', '关于', '为', '比', '把', '被', '让', '被',
    // degree / scope adverbs that carry no English word
    '很', '太', '更', '最', '非常', '真的', '就', '也', '都', '还', '又', '再', '已经', '还是',
    // location / direction glue
    '上', '下', '里', '中', '外', '前', '后', '边',
  ],

  // NPI / negative-polarity items + WHEN they are licensed.
  npi: ['任何', '任何人', '任何东西', '从来', '根本', '一点也', '一点都', '什么都', '谁都', '哪儿都', '再也', '丝毫'],
  npiLicensing: {
    rule: "Mandarin NPIs fall into two shapes. (A) The 任何 series ('any/any person/anything') and the scalar/temporal adverbs 从来 ('ever'), 根本 ('at all'), 再也 ('any more'), 一点也/一点都 ('at all'), 丝毫 — these require a non-veridical licenser and are ungrammatical in a plain positive declarative. (B) The WH-WORD-AS-INDEFINITE construction: 什么, 谁, 哪儿 are simultaneously interrogatives and existential/universal indefinites, and which reading they get is determined ENTIRELY by the environment. 我想说什么 is 'I want to say something' (indefinite) while 你想说什么 is 'what do you want to say?' (interrogative), and 什么都不知道 is 'doesn't know anything' (universal, requires negation). This is a genuine three-way ambiguity that no exact-form matcher can resolve — the adjudicator must read the clause, not the token. The licenser is a free word (不, 没, 没有, 别, 吗, 如果, 想) rather than a suffix, so a substring test over the prompt is reliable here in a way it is not for Japanese or Korean; but note that the segmenter frequently merges the licenser into a bigram (我不, 不想, 不知道, 不是), so a token-level negation test will MISS negation that a substring test finds. checkKnownSide's substring test for brief contracts is therefore the correct one for Chinese, and a token-level rewrite would silently break it.",
    licensedIn: [
      "Verbal negation 不 (general/habitual/future) and 没 / 没有 (perfective/existential) — 我不想说什么, 没有人知道",
      "Prohibitive 别 / 不要 ('don't')",
      "Copular and existential negation 不是 / 没有",
      "Yes/no questions with the final particle 吗, and A-not-A questions (是不是, 想不想, 有没有)",
      "Wh-questions (non-assertive context) and the embedded 是否 / …不…",
      "Conditional clauses with 如果 / 要是 / 的话 (…的话 clause-final)",
      "Desiderative and volitional 想 / 要 / 希望 ('want/hope') — free-choice 'anything you want' reading",
      "Comparatives with 比 and superlatives with 最",
      "Restrictive focus 只 / 才 / 就 ('only/just') and 之前 / 以前 ('before') clauses",
      "Modal 能 / 可以 / 会 questions and the epistemic 可能 / 也许 ('maybe')",
    ],
  },

  // Negation markers. Bare 不 / 没 are listed so the brief contract's SUBSTRING test catches
  // negation even when the segmenter has buried it inside a merged bigram (我不, 不想, 不知道).
  negation: ['不', '没', '没有', '别', '不是', '不要', '不能', '不会', '不用', '无', '未', '非'],

  // Chinese machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'no_inflection', marker: '(zero morphology)', description: "Chinese verbs and nouns NEVER change form: 说 is 'say/says/said/saying/to say' in every prompt, 朋友 is 'friend' and 'friends'. This is the one place where the exact-form matcher is on solid ground, and it means any finding on a CONTENT word in a zho-known course is more likely to be real than the same finding in jpn or kor. Licensed from S1 as a property of the language." },
    { id: 'aspect_le', marker: '了', description: "了 is NOT a past-tense marker, and mapping it to English -ed is the single most common known-side error in Chinese. Verbal 了 marks a bounded/completed event; sentence-final 了 marks a change of state or new situation (我们应该开始了 'we should start now'). A past English sentence can have no 了 at all, and a 了 sentence can be present or future. License it as aspect machinery; never tile English past morphology against it." },
    { id: 'aspect_guo_zhe', marker: '过 / 着', description: "过 marks experiential aspect ('have ever V-ed'), 着 durative/stative ('V-ing, in the state of'). Both are bound to the verb and both are frequently merged with the verb by the segmenter (看了, 做了). English perfect and progressive map onto these plus context, not onto auxiliaries." },
    { id: 'modal_verbs', marker: '会 / 能 / 可以 / 要 / 想 / 应该 / 必须', description: "Modality is carried by preverbal modal VERBS, and the mapping to English is many-to-many, which is precisely why they are licensed constructions and not free glue: 会 = learned ability / future likelihood ('can (having learnt)', 'will'); 能 = circumstantial ability or possibility ('can, am able to'); 可以 = permission ('may/can'); 要 = want / must / be going to; 想 = want to / think; 应该 = should; 必须 = must. One English 'can' splits three ways on the known side, and one Chinese 会 splits two ways in English. Every modal must be licensed at its own debut so the split is taught, not leaked." },
    { id: 'ba_disposal', marker: '把', description: "The 把 construction fronts a definite object before the verb (把它给我 'give it to me'), obligatory with certain result-oriented predicates. It changes word order but adds no English word — English has no 把. Structural machinery licensed at its carrier." },
    { id: 'bei_passive', marker: '被 / 让 / 叫', description: "Passive is the coverb 被 (and colloquial 让/叫), with no change to the verb itself. English 'be V-ed' is two words against one Chinese coverb; and Chinese also uses notional (unmarked) passives where English requires 'be V-ed'. Licensed at its carrier." },
    { id: 'de_structural', marker: '的 / 得 / 地', description: "Three homophonous DE particles doing three different jobs: 的 links a modifier to a noun and also nominalises (我说的 'what I said'); 得 introduces a manner/degree complement after a verb (说得很好 'speaks well'); 地 turns a modifier into an adverbial. English uses word order, relative pronouns and -ly instead. 的 is free glue; 得 and 地 are licensed machinery because 得 is homographic with the modal děi 'must'." },
    { id: 'question_ma_and_a_not_a', marker: '吗 / A-not-A', description: "Yes/no questions are formed either by the final particle 吗 or by reduplicating the verb around 不 (是不是, 想不想, 有没有). Word order is unchanged and there is no do-support: English do/does/did are absorbed entirely. 呢 forms follow-up questions, 吧 softens to a suggestion or a supposition." },
    { id: 'wh_in_situ', marker: '什么 / 谁 / 哪里 / 怎么', description: "Wh-words stay IN SITU — 你想说什么 has the same word order as 我想说话. English fronts its wh-word, so the two prompts have systematically different orders, and the same Chinese wh-word doubles as an indefinite ('something/anyone') when not in a question. Licensed at the first wh prompt." },
    { id: 'coverbs', marker: '给 / 跟 / 对 / 从 / 在 / 用 / 比 / 关于', description: "What English calls prepositions are VERBS in Chinese, placed before the main verb (跟你说 'speak with you', 给我看 'show me', 用英语 'in English', 比 'than'). They are free at the token level but their word order is machinery: the coverb phrase precedes the verb, where English puts the preposition after it." },
    { id: 'resultative_directional_complements', marker: '完 / 到 / 好 / 得 / 来 / 去 / 回来', description: "A second verb or adjective attaches to the main verb to express result or direction: 说完 'finish speaking', 看到 'manage to see', 做好 'get done', 回来 'come back'. English uses separate verbs, particles or aspect for these, so one Chinese compound maps to a whole English verb phrase. License the pattern, don't tile it." },
    { id: 'classifiers', marker: '个 / 件 / 点 / 些', description: "A numeral or demonstrative requires a classifier before the noun (一个朋友, 那个东西, 一点时间). English a/an/the/some correspond to these classifier phrases, not to separate words, and the classifier is chosen by the noun. Free at the token level, licensed as a construction so the a/the mapping is understood." },
    { id: 'conditional_topic_comment', marker: '如果 … 就 / … 的话', description: "Conditionals are framed by 如果 / 要是 at the front, or the clause-final 的话, usually resumed by 就 in the main clause. More generally Chinese is topic-prominent: the topic is fronted and the comment follows, an order English often has to invert. Licensed at the first conditional carrier; also a key NPI licenser." },
    { id: 'comparative_bi', marker: '比 / 更 / 最', description: "Comparison is the coverb 比 with an uninflected adjective (我比你快 'I am faster than you'), plus 更 'more' and 最 'most'. English comparative/superlative morphology (-er/-est/more/most) has no Chinese counterpart to tile against." },
    { id: 'verb_reduplication', marker: '试试 / 看看', description: "Reduplicating a verb gives a tentative/brief 'have a go at V-ing' (你为什么不试试 'why don't you give it a try'). The segmenter cuts this as two identical tokens (试 | 试), so it looks like a stutter in the token list; it is one construction." },
    { id: 'shi_de_cleft', marker: '是 … 的', description: "是…的 focuses a circumstance of a completed event ('it was YESTERDAY that …'). English uses a cleft or simply stress. Licensed at its carrier; note that its 是 and 的 are individually free glue, so the construction is invisible at the token level and must be judged from the prompt." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'leIsNotPast', rule: "了 does not mean 'past'. Do not treat a 了 in the prompt as licensing English past morphology, and do not require a 了 in a prompt whose English gloss is past. The mapping is aspectual (boundedness / change of state), and one English past sentence may legitimately carry 了, 过 or nothing at all." },
    { id: 'noTenseNoNumberNoArticles', rule: "Chinese marks no tense, no agreement, no case, no articles, and (outside human 们) no plural. English a/an/the/-s/-ed/-ing/is/are have no Chinese token to tile against: they are free on the known side and must never require an introduced gloss. Conversely one Chinese form legitimately carries several English forms — many-English→one-Chinese is ZUT-legal and is not a collision." },
    { id: 'modalManyToMany', rule: "English 'can' splits into 会 (learned ability), 能 (circumstantial ability) and 可以 (permission); Chinese 会 splits into English 'can' and 'will'; 要 covers 'want', 'need to' and 'be going to'. Each Chinese modal is one carrier with several English renderings AND each English modal has several Chinese carriers. Keep the carriers distinct, license each at its own debut, and do not report the overlap as a ZUT collision." },
    { id: 'henIsSilent', rule: "很 before a predicate adjective is a near-obligatory link with no English content (他很好 = 'he is good'). Do not gloss it 'very' unless the prompt is genuinely emphatic, and do not expect an English word opposite it. It is free on the known side for exactly this reason." },
    { id: 'proDropAndZeroCopula', rule: "Subjects, objects and even the copula are omitted where recoverable (想说话 'want to speak'; 他很好, no 是). The Chinese prompt therefore has fewer tokens than its English gloss has words, systematically. Never count one against the other." },
    { id: 'segmentationMergedBigrams', rule: "ADJUDICATION RULE, not a language rule. ICU's Chinese dictionary merges high-frequency pronoun+verb and negation+verb bigrams into single tokens: 我想, 你想, 他想, 她想, 我要, 我能, 我在, 你在, 你有, 我知道, 不想, 不知道, 说的, 说得, 做得, 做了, 看了, 好了, 想说, 很好, 怎么说. A finding on any of these is almost always the artefact, not untaught vocabulary — split the token into its parts and re-check each part against the inventory before recording it as real. The merging is inconsistent (the same 想 is standalone elsewhere in the same course), so its absence proves nothing either." },
    { id: 'whInSituAmbiguity', rule: "什么/谁/哪里 are interrogative, existential ('something/someone') and universal ('anything/anyone', under negation) all at once, disambiguated only by the clause. One Chinese wh-word therefore maps to several English words; this is a rendering rule, not a collision, and an NPI verdict on 什么/谁 must be read from the clause rather than from the token." },
    { id: 'coverbOrderNotVocabulary', rule: "English prepositional phrases follow the verb; the Chinese coverb phrase precedes it (跟你说 vs 'speak with you'). When a prompt and its gloss differ only in this order, nothing is missing — do not look for an unintroduced word to explain the difference." },
    { id: 'annotationLeakCheck', rule: "FORWARD-LOOKING CHECK, currently clean. The jpn-known European-target courses have grammatical annotations leaking into learner-facing known_text (（三人称複数半過去）, （女性複数）and the like). The zho-known courses share that authoring lineage, so the same defect is plausible here — but it was CHECKED on 2026-08-17 and NOT found: no known_text row in any of the five zho-known courses contains a full-width or ASCII bracket at all. If one ever appears, or a prompt carries 单数/复数/阴性/阳性/不定式/人称 as a bare annotation, treat it as a content defect to escalate, not as vocabulary to waive." },
  ],
};

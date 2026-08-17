// _lang_jpn — LANGUAGE-LEVEL known-side BRIEF for jpn-known courses. FIRST PASS (2026-08-17), ratified:null.
// The KNOWN/prompt language is Japanese; the target is whatever the course teaches.
//
// DIALECT: this is an AGENT BRIEF, not a mechanical contract. It deliberately uses
// freeClass / npi / npiLicensing / negation / knownConstructions[{id,marker,description}] /
// glossRules and NO freeGlue, negationMarkers or constructions[{id,test}] — so
// isMechanicalContract() returns false and the gate routes every finding to ADVISORY.
// That is the point (Kai's ruling, 2026-08-17): for a language whose morphology the
// exact-form matcher cannot see, the matcher is TRIAGE — it produces a list a human or an
// agent adjudicates. It must never fail a build.
//
// ── CALIBRATION ─────────────────────────────────────────────────────────────
// Derived from the live corpus, not from intuition. Tokenised with this gate's own
// tokenizeKnown + stemKnownGloss over all eight jpn-known courses in the DB:
//   eng_for_jpn, fra_for_jpn, ita_for_jpn, por_for_jpn, deu_for_jpn, spa_for_jpn,
//   zho_for_jpn, cym_anthem_for_jpn.
// 4,749 course_legos rows  → 13,984 tokens / 1,133 types.
// 46,268 course_practice_phrases rows → 340,390 tokens / 1,753 types.
// The free class below is the function-word/bound-morpheme layer of the top ~250 types of
// that combined count, with every content word left out.
//
// ── TYPOLOGICAL PROFILE, and what it does to exact-form matching ────────────
// Japanese is head-final, agglutinative, pro-drop and (for the learner-facing purposes of
// this course estate) has no word spaces. Grammatical relations are free postposed
// particles (は が を に で と から より); tense, polarity, politeness, voice, desire and
// modality are STACKED SUFFIXES on a verb stem, applied in a fixed order, with regular
// stem alternation at each join:
//   話す → 話し|たい → 話し|たく|ありま|せん  ("speak" → "want to speak" → "don't want to speak")
//   行く → 行か|なかっ|た                      ("go" → "didn't go")
// The consequence for a matcher that compares EXACT FORMS is total: 話す (the form the
// course introduces as a LEGO) and 話し / 話せる / 話したい / 話しましょう are, to the
// matcher, unrelated strings. stemKnownGloss does no stemming by design (Tom, 2026-06-15 —
// an introduced form is usable only in the exact form introduced), and there is no honest
// crude suffix-strip for Japanese: the suffixes are stacked and the stem mutates, so a
// naive strip mis-segments more than it recovers. A very large share of any raw finding
// count on a jpn-known course is therefore MORPHOLOGY, not untaught vocabulary.
//
// ── TOKENIZATION STRATEGY (required statement) ──────────────────────────────
// Japanese has no word spaces, so splitting on non-letters would return the whole sentence
// as ONE token and the gate would emit exactly one bogus "unknown gloss <entire sentence>"
// per prompt. tokenizeKnown avoids that: SCRIPTLESS_RE matches kana/kanji, so Japanese
// prompts are routed through Intl.Segmenter. segmenterFor() picks the locale from the text
// — any kana in range U+3040–U+30FF selects the **'ja'** segmenter, so a normal Japanese
// prompt is segmented by ICU's Japanese dictionary. (A prompt of bare kanji with no kana at
// all would fall through to 'zh'; in this corpus that happens only for isolated one-kanji
// LEGO glosses, where the two segmenters agree anyway.)
//
// Segmentation is MORPHEME-ISH, not word-ish, and the CRUCIAL consequence is that this is
// fine: the introduced-gloss inventory is tokenised by the SAME function, so prompt and
// inventory are always cut on the same rule and compare like for like. A LEGO whose
// known_text is 話す yields the inventory token 話す; a prompt containing 話す matches it.
//
// Where it is COARSE OR WRONG — measured on real corpus strings, printed and judged:
//   話したい            → 話 | した | い          (masu-stem + たい split three ways; した is
//                                                  now homographic with the past of する)
//   話したくありません   → 話 | した | く | ありま | せん
//   行かなかった        → 行 | か | なか | っ | た
//   学ぼうとしています   → 学 | ぼう | として | い | ます  (と+して wrongly merged as the
//                                                  conjunction として "as")
//   わかりません        → わか | り | ま | せん
//   聞いたことがありますか → 聞 | いたこ | と | が | ありま | すか   ← "いたこ" and "すか" are
//                                                  GARBAGE segments; ICU has cut across a
//                                                  morpheme boundary and produced strings
//                                                  that are not morphemes of the sentence.
//   食べられるようになりたい → 食 | べ | られる | よう | に | なり | たい
// So: content stems survive as recognisable pieces (話, 学, 聞, 食), inflectional tails are
// shredded into one- and two-mora fragments, and a small number of segments are simply
// wrong. The effect on finding counts is that the raw count is inflated by (a) every
// inflected use of an introduced verb/adjective and (b) the fragment layer. The fragment
// layer is what freeClass below is mostly for: the frequent fragments are listed as free so
// they do not each generate a finding. This is a DELIBERATE loss of signal — see the
// honesty note below.
//
// ── HONESTY: what I put in freeClass that is arguably content ───────────────
// した, いる, ある, ます, です, する and their fragments (し, い, いま, ありま, せん, なり,
// なか, っ, て, れ …) are listed free. した is genuinely ambiguous: it is both the past of
// する ("did") and — far more often in this corpus — the segmenter's cut of a masu-stem +
// たい (話し|たい). At 7,320 occurrences in the phrase corpus it is the single most frequent
// non-particle token, and virtually all of them are the fragment. Listing it free means a
// prompt that really does introduce "did" early will NOT be caught. I accept that trade
// deliberately: leaving it out generates thousands of findings that are all noise and buries
// the real ones. An adjudicator working this list should treat the absence of した-findings
// as an unchecked area, not as a clean result.
//
// ── HONESTY: tokens I could NOT confidently classify, left OUT of freeClass ──
// 形 (132 lego occurrences), 過去 (60), 複数 (55), 一人称 (52), 三人称 (47), 接続 (42),
// 不定詞 (34), 人称 (23), 過去分詞 (21), 格 (19), 単数 (18), 副詞 (13) are NOT Japanese
// prompt language at all. They are GRAMMATICAL ANNOTATIONS baked into known_text in the six
// European-target courses — 〜したかった（三人称複数半過去）→ voulaient, どの（複数形）→ welche,
// 質問する（一人称現在）→ stelle, 私の（女性複数）→ as minhas. Same defect family as the
// parenthetical tags already known in tel/rus/nep. They are left out of freeClass on purpose:
// they SHOULD flag, because they are metadata leaking into learner-facing prompt text, and
// suppressing them would hide a real content defect behind a linguistics decision.
// Also left out, as genuinely content or under-determined: こと/もの (nominalisers, but also
// "thing"), とき/時 ("when/time"), ため ("for/because"), よう (both the "seems/like" pattern
// and part of ように/ようになる), そう, まま. These appear inside larger patterns that the
// knownConstructions below license per carrier; per-carrier licensing is the right home for
// them, not an always-free class.
module.exports = {
  course_code: '_lang_jpn',
  ratified: null,
  known_lang: 'jpn',
  known_lang_name: 'Japanese',

  // Free class — Japanese particles, copula/auxiliary morphology, pronouns, demonstratives,
  // wh-words, conjunctions, and the frequent SEGMENTER FRAGMENTS of the above (see header).
  // Corpus-derived from the top ~250 types across all eight jpn-known courses.
  freeClass: [
    // case / topic / focus / clause particles
    'は', 'が', 'を', 'に', 'で', 'と', 'へ', 'も', 'の', 'や', 'か', 'から', 'まで', 'より',
    'ね', 'よ', 'な', 'ば', 'ので', 'のに', 'けど', 'けれど', 'ながら', 'たら', 'なら', 'ても',
    'でも', 'だけ', 'ずつ', 'とか', 'など', 'ほど', 'ぐらい', 'くらい', 'では', 'には', 'とは',
    'って', 'んで', 'ん', 'ら', 'わ',
    // copula / politeness / auxiliary morphology
    'です', 'ですが', 'だ', 'ます', 'ません', 'ましょう', 'ました', 'ない', 'なかった', 'ず',
    'する', 'した', 'して', 'し', 'しま', 'しょう', 'しよう', 'しな', 'せん', 'せ', 'す',
    'いる', 'いま', 'いた', 'い', 'ある', 'ありま', 'あり', 'てい', 'て', 'た', 'っ', 'く',
    'け', 'き', 'り', 'れ', 'る', 'ろう', 'なり', 'なか', 'なる', 'み', 'え', 'べ', 'ぼう',
    'たい', 'たく', 'たか', 'いたい', 'できる', 'でき', 'ま',
    // pronouns / demonstratives / wh-words
    '私', '私たち', 'たち', 'あなた', '彼', '彼女', '彼ら', '君', '自分',
    'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'どの', 'ここ', 'そこ', 'どこ',
    '何', '誰', 'いつ', 'なぜ', 'どう', 'どうか', 'どんな',
    // conjunctions / connectives / postpositional phrases
    'そして', 'しかし', 'だから', 'また', 'として', 'について', 'ただ', 'ので',
    // degree / quantity adverbs that are never taught as vocabulary
    'とても', 'もっと', 'よく', 'すぎ', 'すぎる',
  ],

  // NPI / negative-concord items + WHEN they are licensed.
  // まだ and しか were in this list in the first draft and were REMOVED after the sweep proved
  // both wrong — see npiLicensing.rule, final paragraph. Do not re-add without re-measuring.
  npi: ['何も', '誰も', '誰にも', 'どこにも', '何にも', '全然', 'ちっとも', 'めったに', '一度も'],
  npiLicensing: {
    rule: "Japanese negative-polarity items are the WH-WORD + も series (何も 'anything/nothing', 誰も/誰にも 'anyone/no one', どこにも 'anywhere') plus the scalar/frequency adverbs 全然, あまり, ちっとも, めったに, 一度も and the exceptive particle しか. They are licensed ONLY in a non-veridical environment and are ungrammatical — or change meaning entirely — in a plain positive declarative. The licenser is almost always a BOUND NEGATIVE SUFFIX on the clause-final verb (ない / ません / なかった / なくて / ず), not a free 'not' word, so the check is a substring test on the prompt, never a word-boundary regex: 誰にも聞かせたくありません carries its licenser inside ありません. Two things must not be treated as violations. (1) The WH + か series (何か 'something', 誰か 'someone', どこか 'somewhere') is a free-choice/indefinite series, NOT an NPI — it is correct and expected in positive declaratives (何かを学ぼうとしています 'I'm trying to learn something', eng_for_jpn S4) and must never be flagged. (2) しか is exceptive and REQUIRES negation, so a しか with no negative tail is a genuine grammatical error and worth reporting, but しか inside a negated clause is correct. Note also that the segmenter usually cuts 何も as 何 | も, so the NPI is often not present as a single token at all — an adjudicator must read the prompt string, not only the token list. TWO ITEMS WERE REMOVED FROM THE NPI LIST AFTER MEASUREMENT, and the reasons generalise. (a) まだ ('still/yet') is polarity-CONDITIONED, not polarity-SENSITIVE: under negation it renders 'yet' (まだ準備ができていません 'not ready yet'), but in a positive declarative it is perfectly grammatical and renders 'still' — 先週たくさん学びましたが、まだ学ぶことがあります 'I learnt a lot last week, but there is still more to learn' (eng_for_jpn). Listing it as an NPI produced a wall of false 'NPI without negation' findings on correct prompts; the polarity split is now handled by the madaPolarityRendering gloss rule instead. (b) しか (exceptive, genuinely negation-requiring in real Japanese) had to be removed for a TOKENIZATION reason, not a grammatical one: the segmenter cuts ほしかった ('wanted (someone to)') as ほ | しか | った, so every past-tense use of ほしい produced a spurious しか token and a false NPI finding. The particle is real, but this matcher cannot tell it apart from a fragment of an unrelated word, so it is not checkable here. Adjudicators should still watch for a bare しか with no negative tail by reading the prompt.",
    licensedIn: [
      "Verbal negation — the bound suffixes ない / ません / なかった / ませんでした / なくて / ず, and adjectival くない / くありません (e.g. 話したくありません 'I don't want to speak'; わかりません 'I don't know')",
      "Existential negation ありません / いません / ない ('there isn't / doesn't have')",
      "Copular negation じゃない / ではない / じゃありません / ではありません",
      "Prohibitive and obligation-negation てはいけない / てはだめ / なくてもいい ('mustn't' / 'needn't')",
      "Yes/no questions formed with the sentence-final particle か (言えるかどうかわかりません; 〜ますか) and the embedded かどうか 'whether'",
      "Wh-questions (non-assertive context)",
      "Conditional / hypothetical clauses — たら, ば, なら, と ('if/when')",
      "Desiderative たい / ほしい and volitional よう/おう ('want to', 'let's') — free-choice reading",
      "Comparatives with より and superlative/scalar contexts",
      "Restrictive focus だけ, しか…ない, ばかり ('only/just')",
      "Epistemic hedges かもしれません, でしょう, と思います (non-veridical)",
    ],
  },

  // Negation markers. BOTH full forms and bare bound stems are listed: for a brief contract
  // checkKnownSide detects negation by SUBSTRING (`known.includes(n)`), which is exactly right
  // where negation is a suffix — listing the stem 'なかっ' catches なかった/なかったら/なかっただろう
  // without enumerating the paradigm.
  negation: ['ない', 'ません', 'せん', 'なかっ', 'なかった', 'ませんでした', 'なく', 'ず', 'じゃない', 'ではない', 'じゃありません', 'ではありません', 'ありません', 'いません', 'いけない', 'だめ'],

  // Japanese machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'particle_case_marking', marker: 'は / が / を / に / で / と', description: "Grammatical relations are free POSTPOSED particles, not word order and not prepositions: topic は, nominative が, accusative を, dative/goal/time に, locative/instrumental で, comitative/quotative と, ablative から, allative へ. English a/the/to/at/in/with/from are realised by these particles (or by nothing at all — Japanese has no articles). Licensed as a block at the first particle-bearing prompt (S1); they never need a separate introduced gloss." },
    { id: 'topic_vs_nominative', marker: 'は vs が', description: "は marks the topic and が the (often newly-introduced or focused) subject. English marks neither, so the same English prompt can correspond to either — 私は話したいです and 私が話したいです both render 'I want to speak'. This is a known-side-only distinction: never invent an English contrast for it, and never treat a は/が swap as a ZUT collision." },
    { id: 'pro_drop', marker: '(zero subject)', description: "Subjects and objects recoverable from context are simply absent: 話したい alone is 'I want to speak' (eng_for_jpn S1 build). The English prompt therefore contains pronouns the Japanese prompt does not, and vice versa; the gate must not expect one Japanese token per English pronoun. Licensed from S1." },
    { id: 'masu_politeness', marker: '-ます / です', description: "Politeness is grammaticalised in the verb's ending: the polite ます/です register vs the plain (dictionary/だ) register. The corpus teaches ます-form as the default. One English form corresponds to both registers (ZUT many-Japanese→one-English), so 話します and 話す are both 'I speak'. Licensed at the first ます/です prompt (S1)." },
    { id: 'te_form_chaining', marker: '-て / -で', description: "The て-form is the universal connective and the base for aspect, requests, permission and prohibition: 話して (and), 話している (progressive), 話してください (please), 話してもいい (may), 話してはいけない (mustn't). It is bound morphology on the verb stem, so no English 'and'/'please'/'may' token corresponds to a separate Japanese word. Licensed at the first て-form." },
    { id: 'tai_desiderative', marker: '-たい / ほしい', description: "'want to V' is the suffix -たい on the masu-stem (話したい), inflecting like an i-adjective (話したくない 'don't want to', 話したかった 'wanted to'). Third-person desire uses -たがる / -たいようです instead, because -たい is restricted to the speaker's own desire — a grammatical constraint English does not have. 'want (a thing)' is ほしい. Machinery, not vocabulary; licensed at the first たい prompt (S1)." },
    { id: 'past_tense_ta', marker: '-た / -ました', description: "Past is the bound suffix -た (plain) / -ました (polite), with regular stem alternation (話す→話した, 行く→行った, 聞く→聞いた). There is no auxiliary. English past -ed / did-V maps to whichever fused form the verb class dictates; do not tile an English auxiliary as a separate Japanese token." },
    { id: 'negation_suffix', marker: '-ない / -ません', description: "Negation is a bound suffix on the verb or adjective (話さない / 話しません / 話したくない / 面白くない), or the negative copula じゃない/ではありません, or the existential ありません/いません. There is NO free 'not'. Negation stacks with tense (話しませんでした) and with the desiderative (話したくありません), producing portmanteau forms; each is one Japanese form for one English negated form." },
    { id: 'question_particle_ka', marker: 'か', description: "Yes/no questions are formed by the sentence-final particle か with no change of word order and no do-support (話しますか 'do you speak?'). Embedded questions use かどうか ('whether', 言えるかどうかわかりません). English do/does/did-support words are absorbed by か + the verb's own inflection and are never separate Japanese glosses." },
    { id: 'potential_form', marker: '-れる / -られる / できる', description: "'can / be able to' is a derived verb form (話す→話せる, 食べる→食べられる) or the light verb できる with する-verbs (練習できる). One potential form covers can/could/be-able-to; its negative (話せません) and past (話せました) are further suffixes on the same stem. Machinery, not a modal word." },
    { id: 'passive_causative', marker: '-れる / -られる / -せる / -させる', description: "Passive and causative are suffixes on the verb stem, and the passive is homophonous with the potential (話される). Japanese also has the adversative passive, which has no English equivalent. Licensed at the first passive/causative carrier; never expect a separate 'be' or 'make/let' token." },
    { id: 'conditional_family', marker: '-たら / -ば / なら / と', description: "Four distinct conditional/temporal-clause forms, all bound or clause-final, covering what English splits between 'if' and 'when': たら (once/if), ば (provided that), なら (as for/if it's the case that), と (whenever). English 'if' is not a separate Japanese word. Also a key NPI licenser." },
    { id: 'nominalizer_koto_no', marker: 'こと / の', description: "A clause is turned into a noun phrase by こと or の (話すことが好きです 'I like speaking'). This is how English gerunds and that-clauses are rendered. Structural machinery licensed at its debut; こと is deliberately NOT in the free class because it also means 'thing'." },
    { id: 'quotative_to', marker: 'と / って', description: "と (colloquially って) closes reported speech and thought before 言う/思う/聞く ('say/think/hear that …'). It is glue, not a complementiser word to be tiled; the segmenter sometimes merges it with a following し into として, which is a segmentation artefact and not the conjunction 'as'." },
    { id: 'modal_expressions', marker: 'なければならない / かもしれない / つもり / でしょう / はず', description: "Deontic and epistemic modality is expressed by clause-final PERIPHRASES, not by single modal words: なければならない / なきゃいけない ('must/have to'), てもいい ('may'), てはいけない ('mustn't'), つもり ('intend to', 1,062 lego occurrences), かもしれません ('might'), でしょう ('probably/will'), はず ('should/supposed to'), 方がいい ('had better'). Each English modal maps to one of these multi-token patterns, so it can never match token-for-token — license the pattern at its carrier's debut." },
    { id: 'adjective_inflection', marker: 'い-adj / な-adj', description: "Adjectives inflect for tense and polarity like verbs (面白い / 面白くない / 面白かった) or take な and the copula (簡単な / 簡単じゃない). English adjectives are invariant, so one English adjective corresponds to a paradigm of Japanese forms — the largest single source of exact-form mismatches after verbs." },
    { id: 'existential_iru_aru', marker: 'いる / ある', description: "Existence and possession split by ANIMACY: いる for animate, ある for inanimate (友達がいます 'I have a friend' vs 時間があります 'I have time'). Both render English 'there is / have'. Many-Japanese→one-English; never split into two English renderings." },
    { id: 'suru_light_verb', marker: '-する', description: "A very large class of verbs is noun + する (練習する 'to practise', 説明する 'to explain', 改善する 'to improve'). The segmenter usually keeps these whole in the inventory but may cut a prompt at the noun/する join, so the same verb can appear as one token in the inventory and two in the prompt. License する as machinery." },
    { id: 'aspect_te_iru', marker: '-ている', description: "-ている marks progressive AND resultant state, and Japanese has no future tense: 話しています covers 'I am speaking' and, for change-of-state verbs, 'I have spoken / it is done'. English present/progressive/perfect/future all map onto the plain or ている form plus context." },
    { id: 'giving_receiving', marker: 'あげる / くれる / もらう', description: "Benefactive giving/receiving verbs encode the direction of the favour relative to the speaker (くれる = towards me, あげる = away from me), a distinction English collapses into 'give'/'for me'. Licensed at the first てくれる/てあげる carrier; it is grammar, not two vocabulary items." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'politenessRegisterCollapse', rule: "The polite ます/です register and the plain register are ONE English rendering. 話します and 話す both gloss 'speak'; 話したいです and 話したい both gloss 'want to speak'. Many-Japanese→one-English is ZUT-legal here and must never be reported as a collision, nor split into two English forms." },
    { id: 'noArticlesNoNumber', rule: "Japanese marks neither definiteness nor (normally) number: 友達 is 'a friend', 'the friend' or 'friends' as context dictates, and たち is optional and human-restricted. English a/an/the/plural -s therefore have no Japanese token to tile against — they are free on the known side and must not require an introduced gloss." },
    { id: 'proDropPronounAsymmetry', rule: "The Japanese prompt routinely omits the pronoun the English gloss requires (話したい = 'I want to speak'). Do not count English pronouns against Japanese tokens in either direction; and conversely, an explicit 私/あなた in the prompt is often emphasis or contrast that English does not mark." },
    { id: 'tenseAspectInSuffix', rule: "English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will/going-to) is rendered by a SINGLE suffixed Japanese verb form (or by the plain form plus context — Japanese has no future tense), never by a separate auxiliary. Do not tile English auxiliaries as separate Japanese tokens." },
    { id: 'negationIsSuffixal', rule: "Negation is the bound suffix ない/ません/なかった (or じゃない/ありません), never a free 'not'. The negation cue for the NPI gate is a SUBSTRING of the clause-final verb; a word-boundary regex finds nothing in Japanese. English don't/doesn't/didn't/won't/can't/isn't all map to whichever fused form the tense and verb class dictate — one Japanese form per one English negation." },
    { id: 'questionByParticle', rule: "English do/does/did-support and copular questions correspond to the final particle か plus the verb's own inflection. do/does/did are NOT separate Japanese glosses; and Japanese question word order is identical to statement word order, so a prompt is a question only by virtue of か (or a question mark)." },
    { id: 'wagaTopicNotEnglish', rule: "The は/が (topic/nominative) choice is a known-side-only feature carried by the prompt. It must not be given an English contrast, and two prompts differing only in は vs が are not a ZUT violation." },
    { id: 'whKaVsWhMo', rule: "何か/誰か/どこか ('something/someone/somewhere') are free-choice indefinites and are CORRECT in positive declaratives; 何も/誰も/どこにも ('anything/anyone/anywhere') are negative-polarity and require a negative tail. One English 'anything' can correspond to either depending on polarity — a rendering rule, not a collision." },
    { id: 'madaPolarityRendering', rule: "まだ is ONE Japanese form with a polarity-conditioned English rendering: 'yet' under negation (まだ準備ができていません 'not ready yet') and 'still' in a positive declarative (まだ学ぶことがあります 'there is still more to learn'). It is NOT a negative-polarity item — it is fully grammatical positive — so it must not be flagged as an NPI without negation. The same shape of rule covers もう ('already' positive / '(not) any more' negative). One form → two English renderings selected by polarity; not a ZUT collision." },
    { id: 'iruAruAnimacyCollapse', rule: "いる (animate) and ある (inanimate) both render English 'there is / has'. Keep them as distinct carriers but do not invent an English distinction; the choice is governed by the noun, not by anything in the English." },
    { id: 'segmenterFragmentsAreNotWords', rule: "ADJUDICATION RULE, not a language rule. Findings whose token is a one- or two-mora kana fragment (し, い, っ, て, た, く, り, れ, ま, せん, ありま, なか, いたこ, すか …) are artefacts of ICU segmentation cutting inside a verb's suffix stack, not untaught vocabulary. Read the original prompt string before judging any such finding; the frequent fragments are already in the free class, and the rest should be dismissed unless the surrounding stem is genuinely new." },
    { id: 'annotationLeakIsADefect', rule: "A finding on 形 / 過去 / 一人称 / 三人称 / 複数 / 単数 / 不定詞 / 過去分詞 / 接続 / 格 / 副詞 is NOT a vocabulary defect to be waived — it is grammatical METADATA that has leaked into learner-facing known_text in the six European-target jpn courses (〜したかった（三人称複数半過去）, どの（複数形）, 私の（女性複数）). Escalate these as a content defect; do not add them to the free class." },
  ],
};

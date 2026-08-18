// _known_jpn — KNOWN-SIDE BRIEF for the Japanese known-side agent. FIRST PASS (2026-08-18), ratified:null.
// KNOWN-LANGUAGE-level contract: the loader falls back to this for EVERY course whose KNOWN/prompt side is
// Japanese (15 courses: ara_eg_for_jpn, ara_for_jpn, ara_sy_for_jpn, cym_anthem_for_jpn, deu_at_for_jpn,
// deu_for_jpn, eng_for_jpn, fra_for_jpn, ita_for_jpn, kor_for_jpn, por_br_for_jpn, por_for_jpn,
// spa_for_jpn, spa_mx_for_jpn, zho_for_jpn). Authored by an Opus agent from the real live corpus.
// RULE (Tom): no regex for language — this is the agent's reference knowledge, NOT a regex gate config.
// The known-side check is an agent that reads this brief + the introduced-vocab list + the prompt and
// judges. See docs/course-optimization/eng-for-x-known-side-pilot.md.
//
// ── CORPUS BASIS ──────────────────────────────────────────────────────────────────────────────────────
// Read live from Supabase 2026-08-18: course_legos (known_text + components[].known) and
// course_practice_phrases (known_text) for all 15 courses. 51,017 rows → 54,976 known-side strings
// (39,457 distinct), 648,768 characters. Segmented with Intl.Segmenter('ja', {granularity:'word'}) — the
// SAME ICU dictionary the gate will use — giving 362,016 word-like tokens over 1,918 distinct types.
// EXPLICIT GAP: only 7 of the 15 courses have any content at all. Row counts (legos/phrases):
// eng 719/10,770 · por 842/6,791 · fra 706/6,483 · spa 657/7,492 · ita 601/5,441 · deu 649/5,145 ·
// zho 548/3,999 · cym_anthem 27/147. The other seven — ara_eg, ara, ara_sy, deu_at, kor, por_br, spa_mx —
// returned ZERO legos and ZERO phrases. This brief is therefore derived from the Romance/Germanic/Chinese
// half of the block and is UNVALIDATED against Arabic-target, Korean-target and the regional variants.
// It should be re-read against those courses once they are built; nothing here is expected to break, but
// nothing here was tested on them either.
//
// ── WHAT THE DICTIONARY SEGMENTER WILL AND WILL NOT GET RIGHT (required note) ─────────────────────────
// Japanese has NO SPACES, so segmentation MUST be 'dictionary'. ICU/Intl.Segmenter is a dictionary+cost
// segmenter, not a morphological analyser, and the gap between its output and a LEGO boundary is the
// single most important thing a reader of this contract needs to know. Measured, not asserted:
//
//   GETS RIGHT. Content words are recovered cleanly and reliably: 私 / あなた / 友達 / 時間 / 英語 /
//   練習 / 面白い / できるだけ / もう一度 / 一生懸命 all come back as single tokens, and every case
//   particle (を は に の が と で も へ や から まで より) is emitted as its own token rather than being
//   glued to its host noun. Kanji compounds are not over-split. Measured against real LEGO boundaries:
//   of 22,038 occurrences of a lego's known_text inside a practice phrase of the same course, 20,516
//   (93.1%) begin AND end exactly on an ICU boundary. So for ~93% of the estate the tokenizer's spans
//   and the authored LEGO's spans agree, and matching a prompt against introduced vocabulary is sound.
//
//   GETS WRONG (1). It shreds verbal and adjectival morphology into meaningless fragments. ICU returns
//   話|した, ありま|せん, 勉強|し|てい|ます, くだ|さい, 学|び, 思|い, 見|え, わか|る. Of the 1,918 distinct
//   types, 226 are pure-hiragana fragments of ≤2 morae (い ま た し て っ って せん てい ない たい ら
//   り れ ば く き …) — and those 226 types account for 59.5% of ALL tokens in the corpus. The MAJORITY
//   of what the segmenter hands the gate is bound inflectional debris, not words. Any check that treats
//   an unmatched token as an untaught word will therefore drown in false violations unless every one of
//   those fragments is free (they are all listed in freeClass below, deliberately and at length).
//
//   GETS WRONG (2). A LEGO taught in its dictionary form is invisible when it appears inflected or inside
//   a longer lexicalised span, because ICU prefers the longer dictionary entry. The 1,522 misaligned
//   occurrences (6.9%) are dominated by exactly this: できる 337× (swallowed by できるだけ / できるように),
//   もう 172× (もう一度, もうすぐ), して 119×, 答え 104×, だけ 103×, している 54×, います 42×. The gate
//   must NOT read "lego string not on a token boundary" as "word absent"; it is a segmenter artefact.
//
//   GETS WRONG (3). It has no lemma. 話す / 話し / 話せる / 話した / 話しました / 話そう are, to ICU, six
//   unrelated surface strings (and three of them are split mid-word). Recovering "these are one verb"
//   is a judgment the AGENT must make; the tokenizer cannot and no suffix table can either (see stemStrip).
//
//   GETS WRONG (4). It cannot see a zero. Japanese drops subjects, has no articles, no plural, and no
//   overt present copula in the plain register — so the English-side 'I / you / the / a / -s / is' have no
//   token to match against at all. Absence on the Japanese side is never evidence of anything.
//
// ── stemStrip IS EMPTY, AND THAT IS THE CORRECT ANSWER ────────────────────────────────────────────────
// Japanese is suffixing and agglutinative, which naively suggests suffix-stripping should pay. It does
// not, and I tested it rather than guessing. Taking 40 plausible strip candidates (ませんでした ましょう
// ません ました ています たいです ない たい った って した せん てい られ れる せる る た て し い く き
// う す む ぶ り み え ば ん …), longest-first, over the 1,918 attested types: stripping produced a
// residue that is itself an attested token 254 times and produced junk 261 times — a coin flip. Worse,
// the "successes" are mostly destructive coincidences: です→で, ます→ま, ない→な, いる→い, てい→て,
// する→す, せん→せ all "succeed" only because the mutilated residue happens to be another fragment in
// the same shredded corpus. And the strips that would actually be USEFUL are unreachable: the real
// Japanese alternation is in the final okurigana mora of the STEM (話す/話し/話せ/話そ, 学ぶ/学び,
// 思う/思い), so recovering the lemma needs a one-mora strip whose residue is a single kanji — which any
// honest stemMinLen must reject, or every 2-character token in the language becomes strippable.
// stemStrip: [] with stemMinLen: 2. Lemma identity in Japanese is the agent's judgment, not a table.
// Consequently morphology is 'agglutinative': on exact-form failure the gate may fall back to stem
// containment, and where that is inconclusive it MUST emit UNCHECKED(morphology_unresolved) rather than
// invent a pass or a violation.
//
// ── THE PERVASIVE KNOWN-SIDE ZUT PRESSURES IN THIS BLOCK ──────────────────────────────────────────────
// (1) OVERT PRONOUNS AGAINST A PRO-DROP LANGUAGE. Natural Japanese drops the subject; ZUT needs one known
// prompt to determine one target form, so the corpus supplies 私 (4,641) and あなた (4,311) on almost
// every clause. This is a deliberate, correct ZUT trade — the prompts are slightly unnatural so that the
// target is deterministic — and the gate must never flag the overt pronoun as redundant. The pressure is
// real in the other direction though: where 私/あなた IS dropped, one Japanese prompt legitimately maps to
// several English persons, and that is a ZUT failure, not a legal many-to-one.
// (2) POLITENESS REGISTER IS THE SECOND AXIS OF EVERY VERB. です/ます is the fixed register of this block
// (です 10,030 · ます 9,016 · ません 4,223), but the plain register leaks: 113 strings end in the plain
// copula だ。 (por 50, zho 45, fra 9, spa 9). Same meaning, different register, and one known prompt
// therefore has two shapes. Register is not free variation here — it must be held constant per course.
// (3) SECOND-PERSON PRONOUN IS NOT FIXED ACROSS THE BLOCK. 14 of 15 courses use あなた exclusively;
// por_for_jpn alone uses きみ (120) and 君 (58) alongside あなた (493), and ita (19), fra (10), deu (10)
// carry a handful of 君. Hindi's block had this solved (आप only); Japanese does not. Any course mixing
// あなた and 君/きみ for the same English 'you' is a genuine ZUT split, recorded in glossRules.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY (honest list) ─────────────────────────────────────────────
//  • し (3,951), して/した/しま/しよう and する (2,777) — the light verb する. It is the single most
//    important thing in the corpus that I have deliberately NOT put in freeClass. する is machinery when
//    it verbalises a nominal (練習する, 説明する, 心配する — the Bengali করা problem exactly) and content
//    when it means 'do'. Its ICU fragments (し, しま, しよう, した) are free ONLY as morphology. I list the
//    fragments as free and the citation forms する/します as machinery, but the boundary between
//    "verbalising suffix" and "the verb to do" is not decidable from frequency and needs a seed review.
//  • こと (4,984) and の as nominaliser vs の as genitive (10,380 combined). ICU gives one token の for
//    both the possessive particle ('my friend's') and the nominaliser ('the fact of speaking'). Both are
//    free, so no violation can arise — but a gloss agent reading の as possessive inside a nominalised
//    clause will produce nonsense English. Recorded in glossRules, unresolved as a classification.
//  • よう (1,587) / ように (881) / ようになり (246). This is at least four distinct constructions —
//    purposive 'so that', resultative 'come to be able to', comparative 'like', and hearsay/evidential
//    〜ようだ (106). I have licensed them as one construction because they share a carrier, which is
//    almost certainly too coarse; splitting needs seed contexts I did not review.
//  • しか (424 raw substring hits) — I could not get a reliable count. It is a genuine NPI ('only …not',
//    corpus: 少ししかない, 友達が数人しかいません — 3 real hits) but 421 of the 424 substring hits are the
//    adjectival past inside 楽しかった / 難しかった / 素晴らしかった. It is in the npi list on linguistic
//    grounds; its true corpus frequency is ~3, not 424, and I am flagging the discrepancy precisely
//    because a naive counter would rank it 150th and a naive matcher would flag every 'it was fun'.
//  • ば (1,010) — conditional -eba, but the count is contaminated the same way (かばん 'bag', しばらく,
//    たとえば). Free either way, so harmless, but the frequency is not trustworthy.
//  • つもり (1,117), はず (52), べき (277), わけ (119), ところ (149) — bound formal nouns carrying modality.
//    I have made them constructions rather than freeClass, following the Hindi चाहिए ruling, but they sit
//    genuinely on the line between closed-class machinery and content nominal.
//  • そう (528) — three homographs ICU cannot separate: the volitional fragment of 話そう, the evidential
//    〜そうです 'seems', and the discourse そうです 'that's right'. Free as a fragment; ambiguous as a gloss.
//  • Metalinguistic scaffolding in known_text. 3,777 strings (6.9%) contain 〜/～ placeholders or
//    parenthetical grammar tags baked into the known side — 知っている（二人称・現在）, 誰かを（対格）,
//    楽しかった（二人称過去）, いくらかの（女性形）, 何人（疑問詞）, オフィスで（場所）. By course:
//    por 1,170 · fra 800 · spa 524 · ita 514 · deu 508 · zho 164 · eng 97. These are authoring artefacts,
//    not Japanese. The tokenizer will read 対格/疑問詞/女性形 as ordinary content nouns and the gate will
//    report them as untaught vocabulary. I have NOT put them in freeClass — they are a content defect to
//    be fixed, not a class of word to be permitted — but the first run of this gate will surface them in
//    bulk and that is expected, not a gate failure. (Same shape as the known tel/rus/nep paren-tag issue.)

module.exports = {
  course_code: '_known_jpn',
  ratified: null,
  known_lang: 'jpn',
  known_lang_name: 'Japanese',
  is_known_default: true,

  // ── Tokenizer / outcome machinery ──
  script: 'Jpan',            // mixed kanji + hiragana + katakana; ISO 15924 'Jpan'
  segmentation: 'dictionary', // NO spaces. ICU/Intl.Segmenter('ja', {granularity:'word'}). See header.
  morphology: 'agglutinative',
  stemStrip: [],             // deliberately EMPTY — measured 254 wins / 261 junk. See header.
  stemMinLen: 2,

  // ── Free class ────────────────────────────────────────────────────────────────────────────────────
  // Two populations, both genuinely never-introduced, listed together because the gate sees them as one
  // stream of ICU tokens:
  //  (a) real free-standing function words — particles, conjunctions, copulas, demonstratives, pronouns,
  //      interrogatives. In Japanese the case particles are phonologically clitics, but the segmenter
  //      emits them as separate tokens, so — unlike Bengali's -কে/-র, which had to go to stemStrip —
  //      here they belong in freeClass. stemStrip being empty makes this the only available home.
  //  (b) the morphological debris ICU produces when it shreds a verb (い ま た し て っ って せん てい
  //      ない たい たか る れ ら り く き え ば ん …). These are NOT words and must never be judged as
  //      vocabulary. 226 such types carry 59.5% of all tokens; omitting them is what would make this
  //      gate unusable on Japanese.
  // Every function word at or above ~100 occurrences in the corpus is classified here or in
  // knownConstructions; none is left unclassified except the items named in the header's honest list.
  freeClass: [
    // (a1) case / focus / binding particles
    'を', 'は', 'に', 'の', 'が', 'と', 'で', 'も', 'へ', 'や', 'から', 'まで', 'より', 'か', 'ね', 'よ', 'わ', 'さ', 'ん', 'ら',
    // (a2) copula + polite auxiliary (citation forms)
    'です', 'ます', 'だ', 'でした', 'ました', 'ません', 'ですが', 'では', 'じゃ', 'ある', 'あり', 'いる', 'いま', 'ない', 'なく', 'なら', 'なり', 'なる',
    // (a3) conjunctions / connectives / subordinators
    'でも', 'けど', 'けれど', 'しかし', 'そして', 'だから', 'ので', 'のに', 'ながら', 'たら', 'ば', 'たり', 'とか', 'また', 'それから', 'なぜなら', 'ただ', 'として', 'について', 'によって', 'に対して', 'という', 'ため', 'ように',
    // (a4) demonstratives / deictics
    'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', 'こう', 'そう', 'どう', 'どの', 'どれ', 'どこ', 'こんなに', 'そんなに', 'みたい', 'ような',
    // (a5) interrogatives
    '何', '誰', 'いつ', 'なぜ', 'いくつ', 'いくつか', 'いくら', 'どんな', 'どうか',
    // (a6) pronouns + person marking (see glossRules on the あなた/君 split and on pro-drop)
    '私', '私たち', 'あなた', '彼', '彼女', '彼ら', '彼女たち', '自分', '自身', '君', 'きみ', 'たち', '達', 'みんな', '皆',
    // (a7) formal / bound nouns treated as free (light nominal glue, never content)
    'こと', 'もの', 'ところ', 'ほう', '方', 'とき', '時', 'よう',
    // (a8) high-frequency degree / quantity adverbs that are pure grading, never taught as vocabulary
    'とても', 'もっと', 'もう', 'まだ', 'よく', 'すぐ', '少し', 'もう少し', 'たくさん', 'すべて', '全部', 'だけ', 'ほど', 'くらい', 'ばかり', 'ずっと', 'ほとんど', 'あまり', 'ちょっと', 'まあまあ',
    // (b) ICU morphological debris — bound inflection, NEVER vocabulary. Listed exhaustively on purpose.
    'い', 'ま', 'た', 'し', 'て', 'っ', 'って', 'せん', 'てい', 'たい', 'たか', 'たく', 'る', 'れ', 'れる', 'られ', 'られる', 'せ', 'せる', 'させ',
    'く', 'き', 'う', 'す', 'む', 'ぶ', 'り', 'み', 'え', 'べ', 'げ', 'じ', 'ざ', 'ほ', 'あ', 'な', 'ご', 'お',
    'ありま', 'しま', 'しな', 'しない', 'しよう', 'しょう', 'ろう', 'だろう', 'でしょう', 'おう', 'おうと', 'ぼう', 'なか', 'んで', 'いか', 'いと', 'いく', 'いたい', 'いたく', 'いるか', 'てく', 'てくる', 'にし', 'すか', 'ますか', 'ないで', 'かな', 'かも', 'わっ', 'あっ', 'きた', 'げた', 'えて', 'いってい', 'いたこ', 'すべ', 'つい',
  ],

  // ── NPI ───────────────────────────────────────────────────────────────────────────────────────────
  npi: ['何も', '誰も', '誰にも', 'どこにも', 'どこも', '一度も', '二度と', '全然', '決して', 'しか', 'ちっとも', '別に', 'たいして', 'まだ', 'あまり', '何一つ'],
  npiLicensing: {
    rule:
      "Japanese negative-polarity items are built on an indefinite/interrogative stem plus the focus particle も (何も, 誰も, どこにも, 一度も) or on a scalar adverb (全然, あまり, まだ, 決して, ちっとも, たいして), plus the exclusive particle しか. They are licensed ONLY in NON-VERIDICAL / downward-entailing environments, and in Japanese the licensing is unusually STRICT: most of these items are ungrammatical, not merely odd, without a negative predicate in the same clause — 何も and しか in particular REQUIRE it (何も言わない 'say nothing', 少ししかない 'there's only a little'). In every licensed environment they are FREE and need no introduction; the ONLY violation is such an item standing in a plain POSITIVE DECLARATIVE. " +
      "The critical Japanese-specific split the agent must judge — and the exact analogue of Hindi कुछ भी vs कुछ — is か-series vs も-series on the SAME stem: 何か / 誰か / どこか / いつか are the positive EXISTENTIALS ('something / someone / somewhere / someday', corpus: 何か 1,835×, 誰か 182×, どこか 150×, いつか 14×) and are perfectly fine in a positive assertion, while 何も / 誰も / どこにも are the negative-concord forms and are NOT. A third series, か+でも (何でも 'anything at all', いつでも 'any time', どこでも), is FREE-CHOICE and is licensed by want/ability/permission/imperative WITHOUT any negation (corpus: 何でもいいので英語を使う機会が好きです, いつでも話せます). So 'I want to say something' = 何か; 'I don't want to say anything' / 'do you want to say anything?' / 'if you want to say anything' = 何も / 何か under a licensor; 'you can ask me anything' = 何でも. " +
      "Two further Japanese-specific notes. (i) まだ is an NPI only in its 'not yet' reading (まだ話せません 'I can't speak yet'); its positive 'still' reading (まだ話している 'still speaking', 679 raw hits, mostly positive) is veridical and NOT an NPI — do not flag it. Likewise あまり is an NPI in 'not very / not much' (あまり面白くない) but ALSO occurs as the veridical intensifier あまりに 'excessively' (あまりに多くの時間), which is not an NPI. (ii) しか is a HOMOGRAPH TRAP, not a frequency item: 421 of its 424 substring occurrences in this corpus are the adjectival past inside 楽しかった / 難しかった / 素晴らしかった and have nothing to do with the particle. The agent must judge the morphology, never the substring. " +
      "Do NOT flag a licensed NPI as unintroduced vocabulary, and do NOT let a も-series form pass in a bare positive assertion.",
    licensedIn: [
      "Clausal negation on the predicate in any of its shapes — plain ない/なかった, polite ません/ませんでした, existential ありません/いません, copular ではない/じゃない (corpus: 何も言わない, 何も読みたくない, 誰も必要としない, 誰にも見せたくない, 全然問題ない). This is the core licensor and for 何も/誰にも/しか it is effectively obligatory.",
      "Negative-request and prohibitive forms — 〜ないでください ('please don't', 15×: 誰にも本当のことを聞かせないでください) and 〜てはいけない/〜てはいけません ('must not', 6×: 間違いをしてはいけません).",
      "Yes/no questions marked by sentence-final か (1,964 〜ますか + 1,052 〜ですか？), including negative-polar 〜ませんか (181×: 来週また話しませんか？) — polar interrogatives are non-veridical and license any-items with no negation present.",
      "Embedded polar questions with 〜かどうか 'whether/if' (538×: 覚えられるかどうかわかりません, 〜かどうか気になる) — the indirect-question licensor, distinct from the conditional.",
      "Conditionals and hypotheticals in all four Japanese shapes — 〜たら (543×: 終わったら話す), 〜れば (950×: できれば), 〜なら (471×), and 〜と — plus もし 'if' (242×). The protasis licenses anything/anyone/ever.",
      "Desiderative and volitional scope — 〜たい 'want to' (3,001×) and 〜ようとする 'try to' (話そうとしています), and 〜てほしい 'want someone to' (598×). Corpus: 何も読みたくない, 誰にも教えたくない.",
      "Ability / potential — the potential forms 〜れる/られる (462×: 覚えられる), 話せる (387×), できる (636×) and 〜ことができる (282×). Corpus: 誰かに聞こえさせる, もちろん何でも質問できる. Also an NPI licensor in the free-choice でも series.",
      "Necessity, obligation and permission modals — 〜なければなりません 'have to' (713×), 〜べき 'should' (277×), 〜なくてもいい 'don't have to' (69×), 〜ても構わない/〜てもいい 'may' — all non-veridical modal contexts.",
      "Epistemic and irrealis marking — かもしれない 'might' (156×), でしょう/だろう 'probably' (636/195×), 〜はず 'is supposed to' (52×), 〜つもり 'intend to' (1,117×), and plain future/generic reference. The event is not asserted as actual.",
      "Comparatives, superlatives and scalar focus — より 'than' (545×), ほど 'as…as' in its negative frame (ほど〜ない), 唯一 'the only' (154×), だけ 'only' (880×) and the exclusive particle しか…ない itself (少ししかない, 友達が数人しかいません).",
      "Explicit free-choice でも-series (何でも, いつでも, どこでも, 誰でも): inherently any-type and licensed by want / ability / permission / imperative / generic WITHOUT overt negation (もし頼んだら、何でも手伝ってくれますか？).",
      "Temporal 'before / until' clauses and other not-yet-realised frames — 〜前に (行く前に手伝ってくれますか), 〜まで (終わるまで知りたくありません), where the event is future-oriented and unasserted.",
    ],
  },

  // ── Negation markers (reference list; negation detection is the agent's judgment, never a regex) ──
  negation: ['ない', 'ないです', 'なかった', 'ません', 'ませんでした', 'せん', 'ありません', 'ありませんでした', 'いません', 'ではない', 'ではありません', 'じゃない', 'じゃありません', 'なく', 'なくて', 'ないで', 'ず', 'ずに', 'ぬ', 'てはいけない', 'てはいけません', 'ないでください'],

  // ── Japanese machinery the agent licenses at a carrier's debut ────────────────────────────────────
  knownConstructions: [
    { id: 'topic-wa-vs-nominative-ga', marker: 'は / が', description: "The は/が alternation is the spine of the Japanese sentence and has NO English counterpart. は (10,954×) marks the TOPIC — what the sentence is about, often the English subject but equally an English object or adverbial (今日は 'as for today'); が (9,650×) marks the grammatical SUBJECT and is obligatory in subordinate clauses, with new/focused information, and with the object of stative predicates (私は英語が好きです 'I like English' — 英語 is が-marked, not を). One English subject can therefore surface as は or が by information structure. Both particles are free class; licensed at the first clause. The agent must not read a が-marked English object as a subject." },
    { id: 'object-wo-and-oblique-ni-de', marker: 'を / に / で / と / から / まで / へ', description: "Case is postpositional and follows the noun: を direct object (14,454×), に dative-goal-time-location-of-existence (10,609×), で instrumental and location-of-action (4,336×), と comitative-and-quotative (6,138×), から source, まで limit, へ direction. English prepositions PRECEDE and Japanese particles FOLLOW, so every prepositional phrase is mirror-imaged; and に vs で is a distinction English 'in/at' does not make (オフィスにいる 'be at the office' vs オフィスで話す 'speak at the office'). All free class; licensed at first use." },
    { id: 'genitive-nominaliser-no', marker: 'の', description: "の (10,380×) is (1) the genitive linking two nominals, possessor first (私の友達 'my friend', 彼女のかばん 'her bag'), and (2) the clausal NOMINALISER turning a clause into a noun phrase (話すのに時間をかけたくありません 'I don't want to take time to speak'). ICU returns one token for both and cannot distinguish them; the agent must. Also the sentence-final explanatory の/んです ('the fact is…'). Free class; licensed at first possessive." },
    { id: 'polite-register-desu-masu', marker: 'です / ます / でした / ました / ません', description: "Every Japanese predicate carries a politeness value. This block is fixed in the POLITE register: です copula (10,030×) and ます verbal (9,016×), negative ません (4,223×), past でした/ました. The plain register (だ, ない, する) appears only as the citation form inside legos and in 113 stray plain-copula sentences. Register is a second axis on every verb, not free variation: the same English 'I speak' has 話します (polite) and 話す (plain) and a course must not mix them for the same prompt. Licensed at the first です/ます; the plain forms are licensed as citation/subordinate forms only." },
    { id: 'te-form-connective', marker: 'て / で (話して, 読んで, 見て)', description: "The て-form is the universal connective and the base of nearly all Japanese periphrasis: clause chaining ('and then'), manner, cause, and the stem for the progressive, benefactive, request, permission, prohibition and resultative constructions below. It is bound morphology — ICU emits it as a bare て or glued into って/てい/てく — and is never content. Licensing the て-form licenses the whole periphrastic family's SHAPE, but each construction below still debuts on its own carrier." },
    { id: 'progressive-resultative-teiru', marker: '〜ている / 〜ています (話している, 学んでいる)', description: "〜ている (2,815 てい fragments + 2,999 いる) covers BOTH the English present progressive ('I'm speaking') AND the resultative/experiential state ('I know', 知っている; 'I've been learning', まだ学んでいる). One Japanese form, several English tenses — a legal many-to-one that the gloss rules must fix per frame. Licensed at its debut; the ICU fragments てい/ている/います are free." },
    { id: 'past-ta-mashita', marker: '〜た / 〜ました / 〜でした', description: "Past/perfective is the suffix 〜た (plain) / 〜ました (polite), fused to the stem with morphophonemic change (話す→話した, 読む→読んだ, 行く→行った). ICU splits it off as した (7,740×) or た (6,242×) or leaves it glued (きた, げた, わっ). English past simple, present perfect and 'used to' all converge on it. Licensed at first past reference." },
    { id: 'desiderative-tai-tagaru', marker: '〜たい / 〜たがる / 〜てほしい', description: "'Want' is a SUFFIX, not a verb: 〜たい (3,001×) attaches to the verb stem and inflects like an adjective (話したい, 話したくない, 話したかった). CRITICALLY it is restricted to first and second person — for a third person you must use 〜たがる (27×: 彼女は答えを見つけたがっています 'she wants to find the answer'). 〜てほしい (598×) is 'want SOMEONE ELSE to'. English 'want' does not make either distinction, so this is a one-English→three-Japanese split. Licensed at 〜たい's debut; 〜たがる needs its own debut." },
    { id: 'potential-and-ability', marker: '〜れる/られる / 話せる / できる / 〜ことができる', description: "Ability is morphological (話す→話せる 387×, 覚える→覚えられる 462×) or periphrastic (できる 636×, 〜ことができる 282×). Note できる is itself the potential of する. English 'can / could / be able to' maps onto all of these; and the potential form takes が, not を, for its object. Licensed at the first potential; also an NPI-licensing environment." },
    { id: 'passive-causative-rareru-saseru', marker: '〜られる (passive) / 〜させる (causative) / 〜させられる', description: "The passive 〜れる/られる is HOMOPHONOUS with the potential above — 見られる is both 'can be seen' and 'is seen' — and Japanese additionally has the adversative passive with no English counterpart. The causative 〜させる (93×: 誰かに聞こえさせる, 練習させてほしい) means 'make/let someone do'. Distinct machinery from potential despite the shared form; licensed separately, and the agent must judge which reading a given られる carries." },
    { id: 'benefactive-direction', marker: '〜てくれる / 〜てあげる / 〜てもらう', description: "Japanese grammaticalises WHO BENEFITS: 〜てくれる (534×) = someone does it for me (手伝ってくれますか 'will you help me'), 〜てあげる (10×) = I do it for someone (手伝ってあげる), 〜てもらう (15×) = I receive the action (話してもらう 'have someone speak'). English has no equivalent and simply says 'help me' — so this is machinery with no English carrier, and the direction is fixed by the Japanese side alone. Licensed at 〜てくれる's debut." },
    { id: 'obligation-permission-prohibition', marker: '〜なければなりません / 〜なくてもいい / 〜てもいい・ても構わない / 〜てはいけません', description: "The deontic family, all built on a negative or て base: obligation 〜なければなりません/〜なければならない (713×, literally 'if not-do, it won't do'), 〜べき 'should' (277×), no-obligation 〜なくてもいい (69×), permission 〜てもいい / 〜ても構わない ('手伝っても構いませんか？'), prohibition 〜てはいけません (6×) and 〜ないでください (15×). This is the Hindi चाहिए class: pure machinery, high frequency, and precisely what leaks if left unclassified. Licensed at the first obligation carrier; each sub-form debuts separately." },
    { id: 'request-imperative', marker: '〜てください / 〜てくれますか / 〜てもらえますか', description: "Requests are て-form + ください (265×: もっとゆっくり話してください) or the interrogative benefactive 〜てくれますか (534×). The bare imperative barely appears. ICU splits ください into くだ|さい (271/267) — both fragments are free. Licensed at ください's debut." },
    { id: 'volitional-and-attempt', marker: '〜しよう / 〜ましょう / 〜(よ)うとする', description: "The volitional 〜(よ)う / 〜ましょう (366×: 終わったら少し話しましょう 'let's talk') is 'let's / I shall', and combined with とする it is 'try to / be about to' (話そうとしています 'I'm trying to speak'). ICU shreds it into しよう/しょう/おう/おうと/ぼう/ろう — all free fragments. English 'let's' and 'try to' both land here. Licensed at its debut." },
    { id: 'conditional-four-ways', marker: '〜たら / 〜れば / 〜なら / 〜と (+ もし)', description: "Japanese has FOUR conditionals selected by semantics, where English has one 'if': 〜たら (543×) temporal/sequential 'when/once', 〜れば (950×) logical/hypothetical, 〜なら (471×) contextual 'if it's the case that', 〜と generic/automatic consequence. もし (242×) is the optional 'if' adverb reinforcing them. One English 'if' → four Japanese forms is the largest one-to-many in this contract. Licensed per form; all are NPI licensors." },
    { id: 'question-ka-and-embedded-kadouka', marker: 'か (〜ますか / 〜ですか) / 〜かどうか', description: "Polar questions are formed with sentence-final か, with NO word-order change and NO do-support (あなたはできますか？ 'can you?'). English do/does/did-questions and auxiliary inversion all map onto か. The embedded counterpart is 〜かどうか 'whether/if' (538×), distinct from the conditional 〜たら/〜れば. Wh-words (何 3,428×, 誰, いつ, どこ, なぜ, どう) stay IN SITU — no fronting. Licensed at か's debut; か is free class." },
    { id: 'quotative-to-and-toiu', marker: 'と (と思います / と言いました) / という', description: "Reported speech, thought and naming take the quotative particle と before 思う (767×) / 言う (496×) / 知る (2,027×): 大事なことかもしれないと思います 'I think it might be important'. という (150×) is the naming/appositive 'called / the fact that' (何という名前ですか 'what's your name'). There is no English 'that' complementiser on the Japanese side — と does the work and precedes the verb. Licensed at the first quotative." },
    { id: 'nominalisation-koto-no-youni-naru', marker: 'こと / の / 〜ようになる / 〜ことができる', description: "Clauses become noun phrases with こと (4,984×) or の, and this is how Japanese builds most complement structures (話すことが好きです 'I like speaking'). 〜ようになる (246×: 話せるようになりたいです 'I want to become able to speak') is the change-of-state 'come to be able to' — a construction English renders with a whole clause. Licensed at こと's debut. See the header: I have licensed the よう family as ONE construction and believe that is too coarse." },
    { id: 'modal-nouns-tsumori-hazu-beki-kamoshirenai', marker: 'つもり / はず / べき / わけ / かもしれない / でしょう・だろう', description: "A closed set of bound formal nouns carrying modality, all requiring a preceding clause: つもり 'intend to' (1,117×), はず 'is supposed to' (52×), べき 'should' (277×), わけ 'it's not that…' (119×, 〜わけではない), かもしれない 'might' (156×), でしょう/だろう 'probably / I expect' (636/195×). This is the Hindi चाहिए / Bengali হবে class — high-frequency machinery that reads as content if unclassified, which is exactly how it leaks. Licensed as constructions at each carrier's debut, NOT as vocabulary." },
    { id: 'prenominal-relative-clause', marker: '（modifier clause）+ 名詞 — 私が知らない人たち', description: "Relative clauses PRECEDE their head noun and use NO relative pronoun and no complementiser: 私が知らない人たち 'people [that] I don't know', あなたが見せたいもの 'the thing you want to show'. The clause-internal verb is in plain (not polite) form regardless of the sentence's register. English who/that/which have no Japanese carrier at all, and the constituent order is fully reversed. Licensed at the first modifier clause." },
    { id: 'suru-light-verb', marker: 'する / します (練習する, 説明する, 心配する)', description: "する (2,777×, plus fragments し 3,951, して, した, しま) verbalises a nominal to form most compound verbs — 練習する 'practise', 説明する 'explain', 心配する 'worry', 準備する 'prepare'. This is the Bengali করা problem: the nominal carries the event, so 練習/説明/心配 ARE content and must be introduced, while the する that verbalises them is machinery. See the header — I could not draw this boundary confidently from frequency and it needs a seed review. Licensed as machinery at first use; the nominal is not." },
  ],

  // ── Known-side ZUT / rendering rules ──────────────────────────────────────────────────────────────
  glossRules: [
    { id: 'pro-drop-vs-overt-pronoun', rule: "Natural Japanese omits the subject; ZUT needs one prompt → one target form. The corpus therefore supplies overt 私 (4,641×) and あなた (4,311×) far beyond natural usage, and this is a DELIBERATE, CORRECT trade — never flag the overt pronoun as redundant or unnatural. The rule bites the other way: where the pronoun IS dropped, one Japanese prompt legitimately maps to I/you/he/she and the target becomes indeterminate. A subjectless known-side prompt whose English target picks a specific person is a ZUT failure, not a legal many-to-one, and must be flagged." },
    { id: 'you-register-not-fixed', rule: "Unlike Hindi (आप only) and Bengali (তুমি only), the SECOND-PERSON PRONOUN IS NOT FIXED across this block. 14 courses use あなた exclusively; por_for_jpn uses きみ (120×) and 君 (58×) alongside あなた (493×), and ita (19×), fra (10×), deu (10×) carry stray 君. あなた, 君 and きみ are three registers of one English 'you'. Within a single course, English 'you' must map to ONE of them; a course using both for the same prompt has a genuine ZUT split. If a familiar register is deliberate it is a new construction license, not a silent variant." },
    { id: 'politeness-register-must-be-held', rule: "です/ます (polite) is the register of this block. 113 known-side strings end in the plain copula だ。 (por 50, zho 45, fra 9, spa 9) — same meaning, different register, so one English prompt has two Japanese shapes. Plain form is CORRECT and obligatory inside relative clauses and before と思う/かもしれない/でしょう; it is a register leak only in a main-clause predicate. Judge the position, not the string." },
    { id: 'verb-lemma-is-agent-judgment', rule: "話す / 話し / 話しました / 話せる / 話そう / 話している are ONE lemma. The segmenter cannot see this (it returns 話す, 話|した, 話せる as unrelated strings) and no suffix table can recover it (stemStrip is empty by measurement). When a prompt contains an inflected form of an introduced verb, that is NOT untaught vocabulary. Where the agent cannot decide whether two surface forms share a lemma, the correct outcome is UNCHECKED(morphology_unresolved) — never an invented violation and never an invented pass." },
    { id: 'negation-converges-on-nai-masen', rule: "English don't / doesn't / didn't / won't / can't / isn't / haven't ALL converge onto the Japanese ない/ません family fused to the verb — there is no standalone 'not' token to gloss. Polite ません (4,223×) and plain ない (3,586×) are one system; ではない/じゃない negate the copula; ありません/いません negate existence. Do not gloss a bare 'not' as a separate word, and do not treat ない as vocabulary — it is inflection." },
    { id: 'ka-series-vs-mo-series-vs-demo-series', rule: "The three indefinite series on one stem must never collapse. か-series 何か/誰か/どこか/いつか = positive existential 'something / someone / somewhere / someday' (1,835 / 182 / 150 / 14×). も-series 何も/誰も/誰にも/どこにも = negative concord, requires a negative predicate (375 / 84 / 108×). でも-series 何でも/いつでも/どこでも = free choice 'anything at all', licensed by want/ability/permission without negation (11 / 16×). English 'anything' maps to all three depending on polarity; picking the wrong series is the single most likely NPI error in this block." },
    { id: 'mada-and-amari-are-polarity-split', rule: "まだ (679×) is 'still' in a positive clause (まだ学んでいる 'still learning') and 'not yet' under negation (まだ話せません) — one word, two English glosses selected by polarity, and only the second is an NPI. あまり is 'not very / not much' under negation (あまり面白くない) but the veridical intensifier あまりに 'excessively' in a positive clause (あまりに多くの時間). Fix the English per polarity; do not flag the positive readings." },
    { id: 'shika-is-a-homograph-trap', rule: "The exclusive particle しか (…しか〜ない 'only … not') occurs about THREE times in this corpus (少ししかない, 友達が数人しかいません). The 424 substring hits for しか are 421 instances of the adjectival past inside 楽しかった 'was fun', 難しかった 'was difficult', 素晴らしかった 'was wonderful'. Judge morphology, never substrings. A string-matching check on しか would flag every past-tense adjective in the block." },
    { id: 'teiru-tense-mapping', rule: "〜ている must map deterministically to the right English tense per frame, or the same Japanese shape gets glossed inconsistently: activity verb + ている = present progressive (話している 'is speaking'); change-of-state verb + ている = resultative STATE, not progressive (知っている = 'knows', NOT 'is knowing'; 疲れている = 'is tired'); with a duration adverbial = present perfect progressive (まだ学んでいる 'has been learning'). Fix the English rendering per verb class." },
    { id: 'want-is-person-restricted', rule: "〜たい is grammatical only for first and second person. 'He wants to speak' is NOT 彼は話したいです — it is 彼は話したがっています (〜たがる, 27× in corpus). English 'want' makes no such distinction, so a third-person 'want' prompt authored with 〜たい is a known-side grammar error, not a stylistic choice. 〜てほしい ('want someone else to', 598×) is a third shape for the same English verb." },
    { id: 'dekiru-dake-is-one-unit', rule: "できるだけ (574×) is a fixed adverbial unit 'as … as possible' (できるだけ早く 'as quickly as possible') and must be taught and matched WHOLE. Tiling it as できる 'can' + だけ 'only' produces nonsense. It is also the largest single cause of segmenter misalignment in this corpus: できる fails to land on a token boundary 337× precisely because ICU prefers the longer entry. Same treatment for もう一度 'once more' (197×), もう少し 'a bit more' (291×), 一生懸命 'as hard as one can' (163×), できるように, そういうわけで." },
    { id: 'mou-is-three-glosses', rule: "もう (1,136×) splits by polarity and collocation: 'already' in a positive perfective, 'any more / no longer' under negation (もうあまり〜ない), and 'another / one more' before a quantifier (もう一度 197×, もう少し 291×). Three English glosses from one Japanese adverb; fix the gloss per frame rather than picking one." },
    { id: 'no-plural-no-articles-no-agreement', rule: "Japanese marks no number, no definiteness and no agreement. English a / the / -s / this-these have NO Japanese carrier and must be treated as free, supplied on the English side only. たち/達 (1,240/136×) is an optional animate collective, not a plural marker — 友達 'friend(s)' is number-neutral, and 私たち 'we' is lexicalised. Never require a Japanese token for an English determiner or plural, and never read the absence of one as a defect." },
    { id: 'head-final-mirror-order', rule: "Japanese is rigidly head-final: verb last, particles after their noun, relative clauses before their head, modifiers before the modified. Every English prepositional phrase, relative clause and complement clause appears in mirror image. When matching an English target's structure against the known-side prompt, constituent ORDER carries no information — only the particle-marked roles do." },
    { id: 'metalinguistic-scaffolding-is-not-japanese', rule: "3,777 known-side strings (6.9%) carry authoring scaffolding baked into known_text: the 〜/～ placeholder (〜してくれますか, 〜のはずです) and parenthetical grammar tags (知っている（二人称・現在）, 誰かを（対格）, 楽しかった（二人称過去）, いくらかの（女性形）, 何人（疑問詞）, オフィスで（場所）). By course: por 1,170 · fra 800 · spa 524 · ita 514 · deu 508 · zho 164 · eng 97. These are NOT Japanese words and are not in freeClass — 対格 'accusative', 疑問詞 'interrogative', 女性形 'feminine form' are metalanguage that a learner is never meant to read. The gate WILL report them as untaught vocabulary on its first run; that is a correct finding about a content defect, not a gate malfunction, and the fix belongs in the content, not in this contract." },
  ],
};

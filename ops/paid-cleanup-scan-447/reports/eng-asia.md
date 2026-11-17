# eng-asia — cleanup scan findings (#447, worker #474·AI)

Courses: **eng_for_jpn, eng_for_kor, eng_for_zho, eng_for_ara**. In all four, English is the language being learnt. I read them live through Popty's script view on 17 Nov 2026 at 14:06Z. **Nothing was changed, rendered or sent.**
Every row is in `eng-asia.json` next to this file. Each row has: course, family, row id, known, target, verdict, fix, confidence, canon ref and chars. The verdicts are written into `eng-asia.build.py`, so the JSON can be rebuilt from a fresh dump.
Audio cost counts only the sides that change: new English × 2 voices, plus new known text × 1. A deletion, a not-new flag or a seed-sentence USE row (which reuses the seed's own clips) costs 0. Re-cutting a LEGO also costs a new intro clip, and those intros are **not** included in the totals.

## Headline

- **eng_for_jpn is in much worse shape than the other three.** It has 11,167 rows, about twice as many as the others (5,600–6,400), and 425 of them are exact duplicates inside the same basket.
  - **192 practice sentences in seeds 226–230 have only the LEGO's Japanese as their prompt.** For example, 男性 is the prompt for "the man is trying to help me understand what you said". This is the "missing known-side translation" that Aran and Deborah reported (A16). It is still live.
  - **At least 174 more rows have a Japanese prompt that does not match the English, is garbled, or is not a question where the English is.** I found these through the question-mark and same-prompt reads only. **The whole course needs a known-side read** (see GAPS).
  - **375 rows use English words that have not been taught yet.** Mostly: *let's* before 158, *them* before 134, *make (mistakes)* before 116, *a lot* before 109, and *every*, *came*, *spoke*, *please* and *knew*, which are never taught.
- **eng_for_kor**: 45 Korean prompts are statements where the English is a question. In the 해요 form, statement and question are the same words, so only the ? tells the learner, and it is missing. There are also 22 prompt/answer mismatches, 10 garbled BUILD prompts, and 12 LEGO-level fixes. Two of those are LEGOs whose whole basket practises something else: S0090L01 *good* and S0061L02 *again*.
- **eng_for_zho**: in seeds 64–73 the Chinese prompts have slipped against the English inside baskets. For example, S0071L02U01 我们不想… has become 现在让任何人听到这个真相 ("now let anyone hear the truth") under "We didn't want to let anyone hear the truth". There are 10 LEGOs whose English is not in their seed or whose Chinese is another LEGO's word (S0057L01 *can't remember | 说*, S0059L02 *next week | 做*), 4 gapped LEGOs, and 53 LEGOs over 8 syllables.
- **eng_for_ara is the cleanest.** The main family is *every* (never taught) in 26 rows. It also has 46 seed sentences the learner never says, 1 empty audio slot (S0201L02B03, target1 + target2), and 16 LEGOs over 8 syllables.
- **All four**: seed 108's English, *"we didn't hope to wake in the middle of the night"*, is not natural English, and in these courses it is what the learner has to say.

| course | REAL rows / items (new) | needs new audio | new audio chars (≈) | read and NOT a defect (not counted) |
|---|---|---|---|---|
| eng_for_jpn | 1,345 (incl. 425 duplicates to delete, 74 seed sentences to add) | ≈ 640 | ≈ 18,600 | ≈ 690 (571 か/の question prompts, 87 seed prompts worded differently, 7 *seem/seems*, 27 phrase-level same-prompt pairs) |
| eng_for_kor | 149 | ≈ 100 | ≈ 2,700 | ≈ 230 (102 Korean particle/verb-form artefacts in the known-LEGO check, 51 reworded seed prompts, 10 phrase-level pairs) |
| eng_for_zho | 176 | ≈ 80 | ≈ 1,900 | ≈ 420 (266 吗/wh-word questions without ？, 139 reworded seed prompts, 21 phrase-level pairs) |
| eng_for_ara | 111 | ≈ 45 | ≈ 900 | ≈ 30 (22 Arabic clitic artefacts in the known-LEGO check, 6 reworded seed prompts) |
| seed 108, all four | 1 item (≈ 40 rows) | ≈ 40 | ≈ 3,600 | — |

The chars figure for the untaught-word rows assumes BUILD rows are reworded and USE rows are deleted. Rewording every USE row instead would add about 18,000 chars on eng_for_jpn.

---

## eng_for_jpn

**J1. The prompt is only the LEGO, not the sentence (A16). 192 REAL, all read.** Every USE row of 9 LEGOs in seeds 226–230 has the LEGO's own Japanese as its prompt:
- S0227L01U01 男性 | the man is trying to help me understand what you said
- S0228L01U02 あの男性は話す練習を始めたばかりです | do you think that man has just started to practise speaking in English?
- S0229L03U01 できれば手伝ってくれるでしょう | that woman would help you if she could but she is very busy today
- S0230L02U01 働きたい | he wants to work with you and I think that is a good idea

Fix: write the Japanese for each whole sentence; each prompt then needs a new known clip. **sure.** Canon A16, P16. This family is KNOWN (Aran/Deborah, A16), but I found no row list for it anywhere, so the rows are listed here. Audio ≈ 4,200 chars (estimate: Japanese ≈ 0.45 × English length). 6 other single rows of this shape are LEGO glosses with an article added, and are not a defect. S0131L03B01 アイデア | there are ideas going around is REAL and counted in J2.

**J2. Prompt and answer do not match, the prompt is garbled, or the prompt is not a question. 174 REAL. Read: every non-か question-mark hit (201) and every same-prompt pair in a basket (18 groups).**
- *Mismatch (M, 84):*
  - S0054L03U12 あなたはできるだけ英語を話そうとしている | are you going to help me before I have to go?
  - S0070L05U03 なぜ彼女は私に教えたくなかったのですか？ | I don't know why she didn't want to tell me about it
  - S0063L04U03 …私を手伝うことに感謝します ("thank you for helping me") | are you sure you don't mind helping me…?
  - S0158L02U07 あなたは何か他のことを考えましたか？ | I should consider something else
  - S0098L01U06 別のゲームをすること ("another game") | I should consider playing something else
- *Garbled (G, 58):* the S0063 family puts the question word in the middle: 本当に気にしませんか、私を手伝うことを (27 rows). Others: S0065L01U05 重要です、あなた自身をテストすることが、時間をかけて; S0101L01B05 この言語についてもっと楽しんで知っています; the dash fragments S0061L03B03 言っていただけますか - それを; and S0144L01B02–B07, where one prompt 今朝したかったこと sits over 6 different English answers.
- *Not a question (Q, 5):* S0021L03B02 今学んでいる | are you learning now?
- *English not natural (E, 27):*
  - S0183L01U01 "have you seen my keys anywhere no I'm afraid I haven't seen them?" (question and answer run together, 13 rows)
  - S0262L01B04 "can you tell me who was that man you were talking to yesterday?"
  - BUILD fragments like "could you say?", "have you seen?", "do you mind if?"

Fix: M and G → rewrite the Japanese prompt to say what the English says, using the seed's own wording (for S0063, the seed's 手伝っても構いませんか？). For G: K6 gives the known side latitude in word forms, but not to be garbled. E → rewrite the English, or delete the fragment. **sure** for M/Q, **likely** for G/E. Canon K2, P16, K6, K9, A9. Audio ≈ 5,300 chars.

**J3. English words used before they are taught. 375 REAL, all 430 hits read.** The detector was wrong on 27 of them (see GAPS), and those are dropped. The 12 S0213 rows are J4, and the S0213/phrase rows already in J2/J5 are counted there.
- S0095L03B05 let's speak again the next time (*let's* is taught at 158)
- S0065L01B06 it's important to make mistakes (*make* at 116)
- S0089L01B04 I've done a lot (*lot* at 109)
- S0202L02U01 nobody knew how to answer the question (*knew* is never taught)
- S0185L01U01 I go to work every day (*every* is never taught)

Fix: delete USE rows. Reword BUILD rows with taught words. Never add a LEGO to license a word (K14/K15). **sure.** Canon P1, K8. Audio ≈ 6,900 chars (BUILD rewording only).

**J4. Missing apostrophes. 12 REAL.** S0213L02U01–U10, S0213L01U03, S0213L01B05: "we dont know what theyre trying to achieve". Fix: add the apostrophes. Re-voice only if the clip says "dont" wrongly (needs an ear check). **sure.** K9. ≈ 1,200 chars if re-voiced.

**J5. Rows that do not contain their LEGO. 35 REAL, 42 read.**
- S0011L03B03 I want to be able to speak English, under *I'd like*
- S0126L01U04 …why it's not working, under *work*
- S0078L02U02 I don't know enough words yet, under *I don't understand*
- S0201L01B02 did you want to know…, under *we wanted to know…*
- S0138L01U08 this **is** where…, under *this was where*

The 7 *seems* rows under *seem* (S0300L01) are a third-person -s and are not counted (K8 "slightly different ending"). Fix: reword the row with the LEGO in its taught form, or delete it. S0126L01 is better re-cut to "it's not working | うまくいっていない". **sure.** P17, K50. ≈ 830 chars.

**J6. Duplicate rows. 425 REAL, read as a list.** The same pair appears twice in one basket: 212 BUILD=BUILD, 179 USE=BUILD, 25 USE=USE, 9 BUILD=USE, across 259 LEGOs. For example, S0052L04B02 手紙 | a letter is a twin of B01, and S0038L01U01 英語を学んでいます | I've been learning English is a twin of B01. Fix: delete the later twin. **sure.** 0 chars.

**J7. LEGO-level items. 4 REAL.**
- S0202L02 "didn't know how to answer the question" is not in its seed ("nobody was sure…") → re-cut to "how to answer the question | 質問にどう答えるか".
- S0043L01 "to answer" is taught as NEW a second time → make it not-new.
- S0207L01 and S0257L01 are not-new with no earlier exact pair → make them NEW (L31).

S0244L03 "have learnt" inside "I've learnt" is read as fine (contracted form).

**J8. LEGOs over 8 syllables. 54 REAL.** These are hand-checked counts; the builder's estimate said 46. 26 more are at 7–8. Most are whole sentences taught as one LEGO:
- S0117L01 "I'm definitely doing better than I was last time we talked to each other" (21)
- S0112L01 "that was very interesting and I wasn't expecting it" (15)
- S0115L01 "I don't feel as if I'm ready to have a conversation" (15)

Fix: split at the clause, using the shortest viable cut (Kai 17 Nov). For S0117L01 that is "I'm definitely doing better | than I was last time | we talked to each other". **likely.** L3. Costs new LEGO clips and intros (not priced).

**J9. Seed sentences the learner never says. 74 REAL.** Examples: seeds 4, 15, 16, 18, 24, 28, 36, 39, 44–49. Fix: add the seed as a USE row reusing its own clips (P26). 0 chars. 87 more seeds are said in English with a differently worded Japanese prompt. These are not a defect for P26, because the learner does say the English; the garbled ones among them are in J2. 5 seeds collide with a played row that has the same Japanese and different English (192, 198, 202, 244, 248). Use the seed's English in that row.

## eng_for_kor

**K1. Question asked with a statement prompt. 45 REAL, all read.** In the 해요 form, "you want to meet" and "do you want to meet?" are the same words; only the ? and the voice tell them apart. Examples:
- S0154L01U01 토요일에 만나고 싶어요 | do you want to meet on saturday?
- S0021L03B02 영어를 배우고 있어요 | are you learning English?
- S0271L01B02 우리와 함께 오고 싶어요 | would you like to come with us?

Fix: add ? to the Korean and re-voice the known clip. **sure** for yes/no questions, **likely** for wh-questions. A7, A9. ≈ 600 chars.

**K2. Prompt and answer do not match. 22 REAL, read.**
- S0155L03U02 내일 아침에 만나고 싶어요 | where do you want to meet tomorrow morning?
- S0158L01U02 다른 것에 대해 이야기해요, 괜찮아요? | I don't mind but let's talk about something else
- S0148L01U01 별로 인내심이 없었어요 | I don't know why he wasn't very patient

In 12 basket pairs the English adds words the prompt does not have. For example, S0100L02B02 그것에 대해 걱정하지 않아도 돼요 | you shouldn't worry about it **this evening**. Fix: make the prompt say what the English says. **sure.** ≈ 350 chars.

**K3. Garbled BUILD prompts. 10 REAL.**
- S0230L01B04 저는 젊은 남자를 알아요, 일하고 싶은
- S0233L02B03 저는 젊은 여자를 알아요, 아는
- S0067L01B01 왜 싶어요 (ungrammatical)

Fix: use the seed's own word order. **likely.** ≈ 180 chars.

**K4. LEGO-level items. 12 REAL, read with seed and basket.**
- S0090L01 *good | 좋은* is not in seed 90, and all 8 of its rows say "more slowly" → re-cut to *more slowly | 더 천천히*.
- S0061L02 is a second *again* debut, and its basket is "could you / could you say? / could you explain?" → re-cut to *could you say that | 말해줄 수 있어요*.
- ZUT clashes:
  - 열심히 일해야 해요 = need to / must (S0106L03/S0109L02) → give the must one 해야만.
  - 싶지 않아요 = I wouldn't like to / I don't want (S0012L01) → give S0012L01 하고 싶지는 않아요 (best guess).
  - 아무것도 = anything / nothing → S0146L01 folds into S0146L02.
- S0160L01 *how*: none of its 6 rows says "how".
- English not in its seed: S0049L01, S0059L01, S0109L03, S0138L01.
- S0207L01 and S0257L01 are not-new with no earlier pair.
- The Korean seeds 200, 279 and 280 leave out "make sure", "left" and "had to" (the LEGOs already have them).

**K5. Untaught words: 17 REAL** (the detector said 35; 18 were its error). Most are *talk* before 88, *a lot* before 89, and *don't* before 19. **Duplicates: 8 REAL** (delete). **Seed never said: 17 REAL** (P26). **LEGOs over 8 syllables: 12** (the builder's estimate said 0), e.g. S0024L02 "I'm not going to be able to" (9) and S0122L02 "I'm excited about how it's going" (10). **English fragments: 4** ("could you say?", "what your name is?").

## eng_for_zho

**Z1. Known side slipped against the English inside baskets, seeds 64–73 (plus 11 and 34). 19 REAL, read.**
- S0071L02U01 现在让任何人听到这个真相 | We didn't want to let anyone hear the truth (the negation is lost)
- S0069L01U01 我不确定我是否想照顾你 | She wants to look after you
- S0066L01U01 同时做所有事情很难 | It's not difficult to speak a little English
- S0073L02U03 在明天之前我还有更多要学 | I've got more to learn and it's not easy

Fix: re-pair each prompt with its own English (the right prompt usually sits on a neighbouring row in the same basket). **sure.** ≈ 200 chars.

**Z2. LEGO-level items. 13 REAL.**
- Chinese that belongs to another LEGO:
  - S0011L01 *to be able | 我想* (should be 能)
  - S0057L01 *can't remember | 说* (should be 记不住)
  - S0059L02 *next week | 做* (should be 下周)
  - S0097L01 *yes | 好*, which clashes with *well | 好* (use the seed's 是的)
- English not in its seed, while all the rows say the seed's word (fix the LEGO, not the rows):
  - S0012L02 *Doesn't want* (seed: wouldn't like)
  - S0026L03 *Seems* (seed: as if)
  - S0033L01 *A long time* (seed: how long)
  - S0055L03 *Doesn't like* (seed: don't enjoy)
  - S0218L01 *How much* (seed: much)
  - S0103L02 *More* (rows say many)
- Other LEGO-level:
  - S0034L02 *To be quiet*: its 4 rows are "When you are talking" over broken Chinese 的时候你在说话.
  - 那不是 = that wasn't / that isn't what → put each inside its seed piece.
  - **Gapped LEGOs (L32): 4.** S0032L02 你想...吗, S0042L03 我开始觉得...了, S0077L02 对...速度感到惊讶, S0138L01 这就是...的地方.

**Z3. Question with a statement prompt: 8 REAL.** S0075L01B01 你还有更多要学的 | Have you got more to learn?; S0119L01B01 我能问你 | Can I ask you? → add 吗/？. **Garbled: 5** (S0044L01U06 uses 或者 in a question, where 还是 is right). **English not natural: 13.** BUILD rows with a time word bolted on: S0271L01B02 "Would you like to come with us next month **now**?", S0157L02B02 "Next month now", S0182L01B03 "Have you seen here?", S0150L02B01 "What your name is?". Fix: delete or reword. **sure.**

**Z4.** **Untaught words: 34 REAL** (the detector said 76). Most are early rows using words from seeds 5–18, plus *still*, *myself*, *every*, *prefer* (never taught). **Duplicates: 7.** **Seed never said: 22.** **LEGOs over 8 syllables: 53**, e.g. S0287L01 "How many people do you know who like watching television" (17) and S0235L01 (15).

## eng_for_ara

- **Untaught words: 38 REAL, all read.** 26 are *every* (never taught): "every day", "every time", "every week". Fix: delete the USE rows, reword the 3 BUILD rows. **sure.** ≈ 500 chars.
- **Empty audio: 1 REAL.** S0201L02B03 has empty target1 and target2 (A16). Render through /api/audio/render. 62 chars.
- **Seed never said: 46 REAL**, e.g. seeds 8, 10, 12, 15, 24, 29 → add USE rows reusing the seed clips (P26). 0 chars.
- **LEGO items: 5.** S0049L02 *you understand* is not in the English seed → "you know | تعرف" (likely). S0045L02B03 and S0054L01B03 do not contain their LEGO (K50). S0207L01, S0228L02 and S0257L01 are not-new with no earlier pair.
- **English not natural: 4.** S0048L01B02 "I don't care if I need too much time" (the deu #435 *need time* calque), S0157L02B03 "next month soon", and the fragments "could you?" and "what your name is?". **Duplicates: 3.** **LEGOs over 8 syllables: 16** (the builder's estimate said 0), e.g. S0122L02 (10).
- 23 known-side "LEGO not in seed" hits: 22 are Arabic clitics written apart (و، بـ، لـ; L28) or case endings (K6), and are not a defect. The one real one is S0049L02 above.

## All four: seed 108
"we didn't hope to wake in the middle of the night" is the LEGO and about 10 rows in each course; in these courses the learner has to say it. Natural English is "we were hoping not to wake up in the middle of the night". **likely.** This is a proposal only: it is the shared English seed text (R0.18). Canon K9. ≈ 3,600 chars across the four courses.

---

## Patterns added (`eng-asia.patterns.json`; all pass calibration)
- **English-target patterns from deu #435's English fixes:** reflexive *feel myself*, *want + -ing*, *go with the bus*, simple present for progressive, missing backshift, adverb after the verb, *how long have you already*, *need too much time*. Hits in this slice: 1 (ara S0048L01B02).
- **From this scan:** missing apostrophes (12 jpn), time-word bolted on (5 zho, 1 ara), bare-auxiliary fragments (33 across the four, 27 REAL), run-on answer (13 jpn), *didn't hope to* (38).
- **From the two prior fix records for this slice:** English text on the known side (a135, eng_for_kor, 17 Aug) and brackets (#973·P unbracket, eng_for_jpn, 14 Oct). Both are **0 live in all four courses**, so those fixes held. Their known positives are planted shapes.

## Coverage

| family | jpn | kor | zho | ara |
|---|---|---|---|---|
| ZUT LEGO/seed | scanned (0) | scanned, 3 REAL | scanned, 2 REAL | scanned (0) |
| ZUT on USE rows | read: phrase-level only (Kai 21 Oct, not a blocker); S0226–230 rows go to J1 | read | read (the 64–73 slips are in Z1) | — |
| prompt is only the LEGO (new detector) | 192 REAL | 2 REAL | 0 | 0 |
| prompt/answer mismatch | **partial**: question-mark, same-prompt and seed-sentence reads only | partial, same | partial, same | partial, same |
| untaught target words | scanned, detector corrected | same | same | same |
| phrase missing its LEGO | read | read (LEGO fixes) | read (LEGO fixes) | read |
| LEGO over 8 syllables | hand-checked count | same | same | same |
| gapped LEGO | 0 | 0 | 4 | 0 |
| not-new / double debut | read | read | read | read |
| dup rows | read | read | read | read |
| empty audio | 0 | 0 | 0 | 1 |
| seed never said | read | read | read | read |
| question marks | read: か/の endings not a defect | all read | 吗/wh endings not a defect; rest read | 0 hits |
| known side has English / brackets | 0 | 0 | 0 | 0 |
| lexical English | run | run | run | run |
| intro wording | **not scanned** | not scanned | not scanned | not scanned |
| female voice / clip ≠ text | not scanned (needs an ear, A22) | same | same | same |

## Gaps
1. **The full known-side read of eng_for_jpn was not done.** The read covered the 201 non-か question rows, 18 same-prompt groups and 170 seed rows, and it found 174 mismatched or garbled prompts plus the 192 J1 rows. The rate in the rows I read suggests many more in the other ~9,000 rows. I have **not put a number on them**. This needs a dedicated read, shaped like deu #435 (shards by seed range, every row read, Japanese vs English). Smaller versions of the same need exist for eng_for_kor (the 해요 statement/question ambiguity also hides in USE rows that end in a ?-less clause) and eng_for_zho seeds 60–80.
2. **There is a bug in the shared detector.** `detect.cjs` untaught_target takes a word's first appearance from LEGOs before it looks at seeds. A word in an early seed whose first LEGO comes later is therefore flagged as untaught. That gave 27 false hits on jpn, 18 on kor and 42 on zho. I recomputed the family with the seed counted at its own number, and the counts above use that. The shared tool is not edited; the orchestrator should know, because other slices use it too.
3. **The builder's syllable estimate under-counts English.** It said kor and ara have 0 LEGOs over 8; a hand count says 12 and 16. The counts above use a vowel-group count with English exceptions, spot-checked by hand. 7–8 syllable LEGOs are counted (jpn 26, kor 32, zho 41, ara 46) but not listed one by one.
4. **The Japanese question-mark convention is ruled "not a defect" by my judgement, not by a canon entry.** か already makes the prompt a question. A9 says a ? must be there before audio is made, but these clips already exist. If Kai wants ？ added and the known clips re-voiced, it is 571 jpn rows (≈ 9,000 chars) and 266 zho rows (≈ 2,700 chars).
5. **Not read:** intro (presentation) wording, any clip by ear, and Popty's edit-event history (admin login). The audio-pass queue shows one pending pass per course from 12 Oct, and blocked "pod awaiting voice approval" on all four. I did not look into either.

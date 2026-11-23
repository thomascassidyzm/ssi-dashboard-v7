# Paid cleanup item 6 — wrong target-language form: the plan (cs #703·AI, 18 Nov)

Section 6 of the combined list (d/23c5a220): 311 rows in 13 courses. Every row was re-read live through Popty (script-view, 18 Nov) before planning; 309 were unchanged since the scan, 1 was already fixed (deu S0513L03B01), 1 is a combined id. **Nothing is applied yet.**

**How each change was checked (offline, before any write).** `ops/paid-cleanup-item6-703/check.cjs` applies the plan in memory to a Popty dump of the whole course and runs the course-builder validator's own pure checks on every touched seed, before vs after (tiling, LEGO containment, BUILD/USE floors, untaught vocabulary — the same functions `POST /api/v2/validate` runs), plus a whole-course one-known-two-targets (ZUT) scan for every edited row and a duplicate scan per basket. A change that added an issue was reworked; the few that remain are listed under each course with the reason. Rows marked *extra* are not in the scan list: they are the same defect found by a course-wide sweep (canon R0.4 step 3) or the knock-on a fix obliges (seed→LEGO→basket, L26/P17/O12).

**Actions:** edit · delete · hold (left as is, reason given — evidence or rules could not settle it) · keep (scan row judged not a defect) · already-fixed.

| course | scope rows | extra rows | edit | delete | hold | keep | chars (est.) |
|---|---|---|---|---|---|---|---|
| jpn_for_eng | 78 | 46 | 100 | 21 | 3 | 0 | 3,733 |
| kor_for_tam | 86 | 35 | 116 | 4 | 0 | 1 | 3,688 |
| por_for_eng | 57 | 4 | 46 | 14 | 0 | 1 | 4,703 |
| ara_for_eng | 24 | 10 | 31 | 3 | 0 | 0 | 2,989 |
| ara_eg_for_eng | 7 | 0 | 2 | 2 | 3 | 0 | 123 |
| kor_for_hin | 17 | 16 | 27 | 2 | 4 | 0 | 1,011 |
| ita_for_eng | 13 | 0 | 10 | 0 | 2 | 1 | 866 |
| spa_for_eng | 12 | 0 | 11 | 1 | 0 | 0 | 1,406 |
| fra_for_eng | 8 | 0 | 7 | 1 | 0 | 0 | 564 |
| zho_for_jpn | 6 | 5 | 10 | 0 | 0 | 1 | 161 |
| deu_for_eng | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| deu_ch_for_eng | 1 | 0 | 1 | 0 | 0 | 0 | 63 |
| eng_for_hin | 1 | 0 | 1 | 0 | 0 | 0 | 0 |

Audio estimate 19,307 characters before library-first (cap 30,000). Known side = 1 clip, target = 2 voices, LEGO with a new English = new presentation.


## jpn_for_eng

**Defects:**
- D1: canonical English "they wanted…" over subjectless 助けを求めたかった, which means "I/we wanted…"
- D2: seed copy follows the seed
- D3: "we wanted to ask for help" would now be an exact copy of the seed row U10
- D4: "she wanted…" over bare たかった (= I/we)
- D5: "he wanted…" over bare たかった
- D6: "she wanted … from her mother" over bare たかった (母 = my mother)
- D7: "they wanted … when they were busy" over bare たかった
- D8: "they wanted…" over bare たかった
- D9: canonical "he wants to pay half" over subjectless 半分払いたい (= I/we want)
- D10: canonical "she doesn't want to seem unfriendly" over subjectless 冷たく見られたくない (= I/we)
- D11: LEGO English "doesn't want…" must carry the seed's words (L26) once the seed says "we don't"
- D12: bare LEGO copy follows its LEGO
- D13: he/she/they English over bare たい/たかった, which says "I/we"
- D14: stated third person + present -tai in the seed sentence
- D15: 彼は/彼女は + 戻りたい (a stated third person with -tai)
- D16: stated third person (彼は/彼女は/友だちは) + -tai
- D17: 母は … 待ちたくない: stated third person with -tai
- D18: 彼女はやめたくない (stated third person + -tai)
- D19: "no" over うん (yes)
- D20: LEGO "no | うん": うん means yes
- D21: "no, …" over うん、…
- D22: "no, do you mind if I wait here?" is not a sensible answer in either language
- D23: "we didn't hope to wake…" over とは思ってなかった (didn't expect)
- D24: LEGO "didn't hope to" over とは思ってなかった
- D25: row English follows the re-glossed LEGO (O12)
- D26: LEGO "to relax | 休みたい" drops the want
- D27: LEGO "keep on doing | 続けたい" drops the want
- D28: LEGO "make sure that | ようにしたい" drops the want
- D29: ようにしたい必要があるらしい is not Japanese (-tai form before 必要がある)
- D30: LEGO "with other people | 他の人とも": も is "too"
- D31: "what kind of feeling" is not English
- D32: "what kind of feeling now" is not English (and "how do you feel now" would copy U01)
- D33: as B01
- D34: seed English "can't remember" over 覚えてない
- D35: LEGO clashes with S0057L01
- D36: LEGO "if I could" in a seed about "he"
- D37: "I was hoping to see you / we could…" over ～てほしかった, which means "I wanted you to…"
- D38: "hoped to see you | あなたを見たかった": 見る said of a person means "look at"; meeting someone is 会う
- D39: "I want you to say that again" over a plain request もう一度言って
- D40: "why do you want | なんで": the English says more than なんで
- D41: "I want the car | 車を": 車を is only "the car" (object)
- D42: English drops "what's" in a copy of the seed
- D43: two sentences in one seed row (。) where the English is one
- D44: two sentences in one row (P20)

**Sources / reasoning:**
- S1: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu". English follows the Japanese, as Kai accepted for 37 jpn seeds on 29 Oct (held group B, edit event ce05e9f6) and as #421 recommended for 428 ("たい is only you or I"). The seed English moves to "we" (a plural first person, the nearest to the canonical "they" that bare たい can carry).
- S2: P26 seed copy
- S3: duplicate
- S4: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu" — a third person's past wish with the hearsay らしい (taught S0200, the seed before) is correct Japanese and keeps a "they" row
- S5: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"
- S6: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"; 母 is the speaker's own mother
- S7: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"; らしい S0200
- S8: P26
- S9: L26; presentation follows (O13)
- S10: O12
- S11: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"; English follows the Japanese (precedent ce05e9f6)
- S12: The seed sentence itself has the defect (stated 彼は/彼女は + -tai). The grammatical fix (-たがる) would replace the seed's LEGO, and that LEGO is the ONLY place the course teaches 戻りたい (16) / 静かにしたくない (34) / 読みたくない (35): 52 rows depend on them (incl. 10 in seeds 313–407), which would become untaught (P1). The other correct forms (…たいって, …たいらしい, …たいみたい) are untaught at seeds 16–35 and need a new LEGO on a released course (structural; Tom's or Kai's go). A seed rebuild with whole-course blast radius (S11/O1), not a row fix: left as is and listed. Bare たい after 彼は is common in casual speech; textbooks mark it (DBJG), so the scan rated this "likely", not "sure".
- S13: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu". The fix stays inside what the course teaches: -たがってる is taught only as the whole chunk 知りたがってる (seed 17), so 戻りたがってる/会いたがってる/やめたがらない do not tile (K21, P2); each row moves to the first person (keeping its LEGO, P17) or, in a 彼は/彼女は basket, to the plain verb (戻る is S0016L01's component, usable alone — K29)
- S14: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu"; the LEGO is 待ちたくない, so -たがらない would break containment (P17): the row moves to the first person instead
- S15: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu". The fix stays inside what the course teaches: -たがってる is taught only as the whole chunk 知りたがってる (seed 17), so 戻りたがってる/会いたがってる/やめたがらない do not tile (K21, P2); each row moves to the first person (keeping its LEGO, P17) or, in a 彼は/彼女は basket, to the plain verb (戻る is S0016L01's component, usable alone — K29); no distinct first-person rewrite left in this basket (U01/U02/U05 cover it)
- S16: うん is "yes"; casual "no" is ううん (大辞林 "ううん": 否定・不承知の返事; DBJG appendix on responses). Kept the canonical English and fixed the Japanese instead of the scan's "yes" + not-new + 12 deletes: the course has no other "no" before 309 ("nope | いや"), and ううん + positive answer to a negative question ("ううん、好き") is natural
- S17: うん is "yes"; casual "no" is ううん (大辞林 "ううん": 否定・不承知の返事; DBJG appendix on responses). Kept the canonical English and fixed the Japanese instead of the scan's "yes" + not-new + 12 deletes: the course has no other "no" before 309 ("nope | いや"), and ううん + positive answer to a negative question ("ううん、好き") is natural; presentation English unchanged, target clip re-voiced
- S18: meaning
- S19: とは思ってなかった = "didn't think/expect that" (DBJG "to omou"; とは adds surprise). The canonical "didn't hope to wake" is also broken English (item 5 raises the same seed for eng_for_*); in jpn the Japanese decides it: "didn't expect to wake up"
- S20: とは思ってなかった = "didn't think/expect that" (DBJG "to omou"; とは adds surprise). The canonical "didn't hope to wake" is also broken English (item 5 raises the same seed for eng_for_*); in jpn the Japanese decides it: "didn't expect to wake up"; presentation follows (O13)
- S21: L26 (the seed says "I'd like to relax"); 休みたい = want to rest; presentation follows
- S22: L26 (seed "I want to keep on doing a little more"); presentation follows
- S23: L26 (seed "…want to make sure that…"); presentation follows
- S24: DBJG "-tai" (a -tai adjective cannot head 必要がある)
- S25: L26 (seed "…with other people too"); DBJG "mo"; presentation follows
- S26: L26 (seed "how do you feel at the moment?"); presentation follows
- S27: 彼は S0016L03
- S28: 今朝は from U05
- S29: S0113L03 "I can't remember | 覚えてない" and S0057L01 "can't remember | 思い出せない": one English, two answers (P16/K22). 覚えてない = "don't remember" (stative -te iru of 覚える, DBJG "oboeru"); English follows the Japanese (precedent ce05e9f6), seed included so the LEGO still uses only the seed's words (L26)
- S30: S0113L03 "I can't remember | 覚えてない" and S0057L01 "can't remember | 思い出せない": one English, two answers (P16/K22). 覚えてない = "don't remember" (stative -te iru of 覚える, DBJG "oboeru"); English follows the Japanese (precedent ce05e9f6), seed included so the LEGO still uses only the seed's words (L26); presentation follows
- S31: L26 (seed "he would give you an answer if he could"); できたら has no subject; presentation follows
- S32: Makino & Tsutsui, A Dictionary of Basic Japanese Grammar, "-tai" (Note 3: -tai expresses the speaker's own wish, or the listener's in a question; a third person's wish needs -tagaru, or an evidential such as らしい/そうだ) and "-garu" "-te hoshii": X-te hoshii = "I want (someone) to X"
- S33: DBJG "miru"; Jisho/大辞林 見る vs 会う
- S34: meaning (-te request, DBJG "-te kudasai"); the scan's English "say that again" would copy U02 exactly, so the row goes
- S35: seed copy (P26): seed English; link the seed's own known clip, 0 chars
- S36: P20; same fix #421 proposed for 73/96/173/193
- S37: P20; as #434 deleted S0166L01U07

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **SEED212** (seed, #56) EDIT: `they wanted to ask for help | 助けを求めたかった` → `we wanted to ask for help | =` — [D1] [S1] sure
- **S0212L01U10** (phrase, #72) EDIT: `they wanted to ask for help | 助けを求めたかった` → `we wanted to ask for help | =` — [D2] [S2] sure
- **S0212L01B04** (phrase, extra) DELETE: `we wanted to ask for help | 助けを求めたかった` — [D3] [S3] sure — note: BUILD floor 3 → 2 (warn-only, P23)
- **S0212L01B03** (phrase, #67) EDIT: `she wanted to ask for help | 助けを求めたかった` → `they say they wanted to ask for help | 助けを求めたかったらしい` — [D4] [S4] sure
- **S0212L01U01** (phrase, #68) EDIT: `he wanted to ask for help yesterday | 昨日助けを求めたかった` → `I wanted to ask for help yesterday | =` — [D5] [S5] sure
- **S0212L01U02** (phrase, #69) EDIT: `she wanted to ask for help from her mother | 母に助けを求めたかった` → `I wanted to ask my mother for help | =` — [D6] [S6] sure
- **S0212L01U04** (phrase, #70) EDIT: `he wanted to ask for help then | その時助けを求めたかった` → `I wanted to ask for help then | =` — [D5] [S5] sure
- **S0212L01U05** (phrase, #71) EDIT: `they wanted to ask for help when they were busy | 忙しい時助けを求めたかった` → `they say they wanted to ask for help when they were busy | 忙しい時助けを求めたかったらしい` — [D7] [S7] sure
- **S0212L01U08** (phrase, extra) EDIT: `they wanted to ask for help but didn't | 助けを求めたかったけどしなかった` → `I wanted to ask for help but didn't | =` — [D8] [S5] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **SEED299** (seed, #57) EDIT: `he wants to pay half | 半分払いたい` → `we want to pay half | =` — [D9] [S1] sure
- **S0299L02B03** (phrase, #77) EDIT: `he wants to pay half | 半分払いたい` → `we want to pay half | =` — [D2] [S8] sure
- **SEED300** (seed, #58) EDIT: `she doesn't want to seem unfriendly | 冷たく見られたくない` → `we don't want to seem unfriendly | =` — [D10] [S1] sure
- **S0300L02** (lego, extra) EDIT: `doesn't want to seem unfriendly | 冷たく見られたくない` → `don't want to seem unfriendly | =` — [D11] [S9] sure
- **S0300L02B01** (phrase, extra) EDIT: `doesn't want to seem unfriendly | 冷たく見られたくない` → `don't want to seem unfriendly | =` — [D12] [S10] sure
- **S0300L02B03** (phrase, #78) EDIT: `she doesn't want to seem unfriendly | 冷たく見られたくない` → `we don't want to seem unfriendly | =` — [D2] [S8] sure
- **S0052L01U04** (phrase, #59) EDIT: `he wanted to come back | 戻りたかった` → `I wanted to come back | =` — [D13] [S11] sure
- **S0052L01U08** (phrase, #60) EDIT: `he wanted to speak Japanese | 日本語を話したかった` → `I wanted to speak Japanese | =` — [D13] [S11] sure
- **S0200L02B03** (phrase, #61) EDIT: `they want to make sure that we finish in time | 時間通り終わるようにしたい` → `I want to make sure that we finish in time | =` — [D13] [S11] sure
- **S0211L02B04** (phrase, #62) EDIT: `they don't want to explain right now | 今は説明したくない` → `I don't want to explain right now | =` — [D13] [S11] sure
- **S0211L02U02** (phrase, #63) EDIT: `she doesn't want to explain the method | 方法を説明したくない` → `I don't want to explain the method | =` — [D13] [S11] sure
- **S0211L02U03** (phrase, #64) EDIT: `he doesn't want to explain the reason | 理由を説明したくない` → `I don't want to explain the reason | =` — [D13] [S11] sure
- **S0211L02U05** (phrase, #65) EDIT: `he doesn't want to explain more | もっと説明したくない` → `I don't want to explain more | =` — [D13] [S11] sure
- **S0211L02U07** (phrase, #66) EDIT: `she doesn't want to explain again | もう一度説明したくない` → `I don't want to explain again | =` — [D13] [S11] sure
- **S0214L01U07** (phrase, #73) EDIT: `he wanted to rest at the weekend | 週末休みたかった` → `I wanted to rest at the weekend | =` — [D13] [S11] sure
- **S0215L01U07** (phrase, #74) EDIT: `she wanted to work on Saturday | 土曜働きたかった` → `I wanted to work on Saturday | =` — [D13] [S11] sure
- **S0215L02U07** (phrase, #75) EDIT: `he wanted to go out on Saturday night | 土曜の夜出かけたかった` → `I wanted to go out on Saturday night | =` — [D13] [S11] sure
- **S0216L01U07** (phrase, #76) EDIT: `they wanted to meet a few friends | 何人か友だちに会いたかった` → `we wanted to meet a few friends | =` — [D13] [S11] sure
- **SEED16** (seed, #79) HOLD: `he wants to come back with everyone else later on | 彼は、あとでみんなと一緒に戻りたい` — [D14] [S12] n/a
- **SEED34** (seed, #80) HOLD: `he doesn't want to be quiet when other people are here | 他の人がいると、彼は静かにしたくない` — [D14] [S12] n/a
- **SEED35** (seed, #81) HOLD: `she doesn't want to read anything this afternoon | 彼女は今日の午後、何も読みたくない` — [D14] [S12] n/a
- **S0016L03B01** (phrase, #82) EDIT: `he wants to go back | 彼は戻りたい` → `he'll go back later | 彼はあとで戻る` — [D15] [S13] sure
- **S0016L03U01** (phrase, #83) EDIT: `he wants to go back | 彼は戻りたい` → `he'll go back with everyone | 彼はみんなと戻る` — [D15] [S13] sure
- **S0016L03U04** (phrase, #84) EDIT: `he wants to go back with everyone later | 彼はあとでみんなと戻りたい` → `he'll go back together | 彼は一緒に戻る` — [D15] [S13] sure
- **S0017L03U05** (phrase, #85) EDIT: `she wants to go back later | 彼女はあとで戻りたい` → `she'll go back later | 彼女はあとで戻る` — [D15] [S13] sure
- **S0018L03U03** (phrase, #88) EDIT: `he wants to go back this evening | 彼は今夜戻りたい` → `he'll go back this evening | 彼は今夜戻る` — [D15] [S13] sure
- **S0020L02U03** (phrase, #91) EDIT: `he wants to go back quickly | 彼は早く戻りたい` → `he'll go back quickly | 彼は早く戻る` — [D15] [S13] sure
- **S0018L01U03** (phrase, #86) EDIT: `he wants to meet everyone | 彼はみんなと会いたい` → `I want to meet everyone | みんなと会いたい` — [D16] [S13] sure
- **S0018L01U04** (phrase, #87) EDIT: `she really wants to meet | 彼女はすごく会いたい` → `I really want to meet | すごく会いたい` — [D16] [S13] sure
- **S0019L01U03** (phrase, #89) EDIT: `he doesn't want to stop | 彼はやめたくない` → `I don't want to stop tomorrow either | 明日もやめたくない` — [D16] [S13] sure
- **S0022L01U03** (phrase, #92) EDIT: `she wants to meet people | 彼女は人に会いたい` → `I want to meet people tomorrow | 明日人に会いたい` — [D16] [S13] sure
- **S0022L01U05** (phrase, #93) EDIT: `he wants to meet people quickly | 彼は早く人に会いたい` → `I want to meet people quickly | 早く人に会いたい` — [D16] [S13] sure
- **S0034L01B02** (phrase, #94) EDIT: `he doesn't want to be quiet | 彼は静かにしたくない` → `don't want to be quiet today | 今日は静かにしたくない` — [D16] [S13] sure
- **S0034L01B03** (phrase, #95) EDIT: `she doesn't want to be quiet | 彼女は静かにしたくない` → `don't want to be quiet later | あとで静かにしたくない` — [D16] [S13] sure
- **S0034L01U01** (phrase, #96) EDIT: `he doesn't want to be quiet | 彼は静かにしたくない` → `I don't want to be quiet tonight | 今夜静かにしたくない` — [D16] [S13] sure
- **S0034L01U02** (phrase, #97) EDIT: `she doesn't want to be quiet | 彼女は静かにしたくない` → `I don't want to be quiet tomorrow either | 明日も静かにしたくない` — [D16] [S13] sure
- **S0035L01U02** (phrase, #98) EDIT: `she doesn't want to read | 彼女は読みたくない` → `I don't want to read today | 今日は読みたくない` — [D16] [S13] sure
- **S0035L01U03** (phrase, #99) EDIT: `he doesn't want to read the sentence | 彼は文を読みたくない` → `I don't want to read the sentence now | 今、文を読みたくない` — [D16] [S13] sure
- **S0035L02U03** (phrase, #100) EDIT: `she doesn't want to read anything | 彼女は何も読みたくない` → `I don't want to read anything today | 今日は何も読みたくない` — [D16] [S13] sure
- **S0035L03U02** (phrase, #101) EDIT: `she doesn't want to read this afternoon | 彼女は今日の午後読みたくない` → `I don't want to read this afternoon | 今日の午後読みたくない` — [D16] [S13] sure
- **S0036L01U04** (phrase, #102) EDIT: `he doesn't want to interrupt | 彼は邪魔したくない` → `I don't want to interrupt today | 今日は邪魔したくない` — [D16] [S13] sure
- **S0265L01U05** (phrase, #103) EDIT: `my friend wants to help you with something important | 友だちは大事なことであなたを助けたい` → `I want to help my friend with something important | 大事なことで友だちを助けたい` — [D16] [S13] sure
- **S0269L02U01** (phrase, #104) EDIT: `my mother doesn't want to wait for two days | 母は二日間待ちたくない` → `I don't want to wait for two days | 二日間待ちたくない` — [D17] [S14] sure
- **S0019L01U04** (phrase, #90) DELETE: `she doesn't want to stop | 彼女はやめたくない` — [D18] [S15] sure
- **SEED282** (seed, extra) EDIT: `no that's not a problem | うん、問題ない` → `= | ううん、問題ない` — [D19] [S16] sure
- **S0282L01** (lego, #105) EDIT: `no | うん` → `= | ううん` — [D20] [S17] sure
- **S0282L01B01** (phrase, extra) EDIT: `no, I like it | うん、好き` → `= | ううん、好き` — [D21] [S16] sure
- **S0282L01B02** (phrase, extra) EDIT: `no, that's perfect | うん、完璧` → `= | ううん、完璧` — [D21] [S16] sure
- **S0282L01B03** (phrase, extra) EDIT: `no, that's good | うん、いいね` → `= | ううん、いいね` — [D21] [S16] sure
- **S0282L01U01** (phrase, extra) EDIT: `no, I understand | うん、分かる` → `= | ううん、分かる` — [D21] [S16] sure
- **S0282L01U02** (phrase, extra) EDIT: `no, I know | うん、知ってる` → `= | ううん、知ってる` — [D21] [S16] sure
- **S0282L01U03** (phrase, extra) EDIT: `no, I want to go | うん、行きたい` → `= | ううん、行きたい` — [D21] [S16] sure
- **S0282L01U04** (phrase, extra) EDIT: `no, I can help you | うん、手伝える` → `= | ううん、手伝える` — [D21] [S16] sure
- **S0282L01U05** (phrase, extra) EDIT: `no, I'm watching television now | うん、今テレビ見てる` → `= | ううん、今テレビ見てる` — [D21] [S16] sure
- **S0282L01U06** (phrase, extra) EDIT: `no, I know your friend | うん、友だち知ってる` → `= | ううん、友だち知ってる` — [D21] [S16] sure
- **S0282L01U07** (phrase, extra) EDIT: `no, I want coffee | うん、コーヒー飲みたい` → `= | ううん、コーヒー飲みたい` — [D21] [S16] sure
- **S0282L01U09** (phrase, extra) EDIT: `no, I'm going to finish my work before I leave | うん、帰る前に仕事終わらせる` → `= | ううん、帰る前に仕事終わらせる` — [D21] [S16] sure
- **S0282L01U10** (phrase, extra) EDIT: `no that's not a problem | うん、問題ない` → `= | ううん、問題ない` — [D21] [S16] sure
- **S0282L01U08** (phrase, extra) DELETE: `no, do you mind if I wait here? | うん、ここで待っていい？` — [D22] [S18] sure
- **SEED108** (seed, #106) EDIT: `we didn't hope to wake in the middle of the night | 夜中に起きるとは思ってなかった` → `we didn't expect to wake up in the middle of the night | =` — [D23] [S19] sure
- **S0108L03** (lego, #107) EDIT: `didn't hope to | とは思ってなかった` → `didn't expect to | =` — [D24] [S20] sure
- **S0108L03B01** (phrase, extra) EDIT: `didn't hope to | とは思ってなかった` → `didn't expect to | =` — [D25] [S19] sure
- **S0108L03B02** (phrase, extra) EDIT: `I didn't hope to do it | するとは思ってなかった` → `I didn't expect to do it | =` — [D25] [S19] sure
- **S0108L03B03** (phrase, extra) EDIT: `I didn't hope to see it | 見るとは思ってなかった` → `I didn't expect to see it | =` — [D25] [S19] sure
- **S0108L03B04** (phrase, extra) EDIT: `I didn't hope to know it | 知るとは思ってなかった` → `I didn't expect to know it | =` — [D25] [S19] sure
- **S0108L03U03** (phrase, extra) EDIT: `I didn't hope to change my way of doing it | やり方を変えるとは思ってなかった` → `I didn't expect to change my way of doing it | =` — [D25] [S19] sure
- **S0108L03U05** (phrase, extra) EDIT: `I didn't hope to see what you were doing | 何をしてるか見るとは思ってなかった` → `I didn't expect to see what you were doing | =` — [D25] [S19] sure
- **S0108L03U06** (phrase, extra) EDIT: `I didn't hope to find the answer | 答えを見つけるとは思ってなかった` → `I didn't expect to find the answer | =` — [D25] [S19] sure
- **S0108L03U07** (phrase, extra) EDIT: `that is why I didn't hope to feel happy | だから楽しいと感じるとは思ってなかった` → `that is why I didn't expect to feel happy | =` — [D25] [S19] sure
- **S0108L03U08** (phrase, extra) EDIT: `we didn't hope to wake in the middle of the night | 夜中に起きるとは思ってなかった` → `we didn't expect to wake up in the middle of the night | =` — [D25] [S19] sure
- **S0110L03** (lego, #108) EDIT: `to relax | 休みたい` → `I'd like to relax | =` — [D26] [S21] sure
- **S0110L03B01** (phrase, extra) EDIT: `to relax | 休みたい` → `I'd like to relax | =` — [D12] [S10] sure
- **S0092L02** (lego, #109) EDIT: `keep on doing | 続けたい` → `want to keep on doing | =` — [D27] [S22] sure
- **S0200L02** (lego, #110) EDIT: `make sure that | ようにしたい` → `want to make sure | =` — [D28] [S23] sure
- **S0200L02U08** (phrase, extra) DELETE: `they say we need to make sure that people can work in time | 人が時間通り働けるようにしたい必要があるらしい` — [D29] [S24] sure
- **S0005L02** (lego, #111) EDIT: `with other people | 他の人とも` → `with other people too | =` — [D30] [S25] sure
- **S0040L01** (lego, #112) EDIT: `what kind of feeling | どんな気分` → `how do you feel | =` — [D31] [S26] sure
- **S0040L01B01** (phrase, extra) EDIT: `what kind of feeling now | 今、どんな気分` → `how does he feel now? | 彼は今、どんな気分？` — [D32] [S27] sure
- **S0040L01B02** (phrase, extra) EDIT: `what kind of feeling today | 今日はどんな気分` → `how does he feel today? | 彼は今日はどんな気分？` — [D33] [S27] sure
- **S0040L01B03** (phrase, extra) EDIT: `what kind of feeling this morning | 今朝はどんな気分` → `how does he feel this morning? | 彼は今朝はどんな気分？` — [D33] [S28] sure
- **SEED113** (seed, extra) EDIT: `why can't I remember what you said? | なんで今のを覚えてないんだろう` → `why don't I remember what you said? | =` — [D34] [S29] sure
- **S0113L03** (lego, #113) EDIT: `I can't remember | 覚えてない` → `I don't remember | =` — [D35] [S30] sure
- **S0113L03B01** (phrase, extra) EDIT: `I can't remember | 覚えてない` → `I don't remember | =` — [D25] [S29] sure
- **S0113L03B02** (phrase, extra) EDIT: `I can't remember | 覚えてない` → `I don't remember | =` — [D25] [S29] sure
- **S0113L03B03** (phrase, extra) EDIT: `I can't remember it | 覚えてない` → `I don't remember it | =` — [D25] [S29] sure
- **S0113L03B04** (phrase, extra) EDIT: `I can't remember that | それを覚えてない` → `I don't remember that | =` — [D25] [S29] sure
- **S0113L03U01** (phrase, extra) EDIT: `when I'm tired, I can't remember things well | 疲れた時、よく覚えてない` → `when I'm tired, I don't remember things well | =` — [D25] [S29] sure
- **S0113L03U02** (phrase, extra) EDIT: `I can't remember what I learned last week | 先週学んだことを覚えてない` → `I don't remember what I learned last week | =` — [D25] [S29] sure
- **S0113L03U03** (phrase, extra) EDIT: `I can't remember anything about that day | その日のことを何も覚えてない` → `I don't remember anything about that day | =` — [D25] [S29] sure
- **S0113L03U05** (phrase, extra) EDIT: `I can't remember what I was trying to do | 何をしようとしてたか覚えてない` → `I don't remember what I was trying to do | =` — [D25] [S29] sure
- **S0113L03U06** (phrase, extra) EDIT: `I can't remember the explanation he gave yesterday | 昨日彼が言った説明を覚えてない` → `I don't remember the explanation he gave yesterday | =` — [D25] [S29] sure
- **S0113L03U07** (phrase, extra) EDIT: `when I try to speak, I can't remember the words | 話そうとすると、言葉を覚えてない` → `when I try to speak, I don't remember the words | =` — [D25] [S29] sure
- **S0113L03U08** (phrase, extra) EDIT: `I can't remember why I wanted to do that | なんでそれをしたかったか覚えてない` → `I don't remember why I wanted to do that | =` — [D25] [S29] sure
- **S0225L01** (lego, #114) EDIT: `if I could | できたら` → `if he could | =` — [D36] [S31] sure
- **S0225L01B01** (phrase, extra) EDIT: `if I could | できたら` → `if he could | =` — [D12] [S10] sure
- **S0151L02U02** (phrase, #115) DELETE: `I was hoping to see you last night | 昨夜会ってほしかった` — [D37] [S32] sure
- **S0151L02U07** (phrase, #116) DELETE: `I was hoping we could talk about it tomorrow | 明日それについて話してほしかった` — [D37] [S32] sure
- **S0154L01U03** (phrase, #117) DELETE: `I was hoping to see you Saturday night | 土曜の夜に会ってほしかった` — [D37] [S32] sure
- **S0156L01U03** (phrase, #118) DELETE: `I was hoping we could go to a restaurant | レストランに行ってほしかった` — [D37] [S32] sure
- **S0107L02B03** (phrase, #119) DELETE: `I hoped to see you | あなたを見たかった` — [D38] [S33] sure
- **S0107L02U02** (phrase, #120) DELETE: `I hoped to see you yesterday | 昨日あなたを見たかった` — [D38] [S33] sure
- **S0107L02U07** (phrase, #121) DELETE: `that is why I hoped to see you | だからあなたを見たかった` — [D38] [S33] sure
- **S0107L02U08** (phrase, #122) DELETE: `even if I'm working hard, I hoped to see you | 頑張っていても見たかった` — [D38] [S33] sure
- **S0061L01U08** (phrase, #123) DELETE: `I want you to say that again | もう一度言って` — [D39] [S34] sure
- **S0067L01B04** (phrase, #124) DELETE: `why do you want | なんで` — [D40] [S18] sure
- **S0121L01B03** (phrase, #125) DELETE: `I want the car | 車を` — [D41] [S18] sure
- **S0258L01U04** (phrase, #126) EDIT: `that blue thing over there | あそこにある青いの、何？` → `what's that blue thing over there? | =` — [D42] [S35] sure
- **SEED41** (seed, #127) EDIT: `I feel okay, but I'm starting to feel tired | 大丈夫。でも、疲れてきてる` → `= | 大丈夫、でも、疲れてきてる` — [D43] [S36] sure
- **S0041L02U04** (phrase, extra) EDIT: `I'm okay, but starting to get tired | 大丈夫。でも、疲れてきてる` → `= | 大丈夫、でも、疲れてきてる` — [D2] [S8] sure — note: scan: "its copy S0041L02U04 takes the new clips"
- **S0041L01B02** (phrase, #128) DELETE: `okay but | 大丈夫。でも` — [D44] [S37] sure
- **S0127L02U06** (phrase, #129) DELETE: `I wanted to meet her today, but I'm not going to wait | 今日は会いたかった。でも、待たない` — [D44] [S37] sure
- **S0163L01U06** (phrase, #130) DELETE: `I am trying it, and I think it's interesting | やってみてる。面白いと思う` — [D44] [S37] sure
- **S0249L01U06** (phrase, #131) DELETE: `I'm not going to wait, I want you to help me now | 待たない。今、手伝ってほしい` — [D44] [S37] sure
- **S0249L01U07** (phrase, #132) DELETE: `I must learn quickly, I want you to help me | 早く学ばないといけない。手伝ってほしい` — [D44] [S37] sure
- **S0249L01U08** (phrase, #133) DELETE: `I want you to help me, I'm not sure if I can | 手伝ってほしい。できるか分からない` — [D44] [S37] sure

## kor_for_tam

**Defects:**
- D1: plain 나/내 self-reference in a 해요체 sentence of a 저/제 course; the same Tamil already maps to 저/제 elsewhere (ZUT, register K10/S12)
- D2: scan: மேடம் glossed 선생님 (sir/teacher)
- D3: USE row drops 선생님, so it does not contain its LEGO 어때요 선생님 (P17)
- D4: LEGO known says எப்படி ("how"), which the seed does not say; the seed says என்ன (L26)
- D5: BUILD row repeats the LEGO's wrong known gloss
- D6: USE row drops 어떻게, so it does not contain its LEGO (P17)
- D7: Korean drops "angry" and the subject the Tamil says (அவர் கோபமாக): wrong meaning
- D8: USE row: சுமார் ஆறு மணிக்கு | 약 6시에, while LEGO S0454L02 teaches the same Tamil as 6시쯤 (one known, two targets, P16)
- D9: USE row நீங்கள் என்ன நினைக்கிறீர்கள் | 어떻게 생각하세요 vs LEGO S0162L01 same Tamil | 어떻게 생각해요 (P16)
- D10: USE row is a fragment ("quickly know") and not a sentence (P7: fragments only as BUILD)

**Sources / reasoning:**
- S1: National Institute of Korean Language, 표준 언어 예절 (2011), ch. "자신을 가리키는 말": 저/제 is the speaker's humble self-reference to a listener addressed in 해요체/하십시오체; 나/내 is for 해체/해라체. Course-internal: kor_for_tam already teaches நானே|제가 (S0025L01), என் நண்பரைப் பற்றி|제 친구에 대해 (S0084L01), என்னுடைய நண்பர்|제 친구가 (S0138L02), என் நண்பர்|제 친구는 (S0199L01), என்னைத் தனியாக விட்டு|저를 혼자 두고 (S0351L01), என்னிடத்தில்|저에게 (S0238L01) — the 나/내 rows give the same Tamil a second Korean answer (P16/K10).
- S2: 선생님 is the standard gender-neutral honorific address for an adult one is being polite to (NIKL 표준 언어 예절, 호칭: 선생님 used for any respected adult; Korean Wiktionary 선생님 sense 3). One Korean form for both "sir" and "madam" is not a clash (Kai 12 Nov: one target, many known is fine); seeds 643/650/651 use it the same way.
- S3: canon P17
- S4: canon L26 (LEGO only carries words its own seed says); 어떻게 생각하세요 = "what do you think" (NIKL 표준국어대사전 어떻게; the idiom answers என்ன நினைக்கிறீர்கள், as S0162L01 already teaches)
- S5: follows S0666L01 (O12)
- S6: meaning check; 화난 것처럼 is taught by S0354L02 after this basket, so it cannot be added here (P1)
- S7: canon P16
- S8: canon P16; rewritten rather than deleted to hold the USE floor (5). Words: அதைப் பற்றி|그것에 대해 S0037L02, 선생님 S0642L01, 어떻게 생각하세요 this seed. Address keeps it apart from S0162L01.
- S9: canon P7; rewritten rather than deleted to hold the USE floor. 얼마나 빠른지 모르겠어요 = "I don't know how fast (it is)" (얼마나 + -(으)ㄴ지 indirect question, NIKL 표준국어대사전 -ㄴ지). Words: எவ்வளவு|얼마나 S0033L01, தெரியவில்லை|모르겠어요 S0010L04.

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **SEED126** (seed, extra) EDIT: `இந்த வேலை என் மூளையின் வடிவத்தை மாற்றுகிறது. | 이 일이 내 뇌의 모양을 바꾸고 있어요.` → `= | 이 일이 제 뇌의 모양을 바꾸고 있어요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0126L03** (lego, #157) EDIT: `என் மூளையின் | 내 뇌의` → `= | 제 뇌의` — [D1] [S1] sure
- **S0126L03C01** (phrase, extra) EDIT: `என் | 내` → `= | 제` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0126L03B01** (phrase, #162) EDIT: `என் மூளையின் | 내 뇌의` → `= | 제 뇌의` — [D1] [S1] sure
- **S0126L03B02** (phrase, #163) EDIT: `என் மூளையின் வடிவத்தை | 내 뇌의 모양을` → `= | 제 뇌의 모양을` — [D1] [S1] sure
- **S0126L03B03** (phrase, #164) EDIT: `இப்போது என் மூளையின் | 지금 내 뇌의` → `= | 지금 제 뇌의` — [D1] [S1] sure
- **S0126L03U01** (phrase, #165) EDIT: `என் மூளையின் வடிவத்தை மாற்றுகிறேன் | 내 뇌의 모양을 바꾸고 있어요` → `= | 제 뇌의 모양을 바꾸고 있어요` — [D1] [S1] sure
- **S0126L03U02** (phrase, #166) EDIT: `என் மூளையின் வடிவத்தை நினைவில் கொள்ள முயற்சிக்கிறேன் | 내 뇌의 모양을 기억하려고 해요` → `= | 제 뇌의 모양을 기억하려고 해요` — [D1] [S1] sure
- **S0126L03U03** (phrase, #167) EDIT: `இப்போது என் மூளையின் வடிவத்தை மாற்றுகிறேன் | 지금 내 뇌의 모양을 바꾸고 있어요` → `= | 지금 제 뇌의 모양을 바꾸고 있어요` — [D1] [S1] sure
- **S0126L03U04** (phrase, #168) EDIT: `இன்று என் மூளையின் வடிவத்தை மாற்றுகிறேன் | 오늘 내 뇌의 모양을 바꾸고 있어요` → `= | 오늘 제 뇌의 모양을 바꾸고 있어요` — [D1] [S1] sure
- **S0126L03U05** (phrase, #169) EDIT: `என் மூளையின் வடிவத்தை மாற்றுகிறேன், ஏனென்றால் அது ஒரு நல்ல யோசனை என்று நம்புகிறேன் | 내 뇌의 모양을 바꾸고 있어요, 왜냐하면 그것이 좋은 생각이라고 믿어요` → `= | 제 뇌의 모양을 바꾸고 있어요, 왜냐하면 그것이 좋은 생각이라고 믿어요` — [D1] [S1] sure
- **S0126L04U01** (phrase, #170) EDIT: `இந்த வேலை என் மூளையின் வடிவத்தை மாற்றுகிறது | 이 일이 내 뇌의 모양을 바꾸고 있어요` → `= | 이 일이 제 뇌의 모양을 바꾸고 있어요` — [D1] [S1] sure
- **SEED130** (seed, extra) EDIT: `அது ஒரு ஆச்சரியமாக இருந்தது, ஏனென்றால் அவர் என் நண்பர். | 그것은 놀라웠어요, 왜냐하면 그는 내 친구이니까요.` → `= | 그것은 놀라웠어요, 왜냐하면 그는 제 친구이니까요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0130L02** (lego, #158) EDIT: `என் நண்பர் என்பதால் | 내 친구이니까요` → `= | 제 친구이니까요` — [D1] [S1] sure
- **S0130L02C01** (phrase, extra) EDIT: `என் | 내` → `= | 제` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0130L02B01** (phrase, #171) EDIT: `என் நண்பர் என்பதால் | 내 친구이니까요` → `= | 제 친구이니까요` — [D1] [S1] sure
- **S0130L02B02** (phrase, #172) EDIT: `அவர் என் நண்பர் என்பதால் | 그는 내 친구이니까요` → `= | 그는 제 친구이니까요` — [D1] [S1] sure
- **S0130L02B03** (phrase, #173) EDIT: `இப்போது என் நண்பர் என்பதால் | 지금 내 친구이니까요` → `= | 지금 제 친구이니까요` — [D1] [S1] sure
- **S0130L02U01** (phrase, #174) EDIT: `அது ஒரு ஆச்சரியமாக இருந்தது, ஏனென்றால் அவர் என் நண்பர் | 그것은 놀라웠어요, 왜냐하면 그는 내 친구이니까요` → `= | 그것은 놀라웠어요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0130L02U02** (phrase, #175) EDIT: `ஏனென்றால் அவர் என் நண்பர் | 왜냐하면 그는 내 친구이니까요` → `= | 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0130L02U03** (phrase, #176) EDIT: `அந்த விஷயம் சுவாரஸ்யமாக இருக்கிறது, ஏனென்றால் அவர் என் நண்பர் | 그것은 흥미롭네요, 왜냐하면 그는 내 친구이니까요` → `= | 그것은 흥미롭네요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0130L02U04** (phrase, #177) EDIT: `இன்று மிகவும் மகிழ்ச்சியாக இருக்கிறேன், ஏனென்றால் அவர் என் நண்பர் | 오늘 정말 기뻐요, 왜냐하면 그는 내 친구이니까요` → `= | 오늘 정말 기뻐요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0130L02U05** (phrase, #178) EDIT: `அது ஒரு நல்ல யோசனை என்று நம்புகிறேன், ஏனென்றால் அவர் என் நண்பர் | 그게 좋은 생각이라고 믿어요, 왜냐하면 그는 내 친구이니까요` → `= | 그게 좋은 생각이라고 믿어요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0132L01U04** (phrase, #179) EDIT: `அது குறைவாக சுவாரஸ்யமாக இருக்கும், ஏனென்றால் அவர் என் நண்பர் | 그것은 덜 흥미로워요, 왜냐하면 그는 내 친구이니까요` → `= | 그것은 덜 흥미로워요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **SEED136** (seed, extra) EDIT: `நிச்சயமாக நீங்கள் அவளிடம் கேட்கலாம், ஏனென்றால் அவள் என் நண்பர். | 물론 그녀에게 물어볼 수 있어요, 왜냐하면 그녀는 내 친구이니까요.` → `= | 물론 그녀에게 물어볼 수 있어요, 왜냐하면 그녀는 제 친구이니까요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0136L03U01** (phrase, #180) EDIT: `நிச்சயமாக நீங்கள் அவளிடம் கேட்கலாம், ஏனென்றால் அவள் என் நண்பர் | 물론 그녀에게 물어볼 수 있어요, 왜냐하면 그녀는 내 친구이니까요` → `= | 물론 그녀에게 물어볼 수 있어요, 왜냐하면 그녀는 제 친구이니까요` — [D1] [S1] sure
- **S0139L02U03** (phrase, #181) EDIT: `மிகவும் வருந்துகிறேன், ஏனென்றால் அவர் என் நண்பர் | 정말 미안해요, 왜냐하면 그는 내 친구이니까요` → `= | 정말 미안해요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **SEED147** (seed, extra) EDIT: `நான் பதற்றமாக உணர்வதைப் பார்த்தபோது அவள் மிகவும் இரக்கமாக இருந்தாள். | 그녀는 내가 긴장하는 걸 봤을 때 매우 친절했어요.` → `= | 그녀는 제가 긴장하는 걸 봤을 때 매우 친절했어요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0147L01** (lego, #159) EDIT: `நான்தான் | 내가` → `= | 제가` — [D1] [S1] sure
- **S0147L01B01** (phrase, #182) EDIT: `நான்தான் | 내가` → `= | 제가` — [D1] [S1] sure
- **S0147L01B02** (phrase, #183) EDIT: `நான்தான் நினைக்கிறேன் | 내가 생각해요` → `= | 제가 생각해요` — [D1] [S1] sure
- **S0147L01B03** (phrase, #184) EDIT: `நான்தான் நம்புகிறேன் | 내가 믿어요` → `= | 제가 믿어요` — [D1] [S1] sure
- **S0147L01U01** (phrase, #185) EDIT: `நான்தான் மிகவும் மகிழ்ச்சியாக இருக்கிறேன் | 내가 정말 기뻐요` → `= | 제가 정말 기뻐요` — [D1] [S1] sure
- **S0147L01U02** (phrase, #186) EDIT: `நான்தான் அது ஒரு நல்ல யோசனை என்று நம்புகிறேன் | 내가 그게 좋은 생각이라고 믿어요` → `= | 제가 그게 좋은 생각이라고 믿어요` — [D1] [S1] sure
- **S0147L01U03** (phrase, #187) EDIT: `நான்தான் கொரிய மொழியை கற்றுக்கொள்ள முயற்சிக்கிறேன் | 내가 한국어를 배우려고 해요` → `= | 제가 한국어를 배우려고 해요` — [D1] [S1] sure
- **S0147L01U04** (phrase, #188) EDIT: `இன்று நான்தான் மிகவும் மகிழ்ச்சியாக இருக்கிறேன் | 오늘 내가 정말 기뻐요` → `= | 오늘 제가 정말 기뻐요` — [D1] [S1] sure
- **S0147L01U05** (phrase, #189) EDIT: `நான்தான் அது நன்றாக இருக்கிறது என்று நினைக்கிறேன் | 내가 그게 좋다고 생각해요` → `= | 제가 그게 좋다고 생각해요` — [D1] [S1] sure
- **S0147L02U02** (phrase, #190) EDIT: `நான் பதற்றமாக உணர்வதை பிடிக்காது | 내가 긴장하는 걸 좋아하지 않아요` → `= | 제가 긴장하는 걸 좋아하지 않아요` — [D1] [S1] sure
- **S0147L02U05** (phrase, #191) EDIT: `நான் பதற்றமாக உணர்வதைக் கேட்கலாமா? | 내가 긴장하는 걸 물어봐도 될까요?` → `= | 제가 긴장하는 걸 물어봐도 될까요?` — [D1] [S1] sure
- **S0147L03U05** (phrase, #192) EDIT: `நான் பார்த்தபோது ஒரு நல்ல யோசனை என்று நினைத்தேன் | 내가 봤을 때 좋은 생각이라고 생각했어요` → `= | 제가 봤을 때 좋은 생각이라고 생각했어요` — [D1] [S1] sure
- **S0147L04U01** (phrase, #193) EDIT: `நான் பதற்றமாக உணர்வதைப் பார்த்தபோது அவள் மிகவும் இரக்கமாக இருந்தாள் | 그녀는 내가 긴장하는 걸 봤을 때 매우 친절했어요` → `= | 그녀는 제가 긴장하는 걸 봤을 때 매우 친절했어요` — [D1] [S1] sure
- **S0147L04U03** (phrase, #194) EDIT: `அவள் இரக்கமாக இருந்தாள், ஏனென்றால் அவர் என் நண்பர் | 그녀는 친절했어요, 왜냐하면 그는 내 친구이니까요` → `= | 그녀는 친절했어요, 왜냐하면 그는 제 친구이니까요` — [D1] [S1] sure
- **S0147L04U05** (phrase, #195) EDIT: `நான் பதற்றமாக உணர்வதைப் பார்த்தபோது இரக்கமாக இருந்தாள் | 내가 긴장하는 걸 봤을 때 친절했어요` → `= | 제가 긴장하는 걸 봤을 때 친절했어요` — [D1] [S1] sure
- **SEED148** (seed, extra) EDIT: `என்னால் பதில் சொல்ல முடியாதபோது அவர் மிகவும் பொறுமையாக இல்லை. | 내가 대답하지 못했을 때 그는 그다지 인내심이 없었어요.` → `= | 제가 대답하지 못했을 때 그는 그다지 인내심이 없었어요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0148L04B02** (phrase, #196) EDIT: `நான் பதில் சொல்ல முடியாத | 내가 대답하지 못했을` → `= | 제가 대답하지 못했을` — [D1] [S1] sure
- **S0148L04U01** (phrase, #197) EDIT: `என்னால் பதில் சொல்ல முடியாதபோது அவர் மிகவும் பொறுமையாக இல்லை | 내가 대답하지 못했을 때 그는 그다지 인내심이 없었어요` → `= | 제가 대답하지 못했을 때 그는 그다지 인내심이 없었어요` — [D1] [S1] sure
- **S0148L04U03** (phrase, #198) EDIT: `நான் பதில் சொல்ல முடியாதபோது வருந்துகிறேன் | 내가 대답하지 못했을 때 미안해요` → `= | 제가 대답하지 못했을 때 미안해요` — [D1] [S1] sure
- **S0148L04U05** (phrase, #199) EDIT: `இன்று நான் பதில் சொல்ல முடியாதபோது ஆச்சரியமாக இருந்தது | 오늘 내가 대답하지 못했을 때 놀라웠어요` → `= | 오늘 제가 대답하지 못했을 때 놀라웠어요` — [D1] [S1] sure
- **SEED166** (seed, extra) EDIT: `என் பெயர் மிகவும் வழக்கத்துக்கு மாறானது அல்ல. | 내 이름은 그다지 특이하지 않아요.` → `= | 제 이름은 그다지 특이하지 않아요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0166L01** (lego, #160) EDIT: `என் பெயர் | 내 이름은` → `= | 제 이름은` — [D1] [S1] sure
- **S0166L01C01** (phrase, extra) EDIT: `என் | 내` → `= | 제` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0166L01B01** (phrase, #200) EDIT: `என் பெயர் | 내 이름은` → `= | 제 이름은` — [D1] [S1] sure
- **S0166L01B02** (phrase, #201) EDIT: `என் பெயர் நல்ல | 내 이름은 좋은` → `= | 제 이름은 좋은` — [D1] [S1] sure
- **S0166L01B03** (phrase, #202) EDIT: `இன்று என் பெயர் | 오늘 내 이름은` → `= | 오늘 제 이름은` — [D1] [S1] sure
- **S0166L01B04** (phrase, #203) EDIT: `நேற்று என் பெயர் | 어제 내 이름은` → `= | 어제 제 이름은` — [D1] [S1] sure
- **S0166L01U01** (phrase, #204) EDIT: `என் பெயர் பிடிக்கும் | 내 이름은 좋아요` → `= | 제 이름은 좋아요` — [D1] [S1] sure
- **S0166L01U02** (phrase, #205) EDIT: `என் பெயர் கடினம் | 내 이름은 어려워요` → `= | 제 이름은 어려워요` — [D1] [S1] sure
- **S0166L01U03** (phrase, #206) EDIT: `என் பெயர் சுவாரஸ்யமாக இருக்கிறது | 내 이름은 흥미롭네요` → `= | 제 이름은 흥미롭네요` — [D1] [S1] sure
- **S0166L01U04** (phrase, #207) EDIT: `என் பெயர் பரவாயில்லை | 내 이름은 괜찮아요` → `= | 제 이름은 괜찮아요` — [D1] [S1] sure
- **S0166L01U05** (phrase, #208) EDIT: `இன்று என் பெயர் பிடிக்கும் | 오늘 내 이름은 좋아요` → `= | 오늘 제 이름은 좋아요` — [D1] [S1] sure
- **S0166L03U01** (phrase, #209) EDIT: `என் பெயர் மிகவும் வழக்கத்துக்கு மாறானது அல்ல | 내 이름은 그다지 특이하지 않아요` → `= | 제 이름은 그다지 특이하지 않아요` — [D1] [S1] sure
- **S0166L03U04** (phrase, #210) EDIT: `என் பெயர் மாறானது அல்ல | 내 이름은 특이하지 않아요` → `= | 제 이름은 특이하지 않아요` — [D1] [S1] sure
- **S0187L02U05** (phrase, #211) EDIT: `இதுவரை என் பெயர் பிடிக்கும் | 지금까지는 내 이름은 좋아요` → `= | 지금까지는 제 이름은 좋아요` — [D1] [S1] sure
- **SEED226** (seed, extra) EDIT: `அந்த மனிதர் எனக்கு உதவ முயற்சிக்கிறார். | 그 남자는 나를 도우려고 해요.` → `= | 그 남자는 저를 도우려고 해요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0226L02** (lego, #161) EDIT: `என்னை | 나를` → `= | 저를` — [D1] [S1] sure
- **S0226L02B01** (phrase, #212) EDIT: `என்னை உதவ முயற்சிக்கிறார் | 나를 도우려고 해요` → `= | 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L02B02** (phrase, #213) EDIT: `இப்போது என்னை | 지금 나를` → `= | 지금 저를` — [D1] [S1] sure
- **S0226L02B03** (phrase, #214) EDIT: `என்னைப் பார்த்தார் | 나를 봤어요` → `= | 저를 봤어요` — [D1] [S1] sure
- **S0226L02U01** (phrase, #215) EDIT: `அவர் எனக்கு உதவ முயற்சிக்கிறார் | 그는 나를 도우려고 해요` → `= | 그는 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L02U02** (phrase, #216) EDIT: `அவர் இப்போது எனக்கு உதவ முயற்சிக்கிறார் | 그는 지금 나를 도우려고 해요` → `= | 그는 지금 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L02U03** (phrase, #217) EDIT: `அவர் நேற்று என்னைப் பார்த்தார் | 그는 어제 나를 봤어요` → `= | 그는 어제 저를 봤어요` — [D1] [S1] sure
- **S0226L02U04** (phrase, #218) EDIT: `அவர் இன்று எனக்கு உதவ முயற்சிக்கிறார் | 그는 오늘 나를 도우려고 해요` → `= | 그는 오늘 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L02U05** (phrase, #219) EDIT: `அவர் என்னை அறிவார் | 그는 나를 알아요` → `= | 그는 저를 알아요` — [D1] [S1] sure
- **S0226L03U01** (phrase, #220) EDIT: `அந்த மனிதர் எனக்கு உதவ முயற்சிக்கிறார் | 그 남자는 나를 도우려고 해요` → `= | 그 남자는 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L03U02** (phrase, #221) EDIT: `அந்த மனிதர் இப்போது எனக்கு உதவ முயற்சிக்கிறார் | 그 남자는 지금 나를 도우려고 해요` → `= | 그 남자는 지금 저를 도우려고 해요` — [D1] [S1] sure
- **S0226L03U04** (phrase, #222) EDIT: `அந்த மனிதர் நேற்று என்னைப் பார்த்தார் | 그 남자는 어제 나를 봤어요` → `= | 그 남자는 어제 저를 봤어요` — [D1] [S1] sure
- **S0226L03U05** (phrase, #223) EDIT: `அந்த மனிதர் இன்று எனக்கு உதவ முயற்சிக்கிறார் | 그 남자는 오늘 나를 도우려고 해요` → `= | 그 남자는 오늘 저를 도우려고 해요` — [D1] [S1] sure
- **SEED227** (seed, extra) EDIT: `அந்த மனிதர் எனக்குப் புதிதாக ஏதாவது சொல்லப் போகிறார். | 그 남자는 나에게 새로운 것을 말해줄 거예요.` → `= | 그 남자는 저에게 새로운 것을 말해줄 거예요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01** (lego, extra) EDIT: `என்னிடம் | 나에게` → `= | 저에게` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01B01** (phrase, extra) EDIT: `எனக்குச் சொல்ல முயற்சிக்கிறார் | 나에게 말하려고 해요` → `= | 저에게 말하려고 해요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01B02** (phrase, extra) EDIT: `இப்போது எனக்கு | 지금 나에게` → `= | 지금 저에게` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01B03** (phrase, extra) EDIT: `எனக்குக் கேட்பார் | 나에게 물어볼 거예요` → `= | 저에게 물어볼 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01U01** (phrase, extra) EDIT: `அவர் எனக்குச் சொல்ல முயற்சிக்கிறார் | 그는 나에게 말하려고 해요` → `= | 그는 저에게 말하려고 해요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01U02** (phrase, extra) EDIT: `அந்த மனிதர் எனக்குக் கேட்பார் | 그 남자는 나에게 물어볼 거예요` → `= | 그 남자는 저에게 물어볼 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01U03** (phrase, extra) EDIT: `அவர் இப்போது எனக்குச் சொல்ல முயற்சிக்கிறார் | 그는 지금 나에게 말하려고 해요` → `= | 그는 지금 저에게 말하려고 해요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01U04** (phrase, extra) EDIT: `அவர் எனக்குப் பதில் கொடுப்பார் | 그는 나에게 대답을 줄 거예요` → `= | 그는 저에게 대답을 줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L01U05** (phrase, extra) EDIT: `அந்த மனிதர் எனக்குச் சொல்ல முயற்சிக்கிறார் | 그 남자는 나에게 말하려고 해요` → `= | 그 남자는 저에게 말하려고 해요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L02B02** (phrase, extra) EDIT: `எனக்குச் சொல்வார் | 나에게 말해줄 거예요` → `= | 저에게 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L02U01** (phrase, extra) EDIT: `அந்த மனிதர் எனக்குச் சொல்வார் | 그 남자는 나에게 말해줄 거예요` → `= | 그 남자는 저에게 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L02U04** (phrase, extra) EDIT: `அந்த மனிதர் இப்போது எனக்குச் சொல்வார் | 그 남자는 지금 나에게 말해줄 거예요` → `= | 그 남자는 지금 저에게 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L02U05** (phrase, extra) EDIT: `அவரும் எனக்குச் சொல்வார் | 그가 나에게 말해줄 거예요` → `= | 그가 저에게 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L03U01** (phrase, extra) EDIT: `அந்த மனிதர் எனக்குப் புதிதாக ஏதாவது சொல்வார் | 그 남자는 나에게 새로운 것을 말해줄 거예요` → `= | 그 남자는 저에게 새로운 것을 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0227L03U05** (phrase, extra) EDIT: `அவரும் எனக்குப் புதிதாக ஏதாவது சொல்வார் | 그가 나에게 새로운 것을 말해줄 거예요` → `= | 그가 저에게 새로운 것을 말해줄 거예요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0229L01U03** (phrase, #224) EDIT: `அவர் எனக்கு உதவுவார் | 그는 나를 도울 거예요` → `= | 그는 저를 도울 거예요` — [D1] [S1] sure
- **S0229L01U05** (phrase, #225) EDIT: `அவரால் முடிந்தால் எனக்கு உதவுவார் | 그가 할 수 있다면 나를 도울 거예요` → `= | 그가 할 수 있다면 저를 도울 거예요` — [D1] [S1] sure
- **S0229L02U03** (phrase, #226) EDIT: `அந்தப் பெண் எனக்கு உதவுவாள் | 그 여자는 나를 도울 거예요` → `= | 그 여자는 저를 도울 거예요` — [D1] [S1] sure
- **S0229L02U05** (phrase, #227) EDIT: `அந்தப் பெண்ணால் முடிந்தால் எனக்கு உதவுவாள் | 그 여자는 할 수 있다면 나를 도울 거예요` → `= | 그 여자는 할 수 있다면 저를 도울 거예요` — [D1] [S1] sure
- **S0237L02B03** (phrase, extra) EDIT: `எனக்குச் சொல்லும்படி | 나에게 말해주길` → `= | 저에게 말해주길` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0237L02U03** (phrase, extra) EDIT: `அவர் எனக்குச் சொல்லும்படி விரும்பினார் | 그는 나에게 말해주길 원했어요` → `= | 그는 저에게 말해주길 원했어요` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **SEED293** (seed, extra) EDIT: `அவர் என்னை எங்கே சந்திக்கப் போகிறார் என்று நான் கண்டுபிடிக்க வேண்டும். | 그가 어디서 나를 만날지 알아야 해요.` → `= | 그가 어디서 저를 만날지 알아야 해요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4 step 3) — seed/LEGO/component must follow so the LEGO stays inside its seed (L26) and the basket still contains its LEGO (P17)
- **S0293L01B01** (phrase, #228) EDIT: `என்னை சந்திப்பாரா என்று | 나를 만날지` → `= | 저를 만날지` — [D1] [S1] sure
- **S0293L01B03** (phrase, #229) EDIT: `அவர் எங்கே என்னை சந்திப்பாரா என்று | 그가 어디서 나를 만날지` → `= | 그가 어디서 저를 만날지` — [D1] [S1] sure
- **S0293L01U01** (phrase, #230) EDIT: `அவர் என்னை சந்திப்பாரா என்று யோசிக்கிறேன் | 그가 나를 만날지 궁금해요` → `= | 그가 저를 만날지 궁금해요` — [D1] [S1] sure
- **S0293L01U03** (phrase, #231) EDIT: `அவர் எங்கே என்னை சந்திப்பாரா என்று யோசிக்கிறேன் | 그가 어디서 나를 만날지 궁금해요` → `= | 그가 어디서 저를 만날지 궁금해요` — [D1] [S1] sure
- **S0293L01U04** (phrase, #232) EDIT: `அவள் என்னை சந்திப்பாளா என்று யோசிக்கிறேன் | 그녀가 나를 만날지 궁금해요` → `= | 그녀가 저를 만날지 궁금해요` — [D1] [S1] sure
- **S0293L02U01** (phrase, #233) EDIT: `அவர் எங்கே என்னை சந்திப்பாரா என்று தெரிந்துகொள்ள வேண்டும் | 그가 어디서 나를 만날지 알아야 해요` → `= | 그가 어디서 저를 만날지 알아야 해요` — [D1] [S1] sure
- **S0293L02U02** (phrase, #234) EDIT: `அவர் என்னை சந்திப்பாரா என்று தெரிந்துகொள்ள வேண்டும் | 그가 나를 만날지 알아야 해요` → `= | 그가 저를 만날지 알아야 해요` — [D1] [S1] sure
- **S0293L02U04** (phrase, #235) EDIT: `இன்று அவர் என்னை சந்திப்பாரா என்று தெரிந்துகொள்ள வேண்டும் | 오늘 그가 나를 만날지 알아야 해요` → `= | 오늘 그가 저를 만날지 알아야 해요` — [D1] [S1] sure
- **S0293L02U05** (phrase, #236) EDIT: `அவள் என்னை சந்திப்பாளா என்று தெரிந்துகொள்ள வேண்டும் | 그녀가 나를 만날지 알아야 해요` → `= | 그녀가 저를 만날지 알아야 해요` — [D1] [S1] sure
- **S0642L01** (lego, #151) KEEP: `உணர்கிறீர்கள் மேடம் | 어때요 선생님` — [D2] [S2] likely — note: only U04 is changed (below)
- **S0642L01U04** (phrase, extra) DELETE: `நீங்கள் எப்படி உணர்கிறீர்கள் | 기분이 어때요` — [D3] [S3] sure — note: part of scan row S0642L01
- **S0666L01** (lego, #152) EDIT: `அனைவரும் எப்படி | 여러분 어떻게` → `நீங்கள் அனைவரும் என்ன | =` — [D4] [S4] sure
- **S0666L01B01** (phrase, extra) EDIT: `அனைவரும் எப்படி | 여러분 어떻게` → `நீங்கள் அனைவரும் என்ன | =` — [D5] [S5] sure
- **S0666L01B02** (phrase, extra) EDIT: `இப்போது அனைவரும் எப்படி | 지금 여러분 어떻게` → `இப்போது நீங்கள் அனைவரும் என்ன | =` — [D5] [S5] sure
- **S0666L01B03** (phrase, extra) EDIT: `அடிக்கடி அனைவரும் எப்படி | 자주 여러분 어떻게` → `அடிக்கடி நீங்கள் அனைவரும் என்ன | =` — [D5] [S5] sure
- **S0666L01B04** (phrase, extra) EDIT: `இன்று அனைவரும் எப்படி | 오늘 여러분 어떻게` → `இன்று நீங்கள் அனைவரும் என்ன | =` — [D5] [S5] sure
- **S0666L01U03** (phrase, extra) DELETE: `நீங்கள் அனைவரும் அப்படி நினைக்கிறீர்கள் | 여러분 그렇게 생각하세요` — [D6] [S3] sure
- **S0354L01U01** (phrase, #153) DELETE: `அவர் கோபமாகத் தெரிய வேண்டிய அவசியமில்லை | 보일 필요가 없었어요` — [D7] [S6] sure
- **S0038L01U02** (phrase, #154) DELETE: `சுமார் ஆறு மணிக்கு | 약 6시에` — [D8] [S7] sure — note: basket USE floor drops to 4 (warn-only, P23): nothing taught by seed 38 can follow 약 except the six-o'clock that clashes, and the other four USE rows of this basket are generator filler outside item 6
- **S0651L01U03** (phrase, #155) EDIT: `நீங்கள் என்ன நினைக்கிறீர்கள் | 어떻게 생각하세요` → `அதைப் பற்றி நீங்கள் என்ன நினைக்கிறீர்கள் மேடம் | 그것에 대해 어떻게 생각하세요, 선생님` — [D9] [S8] sure
- **S0077L03U01** (phrase, #156) EDIT: `விரைவாகப் தெரியும் | 빠른지 알아요` → `எவ்வளவு விரைவாக என்று தெரியவில்லை | 얼마나 빠른지 모르겠어요` — [D10] [S9] likely

## por_for_eng

**Defects:**
- D1: English keeps "they/her/his" while the Portuguese says nós/tua (reported speech must follow the target)
- D2: English person (they) vs nós; and a filler "today" tail
- D3: English person; filler "today" tail
- D4: English person; and the Portuguese stops at "não tínhamos" (nothing had)
- D5: English person; filler "yesterday" tail
- D6: English person (they) vs nós; and "said because" has no object in either language
- D7: as U02, plus a filler "yesterday" tail
- D8: English says he/she/her while the Portuguese says estás/teu (you/your)
- D9: target broken: "ela … está disposto … teu" mixes she, masculine and your
- D10: target broken: "disse se esqueceste-te" (said + whether, and enclisis after se); English person
- D11: as U02
- D12: target broken: "disseram do que aconteceu" (said of what happened)
- D13: target broken: "disse que esqueceste-te" (enclisis after que) and person mismatch
- D14: target broken: plural "they said … they could" over singular pudesse … em ti
- D15: target broken: "trust them" over em ti, plus a filler hoje
- D16: scan: "she said there's no point worrying | … preocupar-te" — wrong person
- D17: "worrying about the way" is not English and "com a maneira" is cut off
- D18: fragment: "want to do on Sunday morning" (no subject); the full question is U08
- D19: subjunctive with no trigger
- D20: subjunctive after "disse que" (report takes the indicative); double report
- D21: subjunctive after "disse que"
- D22: "são várias horas a chegar" is not Portuguese for "it took several hours"
- D23: as U04
- D24: "I thought" over acho (present); achei is taught only at seed 124
- D25: "já" not in the English, odd order
- D26: "at all" over nunca (never)
- D27: calque on "a maneira": "I need the way", "help you with the way", "the way to work" (= route to the office) are not what the Portuguese says
- D28: "entusiasmado para" (EP takes por/com) and the same English "I'm excited to see you" is S0127L02U07 (two answers once both exist)
- D29: "entusiasmado para ver-te": EP takes por
- D30: English says "all the facts", the Portuguese "factos"; todos os is untaught until seed 313
- D31: "tomar o comboio" leans Brazilian, and U02 already has the same English with a different answer (P16)
- D32: question English, statement text

**Sources / reasoning:**
- S1: Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).
- S2: Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).; the "…today/yesterday" tail is moved next to "said", where it means something (it was filler at the end); the rest is the seed's own words
- S3: Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).; onde viver is the seed's own (S0603L01 viver)
- S4: Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).; "disse isso porque" = "said that because" (isso, the object, is taught throughout)
- S5: Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).; words are the seed's own (estás disposto a pagar pelo teu bilhete)
- S6: Cunha & Cintra, colocação dos pronomes átonos: after the conjunction se the clitic goes before the verb (próclise); ela quer saber se (S0453L02U03) replaces the untaught perguntou. Reported speech keeps the reported clause's own person when the reporter repeats what someone said about "us/you": the Portuguese says nós/tua, so the English says we/your (Cunha & Cintra, Nova Gramática do Português Contemporâneo, discurso indireto). The Portuguese is correct and is the seed's own; only the English changes (known-side clip only).
- S7: as U02
- S8: meaning
- S9: as U02; basket keeps 5 USE
- S10: rewritten from taught pieces (não consigo S0057L01; confiar em ti para brincarem juntos sem discutir is the seed's own) to hold the USE floor
- S11: as U04; posso S0119L01
- S12: Not a defect: the seed itself renders generic "there's no point worrying" as não vale a pena preocupar-te (the generic "you"), so the reported row follows the seed exactly.
- S13: P7 (no fragment as USE)
- S14: P24: the LEGO não estejam a falar a sério is subjunctive and correct only after a trigger (a esperança é que, espero que); every row supplies it. Celso Cunha, conjuntivo after verbs of hope. espero que S0292L02, desta vez S0318L01
- S15: P24: the LEGO não estejam a falar a sério is subjunctive and correct only after a trigger (a esperança é que, espero que); every row supplies it. Celso Cunha, conjuntivo after verbs of hope. espero que S0292L02, desta vez S0318L01; agora taught early
- S16: rewritten from taught pieces to hold the floor (preciso de S0044L02)
- S17: as U04; temos de S0405L01, esperar S0269L01
- S18: meaning; P1
- S19: ainda from U04 of this basket; rewritten to hold the BUILD floor
- S20: meaning; each basket keeps ≥5 USE
- S21: Priberam: entusiasmado com/por; P16 — kept one row, at 127 where ver-te is taught
- S22: Priberam Dicionário, "entusiasmado"; Ciberdúvidas da Língua Portuguesa on entusiasmado por/com
- S23: P1 (the scan's todos os factos is untaught at 311)
- S24: Priberam: apanhar o comboio (EP); P16
- S25: punctuation only; clip unchanged

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0580L01U02** (phrase, #237) EDIT: `she said they've often wanted to take the children somewhere a little warmer | ela disse que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente` → `she said we've often wanted to take the children somewhere a little warmer | =` — [D1] [S1] sure
- **S0580L01U03** (phrase, #238) EDIT: `he said they've often wanted to take the children somewhere a little warmer | ele disse que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente` → `he said we've often wanted to take the children somewhere a little warmer | =` — [D1] [S1] sure
- **S0580L01U04** (phrase, #239) EDIT: `they said they've often wanted to take the children somewhere a little warmer | disseram que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente` → `they said we've often wanted to take the children somewhere a little warmer | =` — [D1] [S1] sure
- **S0601L02U02** (phrase, #241) EDIT: `she said they were talking about how it started | ela disse que estávamos a falar sobre como começou` → `she said we were talking about how it started | =` — [D1] [S1] sure
- **S0601L02U03** (phrase, #242) EDIT: `he said they were talking about how it all started | ele disse que estávamos a falar sobre como tudo começou` → `he said we were talking about how it all started | =` — [D1] [S1] sure
- **S0601L02U04** (phrase, #243) EDIT: `they said they were talking about it | disseram que estávamos a falar sobre isso` → `they said we were talking about it | =` — [D1] [S1] sure
- **S0603L03U02** (phrase, #245) EDIT: `she said they didn't have anywhere to live at the time | ela disse que nós não tínhamos onde viver na altura` → `she said we didn't have anywhere to live at the time | =` — [D1] [S1] sure
- **S0603L03U03** (phrase, #246) EDIT: `he said they didn't have anywhere to live at the time | ele disse que nós não tínhamos onde viver na altura` → `he said we didn't have anywhere to live at the time | =` — [D1] [S1] sure
- **S0612L01U01** (phrase, #253) EDIT: `she said they would have bought something | ela disse que nós teríamos comprado algo` → `she said we would have bought something | =` — [D1] [S1] sure
- **S0612L01U02** (phrase, #254) EDIT: `he said they would have bought something | ele disse que nós teríamos comprado algo` → `he said we would have bought something | =` — [D1] [S1] sure
- **S0612L01U03** (phrase, #255) EDIT: `they said they would have bought something | disseram que nós teríamos comprado algo` → `they said we would have bought something | =` — [D1] [S1] sure
- **S0620L02U02** (phrase, #257) EDIT: `she said it's a very long time since they last saw each other | ela disse que já passou muito tempo desde a última vez que nos vimos` → `she said it's a very long time since we last saw each other | =` — [D1] [S1] sure
- **S0620L02U03** (phrase, #258) EDIT: `he said it's a very long time since they last saw each other | ele disse que já passou muito tempo desde a última vez que nos vimos` → `he said it's a very long time since we last saw each other | =` — [D1] [S1] sure
- **S0620L02U04** (phrase, #259) EDIT: `they said it's a very long time since they last saw each other | disseram que já passou muito tempo desde a última vez que nos vimos` → `they said it's a very long time since we last saw each other | =` — [D1] [S1] sure
- **S0614L03U02** (phrase, #261) EDIT: `she said it's near where her family live | ela disse que é perto de onde a tua família vive` → `she said it's near where your family live | =` — [D1] [S1] sure
- **S0614L03U03** (phrase, #262) EDIT: `he said it's near where his family live | ele disse que é perto de onde a tua família vive` → `he said it's near where your family live | =` — [D1] [S1] sure
- **S0614L03U04** (phrase, #263) EDIT: `they said it's near where their family live | disseram que é perto de onde a tua família vive` → `they said it's near where your family live | =` — [D1] [S1] sure
- **S0580L01U05** (phrase, #240) EDIT: `she said they've often wanted to take the children somewhere a little warmer today | ela disse que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente hoje` → `she said today we've often wanted to take the children somewhere a little warmer | ela disse hoje que nós muitas vezes quisemos levar as crianças a um sítio um pouco mais quente` — [D2] [S2] likely
- **S0601L02U05** (phrase, #244) EDIT: `she said they were talking about how it started today | ela disse que estávamos a falar sobre como começou hoje` → `she said today we were talking about how it started | ela disse hoje que estávamos a falar sobre como começou` — [D3] [S2] likely
- **S0603L03U04** (phrase, #247) EDIT: `they said they didn't have anything | disseram que nós não tínhamos` → `they said we didn't have anywhere to live | disseram que nós não tínhamos onde viver` — [D4] [S3] sure
- **S0603L03U05** (phrase, #248) EDIT: `she said they didn't have anywhere to live at the time yesterday | ela disse que nós não tínhamos onde viver na altura ontem` → `she said yesterday we didn't have anywhere to live at the time | ela disse ontem que nós não tínhamos onde viver na altura` — [D5] [S2] likely
- **S0605L02U02** (phrase, #249) EDIT: `she said because they needed help | ela disse porque nós precisávamos de ajuda` → `she said that because we needed help | ela disse isso porque nós precisávamos de ajuda` — [D6] [S4] likely
- **S0605L02U03** (phrase, #250) EDIT: `he said because they needed help | ele disse porque nós precisávamos de ajuda` → `he said that because we needed help | ele disse isso porque nós precisávamos de ajuda` — [D6] [S4] likely
- **S0605L02U04** (phrase, #251) EDIT: `they said because they needed help | disseram porque nós precisávamos de ajuda` → `they said that because we needed help | disseram isso porque nós precisávamos de ajuda` — [D6] [S4] likely
- **S0605L02U05** (phrase, #252) EDIT: `she said because they needed help yesterday | ela disse porque nós precisávamos de ajuda ontem` → `she said that yesterday because we needed help | ela disse isso ontem porque nós precisávamos de ajuda` — [D7] [S2] likely
- **S0612L01U04** (phrase, #256) EDIT: `she said they would have bought something yesterday | ela disse que nós teríamos comprado algo ontem` → `she said yesterday we would have bought something | ela disse ontem que nós teríamos comprado algo` — [D5] [S2] likely
- **S0620L02U05** (phrase, #260) EDIT: `she said it's a very long time since they last saw each other today | ela disse que já passou muito tempo desde a última vez que nos vimos hoje` → `she said today it's a very long time since we last saw each other | ela disse hoje que já passou muito tempo desde a última vez que nos vimos` — [D3] [S2] likely
- **S0614L03U05** (phrase, #264) EDIT: `she said it's near where her family live today | ela disse que é perto de onde a tua família vive hoje` → `she said today it's near where your family live | ela disse hoje que é perto de onde a tua família vive` — [D3] [S2] likely
- **S0570L03U02** (phrase, extra) EDIT: `she asked how much he was willing to pay for his ticket | ela perguntou quanto estás disposto a pagar pelo teu bilhete` → `she asked how much you're willing to pay for your ticket | =` — [D8] [S1] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0570L03U03** (phrase, extra) EDIT: `he asked how much she was willing to pay for her ticket | ele perguntou quanto estás disposto a pagar pelo teu bilhete` → `he asked how much you're willing to pay for your ticket | =` — [D8] [S1] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0570L03U04** (phrase, extra) EDIT: `they asked how much she was willing to pay for her ticket | perguntaram quanto estás disposto a pagar pelo teu bilhete` → `they asked how much you're willing to pay for your ticket | =` — [D8] [S1] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0570L03U05** (phrase, #265) EDIT: `she said she's willing to pay for her ticket | ela disse que está disposto a pagar pelo teu bilhete` → `she said you're willing to pay for your ticket | ela disse que estás disposto a pagar pelo teu bilhete` — [D9] [S5] sure
- **S0572L03U02** (phrase, #266) EDIT: `she asked if he had forgotten what happened the last time they visited | ela disse se esqueceste-te do que aconteceu da última vez que eles nos visitaram` → `she wants to know if you've forgotten what happened the last time they visited us | ela quer saber se te esqueceste do que aconteceu da última vez que eles nos visitaram` — [D10] [S6] likely
- **S0572L03U03** (phrase, #267) EDIT: `he asked if she had forgotten what happened the last time they visited | ele disse se esqueceste-te do que aconteceu da última vez que eles nos visitaram` → `he wants to know if you've forgotten what happened the last time they visited us | ele quer saber se te esqueceste do que aconteceu da última vez que eles nos visitaram` — [D11] [S7] likely
- **S0572L03U04** (phrase, extra) DELETE: `they asked what happened the last time they visited | disseram do que aconteceu da última vez que eles nos visitaram` — [D12] [S8] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0572L03U05** (phrase, #268) DELETE: `she said she had forgotten what happened the last time they visited | ela disse que esqueceste-te do que aconteceu da última vez que eles nos visitaram` — [D13] [S9] sure
- **S0501L04U04** (phrase, #269) EDIT: `they said if only they could trust you to play together without arguing | disseram se ao menos pudesse confiar em ti para brincarem juntos sem discutir` → `I can't trust you to play together without arguing | não consigo confiar em ti para brincarem juntos sem discutir` — [D14] [S10] likely
- **S0501L04U05** (phrase, #270) EDIT: `she said if only she could trust them to play together without arguing | ela disse se ao menos pudesse confiar em ti para brincarem juntos sem discutir hoje` → `can I trust you to play together without arguing? | posso confiar em ti para brincarem juntos sem discutir?` — [D15] [S11] likely
- **S0508L01U04** (phrase, #271) KEEP: `she said there's no point worrying | ela disse que não vale a pena preocupar-te` — [D16] [S12] likely
- **S0508L01U05** (phrase, #272) DELETE: `he said there's no point worrying about the way | ele disse que não vale a pena preocupar-te com a maneira` — [D17] [S8] sure — note: USE floor 5 → 4 (warn-only)
- **S0175L01U01** (phrase, #273) DELETE: `want to do on Sunday morning | queres fazer no domingo de manhã` — [D18] [S13] sure
- **S0482L03B02** (phrase, #274) EDIT: `they aren't talking seriously | eles não estejam a falar a sério` → `I hope they aren't talking seriously | espero que eles não estejam a falar a sério` — [D19] [S14] sure
- **S0482L03U02** (phrase, #275) EDIT: `he said she said they aren't talking seriously | ele disse que ela disse que eles não estejam a falar a sério` → `I hope they aren't talking seriously this time | espero que eles não estejam a falar a sério desta vez` — [D20] [S14] sure
- **S0482L03U04** (phrase, #276) EDIT: `she said they aren't really talking seriously | ela disse que eles não estejam a falar a sério mesmo` → `I hope they aren't talking seriously now | espero que eles não estejam a falar a sério agora` — [D21] [S15] sure
- **S0482L03U05** (phrase, #277) EDIT: `he said they aren't talking seriously this time | ele disse que eles não estejam a falar a sério desta vez` → `the only hope is that they aren't talking seriously this time | a única esperança é que eles não estejam a falar a sério desta vez` — [D21] [S14] sure
- **S0511L01U04** (phrase, #278) EDIT: `she said it took several hours to arrive | ela disse que são várias horas a chegar` → `I need several hours | preciso de várias horas` — [D22] [S16] sure
- **S0511L01U05** (phrase, #279) EDIT: `he said the news took several hours to arrive | ele disse que são várias horas a chegar ao escritório` → `we have to wait several hours | temos de esperar várias horas` — [D23] [S17] sure
- **S0123L01U07** (phrase, #280) DELETE: `I thought that was a good idea | eu acho que era uma boa ideia` — [D24] [S18] sure
- **S0453L02U05** (phrase, #281) DELETE: `did they say who they saw? | disseram quem viram já?` — [D25] [S8] sure
- **S0452L01B04** (phrase, #282) EDIT: `didn't say what they wanted at all | não disseram o que queriam nunca` → `still didn't say what they wanted | ainda não disseram o que queriam` — [D26] [S19] sure
- **S0094L01U04** (phrase, #283) DELETE: `I need the way | eu preciso da maneira` — [D27] [S20] sure
- **S0094L01U07** (phrase, #284) DELETE: `I can help you with the way | eu consigo ajudar-te com a maneira` — [D27] [S20] sure
- **S0094L03U03** (phrase, #285) DELETE: `I need the way to work | eu preciso da maneira de funcionar` — [D27] [S20] sure
- **S0094L03U04** (phrase, #286) DELETE: `I know the way to work | eu sei a maneira de funcionar` — [D27] [S20] sure
- **S0094L03U06** (phrase, #287) DELETE: `I want to know the way to work | eu quero saber a maneira de funcionar` — [D27] [S20] sure
- **S0122L02U04** (phrase, #288) DELETE: `I'm excited to see you | estou entusiasmado para te ver` — [D28] [S21] sure
- **S0127L02U07** (phrase, #289) EDIT: `I'm excited to see you | estou entusiasmado para ver-te` → `= | estou entusiasmado por ver-te` — [D29] [S22] likely
- **S0311L03U06** (phrase, #290) DELETE: `she wants to know all the facts | ela quer saber factos` — [D30] [S23] sure
- **S0450L01U05** (phrase, #291) DELETE: `he said they need to take the train | ele disse que precisam de tomar o comboio` — [D31] [S24] sure
- **S0434L05B01** (phrase, #292) EDIT: `could they reduce? | podiam reduzir` → `= | podiam reduzir?` — [D32] [S25] sure
- **S0453L02B01** (phrase, #293) EDIT: `did they say who they saw? | disseram quem viram` → `= | disseram quem viram?` — [D32] [S25] sure

## ara_for_eng

**Defects:**
- D1: أَنَّ + nominative أَصْدِقاؤُنا
- D2: أَنَّ + nominative أَصْدِقاؤُنا; and تَظُنَّ (subjunctive) with no particle to govern it
- D3: إِنَّ + nominative أَصْدِقاؤُنا
- D4: predicate of لَيْسَتْ in the nominative
- D5: predicate of كانَتْ in the nominative
- D6: هُمْ مُسْتَعِدّينَ: nominal-sentence predicate in the accusative; row does not contain its LEGO (P17)
- D7: الجَميعُ مُسْتَعِدّينَ with no كان-frame: accusative predicate in a nominal sentence
- D8: هَلْ هُمْ مُسْتَعِدّينَ: same case error; does not contain its LEGO
- D9: أَنَّهُمْ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; does not contain its LEGO
- D10: هَلِ الجَميعُ مُسْتَعِدّينَ: no كان-frame
- D11: أَنَّ الجَميعَ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative (and the LEGO's الجَميعُ is lost)
- D12: أَنَّ الناسَ … مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; row does not contain its LEGO
- D13: أَنَّهُمْ مُسْتَعِدّينَ: khabar of أَنَّ must be nominative; row does not contain its LEGO
- D14: ذٰلِكَ (masculine) with لَيْسَتْ (feminine)
- D15: ذٰلِكَ (masculine) with لَيْسَتْ (feminine); and "at all" is not in the Arabic
- D16: أَنْ يُمْكِنُكُمْ تَذْهَبوا: indicative after أَنْ, and two verbs with no أَنْ between them
- D17: bare تَسْتَطيعوا: subjunctive with nothing to govern it; not its LEGO (أَنْ تَسْتَطيعوا)
- D18: أَنَّهُ تَسْتَطيعوا: wrong pronoun and mood
- D19: هَلْ تَسْتَطيعوا: subjunctive after هَلْ; not its LEGO
- D20: تَسْتَطيعوا with no governor and أَنْ تَفْعَلونَ (indicative after أَنْ)
- D21: "they want | يُريدوا": jussive with no لَمْ; not its LEGO (لَمْ يُريدوا)
- D22: هَلْ تَظُنَّ: subjunctive with no governor
- D23: bare تَظُنَّ: subjunctive with no governor; not its LEGO (أَنْ تَظُنَّ)
- D24: هَلْ تَظُنَّ: subjunctive with no governor; not its LEGO
- D25: نَلْتَقِيَ (subjunctive) in a direct question with no أَنْ
- D26: نَلْتَقِيَ (subjunctive) with no أَنْ
- D27: "the bag" over indefinite إِنَّ حَقيبَةً; the scan's الحَقيبَةَ would no longer contain the LEGO حَقيبَةً (P17)
- D28: "understand" over أَتَعَلَّمَ ("learn")
- D29: "the problem" over indefinite مُشْكِلَةٍ; the scan's المُشْكِلَةِ would break the LEGO مُشْكِلَةً
- D30: ends on a dangling أَنْ

**Sources / reasoning:**
- S1: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"inna and her sisters": the subject (ism) of أَنَّ/إِنَّ is accusative. The scan's أَصْدِقاءَنا جاءوا is a surface form no LEGO teaches (K21/R0.2; جاءوا was already untaught here), so the row is rebuilt from taught pieces: أَنَّهُ S0135L02, إِنَّهُ S0143L01, جاءَ S0454L01
- S2: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"inna and her sisters": the subject (ism) of أَنَّ/إِنَّ is accusative; Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: the imperfect is indicative unless governed (أَنْ, لَنْ, لَمْ…). The scan's أَصْدِقاءَنا جاءوا is a surface form no LEGO teaches (K21/R0.2; جاءوا was already untaught here), so the row is rebuilt from taught pieces: أَنَّهُ S0135L02, إِنَّهُ S0143L01, جاءَ S0454L01
- S3: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative
- S4: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences; سَيَكونُ S0090L03
- S5: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences
- S6: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences; عِنْدَما S0034L03
- S7: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences; لَيْلَةَ الجُمُعَةِ already in this basket (U05)
- S8: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences; أَنَّهُ + verbal sentence (ḍamīr al-shaʾn), Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"anna + pronoun of the fact"
- S9: P24: the LEGO الجَميعُ مُسْتَعِدّينَ is correct only inside a كان/يكون frame (مُسْتَعِدّينَ is the accusative predicate of يَكونَ in the seed); every phrase must supply the frame. Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §"kana and her sisters": the predicate of لَيْسَ/كانَ is accusative; nominal sentence predicate is nominative (مُسْتَعِدّونَ) — Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §equational sentences; عِنْدَ المَدْخَلِ from this row
- S10: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §laysa agrees with its subject. The scan's ذٰلِكَ لَيْسَ would no longer contain the LEGO لَيْسَتْ مُشْكِلَةً (P17/K50), and أَنَّها is untaught at 134, so the row is rebuilt from taught pieces: لِأَنَّهُ S0130L02, هُنا (B04)
- S11: as U01; لِذٰلِكَ S0105L01 (no later sibling, P2)
- S12: as U01; no taught "that it" form exists at 134 to rebuild it
- S13: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §subjunctive after أَنْ. Not rewritten: the correct Arabic for this English is seed 668's own sentence (أَرْجو أَنْ تَسْتَطيعوا الذَّهابَ, S0668L01U01), untaught at 665, and any other form gives "I hope you all can go" two answers (P16). Basket keeps 5 USE.
- S14: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame; هِيَ تُريدُ from U03
- S15: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame; تُريدونَ S0658L01
- S16: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame; أَنْ تَقولوا ذلِكَ S0659L01 (تَفْعَلوا is untaught)
- S17: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame; no taught rewrite that is not a near-copy of U02/U03; basket keeps 6 USE
- S18: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods: تَسْتَطيعوا (subjunctive/jussive, nūn dropped) only after أَنْ/لَنْ/لَمْ; the LEGO is أَنْ تَسْتَطيعوا, so per P24 each row keeps the أَنْ frame; تَفْعَلوا untaught
- S19: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §jussive after لَمْ; rewritten to keep BUILD floor
- S20: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods
- S21: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods; لا أُريدُ S0019L04
- S22: Ryding, A Reference Grammar of Modern Standard Arabic (CUP 2005) §moods; لا يُريدُ S0034L01
- S23: P17; قالَتْ إِنَّها and تُريدُ حَقيبَةً are this basket's own (U03, B03)
- S24: meaning; أَفْهَمُ S0078L01 (subjunctive after أَنْ)
- S25: P17; English follows the Arabic
- S26: L22 (a bound أَنْ grows to its verb); تَسْأَل is the seed's own (B02)

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0454L03U05** (phrase, #1) EDIT: `she knows our friends came to us | تَعْرِفُ أَنَّ أَصْدِقاؤُنا جاءوا إِلَيْنا` → `she knows he came to us | تَعْرِفُ أَنَّهُ جاءَ إِلَيْنا` — [D1] [S1] sure
- **S0454L04U02** (phrase, #2) EDIT: `she thinks our friends came at about six | تَظُنَّ أَنَّ أَصْدِقاؤُنا جاءوا حَوالَيِ السّاعَةِ السّادِسَةِ` → `she thinks he came at about six | تَظُنُّ أَنَّهُ جاءَ حَوالَيِ السّاعَةِ السّادِسَةِ` — [D2] [S2] sure
- **S0454L04U05** (phrase, extra) EDIT: `she says they arrived at about six o'clock | تَقولُ إِنَّ أَصْدِقاؤُنا جاءوا حَوالَيِ السّاعَةِ السّادِسَةِ` → `she says he came at about six o'clock | تَقولُ إِنَّهُ جاءَ حَوالَيِ السّاعَةِ السّادِسَةِ` — [D3] [S1] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0627L01B03** (phrase, #3) EDIT: `she said it's not ready | قالَتْ إِنَّها لَيْسَتْ جاهِزَةٌ` → `= | قالَتْ إِنَّها لَيْسَتْ جاهِزَةً` — [D4] [S3] sure
- **S0627L01U02** (phrase, #4) EDIT: `he said it's not ready | قالَ إِنَّها لَيْسَتْ جاهِزَةٌ` → `= | قالَ إِنَّها لَيْسَتْ جاهِزَةً` — [D4] [S3] sure
- **S0627L01U04** (phrase, #5) EDIT: `do you know if it's ready? | هَلْ تَعْرِفُ إِنْ كانَتْ جاهِزَةٌ؟` → `= | هَلْ تَعْرِفُ إِنْ كانَتْ جاهِزَةً؟` — [D5] [S3] sure
- **S0396L02B01** (phrase, #6) EDIT: `they are ready | هُمْ مُسْتَعِدّينَ` → `everybody will be ready | سَيَكونُ الجَميعُ مُسْتَعِدّينَ` — [D6] [S4] sure
- **S0396L02B02** (phrase, extra) EDIT: `everybody is ready | الجَميعُ مُسْتَعِدّينَ` → `everybody was ready | كانَ الجَميعُ مُسْتَعِدّينَ` — [D7] [S5] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0396L02B03** (phrase, #7) EDIT: `are they ready? | هَلْ هُمْ مُسْتَعِدّينَ؟` → `was everybody ready? | هَلْ كانَ الجَميعُ مُسْتَعِدّينَ؟` — [D8] [S5] sure
- **S0396L02B04** (phrase, #8) EDIT: `I know they are ready | أَعْرِفُ أَنَّهُمْ مُسْتَعِدّينَ` → `when everybody is ready | عِنْدَما يَكونُ الجَميعُ مُسْتَعِدّينَ` — [D9] [S6] sure
- **S0396L02U01** (phrase, extra) EDIT: `is everybody ready? | هَلِ الجَميعُ مُسْتَعِدّينَ؟` → `will everybody be ready on Friday night? | هَلْ سَيَكونُ الجَميعُ مُسْتَعِدّينَ لَيْلَةَ الجُمُعَةِ؟` — [D10] [S7] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0396L02U02** (phrase, extra) EDIT: `I think everybody is ready | أَظُنُّ أَنَّ الجَميعَ مُسْتَعِدّينَ` → `I think everybody will be ready | أَظُنُّ أَنَّهُ سَيَكونُ الجَميعُ مُسْتَعِدّينَ` — [D11] [S8] likely — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0396L02U04** (phrase, #9) EDIT: `I think the people at the entrance are ready | أَظُنُّ أَنَّ الناسَ عِنْدَ المَدْخَلِ مُسْتَعِدّينَ` → `was everybody ready at the entrance? | هَلْ كانَ الجَميعُ مُسْتَعِدّينَ عِنْدَ المَدْخَلِ؟` — [D12] [S9] sure
- **S0396L02U05** (phrase, #10) EDIT: `I know they are ready for Friday night | أَعْرِفُ أَنَّهُمْ مُسْتَعِدّينَ لَيْلَةَ الجُمُعَةِ` → `everybody will be ready for Friday night | سَيَكونُ الجَميعُ مُسْتَعِدّينَ لَيْلَةَ الجُمُعَةِ` — [D13] [S5] sure
- **S0134L01U01** (phrase, #11) EDIT: `I think that's not a problem | أَظُنُّ أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً` → `it's not a problem because he's here | لَيْسَتْ مُشْكِلَةً لِأَنَّهُ هُنا` — [D14] [S10] likely
- **S0134L01B03** (phrase, extra) EDIT: `that's not a problem | ذٰلِكَ لَيْسَتْ مُشْكِلَةً` → `that's why it's not a problem | لِذٰلِكَ لَيْسَتْ مُشْكِلَةً` — [D14] [S11] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0134L01U03** (phrase, extra) DELETE: `I believe it's not a problem at all | أَعْتَقِدُ أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً` — [D15] [S12] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3); USE floor 5 → 4 (warn-only)
- **S0665L01U05** (phrase, #12) DELETE: `I hope you all can go | أَرْجو أَنْ يُمْكِنُكُمْ تَذْهَبوا` — [D16] [S13] sure
- **S0668L01B01** (phrase, #15) EDIT: `you all can | تَسْتَطيعوا` → `she wants you all to be able to | هِيَ تُريدُ أَنْ تَسْتَطيعوا` — [D17] [S14] sure
- **S0668L01B03** (phrase, #16) EDIT: `do you all think you can? | هَلْ تَظُنّونَ أَنَّهُ تَسْتَطيعوا؟` → `you all want to be able to | تُريدونَ أَنْ تَسْتَطيعوا` — [D18] [S15] likely
- **S0668L01U02** (phrase, #14) EDIT: `can you all do that? | هَلْ تَسْتَطيعوا ذلِكَ؟` → `I hope you all can say that | أَرْجو أَنْ تَسْتَطيعوا أَنْ تَقولوا ذلِكَ` — [D19] [S16] sure
- **S0668L01U04** (phrase, #13) DELETE: `I don't know if you all can | لا أَعْرِفُ هَلْ تَسْتَطيعوا` — [D19] [S17] sure
- **S0668L01U05** (phrase, extra) EDIT: `yes, you all can do something | نَعَمْ، تَسْتَطيعوا أَنْ تَفْعَلونَ شَيْئاً` → `do you all want to be able to say that? | هَلْ تُريدونَ أَنْ تَسْتَطيعوا أَنْ تَقولوا ذلِكَ؟` — [D20] [S18] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0438L01B01** (phrase, #17) EDIT: `they want | يُريدوا` → `they didn't want that | لَمْ يُريدوا ذلِكَ` — [D21] [S19] sure
- **S0438L01U04** (phrase, extra) EDIT: `do you think they didn't want to collect? | هَلْ تَظُنَّ أَنَّهُمْ لَمْ يُريدوا أَنْ يَجْمَعوا؟` → `= | هَلْ تَظُنُّ أَنَّهُمْ لَمْ يُريدوا أَنْ يَجْمَعوا؟` — [D22] [S20] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0427L02B01** (phrase, #18) EDIT: `you think | تَظُنَّ` → `I don't want you to think | لا أُريدُ أَنْ تَظُنَّ` — [D23] [S21] sure
- **S0427L02U05** (phrase, #19) EDIT: `do you think they understand each other? | هَلْ تَظُنَّ أَنَّهُمْ يَفْهَمونَ بَعْضَهُمْ؟` → `I don't want you to think they understand each other | لا أُريدُ أَنْ تَظُنَّ أَنَّهُمْ يَفْهَمونَ بَعْضَهُمْ` — [D24] [S20] sure
- **S0427L02U03** (phrase, extra) EDIT: `do you think they would like to lead? | هَلْ تَظُنَّ أَنَّهُمْ يَوَدّونَ أَنْ يَقودوا؟` → `he doesn't want you to think they would like to lead | لا يُريدُ أَنْ تَظُنَّ أَنَّهُمْ يَوَدّونَ أَنْ يَقودوا` — [D24] [S22] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0154L01B02** (phrase, #20) EDIT: `where do we meet Saturday night? | أَيْنَ نَلْتَقِيَ لَيْلَةَ السَّبْت` → `= | أَيْنَ نَلْتَقي لَيْلَةَ السَّبْت؟` — [D25] [S20] sure
- **S0154L01B03** (phrase, extra) EDIT: `we meet Saturday night | نَلْتَقِيَ لَيْلَةَ السَّبْت` → `= | نَلْتَقي لَيْلَةَ السَّبْت` — [D26] [S20] sure — note: not in the scan list; same defect in the same basket (R0.4 step 3)
- **S0635L01U05** (phrase, #21) EDIT: `she said the bag will be fine | قالَتْ إِنَّ حَقيبَةً سَتَكونُ جَيِّدَةً` → `she said she wants a bag | قالَتْ إِنَّها تُريدُ حَقيبَةً` — [D27] [S23] sure
- **S0630L01U05** (phrase, #23) EDIT: `can I understand what you're saying? | هَلْ يُمْكِنُني أَنْ أَتَعَلَّمَ ما تَقولُهُ؟` → `= | هَلْ يُمْكِنُني أَنْ أَفْهَمَ ما تَقولُهُ؟` — [D28] [S24] sure
- **S0415L01U04** (phrase, #24) EDIT: `I asked about the problem here | سَأَلْتُ عَنْ مُشْكِلَةٍ هُنا` → `I asked about a problem here | =` — [D29] [S25] sure
- **S0136L02B04** (phrase, #22) EDIT: `can you? | هَلْ يُمْكِنُكَ أَنْ` → `can you ask? | هَلْ يُمْكِنُكَ أَنْ تَسْأَلَ؟` — [D30] [S26] sure

## ara_eg_for_eng

**Defects:**
- D1: "this approach" but no demonstrative
- D2: حاجة كويس: حاجة is feminine (كويسة); the correct row "this is a good thing | دي حاجة كويسة" already exists as S0047L03U01, and this one clashes with it (same English, two answers)
- D3: حاجة كويس (as U03); the correct row exists as S0047L03U02 and this one clashes with it
- D4: not Egyptian: الوقت إن نمشي / بقى وقت نمشي

**Sources / reasoning:**
- S1: Egyptian demonstrative ده (Woidich, Das Kairenisch-Arabische §demonstratives; course S0329L01 ده مهم). Kept أسلوب indefinite so the row still contains its LEGO (the scan's الأسلوب ده would not)
- S2: as U02
- S3: Egyptian adjective agreement (Abdel-Massih, An Introduction to Egyptian Arabic §agreement); P16. Rewriting here would use كويسة before its own LEGO (S0047L03, later sibling — P2)
- S4: as U03
- S5: The natural Egyptian (جه الوقت نمشي) uses جه, which no LEGO teaches, and seed 93 has one LEGO (نمشي) with the rest untiled (S3). A text edit puts an untaught word in two USE rows (P1); the real fix is a new LEGO "it's time | جه الوقت" with its own basket — a structural seed rebuild on a beta course (lego.insert needs Tom's or Kai's explicit go). Listed as a rebuild.

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0441L01U02** (phrase, #27) EDIT: `this approach is really hard | بجد أسلوب صعب` → `this really is a hard approach | بجد ده أسلوب صعب` — [D1] [S1] likely
- **S0441L01U04** (phrase, #28) EDIT: `this approach is still hard | لسه أسلوب صعب` → `this is still a hard approach | ده لسه أسلوب صعب` — [D1] [S2] likely
- **S0047L02U03** (phrase, #25) DELETE: `this is a good thing | دي حاجة كويس` — [D2] [S3] sure — note: L02 USE floor drops; the two remaining L02 USE rows (U02, U05: إن دي مفيد) have the same agreement error and no feminine adjective is taught by seed 47 to fix them — listed, not changed
- **S0047L02U04** (phrase, #26) DELETE: `I think that this is a good thing | بفكر إن دي حاجة كويس` — [D3] [S4] sure
- **SEED93** (seed, #29) HOLD: `It's time to go now. | الوقت إن نمشي دلوقتي.` — [D4] [S5] n/a
- **S0093L01U01** (phrase, #30) HOLD: `it's time to go now | بقى وقت نمشي دلوقتي` — [D4] [S5] n/a
- **S0093L01U04** (phrase, #31) HOLD: `it's time to go | بقى وقت نمشي` — [D4] [S5] n/a

## kor_for_hin

**Defects:**
- D1: seed says 우리는 … 주고 싶어했어요 ("we" with the third-person wish form); its own seed copy U01 already says 싶었어요
- D2: seed: 우리는 … 보고 싶어했어요 (third-person wish form for "we")
- D3: LEGO देखना चाहते थे | 보고 싶어했어요: "we wanted" in this seed
- D4: BUILD follows its LEGO (P17/O12)
- D5: third-person row would no longer contain the LEGO (P17); rewritten in the seed's own person
- D6: bracket label (स्त्री) in the Hindi (K11) and a third-person row that no longer contains the LEGO (P17)
- D7: third-person row would no longer contain the LEGO (P17)
- D8: seed: 우리는 … 알고 싶어했어요 (third-person wish form for "we")
- D9: LEGO जानना चाहते थे | 알고 싶어했어요: "we wanted" in this seed
- D10: component follows the LEGO
- D11: BUILD follows its LEGO
- D12: BUILD follows its LEGO; and सच ("truth") over 무엇을 ("what") is a wrong gloss
- D13: gender label in brackets in the Hindi (K11)
- D14: bracket label (K11); वह … तैयार नहीं है does not show gender, so without the label it would match U03 (→ 그는)
- D15: bracket label (K11); उसे … चाहिए cannot show gender in Hindi, and without it the row equals U03 (उसे … | 그는 …)
- D16: bracket label (K11); कहती already shows "she"
- D17: bracket label (K11); मेरी दोस्त already shows "she"
- D18: bracket label (K11); "वह अच्छे इंसान की तरह है" cannot show gender, and without it the row equals U02 (→ 그는)
- D19: bracket label (K11); वह … जानता था cannot show the subject's gender, and without it the row equals U04 (→ 그는)
- D20: component tile carries a bracket label (K11)
- D21: component tile carries a bracket label "(बीता)" (K11)
- D22: Hindi says "want to learn", Korean 배우려고 해요 says "trying to learn"
- D23: 어디서 + 가다 is wrong: 어디서 marks where an action happens; a destination is 어디(에)
- D24: row in the formal sir/madam block (seed 655: 것 같습니다, 선생님) with no address in the Hindi: no visible register signal (K10)
- D25: 최신 들었어요 is not Korean (bare 최신 "latest" as object)

**Sources / reasoning:**
- S1: -고 싶어 하다 reports another person's wish; the speaker's own (and "we") wish is -고 싶다 (NIKL 표준국어대사전 "싶다" 보조형용사 and "-어 하다"; Korean Grammar in Use Beginner, unit "-고 싶다/-고 싶어 하다"). Course-internal: kor_for_hin already teaches चाहता था | 싶었어요 (S0030L03), and each seed's own seed-copy row (U01) already says 싶었어요.
- S2: O12
- S3: P17; words: हम|우리는, आपको|당신을 already in this basket
- S4: K11, P17; कल|어제 taught S0030L01 (its component tile is fixed below)
- S5: P17; आज|오늘, यह|이것을 in this basket
- S6: O13 (components move with the LEGO)
- S7: O12; meaning
- S8: P17; कल|어제 S0030L01
- S9: P17; उसका नाम|그의 이름을 S0020L04
- S10: Dropping "(स्त्री)" here recreates the clash it was hiding (O4): Hindi उसका does not mark the owner's gender, and S0020L04 already teaches उसका नाम | 그의 이름을 ("his name"); B01–B03 are bare fragments with no context, so "उसका (नाम)" would have two answers (P8/K22). The canon remedy (K23: keep both, explain the sense in a hand-authored presentation, PR1/PR2) means authoring a Hindi presentation line for a Korean LEGO, which is a presentation-design call this pass should not make on its own. Left as is and listed.
- S11: K11; Hindi perfective हुई agrees with a feminine subject (McGregor, Outline of Hindi Grammar §perfective participle); K6 lets the known side use a form of a taught verb
- S12: K11; rewritten instead of deleted to hold the USE floor. Korean drops the "you" subject in a question (NIKL 표준국어문법론 주어 생략); words are this basket's own
- S13: K11
- S14: K11/O4
- S15: K11/O4; a rewrite with 제 친구는 fails the vocabulary gate (친구는 untaught)
- S16: K11 (components are tiles, never prompted — K22 — so no clash)
- S17: K11; the LEGO itself (कल आपसे | 어제 당신에게) is unlabelled
- S18: meaning; सीखने की कोशिश कर रहा हूँ | 배우려고 해요 is S0002L02; rewritten instead of deleted to hold the floor
- S19: NIKL 표준국어대사전 "에서" (장소) vs "에" (도착점); 어디 met in S0070L02 어디 있는지 (P2: a word met inside a chunk may be used)
- S20: K10 rule 1; the scan proposed 같아요, but the LEGO is 것 같습니다 and that would break containment (P17); श्रीमती|선생님 is the seed's own
- S21: meaning; words are the seed's own (최신 아이디어를); rewritten to keep BUILD floor 3

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **SEED54** (seed, extra) EDIT: `हम आपको थोड़ा और समय देना चाहते थे। | 우리는 당신에게 시간을 조금 더 주고 싶어했어요.` → `= | 우리는 당신에게 시간을 조금 더 주고 싶었어요.` — [D1] [S1] sure — note: not in the scan list; same defect found by the course-wide sweep (R0.4)
- **SEED107** (seed, extra) EDIT: `हम देखना चाहते थे कि आप क्या कर रहे थे। | 우리는 당신이 무엇을 하고 있는지 보고 싶어했어요.` → `= | 우리는 당신이 무엇을 하고 있는지 보고 싶었어요.` — [D2] [S1] sure — note: scan row S0107L03 (seed + LEGO)
- **S0107L03** (lego, #134) EDIT: `देखना चाहते थे | 보고 싶어했어요` → `= | 보고 싶었어요` — [D3] [S1] sure
- **S0107L03B01** (phrase, extra) EDIT: `देखना चाहते थे | 보고 싶어했어요` → `= | 보고 싶었어요` — [D4] [S2] sure
- **S0107L03B02** (phrase, extra) EDIT: `यह देखना चाहते थे | 이것을 보고 싶어했어요` → `= | 이것을 보고 싶었어요` — [D4] [S2] sure
- **S0107L03B03** (phrase, extra) EDIT: `आपको देखना चाहते थे | 당신을 보고 싶어했어요` → `= | 당신을 보고 싶었어요` — [D4] [S2] sure
- **S0107L03U02** (phrase, extra) EDIT: `वह आपको देखना चाहता था | 그는 당신을 보고 싶어했어요` → `हम आपको देखना चाहते थे | 우리는 당신을 보고 싶었어요` — [D5] [S3] sure
- **S0107L03U04** (phrase, #147) EDIT: `वह (स्त्री) आपको देखना चाहती थी | 그녀는 당신을 보고 싶어했어요` → `हम कल आपको देखना चाहते थे | 우리는 어제 당신을 보고 싶었어요` — [D6] [S4] sure
- **S0107L03U05** (phrase, extra) EDIT: `वे आपको देखना चाहते थे | 그들은 당신을 보고 싶어했어요` → `हम आज यह देखना चाहते थे | 우리는 오늘 이것을 보고 싶었어요` — [D7] [S5] sure
- **SEED201** (seed, extra) EDIT: `हम जानना चाहते थे कि क्या होने वाला है। | 우리는 무슨 일이 일어날지 알고 싶어했어요.` → `= | 우리는 무슨 일이 일어날지 알고 싶었어요.` — [D8] [S1] sure — note: scan row S0201L01 (seed + LEGO)
- **S0201L01** (lego, #135) EDIT: `जानना चाहते थे | 알고 싶어했어요` → `= | 알고 싶었어요` — [D9] [S1] sure
- **S0201L01C02** (phrase, extra) EDIT: `चाहते थे | 싶어했어요` → `= | 싶었어요` — [D10] [S6] sure
- **S0201L01B01** (phrase, extra) EDIT: `जानना चाहते थे | 알고 싶어했어요` → `= | 알고 싶었어요` — [D11] [S2] sure
- **S0201L01B02** (phrase, extra) EDIT: `यह जानना चाहते थे | 그것을 알고 싶어했어요` → `= | 그것을 알고 싶었어요` — [D11] [S2] sure
- **S0201L01B03** (phrase, extra) EDIT: `सच जानना चाहते थे | 무엇을 알고 싶어했어요` → `क्या जानना चाहते थे | 무엇을 알고 싶었어요` — [D12] [S7] sure
- **S0201L01U03** (phrase, extra) EDIT: `वह जानना चाहती थी कि क्या होने वाला है | 그녀는 무슨 일이 일어날지 알고 싶어했어요` → `हम कल जानना चाहते थे कि क्या होने वाला है | 우리는 어제 무슨 일이 일어날지 알고 싶었어요` — [D7] [S8] sure
- **S0201L01U05** (phrase, extra) EDIT: `वे जानना चाहते थे कि क्या होने वाला है | 그들은 무슨 일이 일어날지 알고 싶어했어요` → `हम उसका नाम जानना चाहते थे | 우리는 그의 이름을 알고 싶었어요` — [D7] [S9] sure
- **S0021L02** (lego, #140) HOLD: `उसका (स्त्री) | 그녀의` — [D13] [S10] n/a
- **S0021L02B01** (phrase, #141) HOLD: `उसका (स्त्री) | 그녀의` — [D13] [S10] n/a
- **S0021L02B02** (phrase, #142) HOLD: `उसका (स्त्री) नाम | 그녀의 이름을` — [D13] [S10] n/a
- **S0021L02B03** (phrase, #143) HOLD: `उसका (स्त्री) नाम सीखना | 그녀의 이름을 배우고` — [D13] [S10] n/a
- **S0096L02U04** (phrase, #144) EDIT: `वह (स्त्री) अभी तैयार नहीं है | 그녀는 아직 준비가 안 됐어요` → `वह अभी तैयार नहीं हुई है | =` — [D14] [S11] likely
- **S0096L05U05** (phrase, #145) EDIT: `उसे (स्त्री) थोड़ा और समय चाहिए | 그녀는 시간이 조금 더 필요해요` → `क्या आपको आज थोड़ा और समय चाहिए? | 오늘 시간이 조금 더 필요해요?` — [D15] [S12] likely
- **S0102L02U05** (phrase, #146) EDIT: `वह (स्त्री) कहती है कि यह ऐसा नहीं है | 그녀는 그렇지 않다고 말해요` → `वह कहती है कि यह ऐसा नहीं है | =` — [D16] [S13] sure
- **S0110L01U04** (phrase, #148) EDIT: `वह (स्त्री) मेरी दोस्त है | 그녀는 제 친구예요` → `वह मेरी दोस्त है | =` — [D17] [S13] sure
- **S0128L02U03** (phrase, #149) DELETE: `वह अच्छे इंसान की तरह है (स्त्री) | 그녀는 좋은 사람 같아요` — [D18] [S14] sure — note: USE floor 5 → 4 (warn-only, P23)
- **S0128L04U05** (phrase, #150) DELETE: `वह किसी ऐसे इंसान की तरह है जिसे मैं जानता था (स्त्री) | 그녀는 제가 알던 사람 같아요` — [D19] [S15] sure — note: USE floor 5 → 4 (warn-only, P23)
- **S0017L03C01** (phrase, extra) EDIT: `वह (स्त्री) | 그녀는` → `वह | =` — [D20] [S16] sure — note: not in the scan list; same defect found by the course-wide sweep
- **S0030L01C01** (phrase, extra) EDIT: `कल (बीता) | 어제` → `कल | =` — [D21] [S17] sure — note: not in the scan list; found by sweep
- **S0152L01U01** (phrase, #136) EDIT: `आप क्या सीखना चाहते हैं | 당신이 무엇을 배우려고 해요` → `आप क्या सीखने की कोशिश कर रहे हैं? | 당신이 무엇을 배우려고 해요?` — [D22] [S18] likely
- **S0156L02U02** (phrase, #137) EDIT: `आप कहाँ जाना चाहते हैं? | 어디서 가고 싶어요?` → `= | 어디 가고 싶어요?` — [D23] [S19] sure
- **S0655L02U02** (phrase, #138) EDIT: `मुझे लगता है कि आप सच में अच्छा कर रही हैं | 정말 잘하고 계신 것 같습니다` → `मुझे लगता है कि आप सच में अच्छा कर रही हैं, श्रीमती | 정말 잘하고 계신 것 같습니다, 선생님` — [D24] [S20] sure
- **S0196L03B01** (phrase, #139) EDIT: `सबसे नया सुना है | 최신 들었어요` → `अभी सबसे नया विचार सुना है | 지금 최신 아이디어를 들었어요` — [D25] [S21] sure

## ita_for_eng

**Defects:**
- D1: scan: re-gloss "that I could do" and a heads-up intro
- D2: "tutto quello che potessi fare": no superlative trigger
- D3: "it's not the least I could do" means nothing
- D4: no trigger, garbled English
- D5: "le ho chiesto di quello che potessi fare" is not Italian
- D6: "sembra che … possa" for "could" (possibility)
- D7: "the one | quella": nothing in the English says a woman, so the learner cannot predict quella over quello
- D8: "devo sicuramente più tempo" is not Italian (dovere + noun = owe)
- D9: English "after that" over "dopo tutto questo" (after all this)
- D10: English "after that" over "dopo tutto questo"
- D11: madam mid-sentence; K32 puts the address at the end
- D12: sir mid-sentence (K32); and "con lei oggi, signore" would split the LEGO con lei, signore (P17)

**Sources / reasoning:**
- S1: Not re-glossed: the seed English has no "that" (L26). The phrase half of P24 is done below; a PR3 heads-up intro is optional (SOFT) and is presentation authoring — not done here.
- S2: Serianni, Grammatica italiana XIV §§ on the subjunctive in relative clauses after a superlative / il minimo / l'unico (il minimo che potessi fare). P24: the LEGO che potessi fare is right only after such a trigger, so every row supplies one; era S0086
- S3: Serianni, Grammatica italiana XIV §§ on the subjunctive in relative clauses after a superlative / il minimo / l'unico (il minimo che potessi fare). P24: the LEGO che potessi fare is right only after such a trigger, so every row supplies one (davvero is untaught)
- S4: Serianni, Grammatica italiana XIV §§ on the subjunctive in relative clauses after a superlative / il minimo / l'unico (il minimo che potessi fare). P24: the LEGO che potessi fare is right only after such a trigger, so every row supplies one (unica is untaught)
- S5: Serianni, Grammatica italiana XIV §§ on the subjunctive in relative clauses after a superlative / il minimo / l'unico (il minimo che potessi fare). P24: the LEGO che potessi fare is right only after such a trigger, so every row supplies one; penso che + congiuntivo (sia)
- S6: K35 (Kai 2026-09-29): think/seem … could → potrebbe, not possa
- S7: Italian must choose a gender the English does not show. A heads-up intro (PR3) does not make the prompt deterministic; the real choice is a presentation design plus context in every row (K23) — not settled by a source, scan confidence "best guess". Left as is and listed.
- S8: Treccani "dovere" (transitive = to owe); avere bisogno di
- S9: meaning
- S10: K32
- S11: K32 + P17 (oggi moved to the front)

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0479L02** (lego, #43) KEEP: `I could do | che potessi fare` — [D1] [S1] n/a
- **S0479L02B03** (phrase, #47) EDIT: `all I could do | tutto quello che potessi fare` → `it was the least I could do | era il minimo che potessi fare` — [D2] [S2] sure
- **S0479L02U02** (phrase, #44) EDIT: `it's not the least I could do | non è il minimo che potessi fare` → `it was the least I could do for you | era il minimo che potessi fare per te` — [D3] [S3] likely
- **S0479L02U04** (phrase, #45) EDIT: `there are many reasons for what I could do | ci sono molte ragioni per quello che potessi fare` → `it's the least I could do for her | è il minimo che potessi fare per lei` — [D4] [S4] likely
- **S0479L02U05** (phrase, #46) EDIT: `I asked her about what I could do | le ho chiesto di quello che potessi fare` → `I think it's the least I could do | penso che sia il minimo che potessi fare` — [D5] [S5] likely
- **S0497L03U03** (phrase, #48) EDIT: `it seems that it could be important | sembra che possa essere importante` → `= | sembra che potrebbe essere importante` — [D6] [S6] likely
- **S0390L01** (lego, #49) HOLD: `the one | quella` — [D7] [S7] n/a
- **S0640L02** (lego, #50) HOLD: `it's the red one | è quella rossa` — [D7] [S7] n/a
- **S0117L01U04** (phrase, #51) EDIT: `I definitely need more time | devo sicuramente più tempo` → `= | ho sicuramente bisogno di più tempo` — [D8] [S8] sure
- **S0642L02U05** (phrase, #52) EDIT: `how do you feel after that? | come si sente dopo tutto questo?` → `how do you feel after all this? | =` — [D9] [S9] sure
- **S0657L01B03** (phrase, #53) EDIT: `how do you all feel after that? | come vi sentite dopo tutto questo?` → `how do you all feel after all this? | =` — [D10] [S9] sure
- **S0642L01U07** (phrase, #54) EDIT: `I want to speak with you, madam, as soon as I can | voglio parlare con lei, signora, appena posso` → `I want to speak with you as soon as I can, madam | voglio parlare con lei appena posso, signora` — [D11] [S10] sure
- **S0639L02U05** (phrase, #55) EDIT: `I want to speak with you sir today | voglio parlare con lei, signore, oggi` → `today I want to speak with you sir | oggi voglio parlare con lei, signore` — [D12] [S11] sure

## spa_for_eng

**Defects:**
- D1: disfrutar + infinitive
- D2: disfrutar + infinitive (and the "like" version would copy B06)
- D3: tener calque for ordering
- D4: tener calque ("¿Puedo tener un momento…?")
- D5: "tomar algo de tiempo para" — with time the verb is pronominal (tomarse)
- D6: "practicar decir": practicar + infinitive

**Sources / reasoning:**
- S1: disfrutar takes de + noun or a gerund ("disfruto leyendo"); "disfrutar + infinitivo" is a calque (Fundéu, "disfrutar de / disfrutar + gerundio"; precedent #442·AI applied the same fix). The gerund despertándome is untaught and would break the LEGO despertarme (P17), so these rows take the seed's own "me gusta" and the English "like" (one Spanish verb per English verb, P16)
- S2: "¿podría tener…?" is a calque of "could I have"; ordering is pedir / "¿me da(s)…?" (Fundéu on calques of "can I have"; RAE DPD "tener")
- S3: "¿podría tener…?" is a calque of "could I have"; ordering is pedir / "¿me da(s)…?" (Fundéu on calques of "can I have"; RAE DPD "tener"); me das is untaught, so the row takes the basket's own necesito un momento para (U09)
- S4: RAE DPD "tomar(se)"; tomarse and tomar are both untaught at 189, so no fix inside taught words; the basket keeps 11 USE
- S5: Deborah's item 10 shape (practicar cómo decir); cómo decir is seed 60's own

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0055L01B03** (phrase, #294) EDIT: `I don't enjoy waking up | No disfruto despertarme` → `I don't like waking up | No me gusta despertarme` — [D1] [S1] sure
- **S0055L01B05** (phrase, #295) EDIT: `I enjoy waking up | Disfruto despertarme` → `I like waking up | Me gusta despertarme` — [D1] [S1] sure
- **S0055L01U01** (phrase, #296) EDIT: `I don't enjoy waking up when I'm tired | No disfruto despertarme cuando estoy cansado` → `I don't like waking up when I'm very tired | No me gusta despertarme cuando estoy muy cansado` — [D2] [S1] likely
- **S0055L01U03** (phrase, #297) EDIT: `I don't enjoy waking up when I'm starting to feel tired | No disfruto despertarme cuando estoy empezando a sentirme cansado` → `I don't like waking up when I'm starting to feel tired | No me gusta despertarme cuando estoy empezando a sentirme cansado` — [D1] [S1] sure
- **S0108L02U09** (phrase, #298) EDIT: `I do not enjoy stopping in the middle of something I am just beginning to understand | No disfruto parar en medio de algo que estoy empezando a entender` → `I don't like stopping in the middle of something I'm just beginning to understand | No me gusta parar en medio de algo que estoy empezando a entender` — [D1] [S1] sure
- **S0216L04U14** (phrase, #299) EDIT: `I really enjoy being able to talk with my friends at the weekend | Disfruto mucho poder hablar con mis amigos el fin de semana` → `I really like being able to talk with my friends at the weekend | Me gusta mucho poder hablar con mis amigos el fin de semana` — [D1] [S1] sure
- **S0243L03U08** (phrase, #300) EDIT: `I don't enjoy eating when I'm feeling tired | No disfruto comer cuando me siento cansado` → `I don't like eating when I'm feeling tired | No me gusta comer cuando me siento cansado` — [D1] [S1] sure
- **S0586L01U01** (phrase, #301) EDIT: `could I have some boiled eggs please? | ¿podría tener unos huevos cocidos por favor?` → `= | ¿podría pedir unos huevos cocidos, por favor?` — [D3] [S2] likely
- **S0586L02U02** (phrase, #302) EDIT: `could I have twenty boiled eggs? | ¿podría tener veinte huevos cocidos?` → `= | ¿podría pedir veinte huevos cocidos?` — [D3] [S2] likely
- **S0156L02U02** (phrase, #303) EDIT: `Can I have a moment to think before I answer? | ¿Puedo tener un momento para pensar antes de contestar?` → `I need a moment to think before I answer | Necesito un momento para pensar antes de contestar` — [D4] [S3] sure
- **S0189L01U03** (phrase, #304) DELETE: `It is a good idea to take a bit of time to think carefully before you try to answer | Es una buena idea tomar algo de tiempo para pensar con cuidado antes de intentar contestar` — [D5] [S4] sure
- **S0060L01U11** (phrase, #305) EDIT: `I need to practise saying different words when I speak Spanish | Necesito practicar decir palabras diferentes cuando hablo español` → `= | Necesito practicar cómo decir palabras diferentes cuando hablo español` — [D6] [S5] likely — note: the wider "practicar hablando" question (#443) is a separate open item and is not touched

## fra_for_eng

**Defects:**
- D1: je ne pense pas que + indicative (c'est)
- D2: "grand chose" is spelled grand-chose, and "doesn't mean anything" over it is wrong (grand-chose = much); plain "doesn't mean much" is B03's English
- D3: spelling "grand chose"
- D4: "no we could | non nous pourrions" contradicts itself

**Sources / reasoning:**
- S1: Grevisse, Le bon usage §1123: ne pas penser que + subjonctif (ce soit), not indicative c'est. ce soit is untaught until S0330 (P1), so each row is rebuilt on the seed's own taught frame "je ne pense pas qu'elle pourrait …" (the seed sentence uses it)
- S2: Larousse "grand-chose" (with hyphen; pas grand-chose = not much)
- S3: Larousse "grand-chose"
- S4: meaning

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0318L01U02** (phrase, #35) EDIT: `I don't think it's true | je ne pense pas que c'est vrai` → `I don't think she could come | je ne pense pas qu'elle pourrait venir` — [D1] [S1] sure
- **S0318L01U03** (phrase, #36) EDIT: `I don't think it's the same thing | je ne pense pas que c'est la même chose` → `I don't think she could stay | je ne pense pas qu'elle pourrait rester` — [D1] [S1] sure
- **S0318L01U04** (phrase, #37) EDIT: `I don't think it's useful | je ne pense pas que c'est utile` → `I don't think she could help | je ne pense pas qu'elle pourrait aider` — [D1] [S1] sure
- **S0318L01U05** (phrase, #38) EDIT: `I don't think it's a good idea | je ne pense pas que c'est une bonne idée` → `I don't think she could do it | je ne pense pas qu'elle pourrait le faire` — [D1] [S1] sure
- **S0318L01U06** (phrase, #39) EDIT: `I don't think it's better | je ne pense pas que c'est mieux` → `I don't think she could wait | je ne pense pas qu'elle pourrait attendre` — [D1] [S1] sure
- **S0469L01B02** (phrase, #40) EDIT: `that doesn't mean anything | ça ne veut pas dire grand chose` → `that doesn't really mean much | ça ne veut pas dire grand-chose` — [D2] [S2] sure — note: target is a spelling change only: same words spoken, keep the clips
- **S0555L04B02** (phrase, #41) EDIT: `and I'm too tired to do much | et je suis trop fatigué pour faire grand chose` → `= | et je suis trop fatigué pour faire grand-chose` — [D3] [S3] sure — note: spelling only: keep the clips
- **S0413L01B03** (phrase, #42) DELETE: `no we could | non nous pourrions` — [D4] [S4] sure — note: BUILD floor drops (warn-only)

## zho_for_jpn

**Defects:**
- D1: Japanese says 覚えたい ("want to memorise"); Chinese says 学 (learn)
- D2: seed copy: Japanese 覚えたい over 学
- D3: scan: 学 → 记住
- D4: 继续做这个一会儿: a duration phrase does not follow a non-personal object
- D5: as seed 92
- D6: the English word "Chinese" inside both the Japanese and the Chinese
- D7: LEGO target "chinese" is an English word; once it says 中文 it repeats S0001L03, so it is not new
- D8: English word "chinese" in the Chinese

**Sources / reasoning:**
- S1: seed contradicts its own known (S15 sense 2); 记住 taught at S0006L01; main course zho seed 20 says 记住
- S2: as seed 20
- S3: Not a defect: this row's Japanese is 学びたい ("want to learn"), so 学 is right; the scan applied the seed fix to a row whose known differs.
- S4: Chinese Grammar Wiki, "Expressing duration": V + duration + object unless the object is a personal pronoun (等我一会儿 is right because 我 is personal)
- S5: as seed 92
- S6: 中文 taught S0001L03; 中国語 is the Japanese
- S7: as seed 283; is_new false (a second debut of a taught word)
- S8: as seed 283

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **SEED20** (seed, #306) EDIT: `彼の名前を早く覚えたいですね。 | 你想快点学他的名字。` → `= | 你想快点记住他的名字。` — [D1] [S1] sure
- **S0020L03U01** (phrase, #308) EDIT: `彼の名前を早く覚えたいですね | 你想快点学他的名字` → `= | 你想快点记住他的名字` — [D2] [S2] sure
- **S0020L03B03** (phrase, #307) KEEP: `彼の名前を早く学びたい | 想快点学他的名字` — [D3] [S3] n/a
- **SEED92** (seed, #309) EDIT: `しばらくこれを続けたいです。 | 我想继续做这个一会儿。` → `= | 我想继续做一会儿这个。` — [D4] [S4] likely
- **S0092L03B03** (phrase, #310) EDIT: `これをしばらくやる。 | 做这个一会儿。` → `= | 做一会儿这个。` — [D5] [S5] likely
- **SEED283** (seed, extra) EDIT: `Chineseを話す友だち、誰がいる？ | 你哪些朋友会说Chinese？` → `中国語を話す友だち、誰がいる？ | 你哪些朋友会说中文？` — [D6] [S6] sure
- **S0283L02** (lego, #311) EDIT: `中国語 | chinese` → `= | 中文` (is_new → false) — [D7] [S7] sure
- **S0283L02U01** (phrase, extra) EDIT: `中国語を話したいです | 我想说chinese` → `= | 我想说中文` — [D8] [S8] sure — note: not in the scan list; same defect in the same basket
- **S0283L02U02** (phrase, extra) EDIT: `中国語を勉強しています | 我在学chinese` → `= | 我在学中文` — [D8] [S8] sure — note: not in the scan list; same defect in the same basket
- **S0283L02U03** (phrase, extra) EDIT: `中国語が好きです | 我喜欢chinese` → `= | 我喜欢中文` — [D8] [S8] sure — note: not in the scan list; same defect in the same basket
- **S0283L02U04** (phrase, extra) EDIT: `中国語を話せますか？ | 你会说chinese吗？` → `= | 你会说中文吗？` — [D8] [S8] sure — note: not in the scan list; same defect in the same basket

## deu_for_eng

**Defects:**
- D1: scan: ich bewege → ich bewege mich

**Sources / reasoning:**
- S1: Already fixed live: the row reads "ich bewege mich" (re-read 18 Nov).

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0513L03B01** (phrase, #32) ALREADY-FIXED: `I move | ich bewege mich` — [D1] [S1] n/a

## deu_ch_for_eng

**Defects:**
- D1: "ich cha Sie hälfe": hälfe (helfen) takes the dative (Ihne); and the dative form would no longer contain the LEGO Sie (P17)

**Sources / reasoning:**
- S1: Duden "helfen" (+ Dativ); Swiss German polite chönd Sie (Idiotikon / Schweizer Standard), mir = dative "me"; "madam" in the English keeps it apart from the du-form chasch mir hälfe (S0512) — K10 rule 1

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0642L01U03** (phrase, #33) EDIT: `I can help you | ich cha Sie hälfe` → `can you help me, madam? | chönd Sie mir hälfe?` — [D1] [S1] likely

## eng_for_hin

**Defects:**
- D1: component चाहता हूँ (male) under the LEGO मैं चाहती हूँ (female, Kriti)

**Sources / reasoning:**
- S1: the LEGO's own form; Hindi verb agreement with a female speaker

**Rows** (`known | target` → `new known | new target`, `=` unchanged):
- **S0001L01C02** (phrase, #34) EDIT: `चाहता हूँ | want` → `चाहती हूँ | =` — [D1] [S1] sure — note: component tile: text only, never spoken (no audio)

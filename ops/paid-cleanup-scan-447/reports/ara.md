# Arabic slice: cleanup scan findings (#447, worker #469)

Courses: **ara_for_eng** (Modern Standard Arabic, main), **ara_eg_for_eng** (Egyptian), **ara_lb_for_eng** (Lebanese). All read live through Popty's script-view on 17 Nov 2026 between 14:06 and 14:07Z. **Nothing was applied, rendered, linked or sent.**
**ara_sy_for_eng could not be read (GAP):** script-view returns 0 seeds and `GET /api/production/ara_sy_for_eng/seed/S0001/baskets` answers 404 "Seed S0001 not found". The estate map lists 300 seeds and a pod-1 with 232 slots (108 draft lines, 6 empty target slots), so the course exists, but not where Popty's seed routes look.

Row-level list: `ops/paid-cleanup-scan-447/reports/ara.json` (one row per finding, with chars). Arabic patterns: `ara.patterns.json`.

**How to read the counts.** A big count is not a big job. Four families are mechanical, cheap and big: seed sentences not played (fix = add the seed as a row with its own clips, 0 chars), question marks, empty audio, and LEGO length. The content families Kai needs to judge are smaller, and each is listed below with examples.

Audio characters = new target text × 2 voices + new known text × 1. A delete or a relink costs 0. A changed LEGO is priced at its known + target × 2 + about 40 for the intro. Rewritten rows are priced at their current length. All figures are estimates (±15%).

## Totals

| course | REAL new findings | of which hand-judged content* | KNOWN (already on a record) | chars |
|---|---|---|---|---|
| ara_for_eng | 563 | 228 | 7 | 25,876 |
| ara_eg_for_eng | 670 | 147 | 0 | 7,607 |
| ara_lb_for_eng | 805 | 189 | 1 | 12,108 |
| **all** | **2,038** | **564** | **8** | **45,591** |

\*Content = grammar, English, P17, seed↔LEGO drift, glosses, ZUT, not-new, untaught, the priority families. The rest are length, seed-play, question marks, empty audio and duplicate rows.
**Not in the total:** re-cutting long LEGOs (not priced until the cuts are chosen), and the ara_for_eng female voice (below, about 17,000 chars if every at-risk row were re-recorded).

## PRIORITY: fixes made in one course and not in the others

| # | rule fixed | where | now | REAL |
|---|---|---|---|---|
| 1 | Same pair taught NEW twice → set not-new (L17) | ara_for_eng #513, d/83adb35a | ara_for_eng 0 left; **ara_eg 14, ara_lb 3** (one lb pair is inverted: S0017L01 is the first teaching but marked not-new, S0035L01 is new) | 17 |
| 2 | Female voice re-check + every pre-July female clip re-recorded | ara_eg / ara_lb #641, d/468045e4 | **ara_for_eng never had it.** It has its own gender-prep pass (348 expansion rows, processed 4 Nov; 0 flagged). 399 played rows carry a first-person masculine form (متأكد، سعيد، مستعد، آسف…), about 16,974 target chars. Female target voices on record: Zariyah (ar-SA) and Salma (ar-EG). AT RISK only, not heard | at risk 399 |
| 3 | lb screen typo مبسط ("simplified") for مبسوط | #641 named 1 row, voices fixed, text left | the 1 row is KNOWN, but the same word is the **LEGO "fun \| مبسط"** (S0064L02), its 14 other rows and seed 64. "Fun" in Lebanese is مسلّي | 16 + seed |
| 4 | Romanised Arabic in the English prompt (yaskot, bido…) | ara_lb, canon record | 0 left in all three courses | 0 (fixed) |
| 5 | Bad female forms (كنت غلطة، عايزتها) | #630/#641 | 0 on screen in any course. These lived in the expansion table, which this scan cannot read; #641 fixed the table | 0 (see gaps) |
| 6 | #513 "noticed, not fixed": S0419L01 rows lack إذا; seed 521 not tiled | ara_for_eng | both still live | KNOWN |

## Empty audio: the 345 and 333 are the English slot only
#221 (d/50327493) said "0 empty target1/target2" for ara_eg and ara_lb. **That still holds.** Every empty slot is the **known (English)** slot: 345 rows in ara_eg (seeds 3–668, mostly 300–600) and 333 in ara_lb, across build, use and 23 debut rows. The same English line already has a clip elsewhere in these three courses for 280 (eg) and 237 (lb) of them, so library-first linking should make those free. Rendering the rest costs **2,242 chars (eg) + 3,069 chars (lb)**. If the library refuses the cross-course clip (a different English voice), the worst case is 12,438 + 11,893.
ara_for_eng has 44 empty played rows, mostly in seeds 13–60: 28 with all three slots empty, 8 with both target slots empty, 8 with only the English slot empty. 5,531 chars.


---

## ara_for_eng (Modern Standard Arabic, main)


### Arabic grammar error (case / mood / agreement): 24 REAL · 1,558 chars

The Arabic is wrong: a case ending, a verb mood or an agreement a learner would copy.

- `S0454L03U05` she knows our friends came to us | تَعْرِفُ أَنَّ أَصْدِقاؤُنا جاءوا إِلَيْنا → أَصْدِقاؤُنا after أَنَّ → أَصْدِقاءَنا (accusative); U02 also تَظُنَّ → تَظُنُّ (sure; K8, R0.16)
- `S0627L01B03` she said it's not ready | قالَتْ إِنَّها لَيْسَتْ جاهِزَةٌ → لَيْسَتْ جاهِزَةٌ → لَيْسَتْ جاهِزَةً (predicate of laysa is accusative) (sure; K8)
- `S0627L01U04` do you know if it's ready? | هَلْ تَعْرِفُ إِنْ كانَتْ جاهِزَةٌ؟ → إِنْ كانَتْ جاهِزَةٌ → إِنْ كانَتْ جاهِزَةً (sure; K8)
- `S0396L02B01` they are ready | هُمْ مُسْتَعِدّينَ → هُمْ مُسْتَعِدّينَ → هُمْ مُسْتَعِدّونَ (nominal sentence: nominative); U04 أَنَّ النّاسَ … مُسْتَعِدّونَ. The LEGO itself (حتى يكون الجميعُ مستعدّين) is right in its seed (sure; K8)
- `S0134L01U01` I think that's not a problem | أَظُنُّ أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً → أَنَّ ذٰلِكَ لَيْسَتْ مُشْكِلَةً → أَنَّ ذٰلِكَ لَيْسَ مُشْكِلَةً (ذلك is masculine) (sure; K8)


### English prompt ungrammatical: 6 REAL · 191 chars

The English the learner hears is not grammatical English.

- `S0570L02U02` I'm afraid willing to pay for it | أَخْشى أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0570L02U03` I suppose willing to pay for it | أَظُنُّ أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0570L02U05` I don't care willing to pay for it | لا يَهُمُّني أَنَّهُ مُسْتَعِدٌّ أَنْ يَدْفَعَ → "I'm afraid willing to pay for it" → "I'm afraid he's willing to pay" (and the Arabic يَدْفَعَ is under a LEGO that says تَدْفَعَ: see P17) (sure; K9)
- `S0410L01U04` I want to stay with each other | أُريدُ أَنْ نَبْقى مَعَ بَعْضِنا → "I want to stay with each other" → "I want us to stay together" (أُريدُ أَنْ نَبْقى مَعاً) (sure; K9)
- `S0387L01B02` on the right | عَلى حَقٍّ → "on the right | عَلى حَقٍّ" means right as in correct → delete B01/B02 fragments, keep the "was right" rows (sure; K9)


### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 118 REAL, 1 KNOWN · 8,156 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0091L02B01` you think now | تُفَكِّرُ الآن → 7 rows drill تُفَكِّرُ without بِسُرْعَةٍ; reword each to contain أَنْ تُفَكِّرَ بِسُرْعَةٍ, or delete the ones that cannot (likely; P17, K50)
- `S0102L03B01` that the matter | إِنَّ الأَمْرَ → rows say إِنَّ الأَمْرَ without نَقولَ; reword with نَقولَ إِنَّ (likely; P17, K50)
- `S0109L02B01` a new word | كَلِمَةً جَديدَةً → rows use singular كَلِمَةً جَديدَةً; make them كَلِماتٍ جَديدَةً ("new words") (sure; P17, K50)
- `S0144L02B01` I woke up earlier | اسْتَيْقَظْتُ أَبْكَرَ → rows stop at أَبْكَرَ; add مِمّا … ("earlier than I wanted") (likely; P17, K50)
- `S0152L03B01` if that were good | لَوْ كانَ ذٰلِك جَيِّداً → LEGO is "if I had known | لَوْ عَرَفْتُ" but all 8 rows use لَوْ كُنْتُ مُسْتَعِدّاً; rewrite with لَوْ عَرَفْتُ (sure; P17, K50)
- KNOWN `S0419L01B01`: d/83adb35a (#513 noticed: none of S0419L01's rows contain إِذا)


### LEGO target is not what its seed says (seed and LEGO translated apart): 35 REAL, 1 KNOWN · 3,754 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0395L01` at the entrance | عِنْدَ المَدْخَلِ → Align the LEGO to the seed: "at the entrance | عِنْدَ المَدْخَلِ" sits in seed 395 "turn left at the next corner": wrong LEGO; replace with "turn left | نَنْعَطِفَ يَساراً" (likely; L26, S3)
- `S0395L04` the next corner | الزّاوِيَةِ التّالِيَةِ → Align the LEGO to the seed: التّالِيَةِ → القادِمَةِ (seed word) (likely; L26, S3)
- `S0395L06` we need to | نَحْنُ بِحاجَةٍ إِلى → Align the LEGO to the seed: نَحْنُ بِحاجَةٍ إِلى → نَحْتاجُ أَنْ (seed words) (likely; L26, S3)
- `S0548L01` at the moment | في الوَقْتِ الحالِيِّ → Align the LEGO to the seed: في الوَقْتِ الحالِيِّ → الآنَ (seed says الآنَ) (likely; L26, S3)
- `S0559L02` you found the path | وَجَدْتَ المَسارَ → Align the LEGO to the seed: المَسارَ → الطَّريقَ (likely; L26, S3)
- KNOWN `S0521L03`: d/83adb35a (#513 noticed: seed 521 not tiled)


### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 33 REAL · 569 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0072L01` your performance | أَداءَكَ → Re-gloss the LEGO English: "your performance" → "you're doing" (seed: you're doing very well) (likely; L26, K9)
- `S0114L02` my performance | أَدائي → Re-gloss the LEGO English: "my performance" → "I'm doing" (likely; L26, K9)
- `S0129L01` that your performance is good | أَنَّ أَداءَكَ جَيِّدٌ → Re-gloss the LEGO English: "that your performance is good" → "that you're doing well" (likely; L26, K9)
- `S0390L02` in the proximity of | بِالقُرْبِ مِنَ → Re-gloss the LEGO English: "in the proximity of" → "near" (likely; L26, K9)
- `S0390L04` the one who is standing in the proximity of the entrance | الَّذي يَقِفُ بِالقُرْبِ مِنَ المَدْخَلِ → Re-gloss the LEGO English: "…in the proximity of the entrance" → "…near the entrance" (likely; L26, K9)


### One English prompt, two Arabic answers (LEGO level): 2 REAL · 119 chars

One English prompt has two Arabic answers at LEGO level.

- `S0403L01` quiet | هادِئينَ → "quiet | هادِئينَ" vs S0034L02 "quiet | هادِئ": grow S0403L01 to "remain quiet | نَبْقى هادِئينَ" (L34 second remedy; the plural needs its subject) (likely; K2, L34)
- `S0407L02` we are | نَكونُ → "we are | نَكونُ" vs S0110L01 "we are | نَحْنُ": grow S0407L02 to "we are a good example | نَكونَ قُدْوَةً حَسَنَةً", or gloss S0110L01 "we | نَحْنُ" (K28 allows the pronoun) (best guess; K2, L34)


### Not-new LEGO that was never taught (no earlier twin on both sides): 8 REAL, 2 KNOWN · 492 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0124L01` that's | تِلْكَ → Make NEW with an intro and a played basket (L31), or re-cut so an earlier LEGO covers it. #513 named this "Case B" and left it untouched (likely; L31, P25)
- KNOWN `S0207L01`: census D6c via d/83adb35a (seeds with no new LEGO, left as ruled 4 Nov)
- KNOWN `S0257L01`: census D6c via d/83adb35a (seeds with no new LEGO, left as ruled 4 Nov)


### Target word used before it is taught: 2 REAL · 214 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0413L04U05` I know going too close to the edge is not good | أَعْرِفُ أَنَّ الاقْتِرابَ كَثيراً مِنَ الحافَّةِ لَيْسَ جَيِّداً → الاقْتِرابَ never taught: reword with إِذا اقْتَرَبْنا (sure; P1, K14)
- `S0395L06B03` we need to think about that | نَحْنُ بِحاجَةٍ إِلى التَّفْكيرِ في ذَلِكَ → التَّفْكيرِ (taught S475) at S395: reword with أَنْ نُفَكِّرَ (likely; P1, K14)


### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 123 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0009L02` a little Arabic | قَليلاً مِنَ العَرَبِيَّةِ → about 9 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0022L03` with people who speak Arabic | بِأُناسٍ يَتَكَلَّمونَ العَرَبِيَّة → about 12 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0027L02` I don't like to take too much time | لا أُحِبُّ أَنْ آخُذَ وَقْتاً كَثيراً → about 12 syllables (partly unvocalised, estimate): re-cut to the shortest viable pieces (Kai 17 Nov) (best guess; L3)
- `S0028L01` it's useful to start talking | مِنَ المُفيدِ أَنْ تَبْدَأَ بِالتَّكَلُّمِ → about 13 syllables: re-cut to the shortest viable pieces (Kai 17 Nov) (likely; L3)
- `S0028L02` as soon as possible | في أَقْرَبِ وَقْتٍ مُمْكِن → about 9 syllables (partly unvocalised, estimate): re-cut to the shortest viable pieces (Kai 17 Nov) (best guess; L3)


### Same row twice in one basket: 5 REAL · 0 chars

The same pair appears twice in one basket.

- `S0001L01U01` I want to speak | أُريدُ أَنْ أَتَكَلَّمَ → delete (twin S0001L01B01) (sure; —)
- `S0106L01B02` we feel happy | نَشْعُرُ بِالسَّعادَة → delete (twin S0106L01B01) (sure; —)
- `S0106L03B02` we work hard | نَعْمَلُ بِجِدٍّ → delete (twin S0106L03B01) (sure; —)
- `S0108L03B02` middle of the night | مُنْتَصَفِ اللَّيْلِ → delete (twin S0108L03B01) (sure; —)
- `S0395L04B02` the next corner | الزّاوِيَةُ التّالِيَةُ → delete (twin S0395L04B01) (sure; —)


### Question on one side only (Arabic lacks ؟): 70 REAL · 5,292 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0003L01U02` how do I learn Arabic? | كَيْفَ أَتَعَلَّمُ العَرَبِيَّةَ → add ؟ to the Arabic; re-record target so the voice asks (sure; A7, A9)


### Seed sentence not in any played basket: 93 REAL, 3 KNOWN · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 4` how to say something in Arabic | كَيْفَ أَقولُ شَيْئاً بِالعَرَبِيَّة → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)
- KNOWN `seed 207`: list for Kai (no new LEGO to host it)
- KNOWN `seed 257`: list for Kai (no new LEGO to host it)
- KNOWN `seed 521`: add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26)


### Empty audio slot on a played row: 44 REAL · 5,531 chars

A played row has an empty audio slot.

- `S0013L02U05` I'm trying to speak Arabic very well now | أُحَاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ جَيِّداً جِدّاً الآنَ → render the empty slot(s): ka,t1,t2 (sure; A16)
- `S0027L03B02` too much time to answer | وَقْتاً كَثيراً لِلإِجابَة → render the empty slot(s): t1,t2 (sure; A16)
- `S0194L01B01` you're looking for | تبحث → render the empty slot(s): ka (sure; A16)


---

## ara_eg_for_eng (Egyptian)


### PRIORITY: same pair taught as new twice (fixed in ara_for_eng by #513): 14 REAL · 0 chars

The same pair is taught as NEW twice. #513 fixed this in ara_for_eng (6 set not-new, 2 held); the variants were never done.

- `S0077L02` how | إزاي → set not new (both sides equal S0003L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0119L01` I can | أقدر → set not new (both sides equal S0003L02); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0120L01` fun | ممتع → set not new (both sides equal S0058L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0122L06` going | ماشي → set not new (both sides equal S0072L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0130L02` because | علشان → set not new (both sides equal S0022L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)


### Arabic grammar error (case / mood / agreement): 7 REAL · 228 chars

The Arabic is wrong: a case ending, a verb mood or an agreement a learner would copy.

- `S0047L02U03` this is a good thing | دي حاجة كويس → حاجة كويس → حاجة كويسة (حاجة is feminine) (sure; K8)
- `S0441L01U02` this approach is really hard | بجد أسلوب صعب → "this approach" but no ده: أسلوب صعب → الأسلوب ده صعب (likely; K8)
- `seed 93` It's time to go now. | الوقت إن نمشي دلوقتي. → not Egyptian: → جه الوقت إننا نمشي دلوقتي; and rows S0093L01U01/U04 بقى وقت نمشي → جه الوقت نمشي. The seed has one LEGO (نمشي), so the rest of it is untiled (S3) (likely; K8, S3)
- `S0093L01U01` it's time to go now | بقى وقت نمشي دلوقتي → بقى وقت نمشي → جه الوقت نمشي (likely; K8)


### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 10 REAL · 282 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0065L03U05` testing is useful | الاختبار مفيد → reword to contain the LEGO, or delete: noun الاختبار under the verb تختبر (likely; P17, K50)
- `S0065L03U06` testing Arabic is fun | اختبار العربي ممتع → reword to contain the LEGO, or delete: same (likely; P17, K50)
- `S0105L01U01` that is why | علشان كده → reword to contain the LEGO, or delete: "that is why | علشان كده" under "the reason | السبب" (likely; P17, K50)
- `S0124L01U01` I thought it was good | افتكرت إنه كويس → reword to contain the LEGO, or delete: افتكرت (remembered/thought) under فكرت (likely; P17, K50)
- `S0110L03U03` I'd like to relax | حابب أرتاح → reword to contain the LEGO, or delete: أرتاح under نرتاح (K50) (likely; P17, K50)


### LEGO target is not what its seed says (seed and LEGO translated apart): 13 REAL · 917 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0273L01` a shame | لسف → Align the LEGO to the seed: "a shame | لسف" is a typo and the wrong English: → "unfortunately | للأسف" (likely; L26, S3)
- `S0264L01` elderly | عجوز → Align the LEGO to the seed: "elderly | عجوز" in seed "An old man | راجل كبير": → "an old man | راجل كبير" (likely; L26, S3)
- `S0294L01` no time | معيش → Align the LEGO to the seed: "no time | معيش" vs seed ما عنديش وقت: → "I don't have time | ما عنديش وقت" (likely; L26, S3)
- `S0274L01` to leave behind | تسيب → Align the LEGO to the seed: تسيب → تمشي (seed) (likely; L26, S3)
- `S0274L02` in a few days | في كام يوم → Align the LEGO to the seed: كام → كم (seed) (likely; L26, S3)


### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 36 REAL · 275 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0332L04` for sis | لأخته → Re-gloss the LEGO English: "for sis" → "for his sister" (likely; L26, K9)
- `S0359L02` leftward | شمال → Re-gloss the LEGO English: "leftward" → "left" (likely; L26, K9)
- `S0398L02` patienter | أصبر → Re-gloss the LEGO English: "patienter" → "more patient" (likely; L26, K9)
- `S0463L01` numeral | رقم → Re-gloss the LEGO English: "numeral" → "number" (likely; L26, K9)
- `S0470L02` upward | لفوق → Re-gloss the LEGO English: "upward" → "up" / "how high" (likely; L26, K9)


### One English prompt, two Arabic answers (LEGO level): 17 REAL · 956 chars

One English prompt has two Arabic answers at LEGO level.

- `S0020L01` to learn | تتعلم → "to learn | تتعلم" (you) vs S0002L02 أتعلم: gloss "you learn" (K26 person on both sides) (likely; K2, K26, L34)
- `S0222L02` to say | يقول → "to say | يقول" vs أقول: gloss "he tells" / grow "he's trying to tell me | بيحاول يقول لي" (likely; K2, K26, L34)
- `S0022L02` to meet | أتقابل → "to meet | أتقابل" vs S0018L02 نتقابل: grow to "to meet people | أتقابل مع ناس" or gloss "(I) meet" (K26) (likely; K2, K26, L34)
- `S0079L01` when? | إمتى → "when | إمتى" (question) vs S0034L03 لما: gloss "when?" with the question kept in a larger LEGO "when exactly | إمتى بالظبط" (L34) (likely; K2, K26, L34)
- `S0077L04` I started | بدأت → "I started | بدأت" vs S0037L01 "أنا بدأت": unify to one form (L34 first remedy) (likely; K2, K26, L34)


### Not-new LEGO that was never taught (no earlier twin on both sides): 5 REAL · 277 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0129L02` very | قوي → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0149L02` I hope | متمنى → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0207L01` do it | تعمله → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0228L02` speaking | الكلام → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0257L01` blue | الزرقا → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)


### Target word used before it is taught: 45 REAL · 1,770 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0016L01U01` he wants to speak Arabic | هو عايز يتكلم عربي → he-form verbs at S16 (يتكلم, يحاول, يخمن, يشرح) untaught: reword with يرجع (taught in seed 16) (likely; P1, K8, K14)
- `S0016L01U03` and he wants to try | و هو عايز يحاول → reword with forms taught by this seed (likely; P1, K8, K14)
- `S0018L01B03` we want to come back | إحنا عايزين نرجع → we-form نرجع never taught (S18 rows); reword with taught forms (likely; P1, K8, K14)
- `S0018L01U04` and we want to find out the answer | و إحنا عايزين نعرف الإجابة → نعرف taught S201: reword (likely; P1, K8, K14)
- `S0027L03U05` why do I need to take so much time? | ليه لازم آخد وقت كتير؟ → "need to | لازم" taught S109; rows from S27 use it. Reword with محتاج (taught) or move the rows after S109 (likely; P1, K8, K14)


### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 13 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0279L02` there wasn't much time left | ماكانش في وقت كتير فاضل → 19 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0288L02` like watching television | بتحب تتفرج على التلفزيون → 21 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0406L01` i'm sure it will be okay | أنا متأكد إنه حيكون تمام → 20 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0415L01` that wouldn't be a problem if you ask me | ده مش حيكون مشكلة لو تسألني → 22 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0449L01` they said that they were almost ready | هم قالوا إنهم تقريبًا جاهزين → 23 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)


### Same row twice in one basket: 2 REAL · 0 chars

The same pair appears twice in one basket.

- `S0013L02U02` you speak Arabic very well today | إنت بتتكلم عربي كويس جدًا النهارده → delete (twin S0013L02B03) (sure; —)
- `S0054L03B02` more time | وقت زيادة → delete (twin S0054L03B01) (sure; —)


### Question on one side only: 27 REAL · 660 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0061L01U01` could I speak with you | ممكن أتكلم معاك؟ → add ? to the English and re-record the known clip (sure; A7, A9)
- `S0659L01B04` could you all say that? | ممكن تقولوا ده → add ؟ to the Arabic and re-record target (sure; A7, A9)


### Seed sentence not in any played basket: 136 REAL · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 11` I'd like to be able to speak after you finish. | أنا حابب أقدر أتكلم بعد ما تخلص. → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)
- `seed 207` You've done what you needed to do. | إنت عملت اللي كنت محتاج تعمله. → list for Kai (no new LEGO to host it) (sure; P26)


### Empty English (known) audio slot on a played row: 345 REAL · 2,242 chars

A played row has an empty audio slot.

- `S0003L01U01` I want to learn how to speak Arabic | أنا عايز أتعلم إزاي أتكلم عربي → render the English line — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)
- `S0011L02U05` I want to say something after you finish | أنا عايز أقول حاجة بعد ما تخلص → link the existing clip of the same English line (library-first, free) — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)


---

## ara_lb_for_eng (Lebanese)


### PRIORITY: wrong word مبسط ("simplified") — #641 named one row: 16 REAL, 1 KNOWN · 481 chars

ara_lb's LEGO "fun | مبسط" uses مبسط, which means "simplified". #641 noticed one row ("I'm glad | مبسط") but not the LEGO or its 15 rows.

- `S0064L02` fun | مبسط → "fun | مبسط" means "simplified": → "fun | مسلّي" (Lebanese مسلّي / بيسلّي); the seed 64 target says مبسط too → مسلّي (likely; K8, L26)
- `S0064L02B01` fun | مبسط → مبسط → مسلّي (with the LEGO) (likely; K8)
- `seed 64` Learning Arabic isn't easy but it is fun. | تعلم العربي مش سهل بس مبسط. → → تعلّم العربي مش سهل بس مسلّي (likely; K8)
- KNOWN `S0074L03U03`: d/468045e4 (#641: "screen text still needs fixing" → مبسوط)


### PRIORITY: same pair taught as new twice (fixed in ara_for_eng by #513): 3 REAL · 0 chars

The same pair is taught as NEW twice. #513 fixed this in ara_for_eng (6 set not-new, 2 held); the variants were never done.

- `S0035L01` she wants | بدها → INVERTED: S0017L01 (seed 17) is marked not-new but is the first time; make S0017L01 NEW and S0035L01 not-new (sure; L17, P25, P26)
- `S0245L01` happy | مبسوط → set not new (both sides equal S0076L01); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)
- `S0519L02` the small | الصغير → set not new (both sides equal S0069L03); its seed keeps other new LEGOs. If the seed sentence plays only under it, copy it as a USE row first (#513 method) (sure; L17, P25, P26)


### English prompt ungrammatical: 19 REAL · 513 chars

The English the learner hears is not grammatical English.

- `S0631L01U02` I think what would you like | بفكر شو بدك؟ → rewrite as plain English, e.g. "I think you're ready now, sir"; "do you all mind?"; or delete the row (0 chars) (sure; K9)


### Phrase does not contain its LEGO (LEGO grew or was re-cut, basket left behind): 20 REAL · 520 chars

The row does not contain its own LEGO, usually because the LEGO was grown or re-cut and its basket was left as it was.

- `S0094L03B01` the way | الطريق → الطريق → الطريقة (with the seed fix); agreement → اللي بتزبط (likely; P17)
- `S0077L02B03` how I began | كيف بلشت → reword to contain the LEGO, or delete: بلشت (untaught) under صرت (likely; P17, K50)
- `S0077L02U04` I'm surprised at how I began | مندهش كيف بلشت → reword to contain the LEGO, or delete: same (likely; P17, K50)
- `S0078L01U01` I don't understand what you said | مش فاهم شو قلت → reword to contain the LEGO, or delete: مش فاهم under فهمت (likely; P17, K50)
- `S0090L01B01` nicer | أحلى → reword to contain the LEGO, or delete: lacks بيكون (likely; P17, K50)


### LEGO target is not what its seed says (seed and LEGO translated apart): 26 REAL · 2,172 chars

The LEGO's Arabic is not what its own seed says, so the learner meets the seed in different words from the ones they were taught.

- `S0034L02` he speaks | يحكي → Align: "he speaks | يحكي" in seed "he doesn't want to be quiet | ما بدو يسكت": wrong LEGO → "be quiet | يسكت" (likely; L26, S3)
- `S0058L02` you know | تعرف → Align: تعرف → تفهم (seed) (likely; L26, S3)
- `S0090L01` nicer | بيكون أحلى → Align: بيكون أحلى → كان أحلى (seed) (likely; L26, S3)
- `S0094L03` the way | الطريقة → Align: LEGO الطريقة is right but seed 94 says الطريق ("road"): fix the SEED → هيدي هي الطريقة الوحيدة اللي رح تزبط; its 7 rows say الطريق too → الطريقة (likely; L26, S3)
- `S0118L01` at the pub | بالبار → Align: LEGO بالبار ("in the pub") is right; SEED says بالسرفيس ("in the shared taxi") → fix the seed (likely; L26, S3)


### LEGO English is a literal or invented gloss (not what the seed says, or not natural English): 56 REAL · 492 chars

The LEGO's English is a literal gloss or an invented synonym instead of what the seed says ("in the proximity of", "yonder", "beachward", "u", "cos").

- `S0074L03` cos you | لأنك → Re-gloss the LEGO English: "cos you" → "because you" (likely; L26, K9)
- `S0114L01` yest | إمبارح → Re-gloss the LEGO English: "yest" → "yesterday" (likely; L26, K9)
- `S0135L01` u think | بتفكر → Re-gloss the LEGO English: "u think" → "you think" (likely; L26, K9)
- `S0142L02` of u | منك → Re-gloss the LEGO English: "of u" → "of you" (likely; L26, K9)
- `S0144L03` th | مما → Re-gloss the LEGO English: "th" → "than" (likely; L26, K9)


### One English prompt, two Arabic answers (LEGO level): 9 REAL · 494 chars

One English prompt has two Arabic answers at LEGO level.

- `S0294L01` enough | كافي → "enough | كافي" vs S0060L02 كافية: grow each to its noun (likely; K2, L34)
- `S0136L03` my friend | صاحبتي → "my friend | صاحبتي" vs صاحبي: larger LEGO that carries "she" (likely; K2, L34)
- `S0124L01` that it | إنها → "that it | إنها" vs S0102L01 إنو: grow to its noun phrase (likely; K2, L34)
- `S0154L01` night | ليلة → "night | ليلة" vs S0108L01 الليل: gloss "Saturday night | ليلة السبت" (likely; K2, L34)
- `S0111L01` new | جديد → "new | جديد" vs جديدة / الجديدة: grow each to its noun (likely; K2, L34)


### Not-new LEGO that was never taught (no earlier twin on both sides): 5 REAL · 284 chars

A LEGO is marked not-new but no earlier LEGO teaches the same pair, so its words are never taught and its basket never plays.

- `S0037L01` I started | بدأت → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0047L01` I believe | بعتقد → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0207L01` you did | عملت → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0257L01` blue | الأزرق → make NEW with intro and played basket (L31), or re-cut onto an earlier LEGO (likely; L31, P25)
- `S0017L01` she wants | بدها → first "she wants | بدها" is marked not-new; make it NEW (pairs with the S0035L01 inversion) (sure; L31, P25)


### Target word used before it is taught: 35 REAL · 1,224 chars

A row uses an Arabic word or form before any LEGO teaches it. Read after clitic-aware normalising (WC-F4): w-, b-, l-, al- and pronoun endings were not counted.

- `S0018L01U01` we want to speak Arabic | بدنا نحكي عربي → reword with forms taught by this seed (untaught: نحكي@S143) (likely; P1, K8, K14)


### New LEGO over 8 syllables (builder estimate says 1; recount from vowel marks): 20 REAL · 0 chars

The builder's syllable check divides letters by 3.5 and drops vowel marks, so it is blind to Arabic length. It flagged 1 LEGO in ara_for_eng; counting vowel marks gives 123.

- `S0195L04` I left on the table | اللي تركتها عالطاولة → 18 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0205L03` that I was trying to say | اللي كنت عم أحاول أحكيها → 20 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0228L01` has just started to practise speaking | هلق بدأ يتمرن على الحكي → 19 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0280L03` I only had to do the most important job | كان لازم بس أعمل الشغلة الأهم → 24 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)
- `S0281L03` do you mind if I finish my coffee | ما رح يزعلك إذا خلصت قهوتي → 21 letters, about 10+ syllables by hand count of the top ones: re-cut to the shortest viable pieces (likely; L3)


### Same row twice in one basket: 14 REAL · 0 chars

The same pair appears twice in one basket.

- `S0030L02U01` I wanted to ask you something | كنت بدي أسألك شي → delete (twin S0030L02B03) (sure; —)
- `S0046L03U05` I don't worry about mistakes | ما بقلق من الأغلاط → delete (twin S0046L03B02) (sure; —)
- `S0062L02B02` at the same time | بنفس الوقت → delete (twin S0062L02B01) (sure; —)
- `S0083L04U02` I agree with what you said | متفق مع شو قلتو → delete (twin S0083L04B03) (sure; —)
- `S0095L01U04` you go slowly | تروح بشوي → delete (twin S0095L01B02) (sure; —)


### Question on one side only: 103 REAL · 2,859 chars

A question has a question mark on one side only, so one voice reads it flat.

- `S0316L01U02` do you think that she could bring the story | بتفكر إنها فيها تجيب القصة؟ → add ? to the English and re-record the known clip (sure; A7, A9)
- `S0632L02U06` Can you give me a glass of water? | فيك تعطيني كاسة مي → add ؟ to the Arabic and re-record target (sure; A7, A9)


### Seed sentence not in any played basket: 146 REAL · 0 chars

The exact seed sentence is not in any played basket (P26). Most seeds have a near-copy whose English or Arabic has drifted.

- `seed 8` I'm going to try to explain what I mean. | رح أحاول أشرح شو قصدي. → add the exact seed as a USE row under its last new LEGO, reusing the seed's own clips (P26) (sure; P26)


### Empty English (known) audio slot on a played row: 333 REAL · 3,069 chars

A played row has an empty audio slot.

- `S0001L05B01` with you now | معك هلق → link the existing clip of the same English line (library-first, free) — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)
- `S0003L01U01` I want to learn how to speak Arabic | بدي أتعلم كيف أحكي عربي → render the English line — known slot only; target1/target2 are filled (#221 claim holds) (sure; A16)


---

## Coverage (family × course)

"Read" means every hit was read by hand. "Word list" means the hits were grouped by the flagged word and each word was judged once.

| family | ara_for_eng | ara_eg | ara_lb |
|---|---|---|---|
| zut_lego / zut_use | 2 / 26 read | 16 / 35 read | 8 / 14 read |
| dup_debut | 0 (fixed by #513) | 14 read | 3 read |
| notnew_untaught | 10 read | 5 read | 5 read |
| lego_syll (builder) | 47, estimate blind; recounted all 1,363 new LEGOs from vowel marks | 21; letter count, top 25 hand-counted | 12; letter count, top 25 hand-counted |
| lego_not_in_seed_known | 289: 202 read, 87 pronoun/auxiliary-only by word list (K28, K54) | 439: 341 read, 98 by word list | 469: 376 read, 93 by word list |
| lego_not_in_seed_target | 46 read | 19 read | 51 read |
| phrase_missing_lego | 215 read | 29 read | 36 read |
| untaught_target | 174: 59 read, 115 by word list (clitics / spelling) | 135: 79 read, 56 by word list | 158: 59 read, 99 by word list |
| article_drift, dup_rows | read | read | read |
| qmark_mismatch | 70 read | 27 read | 103 read |
| seed_not_played | 96 sorted by script (drift type), examples read | 136 sorted, examples read | 146 sorted, examples read |
| empty_audio | 44 mechanical | 345 mechanical | 333 mechanical |
| lexical (8 Arabic patterns) | run | run | run |
| intro wording | not scanned | not scanned | not scanned |
| female voice by ear | at-risk count only | covered by #641 | covered by #641 |

## Not defects (and why)
- **Tokenisation (WC-F4).** About 260 untaught-word hits and 51 "phrase lacks its LEGO" hits are clitics (و، ب، ل، ال), pronoun endings, hamza/alef spellings or vowel marks. They were re-read with a clitic-aware normaliser, not counted.
- **أُمارِس "practise" (15 rows, ara_for_eng)** is never a LEGO alone, but the learner meets it inside سَأُمارِسُ at seed 5. Passes by K29 (likely).
- **ترجع "she comes back" (ara_eg seed 17)** after taught يرجع: a gender agreement change, which K8 lets pass.
- **Honorific cut (K32)** in the sir/madam block (ara_for_eng 639–668): rows that drop only سيدي/سيدتي are not counted. Rows that drop other words are.
- **Pro-drop**: rows that drop أنت where the LEGO has it are not counted.
- **Plural endings late in the course** (جاءوا، حاربوا، تكونوا after S450): the ending is taught on other verbs by then (K51 spirit). Listed as judgement, not counted.
- **Known-side inflections and pronouns** (helps/help, he/they added by K28, "to" by K54) and **soft English synonyms** (mom, vital, perhaps) are not counted.
- **Phrase-level ZUT** (Kai 21 Oct) is not counted unless a LEGO is one side, or the row is also a grammar error.
- **Dialect forms** in ara_eg and ara_lb are judged as Egyptian and Lebanese, never against the MSA course.

## Lexical patterns added (`ara.patterns.json`, all pass calibration)
| id | from | ara_for_eng | ara_eg | ara_lb |
|---|---|---|---|---|
| ara_romanised_known | canon (ara_lb yaskot) | 0 | 0 | 0 |
| ara_mabsat_typo | #641 | 0 | 0 | 16 |
| ara_ghalta, ara_aayza_malformed | #630/#641 | 0 | 0 | 0 (lived in the expansion table, see gaps) |
| ara_anna_nominative, ara_laysa_khabar_nominative | this scan | 2, 2 | — | — |
| ara_odd_english_gloss | this scan | 0 | 74 | 92 |
| ara_broken_english_ithink | this scan | 5 (2 are false: S0153L01U02, S0648L01U04) | 1 (false) | 19 |

## Gaps (stated plainly)
- **ara_sy_for_eng was not readable** through any seed route (0 seeds, 404). Nothing was scanned there.
- **Female voice by ear:** not possible (A22). ara_for_eng gets an at-risk count only. ara_eg and ara_lb rely on #641's re-record; this scan did not re-check it.
- **Expansion table not read.** Popty exposes only counts (`gender-prep/status`, `flag-count`). The two #630 patterns that lived in that table cannot find anything on screen text, so they were dropped as detectors for this purpose.
- **Clip dates not read**, so we cannot tell which ara_for_eng female clips predate its 4 Nov gender-prep pass.
- **Library-first relink of the empty English slots is an expectation, not a check.** It was not dry-run, by brief.
- **Long LEGOs in ara_eg and ara_lb** were estimated from letter counts, with the top 25 hand-counted. They were not all counted one by one.
- **Intro wording** was not scanned in any course.
- **Grammar** was read only where a detector or family pointed. This is not a full grammar read of the courses (R0.16).
- **Not a native speaker.** The fixes rest on standard grammar (Wright) and dialect usage. Confidence words are honest; "best guess" means best guess.

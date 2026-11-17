# kor — cleanup scan findings (#447, worker #471)

Read live on 17 Nov 2026, through Popty's script-view route. **Nothing was changed, voiced or sent.** Each row with its id, the fix, a confidence word and the character count is in `kor.json`. My Korean patterns are in `kor.patterns.json` (all 7 found their known positive).

Audio characters = new Korean text × 2 voices + new English/Hindi/Tamil text × 1. A delete or a relink costs 0. Intro clips are counted roughly, at the length of the new English.

## Summary

| course | REAL new findings | of which 0-char (delete / relink / add the seed's own clips) | new audio chars | KNOWN, not counted |
|---|---|---|---|---|
| kor_for_eng | 1,196 rows (863 of them are exact duplicate rows) | 1,083 | ≈ 25,500 (≈ 6,000 if the 38 over-long whole-seed LEGOs are left to the KNOWN over-8 re-cut) | 220 LEGOs over 8 syllables; the 91 held seeds; the ZUT items go / eyes / must close / to drink; the filler baskets in seeds 431–668 |
| kor_for_hin | 106 | 87 | ≈ 530 | — (no held list exists for the variants) |
| kor_for_tam | 161 | 75 | ≈ 2,700 (+ 8 seed sentences re-voiced for register, ≈ 400) | — |

**The biggest new item is a regression.** On 5 Nov, #248·AD rebuilt the baskets for seeds 301–430. That rebuild dropped the seed sentence from **109 seeds**. Some of these were seeds that #433 had fixed on 22 Oct: for example, S0358L02U06, added on 22 Oct, is gone. The fix costs nothing: add each seed back as a USE row with the seed's own clips.

**The variants are separate builds, not copies.** Only 29 (hin) and 37 (tam) of 661 seed sentences have the same Korean as kor_for_eng. So fixes made in the main course do not carry over to them as text. I ran the main course's patterns on both variants and read every hit.

---

## kor_for_eng

### A. Seed sentence lost in the 5 Nov rebuild: 109 seeds, 301–430 (REAL, 0 chars)
- **What it is:** the learner never says the seed sentence. P26 requires it.
- **Examples:** S0358 "your friend said that she couldn't reach the top" (#433 added it as S0358L02U06; it is gone). S0304 and S0336 have the same history. S0368 "yes I heard that he wanted to grow tomatoes".
- **Read:** all 109, mechanically. No played row carries the seed's Korean, and each seed contains at least one new LEGO that can hold it. I looked at 358 and 304 by eye. Seeds 362, 372 and 381 are KNOWN (#420) and are not counted.
- **Fix:** add the seed as a USE row under its last new LEGO, reusing the seed's three clips. This is what #433 did. Ask the next basket rebuild to keep seed rows. **Canon:** P26.

### B. LEGO drifted from its own seed, so the seed is never said: 49 items, seeds 88–298 (REAL)
- **What it is:** the LEGO, and so every row, says a near-twin of the seed: another particle, a contraction, a synonym, or a pronoun added or dropped. The seed's exact Korean is never played. **None of these 49 is on any held list.** The census (#433) listed 71 seeds of this shape, and #565 fixed them by your 29 Oct ruling ("the seed decides, the LEGOs follow"). These are the same disease, in seeds the census did not list.
- **Examples:**
  - S0096L03 *I need a little more time* | 시간이 **좀** 더 필요해요 → 시간이 **조금** 더 필요해요 (seed)
  - S0226L01 *the man is trying to help me* | 그 남자**가** 도와주려고 해요 → 그 남자**는 저를** 도와주려고 해요
  - S0298L01 *I've got nothing left to say* | 더 **이상** 할 말이 없어요 → 더 할 말이 없어요
  - S0104L02 *what we're doing* | **우리가** 하고 있는 걸 → 하고 있는 걸
- **Read:** all 49.
- **Fix:** 44 LEGOs take the seed's Korean, and the rows that carry the old form are rewritten too. That is 507 rows, 50 of them in other baskets. Then add the seed as a USE row. For 4 seeds (105, 124, 176, 275) only the copy drifted: add the seed row (0 chars). Seed 94's Korean lost "it will work": set the seed to the played copy 이게 될 수 있는 유일한 방법이에요 and link that copy's clips (0 chars). This is the same shape as KNOWN seed 200.
- **Cost:** ≈ 22,000 chars. Only 6 of the 44 stay at 8 syllables or fewer once fixed: 104, 111, 130, 140, 188, 298, ≈ 2,560 chars. **The other 38 are whole-seed LEGOs already over the cap** (part of the KNOWN 220). I recommend fixing those inside that re-cut, so each shorter piece takes the seed's words. Then the ≈ 19,500 chars are spent only once.
- **Canon:** L26, P26, P28; Kai 29 Oct (#565 is the precedent). **Spacing-only differences are not a defect:** 문제 없어요 / 문제없어요 (S0282), 해봤어요 / 해 봤어요 (S0579), 말해줬으면 (S0600).

### C. One English, two Korean answers at LEGO level: 5 (REAL)
- S0526L01 *can't* | 못 vs S0331L04 *can't* | 수 없어요. Re-cut 526 so it tiles: *that you can't guess* | 못 맞추겠다는 게 + *I'm finding it hard* | 어려워요.
- S0345L01 *leave* | 떠날 vs S0351L02 *leave* | 두고 → *ready to leave* | 떠날 준비가. ("to leave" is already S0540L02 떠나고.) **Note:** #420's fix for the KNOWN "go" clash glosses 두고 가고 as "leave", which would keep this clash. Gloss it *leave me on my own* instead.
- S0454L01 *to visit* | 놀러 vs S0428L01 *to visit* | 방문하고. "To visit" is not in seed 454's English. Fix: *came round* | 놀러 왔어요.
- S0124L01 *a good idea* | 좋은 생각이라고 vs USE S0259L01U03 *a good idea* | 좋은 생각이요. Fix: English → *was a good idea*.
- S0183L01 *I'm afraid I haven't seen them* | 안타깝지만: the English is the whole clause. Fix: *I'm afraid* | 안타깝지만 + a new *I haven't seen them* | 못 봤어요. Growing the LEGO instead would make it 9 syllables.
- **Not a defect:** S0492L01 *where* | 어디가 and S0573L01 *holiday* | 휴가를 are not-new, so they are never played (P25). **KNOWN:** go, eyes, must close, to drink (d/8516600e, d/c38294a1). ≈ 270 chars. **Canon:** K2, L34.

### D. LEGO wrong for its seed, seeds 431+: 5 (REAL)
The KNOWN late-band rebuild covers baskets, not LEGOs, so these stand on their own.
- S0431L01/L02 *ready* | 준비 + *wasn't done but* | 됐지만 do not tile the seed. Fix: *they're not ready yet but* | 아직 준비 안 됐지만 (8) + *they'll be ready soon* | 곧 준비될 거예요 (7).
- S0582L02 *growing up* | 자라는 **게**: the seed says 자라는 **건** 어때요, and 게 어때요 reads "how about…". This is the same fault as KNOWN 584. L01's English "here from" is also broken: change it to *here*.
- S0591L02 *me* | **나를** → **저를**. This is plain register in a 저/제 course, and the seed says 저를.
- S0606L02 *knowing the thing* | 알고 있는 걸 → *what I know now* | 지금 아는 걸.
- S0622L02 *it thing* | 그것을 → *it* | 그걸, which then equals S0314L01, so it becomes not-new. Also S0622L05 *knew out* → *knew*.
- ≈ 210 chars. **Canon:** L26, K9, K19, S3.

### E. Gapped LEGOs: 5 new (REAL)
A gapped LEGO's words are apart in the seed. detect.cjs only looks for "…", so I added a check for words that are present but not next to each other. It found 15 in this course: 9 are fixed by B, and 558 is KNOWN.
- S0147L01 *she was very kind* | 그녀는 … 아주 친절했어요
- S0148L01 *he wasn't very patient* | 그는 … 참을성이 별로 없었어요
- S0126L01 *this work is changing* | 이 일이 … 바꾸고 있어요 (#565 changed seed 126 but left this gap)
- S0132L01 *that's less exciting* | 그건 … 덜 신나요
- S0145L01 *why are you not happy* | 왜 … 행복하지 않아요 (the seed has 더 이상 in the middle)
- **Fix:** split each into two pieces that sit next to each other in the seed. For example *she* | 그녀는 (not-new) + *was very kind* | 아주 친절했어요. ≈ 240 chars. **Canon:** L32 (Kai 12 Nov).

### F. Word form not yet taught: 91 rows, seeds 7–402 (REAL)
- **What it is:** a Korean verb ending the learner has not been given yet. The tool's 213 hits for 1–430 included compounds and particles. My recount lets stem + particle and 하다-compounds (기억 + 할) through. Kai, K8: "exactly the form introduced".
- **Examples:**
  - S0012L01B02 *practice tomorrow* | 내일 **연습해요**: only 연습을 is taught
  - S0031L01U01 *we are meeting tonight* | 우리는 오늘 밤에 **만나요**: only 만나고 is taught
  - S0027L02B04 | …**좋지** 않아요: 좋지 is first taught at seed 532
  - S0026L01U03 *meeting soon is good* | 곧 **만나면** 좋아요: 만나면 is first taught at seed 568
- **Read:** all 91.
- **Fix:** delete 71 (each basket keeps at least 7 rows after its duplicates go). Reword 20 with forms that seed teaches (≈ 670 chars). **Canon:** P1, K8, K14.

### G. Row does not contain its LEGO: 20 of 49 hits (REAL)
- **Examples:**
  - The whole S0380L02 basket (8 rows): it says 싶은 게, not its LEGO 싶어하는지, and "오늘 싶은 게 뭔지 알아요" is not Korean. This basket was rebuilt on 5 Nov.
  - S0411L02U01/U05 *I heard about a table for four* | 네 명 자리에 대해 들었어요: the old "heard about X" template, also in the rebuilt band
  - S0325L02B01 *possible* | 가능한 (bare)
  - S0145L01B04, S0160L01U07, S0330L01U04/U05: the verb is in a different form (K50)
- **Fix:** delete 17 and reword 3 (≈ 260 chars).
- **Not a defect (29):** the LEGO is there with a particle or a fused 하다 ending (말해 보고 holds 해 보고; 기억해요 holds 기억; 재미있는 책이에요; 한국어 … 사람들을). **Canon:** P17, K50.

### H. Question mark on one side only: 45 rows, 1–430 (REAL)
- **Examples:** S0271L01U01 *would you like to come with us next month?* | 다음 달에 우리와 같이 오고 싶어요 (no ?, so it reads "I want to come"). The S0405L03 *should we…?* | …해야 할까요 rows. S0061L02B03: the English lacks the ?.
- **Fix:** add the ?. 38 need the Korean re-voiced and 7 the English. ≈ 1,690 chars if every clip is re-voiced. No clip was heard (A22), so whether the intonation is actually wrong is unverified.
- **Canon:** A7, A9.

### I. Not-new LEGO with no earlier twin: 4 (REAL)
- S0304L03 싶어하지 않는, S0336L02 수 없는, S0408L01 *a family* | 가족을, S0427L02 자기들이 (S0419 teaches 자기들을).
- **Fix:** make each new, after reading its unplayed basket. 304 and 336 need this as soon as their seed rows come back (A). ≈ 110 chars of intro English. **Canon:** L31. (207 and 257 are KNOWN.)

### J. Duplicate rows: 863, all in seeds 1–300 (REAL as a class, 0 chars)
- **What it is:** the same English, the same Korean and the same clips twice in one basket. 318 are bare-LEGO BUILD twins, 186 are bare-LEGO USE twins, 353 are a USE row that copies a BUILD row, and 6 are other pairs.
- **Read:** checked by exact equality, not judged one by one. I read 6 baskets by eye.
- **Fix:** delete the later twin. **32 baskets fall below 6 rows** once their twins go (for example S0027L03, 4 → 3, and S0082L02, 7 → 3). Those need new rows, not just the delete.
- **Canon:** P3 (spa #189 and fra did the same).

### KNOWN in kor_for_eng (read, not counted)
- **220 new LEGOs over 8 syllables.** My hand count of Hangul syllables matches #420's 220 exactly. The tool's 285 overcounts.
- The 7–8 syllable list (108 LEGOs) is in the dump. **I did not propose shorter cuts for them (GAP).**
- **The seeds 431–668 filler is still live:**
  - 교회가 ("the church") with no church in the English: 148 played rows, in seeds 501–668
  - "X 들었어요 / 알아요" template rows: 264 hits, mostly 401+
  - a dangling 있어요: 98 hits
  - 7 "now I think…" rows (en_progressive)
  - 18 plain-register rows under S0591L02
  - d/6be32406 and d/f0ab5817 propose a basket rebuild for this band; it has not been done above 430.
- **좀 더 / 조금 더 for "a little more":** 19 rows say 좀 더 and 24 say 조금 더 under the same English. This is the KNOWN 581 family (d/c38294a1).
- **Honorific -세요 in seeds 640–668** (49 hits): these are the sir/madam seeds, which call for it. Not a defect.

---

## kor_for_hin (I checked the Korean side and the structure only; I cannot judge the Hindi prompts beyond mechanical checks)

- **S. Seed Korean never played: 76 seeds** (REAL, 0 chars). Examples: S0003, S0096, S0201, S0301. Every one has a new LEGO that can hold it. Add the seed rows with the seed's clips. (The tool's 570 also includes 494 seeds whose Korean *is* played under a slightly different Hindi line: a dropped pronoun or the ।. I cannot judge those, so they are not counted.)
- **E. Gapped LEGOs: 9** (REAL, L32). Examples:
  - S0138L01 *यहीं* | 여기가 … 곳이에요
  - S0132L03 | 그것은 … 것보다
  - S0624L01 | 그러면 … 좋겠어요
  - S0242L01 | 그녀에게 … 주고
  - **Fix:** split into contiguous pieces. I have not written the Hindi glosses.
- **K. Seed Korean wrong: 2** (REAL). S0107 and S0201 say *we wanted* as 우리는 … 싶어**했**어요. 싶어하다 is for a third person; the rows already say 싶었어요, and kor_for_eng seed 201 says 알고 싶었어요. Fix the seed and the LEGO. ≈ 120 chars.
- **D. "(स्त्री)" gender labels: 11** (REAL, K11/K42).
  - **Examples:** S0021L02 *उसका (स्त्री)* | 그녀의, and the played rows S0021L02B01–B03, S0096L02U04, S0110L01U04.
  - **Fix:** drop the label. In 4 rows the Hindi does not show gender, so drop 그녀는 from the Korean there too.
  - ≈ 300 chars.
- **C. ZUT:** S0138L04 मिलना चाहता था | 만나고 싶어한 vs S0127L02 | 보고 싶었던. Grow 138 to हमसे मिलना चाहता था | 우리를 만나고 싶어한.
- **B.** S0626L01 प्यास नहीं है | 목마르지 is cut mid-way. Fix: → 목마르지 않아요.
- **I. Not-new with no twin: 2:** S0004L03 and S0009L04 अब | 지금.
- **H. Wrong Korean: 4.**
  - S0156L02U02 어디서 가고 싶어요 → 어디 가고 싶어요
  - S0655L02U02 formal 같습니다 → 같아요
  - S0196L03B01 최신 들었어요 is not Korean: delete
  - S0152L01U01 says "trying" for "want": delete
- **Not a defect:**
  - 교회 (42 hits): all at seed 551, whose seed is about a church
  - 함께 (147): this is the variant's own word for "with"; 6 new LEGOs teach it
  - -세요 in seeds 14–33: the seed teaches 하세요
  - phrase-level clashes from pronoun drops (31)
  - 9 phrase_missing hits: particles, except 107L03/201L01, which are counted under K
  - untaught words: 0 after the split-aware recount

## kor_for_tam (I checked the Korean side and the structure only)

- **S. Seed Korean never played: 52 seeds** (REAL, 0 chars). Add the seed rows.
- **D. Plain-register 나/내 in a 저/제 course: 80 rows and LEGOs, plus 8 seed sentences** (REAL, K19).
  - 36 seed sentences use 저/제 and 8 use 나/내. Those 8 are seeds 126, 130, 136, 147, 148, 166, 226, 293, e.g. S0226 그 남자는 **나를** 도우려고 해요.
  - **Fix:** 나는/나를/내가/내 → 저는/저를/제가/제.
  - ≈ 2,400 chars + ≈ 400 for the seeds.
- **C. ZUT: 3.**
  - இன்னும் | 더 (S0023L02) vs | 아직 (S0060L03): grow 23 to இன்னும் அதிகமாக | 더 많이
  - இல்லை | 없어요 (S0057L02) vs | 아니요 (S0096L01): grow 57 to நினைவில் கொள்ள முடியவில்லை | 기억할 수 없어요
  - தயாராக இல்லை | 되지 않았어요 (S0088L06) vs 안 됐어요 (S0096L04): use 안 됐어요 in both, including seed 88
- **B. LEGO cut mid-way or short of its seed: 5.**
  - S0061L03 말해줄 수 → 말해줄 수 있어요
  - S0068L02 찾고 → 찾고 있어요
  - S0626 splits the idiom 목이 마르다, and its rows "아니요 안 마르네요" are not Korean. Fix: 목이 안 마르네요
  - S0662L01 → 여러분 말씀하시네요
  - S0279L01 → 많지 (best guess)
- **E. Wrong word: 2.**
  - S0642 *மேடம்* (madam) is said as 선생님 (sir). Fix: 여사님, as kor_for_eng 642 does.
  - S0666L01 adds எப்படி ("how"), which the Tamil seed does not say.
- **E. Gapped: 3** (S0325L03, S0326L01, S0558L01).
- **G. Row lacks its LEGO: 5.** S0631L01U01–U04 are good Korean but drop 무엇을. Re-cut L01 so they sit under 드릴까요 (best guess). Also S0642L01U04.
- **F. Untaught: 6.** Example: S0040L01U04 좋을 거예요; 좋을 is first taught at 401.
- **J.** S0402L01 ஆம் | 네 is taught as new twice. Fix: set it not-new.
- **H. Wrong row: 4.**
  - S0354L01U01 drops "angry"
  - S0038L01U02 약 6시에 vs LEGO 6시쯤: same Tamil, replayed cold
  - S0651L01U03 vs LEGO S0162L01
  - S0077L03U01 is a fragment
- **Not a defect:**
  - 교회 at seed 551 (41): the seed is about a church
  - 함께 (142): the variant's own word
  - -세요 at 14/15: the seed teaches it
  - S0639L01 선생님 / 선생님과: a particle difference

---

## Coverage

| family | kor_for_eng | kor_for_hin | kor_for_tam |
|---|---|---|---|
| ZUT LEGO / USE | all read | all read | all read |
| tags | all read (654L02 is not-new and unplayed; 668L01 KNOWN) | all read | none |
| not-new / dup_debut | all read | all read | all read |
| lego_not_in_seed **target** | all 95 read | 0 hits | 2 read |
| lego_not_in_seed **known** | **not read (GAP)**: 351 hits, mostly particles and pronoun drops | **not read**: 431, Hindi | **not read**: 573, Tamil |
| gapped (new contiguity check) | 15, all read | 9 | 3 |
| syllables | hand-recounted; >8 is KNOWN (220); **7–8 listed, no cuts proposed (GAP)** | 0 over 8; 64 at 7–8 not cut | 0 over 8; 50 at 7–8 not cut |
| phrase_missing_lego | 49 in 1–430 read; 378 in 431+ = KNOWN filler | 9 read | 6 read |
| untaught | split-aware recount; 91 in 1–430 read; 431+ = KNOWN filler | 0 | 6 read |
| dup rows | 863 by exact equality, 6 baskets by eye | 0 | 0 |
| seed not played | 109 (301–430) + 49 (B) read; 431+ KNOWN | 76 counted mechanically | 52 counted mechanically |
| qmark | 45 in 1–430 read | 0 | 0 |
| article drift | 5 read, not a defect (enough exact rows) | – | – |
| Korean lexical (7 patterns) | read by band; 431+ KNOWN | all read | all read |
| seed coverage (every seed part is a LEGO, Kai 12 Nov) | **mechanical count only: 399 seeds have uncovered Korean; not read** | 597 | 553 |
| intros, clip vs text, female voice | not scanned | not scanned | not scanned |

## Gaps
- **Seed coverage (S3) was counted, not read.** A residue check calibrated on seed 662's uncovered 다 finds Korean that no LEGO covers in 399 / 597 / 553 seeds. That is a re-decomposition, not a fix list, and the numbers include particles that a builder may fairly leave inside a neighbour.
- **Known-side "LEGO not in seed" (1,355 hits across the slice) was not read.** For the variants I cannot judge Hindi or Tamil. For English, the sample I looked at was pronouns and particles.
- **No 7–8 syllable LEGO has a proposed shorter cut.**
- **Audio is not checked:** no clip was heard, and the voice of each clip is not visible on the read route. The "?" costs assume every clip needs re-voicing.
- **Popty may not have a LEGO-insert op.** Fixes C (183), E and the 631 re-cut add a LEGO row. I did not check whether edit-batch can insert a LEGO (the same blocker as d/f0ab5817's missing merge op).
- **Korean readings are mine, backed by the course's own taught forms.** Hindi and Tamil wording in the proposals reuses only words from each course's own seed. Confidence is given per row.
- **Learner counts past each seed:** there is no sanctioned read for this, so I did not check them.

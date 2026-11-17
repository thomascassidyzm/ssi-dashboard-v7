# zho — cleanup scan findings (#447, slice worker #472)

Courses: **zho_for_eng** (main), **zho_for_hin**, **zho_for_tam**, **zho_for_jpn**, **zho_for_gle** (5 seeds).
Live dumps read 17 Nov 2026, 14:06Z, through Popty's `script-view`. **Nothing was applied, rendered or sent.**
Every row is in `zho.json` (course, family, row id, known, target, verdict, fix, confidence, source, canon, chars).

How to read the verdicts: **REAL** = new, worth fixing. **KNOWN** = already on a held or ruled list (doc named). **NOT A DEFECT** = the detector's mechanism, explained. **LIST** = only listed, for Kai's shortest-cut rule.
Audio chars = new target text × 2 voices + new known text × 1. A delete or a not-new flag costs 0. Intro re-voicing is counted at about 60 chars per LEGO.

The variants were **translated separately** from the main course, not copied row by row. Only 30 of 668 Hindi seed sentences match the main course's Chinese, and 26 of 668 Tamil ones do. So the main course's fixes could only be carried over as **patterns**. I mined them from the main course's fix records and ran them on every course in the slice (`zho.patterns.json`). All of them pass detect.cjs calibration.

---

## PRIORITY — main-course fixes the variants never got

### 1. Time word after "can / need / should" (variants: 37 rows; main: 9 left)
The main course moved time words in front of the modal verb: 我要现在说中文 → 我现在要说中文. Kai approved 19 rows on 4 Nov, and seeds 161 and 316 were later changed the same way. The variants still have the old order.
- tam seed 161 + S0161L03U01 | 你能周日早上把那本书给我吗？ → 你周日早上能把那本书给我吗？ (**the main seed 161 already says exactly this**)
- tam seed 316 + S0316L02U01 | 你觉得她能周一带她哥哥来吗？ → 你觉得她周一能带她哥哥来吗？ (same: the main seed 316 already says this)
- tam S0005L01U03 | நான் இப்போது கற்றுக்கொள்ளப் போகிறேன் | 我要现在学习 → 我现在要学习 (the same row shape as main S0005L01U03)
- jpn S0018L04U03 | 今晩6時に会えますか | 你能今天晚上六点和我见面吗 → 你今天晚上六点能和我见面吗 (the main course fixed S0018L04U03 the same way)
- hin S0423L01U04 | उन्हें अभी जाने की ज़रूरत है | 他们需要现在走 → 他们现在需要走

REAL, proposed: **tam 23, jpn 8, hin 6.** All 37 were read. There are 9 more in the main course: S0149L03U04, S0176L01U02, S0210L01U03, S0255L01U04, S0277L02U02, S0371L01U03, S0404L02U04, S0405L01U06, S0428L01U03.
NOT A DEFECT (6, main): a negated "don't need to … now", "before tomorrow" (a deadline), and 能晚点 in seed 168 and its copies, which is natural speech. KNOWN: main S0005L01U03 was approved but refused by the apply guard (d/162f9caf).
**Fix:** move the time word in front of the modal. Each row's text is in the JSON. Rows with 很快 are a best guess: 尽快 may read better where it is taught.
**Canon:** K9/K16. This is a word-order preference, not broken grammar, so R0.18 applies: it is proposed, not assumed. Source: AllSet Chinese Grammar Wiki, "Time words and word order".
**Chars:** tam 410, jpn 164, hin 108, eng 138.

### 2. 想要 used with a verb (K55) — hin 8, tam 9
Kai's K55 rule: 想要 is used only with a thing. "Want to do" is 想.
- tam seed 625 + S0625L01U01 | 你想要喝点什么吗？ → 你想喝点什么吗？ (**main seed 625 already says this**)
- tam S0248L03B03 | 想要退钱 → 想退钱 (main seed 248 is 我想退钱)
- tam S0643L01U01 | 您想要喝茶吗，先生？ → 您想要茶吗，先生？, as main S0643L01U05. Tom's plate A-186 covers seed 643's *English* only, so this row edit does not touch it.
- tam S0658L01U04 | 你们想要喝点什么吗？ → 你们想喝点什么吗？
- hin S0091L01U01–U05 + B01 | 我想要及时回答 … The LEGO is 要及时回答 ("(in order) to answer in time", seed 91). These rows use 想要 + verb. Fix: reword the rows to keep 要 in its seed sense (我要及时回答 / 要及时回答很难). Confidence: best guess.
- hin S0152L01B03/B04 | 我想要练习 / 我想要学中文 → 想要 + a taught noun, as the main course did at S0222L03U02/U03, or delete these builds.

NOT A DEFECT: hin S0586L01B03 我想要工作 (工作 = "a job", a thing); tam S0594L01U05 想要玩具 (toys). The main course has no leftovers: 你想要帮助吗 uses 帮助 as a noun.
**Chars:** tam 120, hin 96.

### 3. 我想 used for "I think" — hin 5, tam 7, eng 1
The course teaches 我想 as "I want" and 我觉得 as "I think". The main course changed S0173L01B04 我想→我觉得 for this reason (#233). In the variants, the known side says "I think" (मुझे लगता है / நினைக்கிறேன்), while other rows answer the same prompt with 我觉得. That gives one prompt two answers.
- hin seed 185 | मुझे लगता है कि आप उन्हें काम पर भूल आए। | 我想你把它们留在工作的地方了。 → 我觉得… This is a seed edit (S15), and the main seed 185 says 我觉得.
- hin S0501L03U04 | मैं चाहता हूँ आप बिना झगड़े साथ खेलें | 我想你们不吵架地一起玩 → 我想让你们不吵架地一起玩. This one is "I want you to", so it needs 让; 我想让你 is taught at S0015.
- hin S0387L02U05 | शायद वह सही थी ("maybe") | 我想她说得对 → make both sides "I think".
- tam S0476L01U03, S0478L01U05, S0479L01U05, and builds S0659L01B03 / S0662L01B02 / S0664L01B03 / S0667L01B04 → 我觉得.
- eng S0172L01U04 | I think this will be helpful | 我想这会很有帮助 → 我觉得…

KNOWN: eng S0285L01U04 (K18). NOT A DEFECT: eng S0542L01U02 每当我想这件事 (想 + object = "think about it"). **Chars:** hin 95, tam 107, eng 17.

### 4. Japanese-only copies of other main-course fixes — jpn 5
- jpn seed 20 + S0020L03B03 + U01 | 彼の名前を早く覚えたい | 你想快点**学**他的名字 → 你想快点记住他的名字. The Japanese says "memorise". 记住 is taught at S0006L01, and main seed 20 uses 记住. This is a seed edit (S15), but the seed contradicts its own known. **sure.**
- jpn seed 92 + S0092L03B03 | 我想继续做这个一会儿 → 我想继续做一会儿这个. The main course approved this exact reorder (#545 B, S0092L03U01/U05/U08), and main seed 92 is now 我想再继续做一会儿.

KNOWN: "learn her name" 学她的名字 in seed 21. hin 12 rows, tam 3 and jpn 2 copy the main course's held D2 item (d/1f252a53). Their own known also says "learning", so they follow Kai's ruling on the main seed 21.

---

## zho_for_eng (main) — other families

**A. Basket drills only part of its LEGO (P17) — 35 REAL (33 LEGOs + 2 single rows), 9 KNOWN.** The detector flagged 322 rows. 34 of them are split or reordered LEGOs (K49), so they are not defects. In the other 288, the basket was clearly written for an earlier, shorter cut, and the LEGO later grew. Examples:
- S0230L01 "to know a young man | 认识一个年轻男人": 11 of 11 rows drill only 认识 (I know that man | 我认识那个男人)
- S0426L01 "love each other | 彼此相爱": 9 of 9 drill 彼此 (help each other | 彼此帮助)
- S0404L01 "shouldn't expect | 不应该指望": 9 of 10 drill 指望
- S0229L02 "if she could | 如果能的话": 11 of 12 drill …的话 with no 如果
- S0508L02, S0623L03, S0624L01, S0627L01, S0589L01, S0536L01: most of each basket misses the LEGO

KNOWN: S0514L02 and S0625L01 (K27), S0198L01 (K20), and the formal-you seeds 642/644/649/651/668 (d/a7f509ac).
**Fix:** use Kai's 17 Nov shortest cut. Where the piece the basket drills is in the seed, re-cut the LEGO to that piece and cover the rest of the seed with another LEGO. Then nearly all rows stay as they are. Otherwise, re-make the rows. Per-LEGO cuts are not drafted (see GAPS). **~2,800 chars** (LEGO + intro only; re-made rows would add more).

**B. One prompt, two LEGO answers (ZUT) — 2 REAL, 4 KNOWN.**
- almost | 几乎 (S0449L01) / 差点 (S0502L01). Grow S0502L01 to "almost got lost | 差点迷路"; 差点 is "nearly (something bad) happened". **likely.**
- to try | 试试 (S0002L01) / 试着 (S0407L01). Grow S0407L01 to "to try to set | 试着树立". This **touches Tom's 试试 ruling (r-2026-11-04)**, so it is Kai's call.
- KNOWN, but sharper now: idea | 主意 (S0123L01) / 想法 (S0259L01). #431 re-cut S0259L01 from 好想法 to "idea | 想法", so K17's clash is now exact. K17's own fix still applies: re-gloss as "thought".
- KNOWN: once 一遍/一次, I want you to 我希望你/我想让你, woman 女人/妇人 (d/1f252a53, K15).
**Chars ~180.**

**C. Taught as new twice — 1 REAL.** S0572L02 "last time | 上次". #431 changed S0117L01 from 这次 to 上次 today, so 上次 is now taught at seed 117. Set S0572L02 not-new. 0 chars.

**D. LEGO not in its own seed — 2 REAL, 6 KNOWN, 7 NOT A DEFECT** (splits by 现在/她/我们/太多, and 打不开).
- S0301L02 "to want to look at | 想看". Seed 301 is 他想给你看点东西, "he wants to **show** you something" (给你看 = show). Re-cut to "to show you | 给你看" and re-make its 10 rows. **likely, ~470 chars.**
- S0055L01 "but sleep | 却睡" is not in seed 55 (…睡得不好却还要醒来). Its rows say 却睡了 for "but fell asleep", which needs 睡着了. Re-cut to "but still have to | 却还要" and re-make the rows. **best guess, ~330 chars.**

**E. Duplicate rows — 15 REAL, 1 KNOWN** (S0643L01U01, seed 643, A-186). Examples: S0009L01B06 = U01, S0040L01U01 = B02, S0203L01U01 = B01 (the seed copy). Delete the build twin. 0 chars.

**F. Bare yes/no echo — 1 REAL.** S0350L01B03 "yes he is | 是的，他是". This Chinese answer is unfinished; Chinese answers with 是的 / 对 alone. Delete the build. 0 chars.

**G. LEGO English not taken from its seed (L26 known side, L11) — a candidate family of 252, plus 8 KNOWN.** The detector flagged 326. I removed 66 that differ only in inflection or a function word, and read the remaining 260 as a list.
Most of them gloss the Chinese literally instead of using the seed's English:
- "originally | 本来" (S0107L01, S0484L01, S0608L01)
- "currently" (S0306L01, S0646L01)
- "extremely | 非常" (S0125L01, S0374L01, S0553L02)
- "in the process of" (S0104L02, S0375L01)
- "regarding" (S0083L03, S0597L03)
- "to give" / "to look at" for 给…看 "show" (S0032L01/L02)
- "midnight" (S0108L01)

KNOWN: the grammar-label and counter glosses ("object marker ba", "measure word for animals"…; K22, K26).
**I did not judge these one by one**, so they are not counted as new findings. They need a per-LEGO pass: re-gloss from the seed's own English. If all were re-glossed it would cost **~17,500 chars** (LEGO known + intro each).

**H. Long LEGOs.** Hand count, one character = one syllable:
- 17 are over 8 syllables. 2 are KNOWN (formal-you seeds). Most of the other 15 are whole-sentence LEGOs in seeds 201–210 (e.g. S0202L01 没有人确定该怎么回答这个问题, 14 syllables).
- 14 are 7–8 syllables (LIST).

No cuts are drafted.

**I. Approved #545 edits that never went live — 3, KNOWN** (d/162f9caf): S0005L01U03, S0108L01U05, S0267L01U14. All three were refused by the apply guard and are still unresolved.

**Detector families that came back clean or not a defect (main):**
- **qmark_mismatch, 96:** 92 are a Chinese question with 吗/什么… but no "？". That is punctuation only, and the meaning is carried by the question word. 3 more have a question word. 1 is a formal-you row (KNOWN).
- **seed_not_played, 85:** 41 seeds have no new LEGO, which is fine (Kai, 4 Nov). 37 have a played copy with slightly different English. 7 are not played at all: 82, 129 and 259 are KNOWN (#431/#435); 293, 345, 469 and 1 more are listed in the JSON family "seed not played".
- **notnew_untaught, 7:** all labels already KNOWN (K26, A10), or unplayed.
- **empty_audio:** 0 live. The orchestrator's 27 were fixed today by #449/#451.
- **27 seed numbers are absent from the course** (31, 119, 124, 127 …). I did not check whether that is intended (see GAPS).

## zho_for_hin — other families
- **Gapped LEGOs (L32), 5 REAL:** S0182L01 "क्या ... है | 有没有", S0395L01 "हमें ...ना है", S0418L01, S0530L02, S0570L02. Proposed whole cuts:
  - S0182L01: क्या आपने देखा है | 你有没有看到
  - S0395L01: हमें बाएँ मुड़ना है | 我们要向左转
  - S0418L01: उन्हें सेवा करनी है | 他们需要服务
  - S0530L02: ताकि मैं गिन सकूँ | 这样我就能数
  - S0570L02: अपनी टिकट के लिए | 为你的票

  This also clears hin's one LEGO clash: क्या है → 是什么 / 有没有. **best guess, ~2,470 chars with re-made baskets.**
- **Seed sentence never played (P26), 131 REAL.** 70 are copies with drifted Hindi; 61 have no copy at all. Add each seed sentence as a USE row on its own clips, as #435 did for the main course. 0 chars if the seed clips exist (not checked).
  - Detector note: its 377 was inflated, because the ZUT key does not strip the Hindi full stop "।".
- NOT A DEFECT: उसने मुझे बताया → 她告诉我 / 他告诉我 (he/she, both tā).
- **LIST:** 113 LEGOs of 7–8 syllables (none over 8).

## zho_for_tam — other families
- **Seed sentence never played (P26), 363 REAL.** 252 are drifted copies; 111 have no copy at all. Fix and cost are as for hin.
- **ZUT on a LEGO, 2 REAL:**
  - "உங்களுக்கு என்ன வேண்டும்" → 你想要什么 (S0631L01) / 你需要什么 (S0170L01U01). Make the row say தேவை "need".
  - "நீங்கள் என்ன செய்கிறீர்கள்" → 你在做什么 (S0107L03) / 你做什么 (S0051L02U01).
- **Over 8 syllables, 1:** S0135L02 你为什么觉得那么好 (9) → 你为什么觉得 | 那么好. **LIST:** 35 of 7–8.

## zho_for_jpn — other families (the course needing the most work)
- **Dictionary-style LEGO glosses, 171 REAL** of 474 new LEGOs.
  - 59 carry a gap marker 〜 (S0001L01 〜したい | 我想, S0109L01 〜しなければならない | 必须): gapped, L32.
  - 132 list alternatives with ・ (S0051L02 する・やる | 做, S0181L01 連れて行く・連れてくる・持っていく・持ってくる | 带): a label, K11/L11.
  - Fix: re-gloss each from the seed's own Japanese chunk, one form. **~10,800 chars.**
  - The detector's gapped/tag check misses 〜 and ・; this needs fixing in detect.cjs.
- **LEGO clashes, 11 REAL:**
  - 会う 见面/见; 早く 快点/早; 聞く 问/听; 話 故事/话; 知る 知道/了解; ありがとう 非常感谢/谢谢; 残念 可惜/遗憾; すごい 太好了/棒; これ 这个/这; 〜しなければならない 必须/得
  - 考え 主意/想法 (the same as main-course K17)

  Each has a proposed re-gloss or grown cut in the JSON. **~730 chars.**
- **English in the Chinese, 1 REAL:** S0283L02 "中国語 | **chinese**", and seed 283 "Chineseを話す友だち… | 你哪些朋友会说Chinese？". Change both to 中文. **sure.**
- **Taught as new twice, 8 REAL:** S0245L03 做, S0247L01 书, S0248L03 把, S0261L01 它, S0270L02 担心, S0280L03 工作, S0285L01 说, S0296L01 多一点. Set them not-new. 0 chars.
- **Known does not match, 1:** S0122L03U01 "ワクワクする | 你觉得兴奋吗" → ワクワクしますか.
- **Empty audio on played rows, 32 LEGOs / 91 rows REAL. 1,679 chars** through the render route, with approval.
- **Seed sentence never played (P26), 167 REAL** (79 drifted copies, 88 with no copy). 0 chars if the seed clips exist.

## zho_for_gle (5 seeds)
3 seed sentences not played (seeds 2, 3, 4). 1 duplicate row: S0005L02U06 = B03. 1 row under S0004L02 点什么 says only 怎么说 (P17). The three Irish ZUT pairs are phrase against phrase, so they do not count (Kai, 21 Oct). Irish known side: target and structure only, per the brief.

---

## Totals (REAL, new)

| course | REAL | chars | biggest families |
|---|---|---|---|
| zho_for_eng | 85 (+252 L26 candidates, not counted) | ~3,900 (+~17,500 if every candidate is re-glossed) | partial baskets 35, duplicates 15, long LEGOs 15, time order 9, P26 4 |
| zho_for_hin | 156 | ~2,800 | P26 131, K55 8, time order 6, gapped 5, 我想 5 |
| zho_for_tam | 405 | ~670 | P26 363, time order 23, K55 9, 我想 7 |
| zho_for_jpn | 404 | ~13,600 | labels 171, P26 167, empty audio 91 rows, ZUT 11, time order 8 |
| zho_for_gle | 5 | 0 | P26 3 |

## Coverage

| family | eng | hin | tam | jpn | gle |
|---|---|---|---|---|---|
| ZUT (LEGO / USE with a LEGO side) | read all | read all | read all | read all | read all |
| ZUT phrase vs phrase | not counted (Kai 21 Oct) | same | same | same | same |
| gapped / tags | scanned (0) | read all 5 | scanned (0) | **detector blind to 〜・; read by hand: 171** | scanned (0) |
| not-new untaught / dup debut | read all | 0 | 0 | read all | 0 |
| LEGO length (characters = syllables) | listed | listed | listed | listed | listed |
| LEGO in seed, target | substring + read all | read all | read all | read all | read all |
| LEGO in seed, known | 326 → 260 read as a list, not judged one by one | excluded (other known) | excluded | excluded | excluded |
| phrase holds LEGO (P17) | read by LEGO (44 LEGOs, 288 rows) | 0 hits | 0 hits | 0 hits | read |
| untaught target words | **not run (spaceless script)** | not run | not run | not run | not run |
| empty audio | 0 | 0 | 0 | read | 0 |
| seed played (P26) | read | recounted (punctuation-proof) | recounted | recounted | read |
| qmark | read (92 punctuation only) | 0 | 0 | 0 | 0 |
| lexical: time order, 想要+verb, 我想=think, 学…名字, 做这个一会儿, 在试试, 不足够 | read all | read all | read all | read all | read all |
| 坐 + object, 弹 + non-instrument | scanned, 0 everywhere | 0 | 0 | 0 | 0 |

## GAPS
- **Untaught Chinese words were not machine-checked in any course.** The script has no spaces, and the word-level detector is switched off for it. Only the lexical patterns above read the Chinese.
- **Known side of the Hindi, Tamil, Japanese and Irish courses:** structure only, per the brief. The Japanese labels were caught because they are visible structure.
- **L26 known-side family (main, 252):** read as a list, not judged row by row; no re-gloss is drafted.
- **Shortest cuts:**
  - not drafted for the 35 partial-basket LEGOs or the long LEGOs (eng 15, hin 113, tam 35, 7–8);
  - the jpn label re-glosses carry two examples only.
- **P26 fixes cost 0 only if the seed sentences have their own clips.** The dump does not carry seed audio, so this is not checked.
- **zho_for_eng is missing 27 seed numbers** (31, 119, 124, 127, 158, 160, 167, 179, 180, 189, 190, 194, 196, 199, 225, 241, 249, 250, 278, 282, 294, 307, 318, 344, 347, 468, 648). I did not check whether they were removed on purpose.
- **Dropped detectors:** 不足够 (main held item; matches only its own 2 KNOWN rows); 坐/弹 (their positives are deleted from the main course and they found nothing live). The "得 = děi" and pinyin records concern audio and pinyin, not text, so no pattern was possible. The wrong-recording family (WC-3) cannot be checked from text.
- **Kept but noisy:** 在试试 (main: all KNOWN, K-list d/c5f74eae).
- **Chinese wording** is best effort from the course's own taught forms plus the sources cited. No native read.

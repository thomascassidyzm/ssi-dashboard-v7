# Presentation clips vs LEGO text — estate-wide divergence sweep

**Question:** after three weeks of heavy text fixing, does the presentation clip that introduces each LEGO still say what the LEGO now reads? Built entirely from the live database.

**Headline:** **1,365 high-confidence divergences** across **59 of 85 checkable courses**. 26 courses are clean. One course, **fra_ca_for_eng, holds 385 of them (29% of its linked LEGOs)**. Separately, **16 courses have no presentation layer at all** and could not be checked — including **pdc_for_eng**, one of the campaigns that prompted this sweep.

Nothing was edited, no audio was generated, nothing was pushed.

---

## 1. Coverage

- **85 courses checked**, covering **72,063 LEGOs** that carry a presentation link.
- **16 courses could not be checked — EXPLICIT GAP.** They have **zero** presentation clips: not a broken link, the clips do not exist. Verified three ways — no `presentation_audio_id` on any LEGO, **zero** rows in `course_audio` with `role='presentation'`, and zero rows in `lego_introductions`.

  `pdc_for_eng` (661 LEGOs), `fin_for_eng` (1,425), `hak_for_eng` (2,635), `mar_for_eng` (2,077), `tel_for_eng` (1,657), `deu_ch_for_eng` (1,558), `yue_for_eng` (1,171), `por_for_jpn` (842), `mlt_for_eng` (733), `nan_for_eng` (732), `bre_for_fra` (630), `gla_for_eng` (536), plus `ita_for_cym`, `sbx_for_eng`, `eng_template`, `zzz_test_for_eng`.

  **This matters for Pennsylvania Dutch specifically:** the PDC word-form corrections *cannot* have broken presentation clips, because pdc_for_eng has none. The rule was not violated there — the presentation layer was never built.

- 21,791 LEGOs in checked courses carry no presentation link at all; they are out of scope of this rule, not defects.

---

## 2. Calibration — proven on known positives before any count

I first tried the obvious signal, *"LEGO edited after its clip was generated"*, and **it is worthless**: **72,063 of 72,063** linked LEGOs have `updated_at > clip.created_at`. A 100% base rate — the row-touch trigger bumps `updated_at` unconditionally. Any count built on that timestamp would have been noise, so I discarded it.

Instead I used `content_audit_log`, which preserves the **old row**, to find LEGOs whose `known_text` provably changed *after* the clip was rendered. That yields **83 real post-clip text edits**, splitting into two calibration sets:

| calibration set | n | detector should | detector did |
|---|---|---|---|
| **Cosmetic** (case/punctuation only, e.g. `i'm` → `I'm`) — inaudible, must NOT flag | 31 | flag 0 | **flagged 0** — pass |
| **Audible** (a word actually changed) | 31 | flag those whose clip still says the old thing | **flagged 20; the 11 passes each verified by eye as the clip already matching current text** — pass |

Worked known positive: `spa_for_eng S0531L01` — text changed `whoever` → `anyone`; the clip still says *"The Spanish for: 'whoever', is:"*. Detector flags it. Its sibling `S0071L03` was changed `anyone` → `no one` while its clip still says *'anyone'* — the two swapped, and both are flagged.

Worked known negative: `ita_for_eng S0126L02`, text changed `this work` → `work`, clip says *'work'* — already correct, correctly not flagged.

An early version of the detector used plain containment and **missed** cases like `spa_for_eng S0524L01` (text now `I'll call you`, clip says *'I'll call you back'*) because the shorter text is a substring of the longer clip. That is why the final detector compares against the **quoted headword slot**, not the whole clip.

---

## 3. The funnel, and the false positives I hunted out

Raw detection is **strict equality between the LEGO's known_text and the quoted headword slot in its clip**. I ran two independent false-positive hunts and cut three classes.

| stage | count |
|---|---|
| LEGOs with a presentation link | 72,063 |
| **Raw hits** (headword slot != current text) | **6,054** |
| − cut: **unquoted headword** (jpn/zho clip formats speak the headword outside quotes) | −3,561 |
| − cut: **authored alternation in the text** (`done / made`; clip legitimately voices one) | −1,121 |
| − cut: **alternation on the clip side** (text `else`, clip *'else/more/still'*) | −7 |
| **High-confidence residue** | **1,365** |

Two further classes I tested for and found **absent**, so they cut nothing:

- **Stale provenance stamps.** The brief warned that a repointed LEGO leaves the old clip stamped with the old id. I trusted the link throughout, then checked: in **all 1,372** residue rows `course_audio.lego_id` equals the linked LEGO id, and **no clip is shared between LEGOs**. No stamp artefact exists in this residue.
- **Parked English brackets.** Bracketed and parenthetical content is stripped during normalisation, so it never produced a hit. None are reported as defects.

Per-course funnel (courses with any raw hit):

| course | linked | raw | −unquoted | −alternation | residue |
|---|---|---|---|---|---|
| eng_for_jpn | 677 | 677 | 668 | 0 | 9 |
| fra_for_jpn | 667 | 667 | 666 | 0 | 1 |
| deu_for_jpn | 632 | 632 | 623 | 0 | 9 |
| spa_for_jpn | 631 | 631 | 629 | 0 | 2 |
| ita_for_jpn | 582 | 582 | 580 | 0 | 2 |
| zho_for_jpn | 475 | 475 | 369 | 0 | 106 |
| fra_ca_for_eng | 1310 | 388 | 2 | 0 | 386 |
| fas_for_eng | 795 | 284 | 0 | 281 | 3 |
| nep_for_eng | 871 | 248 | 0 | 243 | 5 |
| bul_for_eng | 599 | 181 | 0 | 178 | 3 |
| srp_for_eng | 657 | 87 | 0 | 84 | 3 |
| hye_for_eng | 706 | 81 | 0 | 1 | 80 |
| hrv_for_eng | 662 | 78 | 5 | 0 | 73 |
| tha_for_eng | 532 | 72 | 0 | 71 | 1 |
| spa_for_eng | 1411 | 62 | 1 | 0 | 61 |
| nld_for_eng | 564 | 61 | 2 | 0 | 59 |
| cat_for_eng | 617 | 60 | 0 | 57 | 3 |
| eng_for_sin | 1241 | 60 | 0 | 0 | 60 |
| ita_for_zho | 595 | 57 | 0 | 0 | 57 |
| eng_for_zho | 502 | 51 | 0 | 0 | 51 |
| spa_for_zho | 574 | 51 | 3 | 0 | 48 |
| lav_for_eng | 628 | 48 | 0 | 47 | 1 |
| fra_for_zho | 576 | 43 | 0 | 0 | 43 |
| zho_for_eng | 1104 | 37 | 0 | 0 | 37 |
| ukr_for_eng | 589 | 36 | 0 | 33 | 3 |
| cym_s_for_eng | 676 | 35 | 7 | 0 | 28 |
| eng_for_kor | 545 | 34 | 2 | 0 | 32 |
| eus_for_spa | 607 | 27 | 0 | 24 | 3 |
| ron_for_eng | 651 | 27 | 1 | 19 | 7 |
| heb_for_eng | 604 | 25 | 0 | 25 | 0 |
| ara_for_eng | 1374 | 22 | 0 | 2 | 20 |
| deu_for_zho | 611 | 21 | 0 | 0 | 21 |
| cym_n_for_eng | 635 | 20 | 3 | 0 | 17 |
| gle_for_eng | 788 | 20 | 0 | 11 | 9 |
| ita_for_eng | 1299 | 20 | 0 | 0 | 20 |
| por_for_eng | 1357 | 18 | 0 | 0 | 18 |
| por_br_for_eng | 1429 | 17 | 0 | 0 | 17 |
| ara_eg_for_eng | 686 | 14 | 0 | 14 | 0 |
| cym_anthem_for_jpn | 27 | 14 | 0 | 0 | 14 |
| nor_for_eng | 509 | 11 | 0 | 10 | 1 |
| lit_for_eng | 643 | 9 | 0 | 9 | 0 |
| rus_for_eng | 776 | 9 | 0 | 2 | 7 |
| est_for_eng | 642 | 7 | 0 | 3 | 4 |
| afr_for_eng | 486 | 5 | 0 | 0 | 5 |
| eng_for_pan | 1263 | 5 | 0 | 0 | 5 |
| hun_for_eng | 667 | 5 | 0 | 0 | 5 |
| swa_for_eng | 748 | 5 | 0 | 3 | 2 |
| ell_for_eng | 868 | 4 | 0 | 0 | 4 |
| spa_mx_for_eng | 1291 | 4 | 0 | 0 | 4 |
| eng_for_ita | 595 | 3 | 0 | 0 | 3 |
| eus_for_eng | 713 | 3 | 0 | 0 | 3 |
| hin_for_eng | 719 | 3 | 0 | 0 | 3 |
| isl_for_eng | 581 | 3 | 0 | 3 | 0 |
| swe_for_eng | 618 | 3 | 0 | 0 | 3 |
| dan_for_eng | 556 | 2 | 0 | 0 | 2 |
| eng_for_tam | 1361 | 2 | 0 | 0 | 2 |
| ara_lb_for_eng | 640 | 1 | 0 | 0 | 1 |
| ces_for_eng | 643 | 1 | 0 | 1 | 0 |
| deu_for_eng | 1400 | 1 | 0 | 0 | 1 |
| eng_for_ara | 592 | 1 | 0 | 0 | 1 |
| eng_for_deu | 604 | 1 | 0 | 0 | 1 |
| eng_for_spa | 602 | 1 | 0 | 0 | 1 |
| pol_for_eng | 667 | 1 | 0 | 0 | 1 |
| tur_for_eng | 841 | 1 | 0 | 0 | 1 |

---

## 4. What the divergences actually are — and two very different fixes

The residue splits into two kinds, and the split matters because **one of them costs nothing to fix**:

| kind | n | what it is | fix |
|---|---|---|---|
| **Stale clip** | 1,166 | the text was edited and the clip was never re-rendered. Your rule, violated. | re-render |
| **Mis-link** | 199 | the clip's headword belongs to a **different LEGO in the same course** — the link points at the wrong clip. | **repoint the link — no audio spend at all** |

By fix route: **1,121 TTS re-render (cheap, machine-voiced) · 199 repoint (free) · 45 human re-record (expensive)**.

### Human re-record — the expensive bucket, flagged separately

**45 clips, all Welsh**, confirmed `origin='human'` in the database: **cym_s_for_eng 28**, **cym_n_for_eng 17**.

**Croatian is not in the expensive bucket** — despite obliging a human voice by policy, all 68 divergent `hrv_for_eng` clips are `origin='tts'` (azure/xai voices). Flagging that as a discrepancy for you to rule on: if Croatian presentation audio is meant to be human, then 68 clips are currently machine-voiced — a separate finding from this sweep, not something I acted on.

### Worked examples

| course | LEGO | text says now | clip says | kind | fix |
|---|---|---|---|---|---|
| fra_ca_for_eng | S0139L03 | just as bright and early | The French for: 'so early', as in — 'I didn't want to leave so early', is: | stale clip | TTS (cheap) |
| fra_ca_for_eng | S0142L03 | you help me | The French for: 'helping', as in — 'that's very kind of you and I'm grateful to you for helping', is: | stale clip | TTS (cheap) |
| fra_ca_for_eng | S0147L01 | she was really sweet | The French for: 'was', as in — 'she was very kind when she saw me feeling nervous', is: | stale clip | TTS (cheap) |
| fra_ca_for_eng | S0176L02 | if he will | The French for: 'he'll be able', as in — 'I'll ask him if he'll be able to help next year', is: | stale clip | TTS (cheap) |
| zho_for_jpn | S0122L02 | 進展は | 進展 を中国語で言うと： | stale clip | TTS (cheap) |
| zho_for_jpn | S0275L01 | もっと長く | もっと・より を中国語で言うと： | stale clip | TTS (cheap) |
| zho_for_jpn | S0297L01 | 話せる | 〜できる・〜の仕方を知っている を中国語で言うと： | stale clip | TTS (cheap) |
| zho_for_jpn | S0101L02 | この | 〜の（言語の量詞） を中国語で言うと： | stale clip | TTS (cheap) |
| hye_for_eng | S0033L03 | been learning | The Armenian for: 'learning', as in — 'how long have you been learning Armenian', is: | stale clip | TTS (cheap) |
| hye_for_eng | S0025L03 | before I have to go | The Armenian for: 'before', is: | stale clip | TTS (cheap) |
| hye_for_eng | S0056L03 | say | The Armenian for: 'I say', is: | stale clip | TTS (cheap) |
| hye_for_eng | S0069L03 | all afternoon | The Armenian for: 'afternoon', as in — 'the young dog was there all afternoon', is: | stale clip | TTS (cheap) |
| hrv_for_eng | S0222L01 | he's trying to | The Croatian for: 'he/she is trying', is: | stale clip | TTS (cheap) |
| hrv_for_eng | S0250L02 | else | The Croatian for: 'else/more/still', is: | stale clip | TTS (cheap) |
| hrv_for_eng | S0230L02 | who | The Croatian for: 'who/which', is: | stale clip | TTS (cheap) |
| hrv_for_eng | S0206L01 | I like | The Croatian for: 'I like/enjoy', is: | stale clip | TTS (cheap) |
| spa_for_eng | S0233L01 | young | The Spanish for 'I met someone', as in 'I met someone last night who works with your brother.', is: | stale clip | TTS (cheap) |
| spa_for_eng | S0197L01 | my | The Spanish for 'my daughter', as in 'My daughter works for the council.', is: | stale clip | TTS (cheap) |
| spa_for_eng | S0089L02 | a lot | The Spanish for 'speak more slowly', as in 'If you can speak more slowly that would be great.', is: | stale clip | TTS (cheap) |
| spa_for_eng | S0172L02 | that | The Spanish for 'I can manage on my own', as in 'No thank you I can manage on my own.', is: | stale clip | TTS (cheap) |
| eng_for_sin | S0204L01 | කටයුතු හදාගන්න | ඉංග්‍රීසිෙන්. 'සම්බන්ධව'. 'සම්බන්ධව ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. : | stale clip | TTS (cheap) |
| eng_for_sin | S0178L01 | මට වෙලාවක් තිබුණේ නෑ | ඉංග්‍රීසිෙන්. 'හැබැයි'. 'හැබැයි මමා ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. : | stale clip | TTS (cheap) |
| eng_for_sin | S0250L01 | මම උත්තර දෙන්න කලින් | ඉංග්‍රීසිෙන්. 'මමා උත්තර දෙන්නට කලිං'. '' ඉතින්. : | stale clip | TTS (cheap) |
| eng_for_sin | S0249L01 | මට ඕනේ ඔයා | ඉංග්‍රීසිෙන්. 'මමා ඔයාට ඕනේ'. 'මමා ඔයාට ඕනේ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. : | stale clip | TTS (cheap) |
| nld_for_eng | S0148L02 | to answer | The Dutch for — 'answer (verb)' — is: | stale clip | TTS (cheap) |
| nld_for_eng | S0260L01 | faintest | The Dutch for — 'faint' — is: | stale clip | TTS (cheap) |
| nld_for_eng | S0143L03 | we had | The Dutch for — 'had (we had)' — is: | mis-link | repoint (free) |
| nld_for_eng | S0293L01 | to find out | The Dutch for — 'to search out' — is: | stale clip | TTS (cheap) |
| cym_s_for_eng | S0162L01 | son | The Welsh for <src>a son</src> is <tgt>mab</tgt>. <tgt>Mab</tgt>. | stale clip | **HUMAN** |
| cym_s_for_eng | S0292L01 | if you don't | Right then, moving on, let’s get you using "if you don’t make" which is: | stale clip | **HUMAN** |
| cym_s_for_eng | S0024L02 | I’d like | The Cymraeg for <src>I would like</src>, from <tgt>hoffi</tgt> for <src>to like</src>, is <tgt>hoffen i</tgt>.... | stale clip | **HUMAN** |
| cym_s_for_eng | S0283L03 | wait | Okay, for "waiting" I want you to say: | stale clip | **HUMAN** |
| cym_n_for_eng | S0031L04 | I think it’s interesting | If you put <tgt>dw i’n meddwl</tgt> and <tgt>mae’n ddiddorol</tgt> together, they change as if by magic into <... | stale clip | **HUMAN** |
| cym_n_for_eng | S0262L03 | mean | You might remember that "meddwl" is the Welsh for "to think".  It’s also, handily enough, the Welsh for "to me... | stale clip | **HUMAN** |
| cym_n_for_eng | S0262L04 | we can’t | Now, here’s how to say "that we can’t" ("that we cannot"): | stale clip | **HUMAN** |
| cym_n_for_eng | S0256L01 | I’d tell you | The Welsh for <src>I would tell you</src> is <tgt>byddwn i’n deud wrthot ti</tgt>—or <tgt>byddwn i’n deu’ ’tho... | stale clip | **HUMAN** |
| eng_for_kor | S0159L01 | 말하려는 것 | '말하려는 것이'. '그것은 제가 말하려는 것이 아니에요.'처럼. 를 영어로 하면: | stale clip | TTS (cheap) |
| eng_for_kor | S0147L02 | 저를 봤을 때 | '봤을 때'. '그녀가 봤을 때 행복했어요'처럼. 를 영어로 하면: | stale clip | TTS (cheap) |
| eng_for_kor | S0151L01 | 그게 아니었어요 | '아니었어요'. '아니었어요, 놀랐어요'처럼. 를 영어로 하면: | stale clip | TTS (cheap) |
| eng_for_kor | S0140L02 | 보여주려고 하는 것 | '당신이 보여주려는 것을'. '당신이 보여주려는 것을 볼 수 없어서 죄송해요.'처럼. 를 영어로 하면: | stale clip | TTS (cheap) |
| ita_for_zho | S0209L01 | 团体 | 意大利语里。「开会」。如「」。是： | stale clip | TTS (cheap) |
| ita_for_zho | S0161L02 | 书 | 意大利语里。「给」。如「你星期天早上能给我那本书吗？」。是： | stale clip | TTS (cheap) |
| ita_for_zho | S0052L02 | 他过去想 | 意大利语里。「一」。如「」。是： | stale clip | TTS (cheap) |
| ita_for_zho | S0135L02 | 好 | 意大利语里。「问她」。如「」。是： | stale clip | TTS (cheap) |

Note `eng_for_sin`: several clips contain visibly corrupt narration (*'ඒ ගෙ ඒ ගෙ ඒ ගෙ'* repeated) — a clip-quality defect sitting on top of the divergence.

The full machine-readable list of all 1,365 — course, LEGO id, current text, clip text, kind, fix route — is at `.a74-scratch/high-confidence.json` in the Popty checkout. Say the word and I will publish it as a document too.

---

## 5. Recommended fix order — cheapest and most harmful first

1. **The 199 mis-links — free, do these first.** No TTS spend and no human time: a correct clip already exists, the pointer is simply wrong. Concentrated in fra_ca_for_eng (76), hye_for_eng (24), spa_for_eng (20), nld_for_eng (12), zho_for_eng (11).
2. **fra_ca_for_eng's remaining 309 stale clips.** One course carries 23% of the estate's entire problem; clearing it removes the largest single block of learner-facing harm, and it is machine-voiced and cheap.
3. **The zho/jpn cluster — 286 clips** (zho_for_jpn 106, ita_for_zho 57, eng_for_zho 51, spa_for_zho 48, fra_for_zho 43, deu_for_zho 21). Same clip format, same generator — likely one batch re-render.
4. **The mid-tail — hrv 68, hye 56, eng_for_sin 56, nld 47, spa_for_eng 41, eng_for_kor 32.** All TTS. Fold the corrupt eng_for_sin narration in here, since those clips need re-rendering anyway.
5. **The long tail** — roughly 40 courses with 1–20 each, cheap to sweep in a single pass.
6. **Last: the 45 Welsh human re-records.** Genuinely expensive in recordist time and queue. Worth deciding case by case — several are low-severity wording drift (`son` vs *'a son'*, `I'd like` vs *'I would like'*) that may not justify a studio session, while others are substantive (`if you don't` vs *'if you don't make'*).

**No spend is authorised by this report.** Every route above needs your approval, and any re-render must follow make-before-break: generate and verify the new clip before the old one is touched.

---

## 6. Gaps and limits, stated plainly

- **16 courses uncheckable** (§1) — no presentation layer exists. Not investigated further.
- **This compares the known side only.** Presentation clips narrate the known-language prompt; they do not speak the target text (verified across every clip format in the estate). A target_text-only fix therefore *cannot* be caught by this method — **that is an unmeasured surface**, and deserves its own sweep against the target1/target2 clips.
- **Text-level, not audio-level.** I compared `course_audio.text` — what the generator was told to say. I did not transcribe the mp3s. Where TTS mis-spoke its input, this sweep cannot see it.
- **The audit-log calibration reaches back only to 2026-07-03**, when `content_audit_log` begins. Edits before that date have no preserved before-value, so the calibration set is drawn from the last six weeks. Detection itself is unaffected — it compares current state — but the *proof* that a text was edited after its clip exists only for that window.
- **Language-native adjudication is in flight and not yet folded in.** Six verification workers (**#625–#630**) are checking the residue for semantic false positives that a normaliser cannot see. Their findings may reduce the 1,365, and I will report them when they land. The funnel above rests on my own two completed false-positive passes.

# Paid courses cleanup: one fix list, by family (17 Nov 2026)

46 courses in wave 1 (13 slice reports). Grouped into **fix families**, so you rule once per family: look at the examples, give the direction, and one applier does the family across every course. **Biggest learner impact comes first.** Walk it one item at a time.

**Nothing has been applied, rendered, linked or sent.** Row counts are REAL findings the slice workers read by hand. Anything already on a held, KNOWN or ruled list is left out. Audio characters are **estimates** from text length (new target × 2 voices + new known × 1). Deletes, relinks, flag flips and seed copies cost 0. Every row is in the slice files `ops/paid-cleanup-scan-447/reports/<slice>.json` on this branch.

Five things were re-checked against the live courses today (Popty script-view dumps, 14:26–14:50Z). Where the live data disagreed with a report, the live figure is used:
- **Empty audio** (item 1) recounted live, with "can it be linked for free" worked out per slot.
- **German "#435 fixes never live":** all 8 rows still carry the old text. The 17 Nov apply did not touch seeds 33, 56, 64, 141, 182 or 424. All 8 stay on the list (item 7).
- **Arabic female voice, #641:** it re-recorded **ara_eg and ara_lb only** (10,996 clips: eg 5,707, lb 5,289). It never touched ara_for_eng. ara_for_eng has its own gender-prep table (348 rows, processed 4 Nov, 0 flagged), but nobody has checked what its female clips actually say. The scan's "399 rows at risk" is correct, as a text count (item 8).
- **Untaught-word counts** recounted at seed level (item 9). 105 of 1,538 rows were caused by the checker's bug. Each of those words *is* in its seed sentence, but no LEGO of that seed teaches it. So 12 LEGO fixes clear those rows; they do not need 105 row edits.
- **zho S0572L02 "last time | 上次"** is confirmed as taught NEW twice (S0117L01 and S0572L02). It was caused by today's apply, so it is ours (item 2).

## The table

| # | family | courses | rows | audio chars (est.) | free? |
|---|---|---|---|---|---|
| 1 | Silent prompt or answer: empty audio slot on a played row | 17 | 2,617 | ≈ 69,500 (+≈ 21,500 if the Arabic courses' English is rendered fresh, not linked) | ≈ 220 slots free now; 575 more by cross-voice link |
| 2 | **Ours, today:** zho "last time" taught NEW twice | 1 | 1 LEGO (9 rows go dark) | 0 | free |
| 3 | Prompt does not match the answer (wrong, garbled or missing known text) | 7 | 456 | ≈ 9,000 | no |
| 4 | Filler and template rows that are nonsense or add nothing | 10 | 2,249 | 0 as deletes (mar ≈ 31,000 if replaced) | mostly free |
| 5 | Broken English the learner hears or must say | 17 | 167 + seed 108 (×4 courses) | ≈ 13,900 | no |
| 6 | Wrong target-language form (grammar, register, labels) | 14 | 311 | ≈ 10,400 | no |
| 7 | Fixed in the main course, never carried to its sibling | 11 | 690 | ≈ 45,900 | no |
| 8 | Female voice reading a male form (AT RISK, not heard) | 7 | ≈ 5,400 rows (text count) | unknown until sampled | no |
| 9 | Word used before it is taught | 27 | 1,538 → 1,433 row fixes + 12 LEGO fixes | ≈ 45,100 | deletes free |
| 10 | LEGO says something its seed does not | 37 | 1,572 (1,412 without Sinhala) | ≈ 172,500 without Sinhala | no |
| 11 | Basket does not drill its own LEGO | 32 | 1,062 | ≈ 49,400 | partly (deletes) |
| 12 | Seed sentence never said | 41 | 4,033 | 0 (seed's own clips) | free |
| 13 | One prompt, two answers (LEGO level) | 28 | 102 | ≈ 5,500 | partly |
| 14 | Question on one side only | 25 | 1,263 | ≈ 21,200 (German 640 are text-only, 0) | partly |
| 15 | Formal LEGOs without sir/madam | 5 | 89 | ≈ 6,500 | no |
| 16 | NEW / not-new flag wrong | 29 | 138 | ≈ 3,400 (intros) | mostly free |
| 17 | Gapped LEGOs | 12 | 44 | ≈ 3,500 | no |
| 18 | Same row twice in one basket | 34 | 3,207 | 0 | free |
| 19 | LEGOs over 8 syllables (shortest cut) | 29 | 467 | not priced until cuts chosen | no |
| 20 | Thin baskets: build rows that only repeat the LEGO | 6 | 3,592 baskets | ≈ 251,000 | no |

**Separate decisions** (not families; each needs a yes/no before any applier runs): **D1** Sinhala seeds ~345–668 rebuild · **D2** eng_for_jpn full known-side read · **D3** voice gender for eng_for_pan / guj / urd before item 1 renders their known side. Then **wave 2** (8 courses, placeholder) and **gaps**.

---

## 1. Silent slots: a played row with no clip (A16)

**What it is.** The learner reaches a row and hears nothing. Usually the prompt (known side) is silent, so they get no cue. Most are rows U06 and later, added after the course was voiced.

**Live today (played rows only):**

| course | rows | empty slots | free now | must render | chars to render |
|---|---|---|---|---|---|
| eng_for_pan | 615 | 615 Punjabi prompt, 3 English | 1 | 617 | ≈ 21,700 |
| eng_for_mar | 454 | 454 Marathi prompt, 7 English | 3 | 456 | ≈ 15,600 |
| eng_for_tel | 428 | 428 Telugu prompt, 5 English | 3 | 428 | ≈ 18,100 |
| eng_for_guj | 200 | 199 Gujarati prompt, 1 English | 1 | 199 | ≈ 6,800 |
| ara_eg_for_eng | 345 | 345 English prompt | 6 in this course + 305 in another English voice | 34 | ≈ 1,100 (≈ 12,400 if all rendered) |
| ara_lb_for_eng | 333 | 333 English prompt | 5 + 270 in another English voice | 58 | ≈ 1,700 (≈ 11,900 if all rendered) |
| zho_for_jpn | 91 | 88 Japanese prompt, 51 + 51 Chinese | 8 (another course) | 182 | ≈ 1,600 |
| ara_for_eng | 44 | 36 + 36 + 36 | **108: Popty says already rendered, just not bound** | 3 | ≈ 100 |
| por_for_eng | 46 | 45 + 11 + 11 | **67 already rendered, not bound** | ≈ 16 | ≈ 550 |
| jpn_for_eng | 32 | 26 + 19 + 19 | **43 already rendered, not bound** | ≈ 28 | ≈ 700 |
| eng_for_hin | 20 | 20 Hindi prompt, 8 + 8 English | 0 | 36 | ≈ 1,400 |
| eng_for_sin | 4 | 4 + 2 English | 4 | 2 | ≈ 40 |
| eng_for_urd, eng_for_ara | 1 each | English | 2 + 2 (another course) | 0 | 0 |
| eng_for_deu, eng_for_spa, deu_at | 1 each | English / known | 0 | 2 + 2 + 1 | ≈ 115 |
| **total** | **2,617** | | **≈ 220 slots + 575 cross-voice** | | **≈ 69,500** |

"Already rendered, not bound" is Popty's own `audio-pipeline/missing` answer (clip of these words in this voice exists; the slot was never pointed at it). Those are free links.

**Examples.** eng_for_pan S0031L02U06 `ਮੈਨੂੰ ਯਕੀਨ ਨਹੀਂ ਰਾਤ ਨੂੰ ਕੀ ਹੋਵੇਗਾ। | I'm not sure what's going to happen tonight.` (no Punjabi clip). ara_eg S0003L01U01 `I want to learn how to speak Arabic | أنا عايز أتعلم إزاي أتكلم عربي` (no English clip). eng_for_hin S0490L01 "never": all 8 rows have no clip at all.

**Proposed fix.**
1. Link the ≈ 220 already-rendered slots (ara_for_eng, por, jpn, sin). Free.
2. Render the Indic and Telugu prompts, eng_for_hin, zho_for_jpn and the small ones: ≈ 69,500 chars. The pending passes for these courses have been queued since 6 Aug (mar), 12 Aug (pan) and 12 Oct (guj, hin) and have never run. **Hold pan and guj until D3**: their only prompt voice is female, and the text is male.
3. **ara_eg / ara_lb English prompts: your call.** 575 of the 678 slots have their words in another English voice (mostly Sonia, which voices most of these two courses' English; Popty now lists a Cartesia voice as current). A fresh render is likely refused (EXISTS_IN_LANGUAGE), so the realistic routes are: link those clips (free, but a second English voice can be heard), or re-record under the existing re-record authority (≈ 24,300 chars).

---

## 2. Ours from today: zho_for_eng "last time | 上次" taught NEW twice

**What it is.** This morning's Chinese held-items apply changed S0117L01 from 这次 to 上次, which was right. But S0572L02 `last time | 上次` is still marked NEW, so the same pair is now introduced twice.

**Live:** S0117L01 `last time | 上次` NEW, 12 rows. S0572L02 `last time | 上次` NEW, 9 rows (seed 572: 你忘了他们上次来看我们时发生的事了吗？).
**Fix:** set S0572L02 not-new (L17). Its 9 rows stop playing, and the seed's other LEGOs and the seed sentence still play. 0 chars. Sure.

---

## 3. The prompt does not match what the learner must say

**What it is.** The known-side prompt says something else, is garbled, or is just the LEGO. The learner cannot get to the answer from the prompt.

**Courses / rows:** eng_for_jpn 339 · eng_for_kor 78 · eng_for_zho 32 · eng_for_ara 4 · pan, urd, zho_for_jpn 1 each. **456 rows, ≈ 9,000 chars** (new known clips).
- eng_for_jpn S0227L01U01 `男性 | the man is trying to help me understand what you said`: the prompt is only the LEGO (192 rows like this, seeds 226–230).
- eng_for_jpn S0070L05U03 `なぜ彼女は私に教えたくなかったのですか？ | I don't know why she didn't want to tell me about it`: mismatch.
- eng_for_zho S0066L01U01 `同时做所有事情很难 | It's not difficult to speak a little English`.
- eng_for_kor: 45 prompts are statements in the 해요 form where the English is a question, so only a "?" would tell the learner.

**Fix:** rewrite the known prompt to say what the English says, using the seed's own wording where it has one. Otherwise delete the row if the basket keeps enough rows. Sure for mismatches, likely for garbled ones. **See D2:** eng_for_jpn has more of these than anyone has counted.

---

## 4. Filler and template rows: nonsense, or nothing added

**What it is.** Generator rows the learner has to say, either nonsense ("liked a hug", "we're very well", "in exactly already") or the bare LEGO with now/today/here bolted on.

| course | rows | what |
|---|---|---|
| por_br_for_eng | 1,397 | 740 fragments/contradictions, 427 whole clause behind "yes/no/that's true", 174 filler builds, 56 só/já rows in seeds 250–292 |
| eng_for_mar | 430 | 126 tag-glue (`he's my friend yet`, `in exactly already`), 304 "in English" on a fragment (`Sunday in English`) |
| por_for_eng | 205 | filler builds (`what I mean now`) |
| eng_for_sin | 201 | 147 template builds (`liked my grandfather fought in Italy`), 38 "near the field/top" tails, 13 seed-111 "brain" rows, 3 others |
| eng_for_tam, kan, urd, pan, tel, zho | 16 | `I thought today`, `was quiet today?` |

**Total 2,249 rows. Fix:** delete where the basket keeps 3 real builds, otherwise replace with a real phrase from taught words (as the 6 Aug mar repair did). Deletes cost 0. Replacing all of mar's costs ≈ 31,000.
**Two calls for you:** (a) por_br: a few of the 427 are good sentences (`no, thank you | não, obrigado`). Walk a sample before a bulk delete. (b) mar "in English": the 6 Aug triage called this slot "the drill format", but that was an agent's call, not yours. Keep the slot or not?

---

## 5. Broken English the learner hears or must say

**What it is.** In eng_for_* courses English is the target, so the learner copies these. In the Arabic courses it is the English prompt.

**Courses:** eng_for_jpn 39, eng_for_sin 26, eng_for_tam 24, ara_lb 19, eng_for_kan 14, eng_for_zho 13, ara_for_eng 6, eng_for_ita 5, and 1–4 each in kor, tel, deu, por, spa, fra, ben and fra_ca. **167 rows, ≈ 10,300 chars.** Plus **seed 108 in eng_for_jpn/kor/zho/ara**: "we didn't hope to wake in the middle of the night" (≈ 40 rows, ≈ 3,600 chars).
- eng_for_tam S0037L02U01 `I learn English last month`
- eng_for_kan S0034L03B02 `he doesn't want talking`; S0578L02 LEGO `that is more warm` (8 rows)
- ara_lb S0631L01U02 `I think what would you like | بفكر شو بدك؟`

**Fix:** reword to grammatical English, or delete the fragment. Sure. For seed 108, your call between "wake **up**" (minimal) and "We didn't expect to wake up…" (natural; seeds 107/108 may lean on "hope" on purpose).

---

## 6. Wrong target-language form: grammar, register, labels

**What it is.** Each course's own target text is wrong, and the learner copies it.

| course | rows | examples |
|---|---|---|
| jpn_for_eng | 78 | 49 rows where the English says he/she/they want, but bare たい means "I want" (SEED212 `they wanted to ask for help \| 助けを求めたかった` → "I wanted…"); 22 wrong meaning; 7 two sentences in one row |
| kor_for_tam | 86 | 80 rows in plain 나/내 in a polite 저/제 course (`내 뇌의` → `제 뇌의`) |
| por_for_eng | 57 | 37 "she said …" rows whose target keeps the seed's person; 20 wrong mood/tense/calque |
| ara_for_eng + ara_eg | 31 | case/mood/agreement: S0454L03U05 أَصْدِقاؤُنا after أَنَّ → أَصْدِقاءَنا; S0627L01B03 لَيْسَتْ جاهِزَةٌ → جاهِزَةً |
| kor_for_hin | 17 | 11 gender labels in brackets in the Hindi `उसका (स्त्री)` (K11), 6 wrong Korean |
| ita, spa, fra, zho_for_jpn, deu, deu_ch, eng_for_hin | 42 | spa `disfrutar + infinitive` (7); ita seed 479 `che potessi fare` with no trigger (5); fra `je ne pense pas que c'est` (5) |

**Total 311 rows, ≈ 10,400 chars.** Fix: the row-level correction in each slice file. Sure for grammar, likely for wording.

---

## 7. Fixed in the main course, never carried to its sibling

**What it is.** You or Deborah ruled a fix in the main course, and the variant still says the old thing.

| course | rows | what |
|---|---|---|
| spa_mx_for_eng | 406 | "I think" said with *pensar* (S0047L01 creo que vs S0123L01 pienso: 284 rows); Deborah's seed corrections never made here (disfrutar, tomar tiempo para, liderar el camino, sabía que + present…: 122 rows) |
| por_br_for_eng | 93 | 86 European forms (`tinha a certeza` → `tinha certeza`); 7 "pensar em" where the course teaches considerar |
| deu_for_eng | 50 | 33 "want" over möchte; **8 #435 fixes never live (re-checked: all 8 still old)**; 6 `fand, dass` for "thought"; 3 others |
| zho_for_tam / hin / jpn / eng | 76 | time word after the modal (我要现在学习 → 我现在要学习, 46 rows); 想要 + verb (17); 我想 for "I think" (13) |
| deu_at / deu_ch | 30 | want = möchte in AT; Swiss verb LEGOs with no pronoun; subordinators dropped |
| fra_ca_for_eng | 19 | "to meet \| se voir" (your seed-18 ruling, 10 rows); "need for help" (7) |
| ara_lb_for_eng | 16 | LEGO `fun \| مبسط` ("simplified"), plus its rows and seed 64. #641 fixed the voices only. Lebanese "fun" is مسلّي |

**Total 690 rows, ≈ 45,900 chars** (spa_mx alone ≈ 33,300). Fix: apply the main course's ruled form. Sure where the main course's text is the model, likely for the dialect re-statements (deu_at/ch, zho variants are separate translations, so these are the same rule, not the same row).

---

## 8. Female voice reading a male form (AT RISK: text count, nothing heard)

**What it is.** A female voice reads first-person text in the male form (`I'm sure` → masculine). The same defect was found and fixed in ita/spa/fra/por on 16 Nov.

| course | rows at risk | voice | note |
|---|---|---|---|
| eng_for_pan | 1,982 (Punjabi prompt) | Vaani, female, the only prompt voice | 63 rows already female, so the course is mixed |
| eng_for_urd | 1,406 | Uzma, female | |
| eng_for_guj | 472 | Dhwani, female | |
| spa_mx_for_eng | ≈ 454 slots | | |
| ara_for_eng | 399 (≈ 17,000 target chars) | Salma (ar-EG) | **Not covered by #641.** It has its own gender-prep table (348 rows, 4 Nov, 0 flagged), but its clips have never been checked |
| fra_ca_for_eng | 376 | | |
| por_br_for_eng | 310 | | |

**Fix:** an ear sample of 10 per course first (as was done for fra/por on 16 Nov), then a quote. For pan/guj/urd the choice is different: flip the text to female forms (pan ≈ 77,000, urd ≈ 48,000, guj ≈ 18,700 known chars) or add a male prompt voice. **See D3.**

---

## 9. Word used before it is taught

**What it is.** A practice row uses a target word the learner has not been given yet (P1/K8).

**Recounted today at seed level.** 1,538 rows in 27 courses. 105 of them are the checker bug: the word is in that seed's own sentence, but none of the seed's LEGOs teaches it. **For those, the fix is one LEGO each, and the rows then pass:**
eng_for_ben `my` at S0051 (28 rows) · eng_for_tam `try` at S0007 (25) · eng_for_spa `interesting`, `same` (19) · eng_for_pan `for` at S0038, `most` at S0280 (17) · eng_for_deu `hard`, `were` (9) · eng_for_guj `let` at S0071 (4) · eng_for_urd `make`, eng_for_sin `each`, ita `andando` (1 each).

**The other 1,433 rows stand:** eng_for_jpn 375, por 148, spa_for_eng 127, kor 91, eng_for_tam 67, deu `dort` 74, eng_for_kan 62, fra 56, ara_eg 45, eng_for_urd 40, eng_for_fra 40, eng_for_ara 39, ara_lb 35, eng_for_zho 35, eng_for_deu 29, eng_for_tel 25, por_br 24, ita 17, spa_mx 15, eng_for_kor 18, and fewer than 15 in each of the rest.
- deu_for_eng S0614L03U07 `your family was also there | …auch dort`: dort is in no LEGO; "there" is taught as `da`. Fix: dort → da (74 rows, ≈ 4,400 chars).
- eng_for_jpn S0095L03B05 `let's speak again the next time`: *let's* is taught at seed 158.
- por_for_eng: 110 "she/he/they asked" rows on *perguntou/perguntaram*, which are never taught.

**Fix:** delete USE rows, reword BUILD rows with taught words; never add a LEGO just to license a word (K14/K15). The 12 seed-coverage LEGOs above are the exception, because the word is in the seed (S3, your 12 Nov rule). **≈ 45,100 chars** (spa_for_eng ≈ 19,500 of it).

---

## 10. LEGO says something its seed does not (L26)

**What it is.** The LEGO was glossed from the other side, or from an old wording, so the learner is taught words the seed never says (and sometimes the wrong meaning).

**Courses:** zho_for_eng 254 (literal glosses), zho_for_jpn 171 (dictionary-style glosses), eng_for_sin 160 (see D1), eng_for_tam 90, ara_lb 82, ara 68, por_br 68, eng_for_pan 60, eng_for_tel 54, kor 54, ara_eg 49, por 49, jpn 43 (incl. 21 particles taught alone, L7), fra_ca 37, eng_for_por 34, eng_for_ben 33, and fewer in 21 more. Includes 35 verb LEGOs whose English lacks "to" (K54: jpn 21, fra_ca 9, fra 5).
- eng_for_pan S0513L02 `when I turn my head upside down` (seed: "when I move my head up and down")
- zho_for_eng S0301L02 `to want to look at | 想看` (seed: 他想给你看点东西, "wants to show you")
- kor_for_eng S0096L03 `시간이 좀 더 필요해요` (seed: 조금): the seed's exact words are never played (49 LEGOs like this, the #565 disease in seeds the census missed)

**1,572 LEGOs/rows; ≈ 172,500 chars without Sinhala.** Most of that is the re-cut baskets: eng_for_tel ≈ 31,000, kor ≈ 22,000 (≈ 19,500 of it in LEGOs already in the KNOWN over-8 re-cut, so do it there once), zho ≈ 18,400. Fix: re-gloss to the seed's own words, using the shortest cut. Rows follow.

---

## 11. Basket does not drill its own LEGO (P17)

**What it is.** The LEGO grew later (or was re-cut), and the basket still drills the old, smaller piece.

**Courses:** spa_mx 280, ara 118, fra 99 (in 21 baskets), eng_for_tam 81, por 43, deu 39 LEGOs (302 rows), eng_for_sin 37, eng_for_jpn 35, zho 35 (33 LEGOs), and fewer than 30 in each of 23 more. **1,062 items, ≈ 49,400 chars** (deu ≈ 22,600 of it).
- deu S0521L05 `why we needed to stay here | warum wir hier bleiben mussten`: 9 of 10 rows miss it (B01 `had to | mussten`)
- zho S0230L01 `to know a young man | 认识一个年轻男人`: 11 of 11 rows drill only 认识
- ara S0091L02: 7 rows drill تُفَكِّرُ without بِسُرْعَةٍ

**Fix (your 17 Nov shortest cut):** where the piece the basket drills is in the seed, re-cut the LEGO to that piece and cover the rest with another LEGO. Nearly all rows then stay. Otherwise rebuild the rows. Note: about half of spa_mx's 275 rows were not read.

---

## 12. Seed sentence never said (P26)

**What it is.** The learner never practises the seed sentence itself.

**4,033 seeds in 41 courses, 0 chars:** the fix reuses the seed's own clips (the ita #635 method). Largest: zho_for_tam 363, eng_for_hin 354, eng_for_sin 249, eng_for_kan 243, eng_for_pan 198, zho_for_jpn 167, spa_mx 159, eng_for_ben 153, eng_for_tam 149, ara_lb 146, ara_eg 136, zho_for_hin 131, deu_at 118, **kor_for_eng 109**.
- **kor_for_eng 109 is a regression.** The 5 Nov rebuild of seeds 301–430 dropped seed rows that #433 had added on 22 Oct (S0358L02U06 is gone).
- eng_for_spa seed 8 `voy a tratar de explicar lo que quiero decir | I'm going to try to explain what I mean`

**Fix:** add each seed as a USE row under its last new LEGO, with the seed's clips. Free, mechanical, one applier. Ask the next basket rebuild to keep seed rows.

---

## 13. One prompt, two answers (ZUT at LEGO level)

**102 in 28 courses, ≈ 5,500 chars.** Largest: ara_eg 17, zho_for_jpn 11, ara_lb 9.
- ara_eg S0020L01 `to learn | تتعلم` (you) vs S0002L02 أتعلم: gloss "you learn" (K26)
- eng_for_mar S0136L01 `course | अर्थातच`: not English; rows say `course you`. Fix: `of course`
- kor S0526L01 `can't | 못` vs S0331L04 `can't | 수 없어요`: re-cut 526 so it tiles

**Fix:** unify to one form first (L34), else put one inside a larger LEGO that shows why.

---

## 14. Question on one side only

**1,263 rows in 25 courses.** German 640 (deu 269, deu_at 270, deu_ch 101) are text-only (clips unchanged, 0 chars). The rest need the known clip re-read: eng_for_sin 160, ara_lb 103, ara 70 (Arabic lacks ؟), eng_for_tel 48, kor 45, eng_for_tam 37, eng_for_spa 28, ara_eg 27 … **≈ 21,200 chars.**
- deu S0014L01B01 `Do you speak? | Sprichst du` → add ?
- ara_lb S0316L01U02 `do you think that she could bring the story | …؟` → add ? to the English, re-record

---

## 15. Formal LEGOs without sir/madam (K32)

**89 in 5 courses, ≈ 6,500 chars:** ita 34 (seeds 643, 649–655; same fix as fin #846), fra_ca 27 (formal seeds glossed "you all", plus 12 "you guys"), deu_at 12, deu_ch 10, deu 6.
- ita S0643L01 `do you want | vuole` → `do you want sir | vuole, signore`
- fra_ca S0639L01 `you all | vous` → `with you sir | avec vous monsieur`

Note: the eng_for_indic courses (hin included) have no honorific anywhere in 639–655. That was not judged.

---

## 16. NEW / not-new flag wrong

**138 in 29 courses, mostly 0 chars** (≈ 3,400 for intros where a LEGO becomes NEW).
- Taught NEW twice → set not-new: ara_eg 14, ara_lb 3 (both fixed in ara_for_eng by #513), mar 4, zho_for_jpn 8, spa_mx 5.
- Not-new but never taught → make NEW (L31): **S0207L01 "you've done"** in eng_for_fra/deu/ita/por (fixed in eng_for_spa on 14 Oct); **S0257L01** in all five eng_for_eu; spa_mx 8, ara 8.
- ara_lb S0017L01/S0035L01 `she wants | بدها` is inverted: the first teaching is marked not-new.

---

## 17. Gapped LEGOs (L32)

**44 in 12 courses, ≈ 3,500 chars.** eng_for_ben 11 (`আমি কি ... পারি | could I have`), kor_for_hin 9, kor 5, zho_for_hin 5. Fix: fill the gap with the seed's own words, or re-cut gap-free as hin did at seed 128.

---

## 18. Same row twice in one basket

**3,207 in 34 courses, 0 chars, deletes.** kor 863, por 495, ita 440, eng_for_jpn 425, eng_for_kan 182, jpn 180, eng_for_tel 179, spa 127. Fix: delete the later twin. One mechanical applier.

---

## 19. LEGOs over 8 syllables

**467 new LEGOs in 29 courses** (hand counts; the builder's estimate under-counts English and Arabic). ara 123 (recount from vowel marks before cutting), eng_for_jpn 54, eng_for_zho 53, deu 38. Shared across eng_for_eu: `I'm not going to be able to` → `I'm not going to` + `be able to`. Not priced until the cuts are chosen. 7–8 syllable LEGOs are counted per course in the slice files, not listed.

---

## 20. Thin baskets: build rows that only repeat the LEGO

**What it is.** eng_for_hin's #943 repair made each basket have 3 real builds. The five variants were never repaired: guj 1,149, mar 782, ben 748, pan 543, urd 369 baskets (165 have 0–1 real builds). **≈ 251,000 chars** to make them all real.
**Caution:** this rests on #943's tool header saying "a bare build row is never played". That was not re-verified in the player. If it is wrong, this family shrinks to item 4 (filler). Last because it is the biggest spend for the least certain gain.

---

## Decisions before any applier

**D1. eng_for_sin seeds ~345–668: rebuild?** In this half the Sinhala and the English seed often say different sentences, and the LEGOs were cut from the Sinhala. 160 LEGOs carry English the seed does not contain (≈ 74,800 chars to re-cut). For example, S0455 *"We had to leave because the children were tired"* is taught as *"the child was upset"* + *"we need to go home"*. Row fixes will not mend it. The slice recommends one rebuild job: check the Sinhala seeds against the English, re-cut the LEGOs to L26 and regenerate the baskets. Deleting the 185 template/filler rows (item 4) is safe now. **Rebuild: yes / no?**

**D2. eng_for_jpn full known-side read?** The reads that were done (question marks, same-prompt pairs, seed rows) already found 366 bad Japanese prompts (item 3). The other ~9,000 rows were not read, and the hit rate suggests many more. The proposal is a dedicated read shaped like German #435: seed-range shards, every row read, Japanese against English. Smaller versions are needed for eng_for_kor (해요 statement/question) and eng_for_zho seeds 60–80. **Commission it: yes / no?**

**D3. Prompt voice gender for eng_for_pan, eng_for_guj, eng_for_urd.** Each has one female prompt voice, reading male first-person text (item 8). Rendering pan's 615 and guj's 199 empty prompts (item 1) now would add more of the same. **Flip the text to female forms, or add a male prompt voice?** This decides before item 1's pan/guj render.

---

## Wave 2 (placeholder)

spa_for_jpn, fra_for_jpn, deu_for_jpn, ita_for_jpn, spa_for_zho, fra_for_zho, deu_for_zho, ita_for_zho: running separately. Their findings will be folded into the families above. No new families are expected.

## Gaps

- **ara_sy_for_eng could not be read.** Popty's seed routes return 0 seeds and 404 for it.
- **Female voice (item 8) is a text count.** Nothing was heard, and no clip was transcribed.
- **Audio characters are estimates** from text length, not render dry runs. Intro re-voicing is not included for re-glossed LEGOs in the eng_for_eu courses.
- **ara_eg/lb "linkable" English** (item 1) means the words exist in another English voice in the 34 courses dumped today. Whether the library would link them, or refuse a render, was not tried (a dry run can link).
- **Known side not judged** in the Indic, Telugu, Kannada, Tamil and Sinhala courses beyond structure.
- **Not read in full:** half of spa_mx's 275 P17 rows; most of por_br's 427 "yes/no + clause" rows; filler tags in the Indic courses (≈ 4,300 rows counted, not judged); intros in every eng_for_* course.
- **The untaught recount** covers every space-separated course. jpn_for_eng, zho_for_* and the eng_for_asia courses had the slice's own count (eng-asia already corrected the bug).

# Gloss blast-radius audit — 101 courses, 93,854 legos

**Read-only.** No DB writes, no commits, no fixes. 2026-08-12.

---

## The headline: the stored data is not inverted. The data is *missing*.

Deborah's report was that under `hitz bat` ("a word") the per-word English gloss shows `hitz` = "a" and `bat` = "word". That is real. But it is **not a mis-mapped stored gloss pair**, because there is no stored pair at all:

```
eus_for_eng  S0006L02   known "a word"   target "hitz bat"   components = NULL
```

`course_legos.components` is NULL for that lego. Something downstream has to invent an alignment for two known words and two target words, and a positional zip gives exactly `hitz`→"a", `bat`→"word". The renderer is worker #384's half; the data half is that **there is nothing there for it to read**.

The correct alignment is in fact stored elsewhere and is *right*. `course_practice_phrases.decomposition` carries token-aligned blocks, and for the very phrases that use this lego it says:

```
"I want to learn a word" / "hitz bat ikasi nahi dut"
  hitz  -> "word"  (legoId S0006L01)
  bat   -> "a"     (legoId S0006L02)   <- correct
```

So the estate holds a correct alignment for this exact pair and the defective surface is not reading it.

---

## The positional-zip signature is essentially absent from stored components

I ran a swap test over every 2-component lego in the estate: does pairing `(k1→t1, k2→t2)` agree with the course's own alignment evidence *worse* than the swap `(k1→t2, k2→t1)`? Across **91,290 stored component rows in 42,863 legos**, the swap wins in **3 legos**:

| course | lego | known / target | stored | should be |
|---|---|---|---|---|
| fra_for_eng | S0298L01 | nothing left / plus rien | plus→"nothing", rien→"left" | plus→"no longer", rien→"nothing" |
| fra_for_zho | S0272L01 | 听起来 / ça semble être | semble→听起来, être→好像 | inverted |
| zho_for_hin | S0032L02 | क्या कुछ / 什么吗 | 什么→कुछ, 吗→क्या | 什么→क्या (what), 吗→question particle |

Three. In ninety-one thousand rows. **eus_for_eng has zero.** Whatever wrote the components arrays did not zip them positionally.

---

## The real blast radius: legos with no components at all

The defect class that produces Deborah's symptom is *absent* components on a lego that is multi-word on both sides. Estate-wide:

- **4,513 legos** are multi-word on both the known and target side and carry **no components array**. **3,933 of them are declared type A (atomic), for which having no components is correct** — see the root-cause section below.
- Of those, **3,165 would render wrong** under a naive positional zip (either the token counts differ so no zip can be right, or the course's own alignment evidence contradicts the zip).
- 216 would happen to render right; 1,132 are unverifiable because their course has no alignment evidence to check against.

**eus_for_eng is not special — it is 40th on this list.** It has 15 such legos, 13 flagged; I hand-checked all 15 and 14 of them render wrong under a zip. The Welsh and Indic-known courses are an order of magnitude worse, and `cym_n_for_eng` / `cym_s_for_eng` have **zero stored components on any lego in the course**.

---

## PER-COURSE TABLE

Sorted by the count that matters — multi-word legos with no components where a positional zip renders wrong. Courses with 0 in that column are omitted (26 of 101; full data in `scripts/gloss-blast-radius/table.json`).

| course | legos | legos w/ components | component rows | membership fails | swap-wins | multiword legos w/ NO components | of those, a positional zip renders WRONG |
|---|---|---|---|---|---|---|---|
| eng_for_tel | 1504 | 658 | 1441 | 123 | 0 | 513 | 398 |
| eng_for_mar | 1407 | 637 | 1281 | 85 | 0 | 438 | 347 |
| cym_n_for_eng | 635 | 0 | 0 | 0 | 0 | 447 | 312 |
| cym_s_for_eng | 679 | 0 | 0 | 0 | 0 | 443 | 307 |
| eng_for_sin | 1300 | 584 | 1249 | 117 | 0 | 382 | 297 |
| spa_mx_for_eng | 1372 | 347 | 735 | 3 | 0 | 177 | 142 |
| eng_for_kan | 1554 | 963 | 2325 | 273 | 0 | 158 | 134 |
| kor_for_hin | 1523 | 442 | 867 | 0 | 0 | 127 | 86 |
| kor_for_tam | 1527 | 358 | 693 | 0 | 0 | 103 | 63 |
| por_br_for_eng | 1570 | 980 | 2292 | 30 | 0 | 91 | 63 |
| eng_for_tam | 1421 | 828 | 1700 | 290 | 0 | 79 | 59 |
| fra_for_eng | 1653 | 993 | 2079 | 84 | 1 | 81 | 57 |
| gle_for_eng | 943 | 657 | 1507 | 7 | 0 | 50 | 45 |
| ara_for_eng | 1401 | 661 | 1345 | 26 | 0 | 60 | 43 |
| ben_for_eng | 754 | 416 | 1187 | 9 | 0 | 111 | 42 |
| fra_ca_for_eng | 1366 | 874 | 1897 | 65 | 0 | 103 | 42 |
| eng_for_urd | 1169 | 683 | 1535 | 107 | 0 | 57 | 39 |
| eng_for_ita | 598 | 365 | 712 | 41 | 0 | 42 | 35 |
| eng_for_ben | 1323 | 875 | 1889 | 100 | 0 | 63 | 34 |
| por_for_eng | 1417 | 780 | 1720 | 40 | 0 | 57 | 32 |
| eng_for_guj | 1445 | 1133 | 2409 | 176 | 0 | 65 | 31 |
| eng_for_hin | 1327 | 981 | 1973 | 239 | 0 | 48 | 31 |
| fin_for_eng | 1425 | 837 | 1754 | 7 | 0 | 41 | 31 |
| rus_for_eng | 801 | 148 | 334 | 0 | 0 | 33 | 27 |
| ara_eg_for_eng | 1386 | 284 | 615 | 23 | 0 | 33 | 26 |
| eng_for_deu | 630 | 457 | 962 | 65 | 0 | 36 | 26 |
| ell_for_eng | 1023 | 470 | 739 | 15 | 0 | 43 | 24 |
| fas_for_eng | 852 | 376 | 875 | 6 | 0 | 28 | 23 |
| cat_for_eng | 625 | 220 | 425 | 2 | 0 | 30 | 21 |
| tel_for_eng | 1657 | 52 | 116 | 35 | 0 | 27 | 21 |
| deu_for_eng | 1570 | 627 | 1186 | 6 | 0 | 39 | 19 |
| ita_for_eng | 1457 | 961 | 1633 | 19 | 0 | 30 | 19 |
| mlt_for_eng | 733 | 254 | 497 | 7 | 0 | 23 | 19 |
| eng_for_pan | 1323 | 981 | 2025 | 137 | 0 | 44 | 16 |
| eng_for_spa | 618 | 450 | 906 | 62 | 0 | 28 | 15 |
| est_for_eng | 659 | 130 | 275 | 2 | 0 | 21 | 15 |
| isl_for_eng | 584 | 218 | 430 | 4 | 0 | 24 | 15 |
| lav_for_eng | 638 | 161 | 351 | 2 | 0 | 20 | 14 |
| deu_ch_for_eng | 1558 | 758 | 1838 | 7 | 0 | 21 | 13 |
| eus_for_eng | 747 | 347 | 785 | 12 | 0 | 15 | 13 |
| srp_for_eng | 671 | 291 | 708 | 2 | 0 | 18 | 13 |
| nep_for_eng | 926 | 185 | 471 | 2 | 0 | 13 | 12 |
| spa_for_eng | 1475 | 753 | 1378 | 17 | 0 | 26 | 12 |
| eng_for_ara | 600 | 494 | 972 | 30 | 0 | 13 | 10 |
| kor_for_eng | 1459 | 720 | 1603 | 8 | 0 | 15 | 10 |
| bre_for_fra | 630 | 430 | 918 | 43 | 0 | 14 | 8 |
| eng_for_por | 616 | 463 | 919 | 47 | 0 | 15 | 8 |
| heb_for_eng | 629 | 418 | 1076 | 2 | 0 | 10 | 8 |
| tur_for_eng | 1340 | 211 | 389 | 14 | 0 | 9 | 8 |
| eus_for_spa | 609 | 240 | 480 | 15 | 0 | 13 | 7 |
| ara_lb_for_eng | 1546 | 491 | 866 | 79 | 0 | 9 | 6 |
| hin_for_eng | 772 | 150 | 371 | 3 | 0 | 9 | 6 |
| hye_for_eng | 745 | 94 | 211 | 12 | 0 | 8 | 6 |
| ron_for_eng | 703 | 249 | 580 | 3 | 0 | 10 | 6 |
| bul_for_eng | 599 | 129 | 278 | 0 | 0 | 5 | 4 |
| eng_for_fra | 648 | 560 | 1104 | 86 | 0 | 13 | 4 |
| gla_for_eng | 536 | 427 | 896 | 2 | 0 | 10 | 4 |
| hrv_for_eng | 766 | 415 | 826 | 9 | 0 | 4 | 4 |
| eng_for_kor | 546 | 373 | 728 | 68 | 0 | 6 | 3 |
| hun_for_eng | 674 | 121 | 280 | 5 | 0 | 5 | 3 |
| mar_for_eng | 2077 | 173 | 398 | 3 | 0 | 9 | 3 |
| nor_for_eng | 515 | 170 | 245 | 1 | 0 | 8 | 3 |
| swa_for_eng | 814 | 456 | 524 | 11 | 0 | 4 | 3 |
| swe_for_eng | 690 | 128 | 295 | 0 | 0 | 3 | 3 |
| afr_for_eng | 515 | 99 | 253 | 0 | 0 | 2 | 2 |
| cat_for_spa | 1411 | 480 | 651 | 10 | 0 | 4 | 2 |
| lit_for_eng | 676 | 448 | 925 | 65 | 0 | 4 | 2 |
| sbx_for_eng | 61 | 27 | 54 | 3 | 0 | 2 | 2 |
| ces_for_eng | 659 | 570 | 1485 | 28 | 0 | 1 | 1 |
| deu_at_for_eng | 1259 | 525 | 1300 | 2 | 0 | 1 | 1 |
| ita_for_cym | 58 | 29 | 38 | 0 | 0 | 1 | 1 |
| nld_for_eng | 625 | 121 | 248 | 5 | 0 | 1 | 1 |
| pdc_for_eng | 661 | 399 | 950 | 6 | 0 | 1 | 1 |
| pol_for_eng | 748 | 433 | 1106 | 0 | 0 | 3 | 1 |
| ukr_for_eng | 633 | 131 | 244 | 0 | 0 | 1 | 1 |
**Estate totals:** 93,854 legos | 42,863 with components | 91,290 component rows | 3,368 target-membership failures | **3 swap-wins** | 4,513 multi-word legos with no components | 3,165 of those zip-wrong.

---

## EUS DETAIL

747 legos; 347 carry components (785 component rows); 115 have `components = NULL`, 285 have an empty array `[]`.

**The 15 legos with no components and multi-word on both sides** — hand-verified against their own seed sentences. All 15 are declared type **A**. This is the complete eus list for Deborah's defect class:

| lego | known | target | a positional zip gives |
|---|---|---|---|
| S0006L02 | a word | hitz bat | hitz="a", bat="word" — **inverted** (Deborah's report) |
| S0232L01 | old woman | emakume zahar | emakume="old", zahar="woman" — **inverted** |
| S0137L04 | being perfect | perfektua izatea | perfektua="being", izatea="perfect" — **inverted** |
| S0126L01 | this work | lan honek | lan="this", honek="work" — **inverted** |
| S0001L02 | to speak | hitz egin | hitz="to", egin="speak" — wrong (hitz=word, egin=do) |
| S0134L03 | working at | lanean aritzea | wrong |
| S0027L01 | I like | gustatzen zait | gustatzen="I", zait="like" — wrong |
| S0120L01 | you like | gustatzen zaizula | wrong |
| S0286L03 | speaking Basque | euskaraz hitz egitea | 2 known words vs 3 target words — no zip can be right |
| S0060L01 | I don't know | ez dakit | 3 vs 2 — no zip can be right |
| S0122L03 | how it's going | nola doan | 3 vs 2 |
| S0144L01 | I woke up | esnatu nintzen | 3 vs 2 |
| S0293L01 | I can find out | aurki dezaket | 4 vs 2 |
| S0295L01 | in a day | egun batean | 3 vs 2 |
| S0138L03 | my friend | nire lagunak | nire="my", lagunak="friend" — **correct by luck** |

14 of 15 wrong. Basque noun-adjective and noun-determiner order is the reason the inversions cluster: `emakume zahar` = woman-old, `hitz bat` = word-a.

**The known-good samples in the brief check out.** S0265L01, S0264L01 and S0009L02 all carry correct, target-ordered components with correct knowns. eus stored components are ordered in *target* order with meaning-correct knowns — e.g. S0002L02 "I am trying"/"saiatzen ari naiz" stores `[trying→saiatzen, I am→ari naiz]`, which is target-ordered and *not* parallel to the known word order. That is the right design and it is evidence against a zip.

**eus stored-component defects (12 target-membership failures, all hand-verified against seeds):**

- **(b) clean rewrite — 4.** S0033L01 `denboran`→`denbora`; S0236L02 `laguntza`→`laguntze`; S0022L02 `duten` vs lego's `duen`; S0032L02 `zenuen` in `zenidan`.
- **(c) cut — 2.** S0029L02 "I'm eager"/`gogoa dut` carries components for a different construction (`gogoz nago`); S0006L03 `gogoratzen saiatzen ari naiz` carries components for `gogoratu nahian ari naiz`. Both are orphans.
- **(d) judgment / the check can't see it — 6.** Morpheme splits the contiguity rule cannot express (`eskatzea`=[eskatu, tzea], `eskatzera`=[eskatu, ra], `ari zarela`=[ari zara, ela]), and three seed-vs-lego outliers where the component matches the **seed's** target text but the lego's `target_text` differs (S0026L03 seed `sentitzen dut` vs lego `sentitzen naiz`; S0022L02; S0006L03). Those are lego-text questions, not row fixes.

Zero of the 12 is an inversion.

**Also in eus: 373 of 785 component rows carry literal double-quote characters inside the values** — e.g. `{"known": "\"feeling\"", "target": "\"sentitzen\""}`. Mechanical (a), and learner-facing if rendered raw.

---

## TRIAGE DISTRIBUTION

The distribution is the finding, and it repeats the 2026-07-04 pilot's lesson: most of what a membership check flags is the check looking at the wrong unit.

**Target-membership failures: 3,368 rows of 91,290 (3.7%).**

| bucket | rows | share | verdict |
|---|---|---|---|
| Component's known **is** a member of the known side, target is not | 2,547 | **76%** | **(d)** — a systematic authoring convention, not debris |
| Neither side is a member | 821 | 24% | genuinely suspect; needs per-item triage |

The 76% bucket is one convention, concentrated in the `eng_for_X` courses: the component decomposes the **known** sentence word-by-word and glosses each word, rather than slicing the target sentence. `eng_for_deu S0155L04` known `es macht mir nichts aus` / target "I don't mind" stores `macht→makes`, `mir→me`, `nichts→nothing`. Every one of those is a correct gloss of the German; none is a slice of the English. Tom's 2026-07-04 ruling ("components MUST be part of the target sentence") is systematically not met by these courses — that is a **policy question about a whole authoring convention, not 2,547 rows of work**. `eng_for_kan` 274 flags of which 273 are this; `eng_for_hin` 239 of 229; `eng_for_guj` 176 of 167.

A second convention contaminates the same bucket: agglutinative/inflecting targets store the **citation form** rather than the inflected surface. `jpn_for_eng S0024L01` target `覚えられないと思う` stores `remember→覚える`. 104 of jpn's 163 flags are this shape. Also (d).

**Genuinely mechanical classes (independent of the above):**

| class | rows | verdict |
|---|---|---|
| Component values carrying literal `"` characters | 3,929 | **(a)** mechanical strip |
| Component with an empty `known` or `target` string | 13 | **(a)** mechanical |
| Confirmed positional inversions | 3 | **(b)** clean rewrite, hand-written |

Quote pollution by course: heb_for_eng 764, srp_for_eng 708, lit_for_eng 602, eng_for_urd 379, eus_for_eng 373, mlt_for_eng 359.

**And the class that actually matters:** 4,513 missing-component legos / 3,165 zip-wrong. These are **not** (a)/(b)/(c)/(d) content defects — the stored rows are absent, not wrong. See the next section: for most of them, absent is *correct*.

---

## The root cause: multi-word legos declared type A

Splitting the 4,513 by their declared LEGO type is decisive:

| type | is_new | multi-word legos with no components |
|---|---|---|
| **A (atomic)** | true | **3,933** |
| M (molecular) | true | 343 |
| A | false | 142 |
| M | false | 88 |

**87% of the gap is type-A legos.** An A-LEGO is by definition a single meaningful unit and *correctly* carries no components — only M-LEGOs must carry `components[]`. Deborah's lego is one of them:

```
eus_for_eng S0006L02   type A   is_new true   "a word" / "hitz bat"   components NULL
```

So is every other eus case I hand-verified — `emakume zahar`, `perfektua izatea`, `lan honek`, `euskaraz hitz egitea` are all declared **A**.

That closes the chain:

1. The lego is declared **A**, so no components are stored — and by the methodology that is correct, not a defect. `hitz bat` is one intention ("a word") in which `bat` is a construction-feature determiner, exactly the kind of thing the doctrine says must *not* be atomised out.
2. Something downstream renders a per-word gloss anyway.
3. With nothing to read, it zips positionally, and Basque noun-determiner order inverts it.

**The consequence for the fix:** backfilling `components` onto these 3,933 legos would contradict their own type declaration and re-introduce the bare-particle debut the methodology forbids. The repair belongs in the consumer — an A-LEGO should be shown whole, never split — plus a scoped review of whether those 3,933 multi-word A declarations are all honest (some will be genuine M-LEGOs mis-typed; that is a separate, seed-by-seed content question).

**A backfill route already exists and correctly does not see these.** `services/course-builder/routes/components.cjs` serves `GET /course/:code/components/gaps` and `POST /components/backfill`, filtered to `type='M' AND is_new=true` and multi-word on both sides. Under its own filter the estate has **343** gaps and eus_for_eng has **zero** — which is why this never surfaced as a backfill task. Its write path takes an authored `components` array from the caller and refuses to overwrite existing components without `?force=true`; it does no zipping. That route is the right tool for the 343 real M-LEGO gaps and the wrong tool for the other 3,933.

---

## DID EUS TAKE A DIFFERENT BUILD PATH?

**Verdict: no evidence of a different path, and no zip in the code that wrote eus.**

- **The one positional zip on a write path in the repo** is `services/course-builder/routes/seed-translate.cjs:186`:
  ```js
  components = components.map((comp, i) => ({
    ...comp, known: lt.component_translations[i]?.known_text || comp.target,
  }));
  ```
  This takes a source course's components and replaces each `known` by **array index** from a separately-produced translation list. It is a genuine index-zip and it is a standing risk — but it only runs on the `/seed/translate` path, which builds `X_for_<non-English>` courses by translating the known side of an existing course. **eus_for_eng's known side is English, the original; it did not go through this route.** Two of the three confirmed inversions in the estate (`fra_for_zho`, `zho_for_hin`) *are* on courses this route builds, which is consistent.
- No other code in `services/`, `tools/` or git history constructs a components array by zipping two token lists. Searched for the `split(/\s+/)` + `map((w,i)=>({known:w,target:t[i]}))` shape across the write path.
- The aligner that produced the *correct* data, `services/phrase-decomposer.cjs`, matches declared vocabulary spans against the target surface and assigns each matched span its own lego's `known_text` (line 195). It aligns; it does not zip. Unmatched residue becomes a `isGhost:true` block with an empty known — which is why the oracle built from it is trustworthy.
- eus_for_eng timestamps: legos created 2026-04-20 and 2026-04-28 in seed-ordered runs, all updated in a 2026-07-06 15:01–15:03 sweep, with a few touched 2026-07-15/18. That is an ordinary incremental build followed by a course-wide update pass — not a single bulk direct-insert event.
- eus has 6,450 practice phrases and 6,380 decomposition rows, i.e. it went through the normal phrase-writing pipeline like everyone else.

**So the eus symptom is not a build-path anomaly.** It is the general missing-components gap plus a consumer that guesses, landing hardest in eus because Basque word order inverts against English on exactly the short noun-phrase legos where components are most often absent.

---

## EXPLICIT GAPS

1. **11 courses have no alignment evidence** (`decomposition` is NULL for every phrase row): `ben_for_eng, deu_at_for_eng, fin_for_eng, fra_ca_for_eng, glg_for_eng, hak_for_eng, ita_for_cym, mar_for_eng, nan_for_eng, tel_for_eng, yue_for_eng`. For these, my zip-wrong count detects **only token-count mismatches** and is a **lower bound**. `hak_for_eng` is the estate's largest course (2,635 legos, 1,818 with components) and is entirely unverified on the swap and oracle tests. `fra_ca_for_eng` (103 missing-multi) and `ben_for_eng` (111) are likewise under-counted.
2. **The oracle is an imperfect judge.** It agrees with a stored component's known in 51% of the 22,259 comparisons it could make. I hand-read 30 disagreements in eus: essentially all are near-synonym gloss variance ("know" vs "knowing", "give" vs "to give", "me (indirect)" vs "me") — not defects. I therefore did **not** report the 10,876 oracle disagreements as findings; only the much stricter swap test, which requires the oracle to positively prefer the *other* component's known. The disagreement figure is published here so nobody re-derives it and calls it a defect count.
3. **The 821 "neither side is a member" failures are not individually triaged.** eus's 12 were (4 fix / 2 cut / 6 judgment). Extrapolating that split to 821 would be exactly the mistake the pilot warns against — the mix flips with the course. `eng_for_tam` is the outlier worth opening first: 290 failures of which only 27 are the known-side convention, so ~263 are unexplained, by far the estate's largest unexplained pool.
4. **I did not inspect any renderer.** Whether the surface Deborah saw actually performs a positional zip, and which surfaces read `components` vs `decomposition`, is worker #384's half. My "a zip renders wrong" column is a statement about what *would* happen given a zip, not proof that one runs.
5. **`course_practice_phrases.phrase_role='component'` rows** (767 in eus) were not audited against the same rule; they are a separate store from `course_legos.components` and were out of the time I had. Named here rather than silently skipped.
6. No query timed out; all 101 courses were scanned in full, no sampling.

---

## Recommendation

1. **Make the consumer refuse to guess — this is the fix.** If a lego is type A, or has no `components`, show it whole; never invent a word-by-word split. That removes the entire 3,165-lego defect class in one change, respects the type declaration, and costs nothing to run. Everything else below is secondary.
2. **Backfill the 343 genuine M-LEGO gaps** through the route that already exists (`POST /course/:code/components/backfill`), authored per-lego, gated on target-membership. Do **not** backfill the 3,933 type-A legos — that would contradict their declaration and manufacture the bare-particle debuts the methodology forbids.
3. **Audit the 3,933 multi-word type-A declarations** as its own scoped content pass — count first, pilot ~40, and expect the mix to flip by course. Some are honest intention-units (`hitz bat`); some will be mis-typed M-LEGOs. This is content judgment, not a script.
4. **Fix the 3 confirmed inversions by hand** and put an order-preservation assertion on `seed-translate.cjs:186` so the index-zip cannot drift again.
5. **Strip the 3,929 quote-polluted values** — mechanical, gated, reversible.
6. **Get a ruling from Tom on the `eng_for_X` convention** (2,547 rows): are components allowed to decompose the *known* side? Today's gate says no and 76% of the estate's flagged rows say yes. One ruling settles it, exactly as the 2026-07-04 component-row ruling cleared ~230 of 340 fra flags.

Items 2, 4 and 5 need a plan and approval before any write. Nothing in this audit wrote anything.

---

*Detector and raw data: `scripts/gloss-blast-radius/detect.cjs`, `triage.cjs`, `table.json`, `detail.json`, `triage.json` (gitignored workspace).*

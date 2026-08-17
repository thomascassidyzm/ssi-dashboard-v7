# Estate-wide ZUT (untaught-word) audit — 2026-08-15

**Read-only.** No course content edited, no audio generated, nothing committed, nothing pushed.

Scope: every course in the estate **except `fra_for_eng` and `spa_for_eng`** (done 2026-08-15).
Course list enumerated from the **live `courses` table**, not from any doc.

---

## 1. Coverage

**145 courses exist live.** Of those:

- **101 have content** (≥1 seed row and ≥1 lego or phrase row).
- **99 were audited** (101 minus the two already-done Romance courses).
- **44 could NOT be audited — no content to audit.** 22 have a seed shell but zero legos and zero
  phrases (`ara_for_cym, bre_for_eng, cor_for_eng, cym_for_yor, deu_for_cym, fra_for_cym, fur_for_eng,
  ind_for_eng, jpn_for_cym, kan_for_eng, kor_for_cym, lmo_for_eng, mkd_for_eng, nap_for_eng,
  por_for_aze, por_for_cym, rgn_for_eng, roh_for_eng, scn_for_eng, sme_for_eng, spa_for_cym,
  vec_for_eng, yid_for_eng, yor_for_eng, zho_for_cym`), and the rest are wholly empty shells
  (`ara_eg_for_jpn, ara_eg_for_zho, ara_for_jpn, ara_for_zho, ara_sy_for_eng, ara_sy_for_jpn,
  ara_sy_for_zho, deu_at_for_jpn, deu_at_for_zho, jpn_for_zho, kor_for_jpn, kor_for_zho,
  por_br_for_jpn, por_br_for_zho, por_for_lit, por_for_zho, spa_mx_for_jpn, spa_mx_for_zho,
  zzz_test2_for_eng`). **This is a gap, not a pass** — those courses are unaudited because there is
  nothing in them.

### Gap: 13 audited courses where the untaught-word detector does not work

The detector is word-based. It is **meaningless for target languages written without word spaces**.
These 13 ran, produced large numbers, and I am **discarding those numbers as uninterpretable**:

`hak_for_eng, jpn_for_eng, kor_for_eng, kor_for_hin, kor_for_tam, nan_for_eng, tha_for_eng,
yue_for_eng, zho_for_eng, zho_for_gle, zho_for_hin, zho_for_jpn, zho_for_tam`

They are **not clean — they are unmeasured.** Auditing them needs a segmenter (or a LEGO-span
tiling check that never tokenises), which I did not build. That is 13 of the estate's biggest
courses, including four released ones (`jpn_for_eng`, `kor_for_eng`, `zho_for_eng`, plus `hak`,
`nan`, `yue` in draft). They still carry the other check's numbers (§3b), which do work.

So: **86 courses carry a trustworthy untaught-word verdict; 13 carry none; 44 have no content.**

### Fan-out: five sonnet triage workers, all five reported

**#613** semitic · **#614** celtic · **#615** agglutinative · **#616** eng-target · **#617** euro-tail.
All five finished and all five full reports are folded into this document. Two of them (#613, #616)
arrived after the first version of this report was published; §4b is the corrected triage and
supersedes the raw detector residue in §3a wherever the two disagree.

Two operational notes worth recording. **#616 had its scratch directory deleted mid-task by another
concurrent session writing into the same shared `.a108-zut/` workspace** — it moved to a private
path and re-ran from scratch, reproducing identical totals, so the result is unaffected. And both
#613 and #616 hit the fan-out depth ceiling (they are already dispatched workers) and did their
verification single-pass rather than sub-dispatching — which is the cap working as intended.

---

## 2. Calibration — I did not trust a single number before this passed

Two detectors, calibrated separately.

**Detector A (reused, unchanged): the prior run's tool** — `scripts/_audit-phrase-zut.cjs`, the same
one used for the 2026-08-15 fra/spa rerun. Same-known/different-target (bidirectional) plus
component target-membership.

> **Calibration A — a real, already-confirmed defect.** The fra/spa rerun confirmed exactly one
> row-level defect: `spa_for_eng` component target **"Una idea buena"** (adjective after noun)
> against sibling seed 189's correct **"una buena idea"**. I re-ran the tool against the **live DB**
> and it re-detected it: known `a good idea` → two distinct targets, `una buena idea` (seed 189,
> `course_legos`) vs `Una idea buena` (seed 259, `course_practice_phrases`, role `build`).
> **PASS.**

**Detector B (new): the untaught-word check** Kai actually described — a practice phrase at seed N
may only use target material taught at seeds ≤ N (legos, component rows, and seed sentences at
seeds ≤ N). The prior run did not contain this check, so there was no already-confirmed
untaught-word defect to calibrate against. I used two injected controls instead, and say so plainly:

> **Calibration B1 — foreign-word control.** Injected into `fra_for_eng` at seed 5:
> *"je veux parler avec un hippopotame vermillon"*. Detector flagged **hippopotame** and
> **vermillon**, both `first taught: never`. **PASS.**
>
> **Calibration B2 — the shape that actually matters: a word that IS taught, but far too late.**
> Injected into `spa_for_eng` at seed 10: *"quiero saber sobre la guerra"*. Detector flagged
> **saber** (really taught at 45), **sobre** (83) and **guerra** (462) — and correctly reported the
> gap for each. **PASS.** This is the ordering-defect shape, and it survives every one of the eight
> false-positive filters below.
>
> **Calibration B3 — the negative control.** On the two courses the prior run called clean-ish,
> the finished detector returns `fra_for_eng` **1** residue row and `spa_for_eng` **28**, out of
> 250 and 185 raw hits. A detector that flagged the "clean" courses heavily would be a detector I
> would not believe. (fra's single row: `ensemble` used at seed 120, first taught at 133.)

---

## 3. The funnel

### 3a. Untaught-word check — 86 courses

**709,985 practice phrases checked → 86,678 raw word-level hits → 552 residue → 404 detector-high-confidence → 357 confirmed by language-competent triage** (plus 96 Armenian rows reclassified as a different defect class entirely — see §4b).

Raw hits are worthless on their own; here is what removes them, in order. Each class is the
detector's, not a hand-wave — the prior fra/spa run's finding that "most of what remains is grammar
the checker cannot see" is exactly what these classes are built to strip.

| # | false-positive class | what it strips | removed |
|---|---|--:|--:|
| C1 | digits / 1-char tokens | numerals, stray letters | 53 |
| C2 | apostrophe elision | `qu'ils` vs `qu` + `ils` — the exact hole the prior run found in `normalizeForContainment` | 764 |
| C3 | diacritic-only variant | `tú`/`tu`, `mí`/`mi` | 25 |
| C4 | stem/prefix inflection | shared ≥3-char stem with a taught word | 30,764 |
| C5 | morphological neighbour | edit distance ≤1 (short) / ≤2 (long) from a taught word — agreement, tense, gender | 17,133 |
| C6 | affix / clitic containment | agglutinative suffixing (eus/hun/fin/est/tur/hye) and Semitic proclitics و ال ب ل ك ف | 18,017 |
| C7 | Celtic initial mutation | soft/nasal/aspirate mutation changes the word-initial consonant, so no string check matches the radical | 156 |
| C8 | same-block | word taught at seed N or N+1 — authoring order inside one block, not a course-order defect | 71 |

**One of those classes was a bug I found mid-run, and it mattered more than everything else.**
The tokeniser stripped Latin punctuation only. Arabic-script `؟ ، ؛` and Arabic tashkeel/tanween
were left inside tokens, so `هنا؟` never matched taught `هنا`, and `مفيداً` never matched `مفيدا`.
`ara_for_eng` read **6,174 raw hits / 1,126 residue**. After adding Arabic-script punctuation
stripping, tashkeel removal and alef/ya/ta-marbuta folding (and Hebrew niqqud), the same course
reads **44 raw hits / 0 residue**. Every one of those 1,126 "defects" was orthographic noise.
Estate residue fell from 1,697 to 552 on that one fix. **Had I reported the first number, I would
have handed Kai 1,126 fictional Arabic defects.**

**High-confidence** = survived all eight classes AND (the word is never taught anywhere in the
course, OR it is first taught ≥20 seeds later) AND was not overturned by a language-competent
worker.

Per-course funnel (86 courses, ranked by high-confidence count):

| course | phrases checked | raw hits | −short | −elision | −diacritic | −inflection | −morph-neighbour | −affix/clitic | −Celtic mutation | −same-block | residue | worker-FP | HIGH-CONF |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| hye_for_eng | 5378 | 1638 | 0 | 0 | 0 | 957 | 567 | 18 | 0 | 0 | 96 | 0 | 96 |
| gle_for_eng | 5431 | 384 | 4 | 1 | 1 | 118 | 114 | 8 | 24 | 8 | 106 | 20 | 62 |
| eng_for_jpn | 10108 | 443 | 0 | 46 | 0 | 218 | 77 | 13 | 12 | 24 | 53 | 0 | 34 |
| eus_for_eng | 5683 | 179 | 0 | 0 | 0 | 126 | 17 | 1 | 0 | 2 | 33 | 2 | 31 |
| ara_eg_for_eng | 10812 | 127 | 0 | 0 | 0 | 27 | 69 | 1 | 0 | 0 | 30 | 0 | 27 |
| cym_n_for_eng | 4997 | 711 | 0 | 181 | 10 | 219 | 254 | 18 | 7 | 0 | 22 | 0 | 22 |
| cym_s_for_eng | 5365 | 1159 | 36 | 385 | 4 | 242 | 467 | 1 | 1 | 0 | 23 | 0 | 18 |
| ara_lb_for_eng | 11521 | 84 | 1 | 0 | 0 | 20 | 46 | 2 | 0 | 0 | 15 | 0 | 12 |
| lav_for_eng | 4920 | 75 | 0 | 0 | 1 | 57 | 4 | 2 | 0 | 0 | 11 | 0 | 9 |
| deu_for_eng | 12954 | 140 | 0 | 0 | 0 | 113 | 13 | 1 | 0 | 1 | 12 | 0 | 8 |
| afr_for_eng | 3877 | 8 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 7 |
| ita_for_eng | 12275 | 109 | 0 | 40 | 0 | 62 | 1 | 0 | 0 | 0 | 6 | 0 | 6 |
| eng_for_zho | 4392 | 53 | 0 | 3 | 0 | 18 | 8 | 0 | 4 | 2 | 18 | 0 | 6 |
| sbx_for_eng | 427 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 5 |
| eng_for_tam | 10936 | 77 | 0 | 6 | 0 | 24 | 26 | 2 | 0 | 3 | 16 | 0 | 4 |
| ces_for_eng | 5278 | 59 | 0 | 0 | 2 | 39 | 10 | 1 | 0 | 1 | 6 | 0 | 4 |
| hrv_for_eng | 5449 | 55 | 0 | 0 | 0 | 51 | 0 | 0 | 0 | 0 | 4 | 0 | 4 |
| fas_for_eng | 6395 | 40 | 0 | 0 | 0 | 29 | 5 | 0 | 1 | 1 | 4 | 0 | 4 |
| eng_for_pan | 10621 | 19 | 0 | 9 | 0 | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 4 |
| gla_for_eng | 4507 | 129 | 0 | 12 | 0 | 80 | 20 | 2 | 0 | 0 | 15 | 0 | 3 |
| eng_for_kan | 11973 | 60 | 0 | 8 | 0 | 37 | 10 | 0 | 1 | 1 | 3 | 0 | 3 |
| cat_for_spa | 6030 | 26 | 6 | 4 | 0 | 11 | 2 | 0 | 0 | 0 | 3 | 0 | 3 |
| eng_for_ara | 4975 | 17 | 0 | 2 | 0 | 5 | 1 | 2 | 0 | 2 | 5 | 0 | 3 |
| ita_for_jpn | 4870 | 6 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 3 | 0 | 3 |
| ell_for_eng | 7374 | 55 | 0 | 0 | 0 | 51 | 1 | 1 | 0 | 0 | 2 | 0 | 2 |
| srp_for_eng | 4922 | 40 | 0 | 0 | 0 | 30 | 5 | 0 | 0 | 1 | 4 | 0 | 2 |
| est_for_eng | 4839 | 26 | 0 | 0 | 0 | 23 | 1 | 0 | 0 | 0 | 2 | 0 | 2 |
| eng_for_hin | 10599 | 19 | 0 | 3 | 0 | 8 | 3 | 0 | 0 | 2 | 3 | 0 | 2 |
| eng_for_deu | 4937 | 14 | 0 | 1 | 0 | 6 | 1 | 2 | 0 | 1 | 3 | 0 | 2 |
| deu_for_zho | 5204 | 11 | 0 | 0 | 0 | 7 | 2 | 0 | 0 | 0 | 2 | 0 | 2 |
| eng_for_por | 5104 | 10 | 0 | 1 | 0 | 2 | 3 | 0 | 0 | 1 | 3 | 0 | 2 |
| cym_anthem_for_jpn | 147 | 8 | 0 | 0 | 0 | 5 | 0 | 0 | 1 | 0 | 2 | 0 | 2 |
| lit_for_eng | 5188 | 7 | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 3 | 0 | 2 |
| pol_for_eng | 5049 | 36 | 0 | 0 | 0 | 21 | 11 | 1 | 0 | 0 | 3 | 0 | 1 |
| eng_for_fra | 5240 | 25 | 0 | 2 | 0 | 6 | 9 | 1 | 0 | 1 | 6 | 0 | 1 |
| nld_for_eng | 4368 | 24 | 0 | 0 | 1 | 18 | 2 | 0 | 0 | 2 | 1 | 0 | 1 |
| spa_for_zho | 4446 | 20 | 0 | 0 | 2 | 16 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| deu_for_jpn | 4927 | 19 | 0 | 0 | 0 | 16 | 2 | 0 | 0 | 0 | 1 | 0 | 1 |
| eng_for_urd | 9746 | 10 | 0 | 5 | 0 | 1 | 0 | 1 | 0 | 2 | 1 | 0 | 1 |
| ron_for_eng | 5166 | 9 | 0 | 0 | 0 | 6 | 2 | 0 | 0 | 0 | 1 | 0 | 1 |
| swe_for_eng | 5178 | 8 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 1 | 1 | 0 | 1 |
| por_for_eng | 12639 | 124 | 0 | 0 | 0 | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ara_for_eng | 11340 | 44 | 0 | 0 | 0 | 32 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_for_ben | 10632 | 41 | 0 | 27 | 0 | 10 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| por_br_for_eng | 12056 | 36 | 0 | 0 | 3 | 22 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| nep_for_eng | 6824 | 25 | 0 | 0 | 0 | 23 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| eng_for_tel | 10859 | 24 | 0 | 2 | 0 | 9 | 10 | 1 | 0 | 1 | 1 | 0 | 0 |
| eng_for_spa | 4898 | 16 | 0 | 0 | 0 | 5 | 4 | 0 | 0 | 3 | 4 | 0 | 0 |
| eng_for_sin | 10506 | 14 | 0 | 4 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_for_kor | 4680 | 12 | 0 | 3 | 0 | 6 | 1 | 0 | 0 | 0 | 2 | 0 | 0 |
| fin_for_eng | 12321 | 12 | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rus_for_eng | 6071 | 12 | 0 | 0 | 0 | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| bul_for_eng | 4580 | 11 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| fra_for_zho | 4967 | 11 | 0 | 5 | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| ita_for_zho | 4874 | 11 | 0 | 1 | 0 | 8 | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| swa_for_eng | 5846 | 9 | 0 | 0 | 0 | 6 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| hun_for_eng | 4843 | 7 | 0 | 0 | 0 | 6 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| cat_for_eng | 5041 | 6 | 0 | 5 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| hin_for_eng | 5760 | 6 | 0 | 0 | 0 | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_for_ita | 4982 | 4 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 0 |
| fra_ca_for_eng | 11007 | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_for_guj | 11628 | 3 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| heb_for_eng | 4701 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 0 |
| isl_for_eng | 4785 | 3 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| fra_for_jpn | 5481 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pdc_for_eng | 5693 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_template | 4583 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ukr_for_eng | 4755 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| ben_for_eng | 5628 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bre_for_fra | 5016 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dan_for_eng | 4499 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| deu_ch_for_eng | 11551 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| deu_at_for_eng | 11251 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| eng_for_mar | 11574 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| eus_for_spa | 4888 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| glg_for_eng | 4475 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ita_for_cym | 448 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| mlt_for_eng | 5344 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| mar_for_eng | 13482 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nor_for_eng | 4439 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| por_for_jpn | 6041 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| spa_for_jpn | 7267 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| spa_mx_for_eng | 11966 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| tel_for_eng | 12448 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| tur_for_eng | 9046 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| zzz_test_for_eng | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 3b. The prior run's own check, re-run estate-wide (Detector A)

Same tool, same three buckets, all 99 courses. The prior run's ruling stands and I am not
overturning it: **do not sweep bidirectional-strict as a content queue** — its 8,835 estate-wide
entries are dominated by agreement/aspect/register/polysemy the plain-string check cannot see
(~92% noise in the fra/spa pilot), and target-side collisions are explicitly *not enforced*.
The bucket that IS worth a pass is **target-membership failures: 3,577 estate-wide**, and they
concentrate hard in the `eng_for_*` family:

`eng_for_kan` 273 · `eng_for_hin` 230 · `eng_for_guj` 197 · `eng_for_pan` 194 · `jpn_for_eng` 174 ·
`kor_for_eng` 173 · `eng_for_sin` 150 · `eng_for_tel` 126 · `eng_for_ben` 116 · `eng_for_urd` 100 ·
`eng_for_fra` 93 · `ara_lb_for_eng` 89 · `eng_for_mar` 88 · `eng_for_jpn` 84 · `eng_for_deu` 77

**Caveat I will not paper over:** worker **#616** was asked to spot-check 15 of those membership
rows and its report never reached me, so **I have no evidence-level verdict on whether these are
real orphans or elision/normalisation artefacts.** The prior run already proved the elision hole is
real in `normalizeForContainment`, so a chunk of 3,577 is probably mechanical. Treat the number as
a queue length, not a defect count, until someone pulls 40 rows.

Full Detector-A table for all 99 courses is at the end of this document (§7).

---

## 4. The high-confidence defects

404 hits across 41 courses, grouped by (course, untaught word). Every row is a live-DB fact:
the word is absent from every lego, component and seed sentence at or before that seed.


#### hye_for_eng — 96 high-confidence hits, 21 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **օգտակար** | **never** | 35 | 28, 29, 31, 32, 33, 35 | օգտակար է օգնելու մարդիկի սկսել սովորում | it's useful to help people start learning | `hye_for_eng:S0028L02U04` `hye_for_eng:S0028L03B01` `hye_for_eng:S0028L03U01` `hye_for_eng:S0028L04B03` +31 more |
| **ճշմարտությունը** | **never** | 17 | 71, 80 | կարծում եմ որ հեչասպաս է ճշմարտությունը գտել | I think it is interesting to find the truth | `hye_for_eng:S0071L01U03` `hye_for_eng:S0071L01U01` `hye_for_eng:S0071L02U04` `hye_for_eng:S0071L02B01` +13 more |
| **տղան** | **never** | 10 | 197 | իմ տղան աշխատում է որևնժիչ | my son works as a | `hye_for_eng:S0197L02U05` `hye_for_eng:S0197L01B01` `hye_for_eng:S0197L01U01` `hye_for_eng:S0197L01B02` +6 more |
| **երևալ** | **never** | 9 | 300 | նա երևալ է | she seems | `hye_for_eng:S0300L02U02` `hye_for_eng:S0300L02U03` `hye_for_eng:S0300L02B03` `hye_for_eng:S0300L02B01` +5 more |
| **enk** | **never** | 3 | 111 | մենք sirum enk nor baner sovorel | we enjoy learning new things | `hye_for_eng:S0111L01U03` `hye_for_eng:S0111L01U04` `hye_for_eng:S0111L01U02` |
| **ouzum** | **never** | 3 | 51, 111 | ouzum em mardiki het բաներ անեմ | I want to do things with people who speak Armenian | `hye_for_eng:S0051L05U04` `hye_for_eng:S0051L05U01` `hye_for_eng:S0111L01U02` |
| **em** | **never** | 3 | 51 | ouzum em mardiki het բաներ անեմ | I want to do things with people who speak Armenian | `hye_for_eng:S0051L05U04` `hye_for_eng:S0051L05U01` `hye_for_eng:S0051L05U03` |
| **sovorel** | **never** | 2 | 111 | մենք sirum enk nor baner sovorel | we enjoy learning new things | `hye_for_eng:S0111L01U03` `hye_for_eng:S0111L01U04` |
| **het** | **never** | 2 | 51 | ouzum em mardiki het բաներ անեմ | I want to do things with people who speak Armenian | `hye_for_eng:S0051L05U04` `hye_for_eng:S0051L05U02` |
| **sirum** | **never** | 1 | 111 | մենք sirum enk nor baner sovorel | we enjoy learning new things | `hye_for_eng:S0111L01U03` |
| **nor** | **never** | 1 | 111 | մենք sirum enk nor baner sovorel | we enjoy learning new things | `hye_for_eng:S0111L01U03` |
| **baner** | **never** | 1 | 111 | մենք sirum enk nor baner sovorel | we enjoy learning new things | `hye_for_eng:S0111L01U03` |
| **miain** | **never** | 1 | 111 | մենք miain porjoum enk sovorel | we're trying to learn together | `hye_for_eng:S0111L01U04` |
| **porjoum** | **never** | 1 | 111 | մենք miain porjoum enk sovorel | we're trying to learn together | `hye_for_eng:S0111L01U04` |
| **mardiki** | **never** | 1 | 51 | ouzum em mardiki het բաներ անեմ | I want to do things with people who speak Armenian | `hye_for_eng:S0051L05U04` |
| **inch** | **never** | 1 | 51 | inch vor անեմ erb hoghvats em | what should I do when I am tired | `hye_for_eng:S0051L05U03` |
| **vor** | **never** | 1 | 51 | inch vor անեմ erb hoghvats em | what should I do when I am tired | `hye_for_eng:S0051L05U03` |
| **erb** | **never** | 1 | 51 | inch vor անեմ erb hoghvats em | what should I do when I am tired | `hye_for_eng:S0051L05U03` |
| **hoghvats** | **never** | 1 | 51 | inch vor անեմ erb hoghvats em | what should I do when I am tired | `hye_for_eng:S0051L05U03` |
| **hayeren** | **never** | 1 | 111 | մենք ouzum enk hayeren khosel | we want to speak Armenian | `hye_for_eng:S0111L01U02` |
| **khosel** | **never** | 1 | 111 | մենք ouzum enk hayeren khosel | we want to speak Armenian | `hye_for_eng:S0111L01U02` |

#### gle_for_eng — 62 high-confidence hits, 17 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **roimh** | seed 237 | 19 | 65, 66, 93, 114, 198, 200 | dúirt sé liom go raibh sé ag iarraidh a chinntiú go raibh gach rud de dhíth againn roimh ag tosú | he told me he wanted to make sure that we had everything we needed before we began | `gle_for_eng:S0200L03U10` `gle_for_eng:S0065L05U10` `gle_for_eng:S0200L02U13` `gle_for_eng:S0198L03U13` +15 more |
| **léi** | seed 232 | 7 | 141, 153, 155, 181 | dúirt mé léi gan fadhb, seo an áit ar theastaigh ó mo chara bualadh linn | I told her no problem, this is the place where my friend wanted to meet us | `gle_for_eng:S0141L01U12` `gle_for_eng:S0141L01U04` `gle_for_eng:S0181L02U15` `gle_for_eng:S0153L03U09` +2 more |
| **aici** | seed 233 | 6 | 89, 113, 141, 198, 200 | dúirt sí gan fadhb, tá a fhios aici faoin áit ar theastaigh ó mo chara teacht | she said no problem, she knows the place where my friend wanted to come | `gle_for_eng:S0141L01U13` `gle_for_eng:S0200L04U14` `gle_for_eng:S0198L02U11` `gle_for_eng:S0113L03U06` +2 more |
| **dtí** | seed 187 | 5 | 89, 103 | Níl muid ag bualadh le chéile go dtí a sé a chlog tráthnóna | we are not meeting each other until six o'clock this evening | `gle_for_eng:S0103L01U07` `gle_for_eng:S0089L04U03` `gle_for_eng:S0089L04U14` `gle_for_eng:S0089L04U13` |
| **siad** | seed 200 | 5 | 76, 85 | Ní aithním na daoine sin, ach dúirt sí liom go bhfuil siad ag labhairt Gaeilge go han-mhaith | I do not know those people, but she told me they speak Irish very well | `gle_for_eng:S0085L01U13` `gle_for_eng:S0076L03U12` `gle_for_eng:S0076L04U13` `gle_for_eng:S0076L05U13` |
| **sin** | seed 56 | 3 | 13, 14 | labhraíonn tú Gaeilge le duine éigin eile inniu, agus ba mhaith liom sin | you speak Irish with someone else today, and I'd like that too | `gle_for_eng:S0013L02U07` `gle_for_eng:S0013L02U05` `gle_for_eng:S0014L01U01` |
| **faide** | seed 275 | 3 | 155 | Ní miste liom fanacht beagán níos faide má tá rudaí fós le caint faoi againn | I don't mind staying a little longer if we still have things to talk about | `gle_for_eng:S0155L01U14` `gle_for_eng:S0155L01U03` `gle_for_eng:S0155L02U12` |
| **mhéad** | seed 287 | 3 | 89 | Níl mé cinnte cé mhéad ama atá agam sula gcaithfidh mé imeacht, ach tá mé ag iarraidh labhairt a chleachtadh chomh luath agus is féidir liom | I'm not sure how much time I have left before I have to leave, but I want to keep practising for as long as possible | `gle_for_eng:S0089L05U11` `gle_for_eng:S0089L04U12` `gle_for_eng:S0089L04U10` |
| **nó** | seed 44 | 2 | 12 | inniu nó amárach | today or tomorrow | `gle_for_eng:S0012L03B02` `gle_for_eng:S0012L03U10` |
| **dtosaíonn** | seed 281 | 2 | 124, 200 | deir siad gur smaoineamh maith é a fheiceáil cad atá le déanamh sula dtosaíonn tú | they say that it is a good idea to check what needs to be done before you start | `gle_for_eng:S0200L01U08` `gle_for_eng:S0124L02U06` |
| **uait** | seed 142 | 1 | 83 | aontaím leat agus tá mé sásta é sin a chloisteáil uait | I agree with you and I am happy to hear that from you | `gle_for_eng:S0083L01U02` |
| **phlé** | seed 210 | 1 | 159 | ní féidir liom cuimhneamh cad atá mé ag iarraidh a rá faoi láthair agus ceapaim gur smaoineamh maith é sin a phlé | I cannot remember what I am trying to say right now and I think that is very frustrating for me | `gle_for_eng:S0159L02U02` |
| **fhios** | seed 45 | 1 | 14 | ba mhaith liom a fhios agam an labhraíonn tú Gaeilge an lá ar fad | I'd like to know if you speak Irish all day | `gle_for_eng:S0014L02U06` |
| **linn** | seed 138 | 1 | 103 | caithfidh mé smaoineamh ar rud éigin eile is féidir linn a dhéanamh le seo a dhéanamh níos éasca | there must be something else we can do to make this easier for everyone | `gle_for_eng:S0103L05U13` |
| **chinn** | seed 126 | 1 | 79 | cathain a thosaigh tú ag iarraidh é seo a fhoghlaim agus cén fáth ar chinn tú ar sin | when did you start wanting to learn this and why did you decide to | `gle_for_eng:S0079L01U15` |
| **áit** | seed 138 | 1 | 69 | ní raibh sí ag léamh aon rud suimiúil an tráthnóna seo agus thosaigh sí ag caint níos mó ina áit | she was not reading anything interesting this afternoon and she decided to start practising speaking instead | `gle_for_eng:S0069L05U06` |
| **teanga** | seed 101 | 1 | 79 | cathain a bhfuil tú ag iarraidh tosú ag caint níos mó sa teanga | when do you want to start talking more in the language | `gle_for_eng:S0079L01U03` |

#### eng_for_jpn — 34 high-confidence hits, 26 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **nice** | seed 219 | 3 | 133 | it's nice to get to know someone new | 新しい人を知るのは素敵です | `eng_for_jpn:S0133L02U01` `eng_for_jpn:S0133L01U01` `eng_for_jpn:S0133L01U02` |
| **first** | seed 494 | 2 | 147, 245 | I want to speak for a short time first | まず少しの時間話したいです | `eng_for_jpn:S0245L01U03` `eng_for_jpn:S0147L02U02` |
| **school** | seed 323 | 2 | 197 | he's a teacher at a school near here | 彼は近くの学校の教師です | `eng_for_jpn:S0197L03U03` `eng_for_jpn:S0197L02U01` |
| **sister** | seed 233 | 2 | 147, 197 | my sister is a teacher | 私の姉は教師です | `eng_for_jpn:S0197L03U05` `eng_for_jpn:S0147L01U05` |
| **told** | seed 211 | 2 | 108, 149 | I told her I hope you'll finish soon | すぐ終わるといいですねと彼女に言いました | `eng_for_jpn:S0149L02U01` `eng_for_jpn:S0108L02U02` |
| **many** | seed 103 | 2 | 51, 69 | many things | いろんな こと | `eng_for_jpn:S0051L04B05` `eng_for_jpn:S0069L02U14` |
| **hurry** | **never** | 2 | 279, 280 | I have only a little time so I have to hurry | 少しだけ時間があるので、急がなければなりません | `eng_for_jpn:S0280L03U05` `eng_for_jpn:S0279L01U01` |
| **suggest** | **never** | 1 | 243 | can you suggest a thing to eat? | 何か食べるものを提案してもらえますか？ | `eng_for_jpn:S0243L02U04` |
| **order** | **never** | 1 | 200 | in order to make sure | 確実にするために | `eng_for_jpn:S0200L02B02` |
| **always** | **never** | 1 | 55 | waking up when I didn't sleep is always hard | 眠れなかったとき起きるのはいつも大変だ | `eng_for_jpn:S0055L02U10` |
| **said** | seed 78 | 1 | 58 | it's interesting when I start to understand what you said | あなたが言ったことを理解し始めると面白いです | `eng_for_jpn:S0058L02U05` |
| **spoke** | **never** | 1 | 135 | I didn't think you spoke so well | あなたがそんなに上手に話すとは思いませんでした | `eng_for_jpn:S0135L01U05` |
| **doctor** | seed 181 | 1 | 11 | I'd like to be a doctor | 医者になりたいです | `eng_for_jpn:S0011L03B02` |
| **drink** | seed 625 | 1 | 217 | I want to drink a glass or two | 一杯か二杯飲みたいです | `eng_for_jpn:S0217L02B03` |
| **over** | seed 258 | 1 | 226 | do you know the man over there? | あちらの男性を知っていますか？ | `eng_for_jpn:S0226L01U02` |
| **city** | seed 302 | 1 | 197 | he works in a pub in the city | 彼は市内のパブで働いています | `eng_for_jpn:S0197L02U04` |
| **believe** | seed 125 | 1 | 76 | I can't believe how much I've learnt in such a short time | こんなに短い時間でどれだけ学んだかが信じられません | `eng_for_jpn:S0076L02U03` |
| **teacher** | seed 197 | 1 | 11 | I'd like to be a teacher | 私は教師になりたいです | `eng_for_jpn:S0011L03B01` |
| **glad** | **never** | 1 | 117 | I'm glad that I'm definitely doing better than I was last time we talked to each other | 前回お互いに話した時より確実にうまくやっていると嬉しいです | `eng_for_jpn:S0117L01U04` |
| **several** | seed 369 | 1 | 62 | it's difficult to talk about several things at the same time | 同時にいくつかのことを話すのが難しいです | `eng_for_jpn:S0062L01U04` |
| **drank** | **never** | 1 | 217 | she drank a glass or two and felt better | 彼女は一杯か二杯飲んで気分が良くなりました | `eng_for_jpn:S0217L02U04` |
| **goes** | seed 560 | 1 | 121 | she goes to work by car | 彼女は車で仕事に行きます | `eng_for_jpn:S0121L01U03` |
| **terrible** | **never** | 1 | 248 | that was terrible and I want my money back | それはひどかったのでお金を返してほしいです | `eng_for_jpn:S0248L02U04` |
| **never** | seed 309 | 1 | 121 | that's unusual, I've never seen that before | それは珍しいですね、今まで見たことがありません | `eng_for_jpn:S0121L03U02` |
| **replied** | **never** | 1 | 268 | yes she sent me two emails last week but I haven't replied yet | はい、先週彼女はメールを二通送ってくれましたが、まだ返信していません | `eng_for_jpn:S0268L01U04` |
| **confident** | **never** | 1 | 58 | you feel more confident when you understand enough words | 十分な言葉がわかる時に自信がつきます | `eng_for_jpn:S0058L01U03` |

#### eus_for_eng — 31 high-confidence hits, 12 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **ditut** | seed 85 | 8 | 6 | hitzak ikasi nahi ditut | I want to learn words | `eus_for_eng:S0006L01B02` `eus_for_eng:S0006L01U03` `eus_for_eng:S0006L01U02` `eus_for_eng:S0006L01U04` +4 more |
| **arte** | seed 187 | 5 | 33 | noiz arte elkartu nahi duzu? | how long do you want to meet? | `eus_for_eng:S0033L01B03` `eus_for_eng:S0033L01U01` `eus_for_eng:S0033L01U03` `eus_for_eng:S0033L01U05` +1 more |
| **zaude** | seed 63 | 5 | 40 | gaur goizean nekatuta zaude? | are you tired this morning? | `eus_for_eng:S0040L01U05` `eus_for_eng:S0040L01B03` `eus_for_eng:S0040L01B02` `eus_for_eng:S0040L01U01` +1 more |
| **dizut** | seed 119 | 4 | 32, 54 | zerbait erakutsi nahi dizut | I want to show you something | `eus_for_eng:S0032L01U01` `eus_for_eng:S0032L01U02` `eus_for_eng:S0054L01U02` `eus_for_eng:S0032L01U05` |
| **egongo** | seed 80 | 2 | 26 | laster prest egongo naiz | I'll be ready soon | `eus_for_eng:S0026L01U02` `eus_for_eng:S0026L01U03` |
| **hor** | **never** | 1 | 26 | ia hor nagoela sentitzea gustatzen zait | I like feeling that I am nearly there | `eus_for_eng:S0026L04U03` |
| **idaztea** | **never** | 1 | 52 | gauzak idaztea gustatzen zait | I enjoy writing things | `eus_for_eng:S0052L01U04` |
| **uztea** | seed 240 | 1 | 27 | hitz egiteari uztea ez zait gustatzen | I don't like stopping talking | `eus_for_eng:S0027L01U03` |
| **ona** | seed 47 | 1 | 27 | denbora gehiegi hartzea ez da ona | taking too much time is not good | `eus_for_eng:S0027L05U04` |
| **nonbait** | seed 182 | 1 | 53 | nonbait sartuko dut | I'll put it somewhere | `eus_for_eng:S0053L01U04` |
| **zion** | seed 357 | 1 | 52 | lagunari gutun bat idatzi zion | he wrote a letter to his friend | `eus_for_eng:S0052L03U04` |
| **moduz** | **never** | 1 | 40 | zer moduz? | how are you? | `eus_for_eng:S0040L01U02` |

#### ara_eg_for_eng — 27 high-confidence hits, 9 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **لازم** | seed 109 | 18 | 26, 27, 30, 32, 34, 35 … | لازم توريني قبل ما لازم أمشي | you need to show me before I have to go | `ara_eg_for_eng:S0032L01U04` `ara_eg_for_eng:S0035L01U03` `ara_eg_for_eng:S0032L01B03` `ara_eg_for_eng:S0030L02U04` +13 more |
| **الواحد** | **never** | 2 | 58 | إن الواحد يحاول ممتع | trying is fun | `ara_eg_for_eng:S0058L01U05` `ara_eg_for_eng:S0058L01U03` |
| **تكفي** | **never** | 1 | 58 | شوية تكفي | a little is enough | `ara_eg_for_eng:S0058L04U03` |
| **حقيقيه** | **never** | 1 | 130 | مفاجأة حقيقية | real surprise | `ara_eg_for_eng:S0130L01U03` |
| **الاختبار** | **never** | 1 | 65 | الاختبار مفيد | testing is useful | `ara_eg_for_eng:S0065L03U05` |
| **بيبقي** | **never** | 1 | 58 | لما أتكلم عربي بيبقى ممتع | when I speak Arabic it's fun | `ara_eg_for_eng:S0058L01U04` |
| **بعمله** | **never** | 1 | 46 | أنا مش بقلق من اللي بعمله | I'm not worried about what I do | `ara_eg_for_eng:S0046L02U03` |
| **خالص** | seed 191 | 1 | 48 | أنا مش مهتم فيها خالص | I'm not interested in it at all | `ara_eg_for_eng:S0048L01U02` |
| **كام** | seed 274 | 1 | 9 | أنا عايز أقول كام كلمة بالعربي | I want to say a little in Arabic | `ara_eg_for_eng:S0009L02U05` |

#### cym_n_for_eng — 22 high-confidence hits, 9 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **gwaith** | **never** | 9 | 223, 225, 228, 230, 239, 243 | cyn i chi fynd i’r gwaith | before you go to work | `cym_n_for_eng:S0243L02B02` `cym_n_for_eng:S0225L02U01` `cym_n_for_eng:S0223L03B07` `cym_n_for_eng:S0228L01B02` +5 more |
| **gwrando** | **never** | 6 | 305 | mi wnaeth addewid y byddi di'n gwrando ar bob gair | he made a promise that you will listen to every word | `cym_n_for_eng:S0305L01B06` `cym_n_for_eng:S0305L02B06` `cym_n_for_eng:S0305L01B07` `cym_n_for_eng:S0305L02B03` +2 more |
| **gaethoch** | **never** | 1 | 147 | gaethoch chi amser da eich hunain? | did you have a good time yourself? | `cym_n_for_eng:S0147L02B03` |
| **tseina** | **never** | 1 | 111 | dw i’n dod o Tseina | I’m from China | `cym_n_for_eng:S0111L03B05` |
| **peidiwch** | **never** | 1 | 167 | peidiwch ag aros amdanaf fi os dach chi’n barod rŵan | don’t wait for me if you’re ready now | `cym_n_for_eng:S0167L01U04` |
| **waith** | **never** | 1 | 218 | bydd yn ofalus pan ti’n cerdded i dy waith | be careful when you walk to your work | `cym_n_for_eng:S0218L03B04` |
| **ariannin** | **never** | 1 | 128 | dw i’n dod o’r Ariannin | I’m from Argentina | `cym_n_for_eng:S0128L02B04` |
| **ngwaith** | **never** | 1 | 221 | ti’n gwybod bo’ fi isio cerdded i fy ngwaith | you know that I want to walk to my work | `cym_n_for_eng:S0221L02U01` |
| **naddo** | **never** | 1 | 115 | naddo, wnes i wylio’r pêl-droed am amser byr | no, I watched the football for a short time | `cym_n_for_eng:S0115L02U14` |

#### cym_s_for_eng — 18 high-confidence hits, 8 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **gwaith** | **never** | 10 | 230, 234, 235, 238, 240, 242 … | ti’n gwybod bo’ fi’n moyn cerdded i’r gwaith | you know that I want to walk to work | `cym_s_for_eng:S0234L01U04` `cym_s_for_eng:S0240L01B01` `cym_s_for_eng:S0238L01B07` `cym_s_for_eng:S0238L01B06` +6 more |
| **ŷch** | seed 173 | 2 | 150 | ŷch chi’n barod eich hunain? | are you ready yourselves? | `cym_s_for_eng:S0150L02U04` `cym_s_for_eng:S0150L02B01` |
| **amdanoch** | **never** | 1 | 172 | mae fy nhad yn mynd i aros amdanoch chi | my father is going to wait for you | `cym_s_for_eng:S0172L01B06` |
| **peidiwch** | **never** | 1 | 173 | peidiwch ag aros amdana i os ŷch chi’n barod nawr | don’t wait for me if you’re ready now | `cym_s_for_eng:S0173L01U05` |
| **amdana** | **never** | 1 | 173 | peidiwch ag aros amdana i os ŷch chi’n barod nawr | don’t wait for me if you’re ready now | `cym_s_for_eng:S0173L01U05` |
| **dseina** | **never** | 1 | 108 | dw i’n dod o dseina | I’m from china | `cym_s_for_eng:S0108L03B04` |
| **fuan** | **never** | 1 | 274 | allet ti ddweud wrtha i sut i ffeindio mas yn fuan? | can you tell me how to find out soon? | `cym_s_for_eng:S0274L02B03` |
| **gaethoch** | **never** | 1 | 150 | gaethoch chi amser da eich hunain? | did you have a good time yourselves? | `cym_s_for_eng:S0150L02B02` |

#### ara_lb_for_eng — 12 high-confidence hits, 10 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **بلشت** | **never** | 2 | 77 | كيف بلشت | how I began | `ara_lb_for_eng:S0077L02B03` `ara_lb_for_eng:S0077L02U04` |
| **ابكر** | seed 144 | 2 | 30, 31 | كنت بدك تبدأ تحكي أبكر | you wanted to start talking sooner | `ara_lb_for_eng:S0031L01U02` `ara_lb_for_eng:S0030L01U02` |
| **بالضبط** | seed 153 | 1 | 79 | إيمتى بالضبط | when exactly | `ara_lb_for_eng:S0079L01B02` |
| **مرحب** | **never** | 1 | 71 | أي حدا مرحب فيه | any person is welcome | `ara_lb_for_eng:S0071L01U04` |
| **كفايه** | seed 379 | 1 | 60 | ما نمت كفاية لسا | I haven't slept enough yet | `ara_lb_for_eng:S0060L03U03` |
| **بالانجليزي** | **never** | 1 | 44 | أقدر أحكي عربي أو أشرح بالإنجليزي | I can speak Arabic or explain in English | `ara_lb_for_eng:S0044L01U04` |
| **بيساعدوا** | **never** | 1 | 47 | بعتقد إن الأغلاط بيساعدوا | I believe that mistakes help | `ara_lb_for_eng:S0047L02U01` |
| **يعملها** | **never** | 1 | 106 | يعملها بجد | he does it seriously | `ara_lb_for_eng:S0106L01U03` |
| **سمحت** | seed 630 | 1 | 61 | لو سمحت تعيد شو قلت | please repeat what you said | `ara_lb_for_eng:S0061L04U03` |
| **حطت** | **never** | 1 | 53 | حطت رسالتو | she put his letter | `ara_lb_for_eng:S0053L03B03` |

#### lav_for_eng — 9 high-confidence hits, 9 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **ieradās** | seed 454 | 1 | 139 | viņa ieradās agri šodien | she arrived early today | `lav_for_eng:S0139L01U06` |
| **pazīsti** | seed 284 | 1 | 85 | vai tu pazīsti tos cilvēkus? | do you know those people? | `lav_for_eng:S0085L02U06` |
| **funkcijām** | **never** | 1 | 126 | viņa mācās par smadzeņu funkcijām | she is learning about the brain's functions | `lav_for_eng:S0126L03U07` |
| **krēsls** | **never** | 1 | 264 | šis ir vecs krēsls | this is an old chair | `lav_for_eng:S0264L01U04` |
| **zināt** | seed 45 | 1 | 12 | es gribu zināt kas notiks | I want to know what's going to happen | `lav_for_eng:S0012L04U06` |
| **saka** | seed 200 | 1 | 109 | viņa saka ka jāstrādā smagi | she says you must work hard | `lav_for_eng:S0109L03U07` |
| **eju** | **never** | 1 | 151 | es eju uz restorānu | I am going towards the restaurant | `lav_for_eng:S0151L01U05` |
| **ceļus** | **never** | 1 | 126 | mācīšanās maina smadzeņu ceļus | learning changes the brain's pathways | `lav_for_eng:S0126L03U06` |
| **struktūru** | **never** | 1 | 126 | šis darbs maina smadzeņu struktūru | this work changes the brain's structure | `lav_for_eng:S0126L03U05` |

#### deu_for_eng — 8 high-confidence hits, 6 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **durften** | **never** | 3 | 399, 424 | ich wusste, dass wir keine Zeit verschwenden durften | I knew we had to not waste time | `deu_for_eng:S0424L01U04` `deu_for_eng:S0424L01U02` `deu_for_eng:S0399L02U04` |
| **dürfen** | **never** | 1 | 399 | ich denke, dass wir die Hoffnung nicht verlieren dürfen | I think we need to not lose hope | `deu_for_eng:S0399L02U02` |
| **übst** | **never** | 1 | 111 | Wenn du mehr übst, verändert es wie du lernst | When you practise more, it changes how you learn | `deu_for_eng:S0111L02U14` |
| **tun** | seed 479 | 1 | 57 | Was soll ich tun um gut Deutsch zu lernen | What shall I do to learn German well | `deu_for_eng:S0057L01U07` |
| **triffst** | **never** | 1 | 238 | Er wollte, dass du ihn im Büro triffst, aber du hast es vergessen | He wanted you to meet him at the office this morning but you forgot and now he is a bit upset about it | `deu_for_eng:S0238L01U10` |
| **hat** | seed 84 | 1 | 55 | Er hat gestern gut geschlafen | He slept well yesterday | `deu_for_eng:S0055L02U09` |

#### afr_for_eng — 7 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **dit** | seed 28 | 4 | 4 | ek wil nou leer om dit te sê | I want to learn to say it now | `afr_for_eng:S0004L01U04` `afr_for_eng:S0004L01U03` `afr_for_eng:S0004L01U05` `afr_for_eng:S0004L01U02` |
| **myself** | **never** | 3 | 65 | ek gaan volgende week myself toets | i'm going to test myself next week | `afr_for_eng:S0065L03U03` `afr_for_eng:S0065L03B02` `afr_for_eng:S0065L03U04` |

#### eng_for_zho — 6 high-confidence hits, 5 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **myself** | seed 518 | 2 | 241, 246 | I wanted her to help you but she was too busy so I'm going to do it myself | 我想让她帮你，但是她太忙了，所以我打算自己来做 | `eng_for_zho:S0246L01U05` `eng_for_zho:S0241L01U05` |
| **prefer** | **never** | 1 | 288 | Most people I know like watching television but I prefer to read | 我认识的大多数人都喜欢看电视，但我更喜欢读书 | `eng_for_zho:S0288L01U05` |
| **home** | seed 95 | 1 | 11 | I want to go home after I finish | 我想说完以后回家 | `eng_for_zho:S0011L04U01` |
| **talk** | seed 88 | 1 | 15 | Do you want to talk with me now? | 你想现在和我说话吗 | `eng_for_zho:S0015L01U07` |
| **although** | seed 178 | 1 | 148 | He wasn't very patient although he was very kind | 他不太有耐心，虽然他很友好 | `eng_for_zho:S0148L01U04` |

#### ita_for_eng — 6 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **essere** | seed 137 | 6 | 76, 77, 83 | penso di essere molto contento di quanto ho già imparato | I think that I'm very happy with how much I've learnt | `ita_for_eng:S0076L02U08` `ita_for_eng:S0077L01U08` `ita_for_eng:S0076L01U03` `ita_for_eng:S0077L01U03` +2 more |

#### sbx_for_eng — 5 high-confidence hits, 5 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **asdf** | **never** | 1 | 1 | asdf qwerty zzz | I want | `sbx_for_eng:S0001L01B01` |
| **qwerty** | **never** | 1 | 1 | asdf qwerty zzz | I want | `sbx_for_eng:S0001L01B01` |
| **zzz** | **never** | 1 | 1 | asdf qwerty zzz | I want | `sbx_for_eng:S0001L01B01` |
| **to** | **never** | 1 | 1 | to speak bremañ | speak now | `sbx_for_eng:S0001L05B01` |
| **speak** | **never** | 1 | 1 | to speak bremañ | speak now | `sbx_for_eng:S0001L05B01` |

#### ces_for_eng — 4 high-confidence hits, 4 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **češtinu** | **never** | 1 | 35 | chci cvičit češtinu dnes odpoledne | I want to practise Czech this afternoon | `ces_for_eng:S0035L01U06` |
| **vůbec** | seed 191 | 1 | 112 | nečekal jsem to vůbec | I wasn't expecting it at all | `ces_for_eng:S0112L02U05` |
| **tento** | seed 554 | 1 | 89 | jsem toho hodně stihl tento týden | I've done a lot this week | `ces_for_eng:S0089L01U06` |
| **doufám** | seed 149 | 1 | 102 | doufám, že to tak není | I hope it's not like that | `ces_for_eng:S0102L02U05` |

#### eng_for_pan — 4 high-confidence hits, 3 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **person** | seed 388 | 2 | 133 | do you get to know that person? | ਕੀ ਤੁਸੀਂ ਉਸ ਵਿਅਕਤੀ ਨੂੰ ਜਾਣ ਲੈਂਦੇ ਹੋ? | `eng_for_pan:S0133L02U03` `eng_for_pan:S0133L02U01` |
| **first** | seed 494 | 1 | 169 | what do you want me to do first? | ਤੁਸੀਂ ਮੈਨੂੰ ਕੀ ਕਰਨ ਲਈ ਕਹਿੰਦੇ ਹੋ ਪਹਿਲਾਂ? | `eng_for_pan:S0169L01B03` |
| **does** | **never** | 1 | 33 | how long does he want to learn English? | ਕਿੰਨੇ ਸਮੇਂ ਤੋਂ ਉਹ ਅੰਗਰੇਜ਼ੀ ਸਿੱਖਣਾ ਚਾਹੁੰਦਾ ਹੈ? | `eng_for_pan:S0033L01U06` |

#### eng_for_tam — 4 high-confidence hits, 4 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **recently** | **never** | 1 | 268 | she recently sent me emails last week | அவள் கடந்த வாரம் சில மின்னஞ்சல்கள் அனுப்பினாள் | `eng_for_tam:S0268L02U05` |
| **friends** | seed 51 | 1 | 11 | I want to be able to meet my friends | நான் என்னுடைய நண்பர்களை சந்திக்க முடியும் | `eng_for_tam:S0011L03U05` |
| **nobody** | seed 202 | 1 | 108 | nobody wanted to wake in the middle of the night | யாரும் இரவில் விழிக்க விரும்பவில்லை | `eng_for_tam:S0108L02U04` |
| **also** | **never** | 1 | 149 | I also hope you'll finish soon | நீங்களும் விரைவில் முடிப்பீர்கள் என்று நம்புகிறேன் | `eng_for_tam:S0149L04U06` |

#### fas_for_eng — 4 high-confidence hits, 4 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **اومدی** | **never** | 1 | 130 | تعجب کردم که اومدی | I was surprised that you came | `fas_for_eng:S0130L01U06` |
| **جدید** | seed 111 | 1 | 68 | دنبال یه چیز جدید می‌گردم | I'm looking for something new | `fas_for_eng:S0068L01U09` |
| **هیچی** | **never** | 1 | 69 | از سگ کوچیکه هیچی نمی‌خواد | he doesn't want anything from the small dog | `fas_for_eng:S0069L05U07` |
| **فراموش** | seed 205 | 1 | 20 | نمی‌خوام اسمش رو فراموش کنم | I don't want to forget his name | `fas_for_eng:S0020L02U03` |

#### hrv_for_eng — 4 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **turba** | **never** | 4 | 198 | moja turba | my bag | `hrv_for_eng:S0198L01B02` `hrv_for_eng:S0198L01U03` `hrv_for_eng:S0198L01B01` `hrv_for_eng:S0198L01B03` |

#### cat_for_spa — 3 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **crec** | seed 47 | 3 | 25 | no crec que hagi d'explicar el que vull dir | no creo que tenga que explicar lo que quiero decir | `cat_for_spa:S0025L02U04` `cat_for_spa:S0025L02U01` `cat_for_spa:S0025L02U05` |

#### eng_for_ara — 3 high-confidence hits, 3 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **important** | seed 65 | 1 | 44 | it's important to improve as soon as you can | من المهم أن تتحسن في أقرب وقت ممكن | `eng_for_ara:S0044L03U06` |
| **tired** | seed 39 | 1 | 19 | I want to learn quickly but I'm tired today | أريد أن أتعلم بسرعة لكنني متعب اليوم | `eng_for_ara:S0019L01U07` |
| **goes** | seed 560 | 1 | 242 | I wanted to give her a little more time before she goes | أردت أن أعطيها وقتاً أكثر قليلاً قبل أن تذهب | `eng_for_ara:S0242L01U06` |

#### eng_for_kan — 3 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **told** | seed 211 | 3 | 76, 83, 84 | she already told me | ಅವಳು ನನಗೆ ಈಗಾಗಲೇ ಹೇಳಿದಳು | `eng_for_kan:S0076L01U02` `eng_for_kan:S0083L01U05` `eng_for_kan:S0084L01U03` |

#### gla_for_eng — 3 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **càil** | seed 141 | 2 | 48, 52 | chan eil dragh agam air a h-uile càil an-dràsta | I don't care about that right now | `gla_for_eng:S0048L01U05` `gla_for_eng:S0052L03U05` |
| **chionn** | seed 47 | 1 | 23 | a chionn tha ise ag iarraidh a thòiseachadh ionnsachadh | because she wants to start learning | `gla_for_eng:S0023L01U03` |

#### ita_for_jpn — 3 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **abbia** | seed 325 | 3 | 47 | non penso che abbia bisogno di sapere tutto | すべてを分かる必要はないと思います。 | `ita_for_jpn:S0047L01U02` `ita_for_jpn:S0047L01U01` `ita_for_jpn:S0047L01B02` |

#### cym_anthem_for_jpn — 2 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **bardd** | **never** | 2 | 1, 5 | bardd wyf | 私は詩人だ | `cym_anthem_for_jpn:S0005L01B03` `cym_anthem_for_jpn:S0001L02B01` |

#### deu_for_zho — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **öfter** | **never** | 1 | 277 | ich werde dich von nächster Woche an öfter treffen | 从下周起我会更常见你 | `deu_for_zho:S0277L01U02` |
| **während** | seed 512 | 1 | 281 | bitte warte während ich austrinke | 你等我喝完好吗 | `deu_for_zho:S0281L02U06` |

#### ell_for_eng — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **λες** | seed 533 | 1 | 20 | θέλεις να μάθεις πώς να λες κάτι στα ελληνικά; | do you want to learn how to say something in Greek? | `el_for_eng:S0020L02U06` |
| **λέει** | seed 480 | 1 | 18 | θέλουμε να μάθει πώς να λέει κάτι στα ελληνικά | we want her to find out how to say something in Greek | `el_for_eng:S0018L01U07` |

#### eng_for_deu — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **fun** | seed 64 | 1 | 38 | I've been learning for about a week, and it is fun | ich lerne seit ungefähr einer Woche, und es macht Spaß | `eng_for_deu:S0038L03U06` |
| **sorry** | seed 139 | 1 | 43 | I'm sorry, I wasn't thinking about it | es tut mir leid, ich habe nicht darüber nachgedacht | `eng_for_deu:S0043L01U06` |

#### eng_for_hin — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **myself** | seed 518 | 1 | 99 | I should ask myself now | मुझे खुद से पूछना चाहिए अभी | `eng_for_hin:S0099L02U03` |
| **improving** | **never** | 1 | 33 | how long have you been improving? | कितने समय से सुधार कर रहे हैं? | `eng_for_hin:S0033L01U05` |

#### eng_for_por — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **tired** | seed 39 | 1 | 19 | I'd like to learn English but I'm a little tired today | gostaria de aprender inglês mas estou um pouco cansada hoje | `eng_for_por:S0019L01U06` |
| **afraid** | seed 183 | 1 | 86 | I'm afraid not | infelizmente não | `eng_for_por:S0086L01B02` |

#### est_for_eng — 2 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **ütlema** | **never** | 2 | 5 | ma hakkan ütlema midagi eesti keeles | i'm going to say something in Estonian | `est_for_eng:S0005L01U04` `est_for_eng:S0005L01U03` |

#### lit_for_eng — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **kol** | seed 187 | 1 | 26 | nenoriu nustoti kol jaučiu lyg būčiau beveik pasiruošęs | I don't want to stop until I feel as if I'm nearly ready | `lit_for_eng:S0026L04U05` |
| **jaučiu** | seed 114 | 1 | 26 | nenoriu nustoti kol jaučiu lyg būčiau beveik pasiruošęs | I don't want to stop until I feel as if I'm nearly ready | `lit_for_eng:S0026L04U05` |

#### srp_for_eng — 2 high-confidence hits, 2 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **otišao** | seed 362 | 1 | 221 | gledao sam nešto i onda sam otišao da spavam | i watched something and then i went to sleep | `srp_for_eng:S0221L03U07` |
| **koga** | seed 128 | 1 | 105 | nije znao koga da pita | he did not know who to ask | `srp_for_eng:S0105L01U06` |

#### deu_for_jpn — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **noch** | seed 60 | 1 | 7 | ich möchte noch hart lernen | もっと頑張って学びたい | `deu_for_jpn:S0007L02U06` |

#### eng_for_fra — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **middle** | seed 108 | 1 | 55 | I don't enjoy waking up in the middle of the night | je n'aime pas me réveiller au milieu de la nuit | `eng_for_fra:S0055L01U07` |

#### eng_for_urd — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **since** | seed 146 | 1 | 38 | I've been learning since last month | میں پچھلے مہینے سے سیکھتا رہا ہوں | `eng_for_urd:S0038L01U06` |

#### nld_for_eng — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **jou** | seed 230 | 1 | 29 | dat is beter voor jou | that is much better for you | `nld_for_eng:S0029L02U04` |

#### pol_for_eng — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **żadnych** | **never** | 1 | 279 | nie zostało żadnych pieniędzy | there wasn't any money left | `pol_for_eng:S0279L01U04` |

#### ron_for_eng — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **persoana** | seed 388 | 1 | 87 | persoana pe care vreau să o ajut | the person I want to help | `ron_for_eng:S0087L01U01` |

#### spa_for_zho — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **mucho** | seed 88 | 1 | 38 | llevo mucho tiempo aprendiendo español con alguien más | 我一直在和别人一起学西班牙语 | `spa_for_zho:S0038L03U04` |

#### swe_for_eng — 1 high-confidence hits, 1 distinct untaught words

| untaught word | first taught | hits | seeds | example phrase | example known | row ids |
|---|--:|--:|---|---|---|---|
| **av** | seed 110 | 1 | 85 | många av de där människorna är unga | many of the people here are young | `swe_for_eng:S0085L03U04` |


---

## 4b. Language-competent triage — what survived, and what changed

The 404 in §4 is the *detector's* high-confidence residue. Five language-competent workers then
verified it row by row against the live DB. **Their verdicts supersede §3a and §4 wherever they
disagree.** Three things changed materially, and one of them changes what the biggest number in
this report even means.

### Corrected totals

| cluster | detector residue | confirmed defects | overturned as FP | new FP class the detector missed |
|---|--:|--:|--:|---|
| Celtic (#614) | 166 | **129 rows** | 37 rows (gle) | **synthetic-preposition paradigm** |
| Agglutinative excl. Armenian (#615) | 49 | **48 rows / 27 distinct** | 1 word | — |
| Armenian (#615) | 96 | **0 ZUT defects** — see below | 0 | **not a ZUT problem at all** |
| Semitic (#613) | 49 | **25 distinct defects** | 7 words + 4 borderline | same-seed teaching; diacritic-only |
| English-target (#616) | 124 | **92 rows** | 32 rows | **self-teaching row**; taught-earlier-via-different-lego |
| Euro tail (#617) | 68 | **63 rows** | 5 (sandbox course) | — |

### The Armenian finding is not what §4 says it is

**`hye_for_eng`'s 96 rows are real defects but they are not used-before-taught.** Worker #615 traced
every one to two root causes:

- **71 rows — the introducing LEGO's `target_text` is a corrupted spelling** that never matches the
  correctly-spelled word the practice phrases actually use. The word *is* taught; it is taught under
  a typo. Confirmed pairs: seed 28 `S0028L01` "useful" is stored as **`օժուտակ`** while 35 phrases
  use **`օգտակար`**; seed 71 "the truth" stored **`չտմարտյունը`** vs 17 uses of **`ճշմարտությունը`**;
  seed 197 "the son" stored **`տգանը`** vs 10 uses of **`տղան`**; seed 300 "to seem" stored
  **`երեվել`** vs 9 uses of **`երևալ`**.
- **25 rows — backfill ghost placeholders.** The `decomposition` segments carry
  `isGhost:true, legoId:null, known:""` and hold *Latin-transliteration* fragments (e.g.
  `sirum enk nor baner sovorel`), not Armenian script, with `metadata.pipeline:"backfill"`. These
  phrases were never actually decomposed or authored.

That is arguably **worse** than a ZUT ordering slip — up to 96 rows may be teaching or reinforcing
misspelled or placeholder text — but it belongs to content QA, not to a resequencing pass. It needs
a different fix and a different owner.

### New false-positive classes found by the workers

1. **Self-teaching row (#616, 24 rows).** The flagged phrase *is itself* the `build`/`component`
   row that introduces the word; the detector matched a later coincidental occurrence and reported
   a phantom gap. This is the single biggest FP class in the English-target family.
2. **Synthetic-preposition paradigm (#614, 37 rows in `gle_for_eng`).** Irish fuses
   preposition + pronoun into one word (`ag`+`í`→`aici`, `le`+`í`→`léi`, `ar`+`í`→`uirthi`). The
   bare preposition is taught early in every case, but the fused form shares no exploitable
   substring with it, so my crude mutation filter never caught it. `aici` alone accounted for 16
   rows. Welsh almost certainly has the same engine in `amdanaf/amdanoch/amdani`.
3. **Same-seed teaching (#613).** `عليك`↔`على` and `بعمله`↔`أعمل` are each taught at the same seed
   as the flagged use — my same-block tolerance is not proclitic-aware, so it missed them.

### Corrections to my own numbers

- **`ara_for_eng`: 1 real defect, not 0.** My orthography fix took the residue to zero; #613's
  independent full census (all 188 distinct words, not a sample) agrees it is **98.9% orthographic
  noise** but found one genuine defect I had over-folded away: seed 395 `S0395L06B03`
  *"نَحْنُ بِحاجَةٍ إِلى التَّفْكيرِ في ذَلِكَ"* uses **التَّفْكيرِ** (the verbal noun "thinking"),
  which is never taught — only `فِكْرَة` ("an idea", a different word) is, at seeds 196/260/272.
- **`ara_eg_for_eng`: 9 confirmed, not 27.** Five of my hits were same-seed teaching or
  diacritic-only. The `لازم` finding stands and is the big one — used **19 times** from seed 26
  onward, first taught at seed 109.
- **`ara_lb_for_eng`: 11 confirmed, not 12**, plus 3 borderline. Note #613's warning: substring
  matching is **not trustworthy for Semitic triliteral roots** — two rows it first called FP
  (`إجت` matched against unrelated `اجتماع`; `يعملها` against unrelated `لها`) flipped back to real
  on manual root re-search.
- **`gle_for_eng`: 69 confirmed of 106**, not 62 — worker #614 covered all 26 distinct words and
  overturned only the preposition paradigm. `roimh` is used **19 times** from seed 65 and first
  taught at 237.
- **`eng_for_jpn`: 38 confirmed of 53**, and #616's diagnosis matters: it is **not one repeating
  bug**. The 38 span 26 distinct words, mostly used once or twice each — a genuine broad pattern of
  practice phrases reaching ahead of their build seed.
- **`my firstTaughtAt` field is optimistic in places.** #616 found rows where my JSON names a
  reintroduction seed (`eng_for_ara` "goes" → 560; `eng_for_jpn` "first" → 494, "school" → 323)
  but the word only ever appears in `use`-role phrases and **never in a genuine teaching row**. For
  those, read "first taught: **never**", not my number. My taught-set counted seed sentences as
  teaching events; #616's stricter index counted only legos and `build`/`component` rows. Its
  definition is the right one and the defects are still real — the gap is worse than I stated, not
  better.
- **`cym_n`/`cym_s`: all 45 confirmed, and the brief's expectation was wrong.** #614 reports
  **Welsh initial mutation was not the source of a single one** of the 45 Welsh rows. `gwaith`
  ("work") in any mutation form is never a lego, seed or component row in either course, and
  `gwrando` ("listen") adds 6 more in the North. The mutation filter is already doing its job
  there; the residue is real.
- **`hrv_for_eng` "turba"** — #617 confirms it independently: the word for "bag" is genuinely
  untaught until seed 635 and used at 198, and `turba` also looks like a typo for `torba`. Either
  way it is a defect in a live course.
- **`cym_anthem_for_jpn` "bardd"** — singular "poet" is never taught, only the plural `beirdd`;
  a real gap the edit-distance filter could not see.

### Open questions the workers refused to guess at — these need a methodology ruling, not a data fix

1. **Is a new person/number conjugation its own teachable unit?** `ara_for_eng` seed 211 uses
   `يعودوا` ("they come back") where only `يَعودُ` ("he comes back") is taught, at seed 16. If a verb
   stem counts as taught for all its persons, this is clean; if not, it is a defect — and the same
   ruling reclassifies a large slice of the 17,133 rows my C5 filter strips estate-wide.
2. **Colloquial vs MSA particle spellings.** `ara_lb` uses colloquial `لأ` ("no") where the taught
   form is `لا`. My hamza-folding treats them as the same token. Whether that is correct is a
   native-speaker call across all three Arabic variants.
3. **Do cognates get an exemption?** #617 notes the stated ZUT rule does not exempt them (Italian
   `idea` for an English speaker), so it changes severity, not verdicts — but it is worth a ruling.


---

## 5. Which courses need a fix pass first

Ranked after triage, by *what a learner actually hits*, not by raw count.

**Tier 1 — released or live, real defects, fix first**

1. **`cym_n_for_eng` / `cym_s_for_eng` — 45 confirmed, both released and live.** Highest-stakes rows
   in the report, and the cheapest fix: **`gwaith`/`waith`/`ngwaith` ("work") is used across ~19
   phrases from seed 218 onward and is never taught in either course**, plus `gwrando` ("listen")
   for 6 more in the North. Two missing LEGOs clear most of both courses. Remainder: `gaethoch`,
   `peidiwch`, `naddo`, `Tseina`/`Ariannin` (North); `ŷch` (used 150–161, taught 173), `amdanoch`,
   `fuan` (South). Worker #614 verified all 45 and overturned none.
2. **`hye_for_eng` — 96 rows, but NOT a ZUT pass.** See §4b: 71 rows are a corrupted LEGO spelling
   and 25 are un-decomposed backfill ghost placeholders holding Latin transliteration. Do not send
   this to a resequencing sweep — it needs content QA on the LEGO cards and a re-decomposition of
   the ghost rows. **This is the item I would put in front of Kai first**, because it is the only
   one where the defect class itself was misdiagnosed.
3. **`gle_for_eng` — 69 confirmed of 106.** Beta, public. Ordering, not orphans: `roimh` used 19×
   from seed 65 but taught at 237; `sin` at 13 taught at 56; `nó` at 12 taught at 44; `dtí`, `siad`,
   `uait`, `faide`, `phlé` all 40–170 seeds early. A resequencing pass. (37 rows were the Irish
   synthetic-preposition paradigm and are FP — see §4b.)
4. **`eng_for_jpn` — 38 confirmed of 53.** Beta. Broad, not a single bug: 26 distinct words, most
   used once or twice. `suggest`, `always`, `spoke`, `hurry`, `city`, `confident`, `terrible`,
   `replied` never taught at all; `told` at 149/201/202 taught at 211; `sister` at 147/197 taught at
   232; `nice` at 133 taught at 219. Because 73 courses share the English seed corpus, check whether
   these leak into siblings before fixing one course in isolation.
5. **`eng_for_zho` — 18 confirmed of 18, nothing overturned.** Beta. Seed-11 and seed-15 phrases
   reach forward to seeds 16–18 repeatedly (`come`, `back`, `later`, `this`, `evening`, `meet`), and
   `myself`/`prefer` are never taught. The cleanest single-course queue in the report.

**Tier 2 — real, smaller, or lower exposure**

6. **`eus_for_eng` — 12 confirmed defects across ~32 rows.** Beta, public. Extreme gaps: `zion` used
   at 52 taught at 357; `uztea` at 27 taught at 240; `arte` across all of seed 33 taught at 187;
   `ditut`, `hor`, `idaztea`, `azalduko` never taught.
7. **`ara_eg_for_eng` (9) / `ara_lb_for_eng` (11 + 3 borderline).** Beta, public. Egyptian is mostly
   one word — **`لازم` used 19× from seed 26, taught at 109** — one LEGO moved earlier. Lebanese is
   more scattered and has the worst single gap in the estate: `سمحت` ("please") used at seed 61,
   taught at **630**.
8. **`lav_for_eng` (11).** `ieradās` at 139 taught at 454; `pazīsti` at 85 taught at 284;
   `struktūru`/`ceļus`/`funkcijām` never taught (seed 126 looks like one over-ambitious phrase).
9. **`deu_for_eng` (8).** Beta, very high traffic. `dürfen`/`durften` (seeds 399/424), `übst` (111),
   `triffst` (238) never taught; `tun` at 57 taught at 479.
10. **`hrv_for_eng` (4) — released and live.** `turba` at seed 198: the word for "bag" is untaught
    until 635, and `turba` is very likely a typo for `torba`. Smallest fix in the report and the
    most embarrassing to ship.
11. **`ita_for_eng` (6) — released and live.** All six are `essere` across seeds 76–83, taught at
    137. One LEGO moved earlier.
12. **`afr_for_eng` (7).** `dit` at seed 4 taught at 28; **`myself` sits untranslated in three
    Afrikaans phrases** at seed 65 — a translation miss, not a ZUT slip.

**Tier 3 — the tail is real.** #617 checked all 68 euro-tail rows and overturned **zero** in the 19
genuine courses. `eng_for_kan`/`eng_for_pan`/`eng_for_tam`/`eng_for_spa`/`eng_for_fra` and ~25
others hold 1–9 confirmed hits each. Worth one batched pass. Note `told` in `eng_for_kan` (used at
76/83/84, taught at 211) and `person` in `eng_for_pan` (used at 133, taught at 388).

**Excluded as non-content.** `sbx_for_eng` (sandbox: "asdf qwerty zzz"), `zzz_test_for_eng`,
`eng_template`. `cym_anthem_for_jpn`'s 2 rows (`bardd`) are real but it is a 7-seed novelty course.

**Cannot be ranked at all** — the 13 no-space-script courses in §1, four of them released. Their
untaught-word status is unknown, not good.

---

## 6. What I would fix in the tooling before the next run

1. **The Arabic-script normalisation belongs in the shared normaliser, not in my scratch script.**
   Tashkeel + `؟ ، ؛` + alef/ya/ta-marbuta folding turned 1,126 phantom defects into 0. Anything
   else in the estate that string-matches Arabic text has the same hole.
2. **The elision hole the prior run found in `normalizeForContainment`
   (`services/course-builder/lib/text-normalization.cjs:29`) is still open** — I worked around it in
   my own detector (C2, 764 hits) rather than touching the live gate. Fixing it there would
   mechanically shrink the 3,577 membership queue before anyone triages a single row.
3. **A no-space-script untaught check needs a LEGO-span approach**, not tokenisation — check whether
   each taught LEGO's target string tiles the phrase, and flag the uncovered spans.
4. **The taught-set definition should be #616's, not mine.** I counted seed sentences as teaching
   events; the stricter index counts only legos and `build`/`component` rows. Mine understates gaps
   and invents reintroduction seeds that are really `use`-role occurrences.
5. **Add the self-teaching guard and the synthetic-preposition paradigm to the FP classes** before
   any rerun — together they were 61 of the residue rows the workers overturned.
6. **`same_block` needs to be proclitic-aware** (#613's `ara_for_eng` seed-510 case), which likely
   means the same blind spot sits inside the 71 rows C8 already strips estate-wide.

---

## 7. Detector A, all 99 courses

| course | rows | bidir strict | membership fails | target-side collisions |
|---|--:|--:|--:|--:|
| eng_for_kan | 15784 | 47 | 273 | 114 |
| eng_for_hin | 13748 | 9 | 230 | 119 |
| eng_for_guj | 15393 | 34 | 197 | 139 |
| eng_for_pan | 13910 | 19 | 194 | 106 |
| jpn_for_eng | 13232 | 514 | 174 | 68 |
| kor_for_eng | 15369 | 299 | 173 | 80 |
| eng_for_sin | 13019 | 20 | 150 | 62 |
| eng_for_tel | 13759 | 36 | 126 | 61 |
| eng_for_ben | 13799 | 31 | 116 | 123 |
| eng_for_urd | 12426 | 15 | 100 | 90 |
| eng_for_fra | 6973 | 4 | 93 | 51 |
| ara_lb_for_eng | 13879 | 235 | 89 | 25 |
| eng_for_mar | 14255 | 28 | 88 | 61 |
| eng_for_jpn | 11489 | 74 | 84 | 42 |
| eng_for_deu | 6510 | 3 | 77 | 53 |
| eng_for_por | 6627 | 7 | 75 | 40 |
| eng_for_spa | 6418 | 9 | 74 | 44 |
| eng_for_kor | 5954 | 80 | 72 | 53 |
| fra_ca_for_eng | 14253 | 4 | 66 | 89 |
| ces_for_eng | 7315 | 22 | 63 | 51 |
| eng_for_ita | 6259 | 23 | 63 | 30 |
| lit_for_eng | 6746 | 78 | 57 | 59 |
| ara_for_eng | 14039 | 182 | 55 | 80 |
| fas_for_eng | 8090 | 268 | 50 | 19 |
| eng_for_tam | 13998 | 32 | 43 | 49 |
| ita_for_eng | 14964 | 84 | 42 | 65 |
| bre_for_fra | 6556 | 32 | 41 | 34 |
| ben_for_eng | 7532 | 7 | 40 | 64 |
| hye_for_eng | 6324 | 329 | 40 | 2 |
| por_for_eng | 15572 | 124 | 39 | 72 |
| eng_for_zho | 5594 | 49 | 36 | 45 |
| tur_for_eng | 10758 | 52 | 36 | 6 |
| ell_for_eng | 9088 | 73 | 31 | 29 |
| eng_for_ara | 6520 | 8 | 28 | 61 |
| ara_eg_for_eng | 12807 | 249 | 27 | 16 |
| tel_for_eng | 14219 | 689 | 27 | 5 |
| eus_for_eng | 7197 | 119 | 26 | 19 |
| fra_for_zho | 6252 | 189 | 24 | 28 |
| deu_for_eng | 15496 | 169 | 23 | 19 |
| deu_for_zho | 6267 | 191 | 21 | 10 |
| ita_for_zho | 5717 | 126 | 20 | 9 |
| deu_ch_for_eng | 14859 | 36 | 16 | 66 |
| eus_for_spa | 5962 | 48 | 16 | 8 |
| fra_for_jpn | 7189 | 63 | 16 | 75 |
| por_br_for_eng | 15749 | 49 | 16 | 96 |
| nep_for_eng | 8217 | 253 | 14 | 12 |
| glg_for_eng | 5601 | 0 | 13 | 30 |
| swa_for_eng | 7154 | 84 | 13 | 17 |
| spa_for_zho | 5331 | 120 | 12 | 19 |
| hin_for_eng | 6901 | 169 | 11 | 14 |
| hrv_for_eng | 7027 | 32 | 11 | 47 |
| mlt_for_eng | 6544 | 100 | 11 | 18 |
| ita_for_jpn | 6042 | 63 | 10 | 35 |
| cat_for_spa | 7955 | 13 | 9 | 3 |
| zho_for_eng | 13069 | 227 | 9 | 46 |
| pol_for_eng | 6858 | 19 | 8 | 66 |
| gle_for_eng | 6917 | 17 | 7 | 19 |
| spa_mx_for_eng | 14060 | 70 | 7 | 7 |
| afr_for_eng | 4636 | 37 | 6 | 4 |
| hun_for_eng | 5789 | 187 | 6 | 16 |
| dan_for_eng | 5731 | 31 | 5 | 23 |
| nan_for_eng | 7103 | 14 | 5 | 21 |
| nld_for_eng | 5235 | 82 | 5 | 8 |
| pdc_for_eng | 7290 | 8 | 5 | 35 |
| swe_for_eng | 6146 | 65 | 5 | 2 |
| cat_for_eng | 6076 | 77 | 4 | 19 |
| est_for_eng | 5769 | 103 | 4 | 10 |
| isl_for_eng | 5794 | 77 | 4 | 25 |
| por_for_jpn | 7633 | 67 | 4 | 31 |
| zho_for_tam | 11963 | 44 | 4 | 15 |
| gla_for_eng | 5912 | 254 | 3 | 65 |
| fin_for_eng | 15478 | 10 | 3 | 113 |
| lav_for_eng | 5904 | 147 | 3 | 16 |
| ron_for_eng | 6430 | 31 | 3 | 16 |
| sbx_for_eng | 534 | 6 | 3 | 2 |
| rus_for_eng | 7181 | 176 | 3 | 18 |
| zho_for_hin | 14594 | 74 | 3 | 63 |
| deu_at_for_eng | 13810 | 73 | 2 | 67 |
| mar_for_eng | 15951 | 10 | 2 | 18 |
| srp_for_eng | 6292 | 108 | 2 | 36 |
| tha_for_eng | 5502 | 51 | 2 | 3 |
| yue_for_eng | 10165 | 60 | 2 | 14 |
| bul_for_eng | 5435 | 136 | 1 | 22 |
| heb_for_eng | 6383 | 21 | 1 | 30 |
| hak_for_eng | 27198 | 34 | 1 | 24 |
| kor_for_tam | 14434 | 65 | 1 | 45 |
| nor_for_eng | 5193 | 66 | 1 | 7 |
| spa_for_jpn | 8149 | 168 | 1 | 3 |
| ukr_for_eng | 5632 | 45 | 1 | 12 |
| cym_anthem_for_jpn | 174 | 0 | 0 | 0 |
| cym_n_for_eng | 5632 | 88 | 0 | 0 |
| cym_s_for_eng | 6044 | 102 | 0 | 0 |
| deu_for_jpn | 5794 | 176 | 0 | 7 |
| eng_template | 330 | 0 | 0 | 0 |
| ita_for_cym | 523 | 0 | 0 | 0 |
| kor_for_hin | 14872 | 97 | 0 | 64 |
| zho_for_gle | 142 | 6 | 0 | 0 |
| zho_for_jpn | 4547 | 113 | 0 | 2 |
| zzz_test_for_eng | 1 | 0 | 0 | 0 |

---

*Read-only audit. No course content was edited, no audio generated, no commits made, nothing pushed. Scratch artifacts live in the gitignored `.a108-zut/` workspace.*

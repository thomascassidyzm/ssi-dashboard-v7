# Sliding-scale word cap — Part 1 (every English-involved course) + Part 2 (non-English known-language groups)

Follow-on from the 3-course pilot ([eng_for_zho/ara/spa sliding-scale run](https://watson-1.tail4968cb.ts.net/d/8a489dac)). Read-only, live DB. `course_practice_phrases` joined to `course_round_index` for round number, `phrase_role='use'` only, words = whitespace split (`trim` + `regexp_split_to_array(...,'\s+')`).

Bands: **1-20 → 8-word cap**, **20-100 → 10-word cap**, **101+ → uncapped (no cull)**.

Query verified against the prior eng_for_zho result before running at scale (23/80, 31/497, 2006 total — exact match).

---

## Part 1 — every course where English is known OR target side

Scope: `courses` where `known_lang='eng' OR target_lang='eng'` (96 course rows in the table; 79 have USE-phrase data — the rest are empty drafts). Word count taken on whichever field is the English side for that course (`known_text` when English is known, `target_text` when English is target).

| Course | 1-20 excl/total | 1-20 % | 20-100 excl/total | 20-100 % | 101+ total |
|---|---|---|---|---|---|
| afr_for_eng | 27/79 | 34.18% | 27/393 | 6.87% | 1880 (uncapped) |
| ara_eg_for_eng | 20/79 | 25.32% | 25/409 | 6.11% | 6221 (uncapped) |
| ara_for_eng | 4/75 | 5.33% | 55/396 | 13.89% | 6433 (uncapped) |
| ara_lb_for_eng | 16/85 | 18.82% | 11/391 | 2.81% | 6695 (uncapped) |
| ben_for_eng | 0/57 | 0.00% | 28/399 | 7.02% | 3028 (uncapped) |
| bul_for_eng | 13/71 | 18.31% | 5/366 | 1.37% | 2379 (uncapped) |
| cat_for_eng | 1/82 | 1.22% | 4/424 | 0.94% | 2709 (uncapped) |
| ces_for_eng | 19/82 | 23.17% | 17/428 | 3.97% | 2397 (uncapped) |
| cym_n_for_eng | 3/19 | 15.79% | 21/244 | 8.61% | 1100 (uncapped) |
| cym_s_for_eng | 0/20 | 0.00% | 24/271 | 8.86% | 1060 (uncapped) |
| dan_for_eng | 13/81 | 16.05% | 10/371 | 2.70% | 2345 (uncapped) |
| deu_at_for_eng | 10/71 | 14.08% | 15/401 | 3.74% | 6095 (uncapped) |
| deu_ch_for_eng | 21/79 | 26.58% | 12/400 | 3.00% | 6420 (uncapped) |
| deu_for_eng | 14/61 | 22.95% | 82/473 | 17.34% | 7883 (uncapped) |
| ell_for_eng | 41/90 | 45.56% | 63/513 | 12.28% | 3296 (uncapped) |
| eng_for_ara | 24/82 | 29.27% | 43/400 | 10.75% | 2455 (uncapped) |
| eng_for_ben | 8/80 | 10.00% | 13/400 | 3.25% | 5971 (uncapped) |
| eng_for_deu | 18/83 | 21.69% | 15/406 | 3.69% | 2537 (uncapped) |
| eng_for_fra | 35/84 | 41.67% | 61/400 | 15.25% | 2697 (uncapped) |
| eng_for_guj | 18/74 | 24.32% | 12/400 | 3.00% | 6703 (uncapped) |
| eng_for_hin | 13/78 | 16.67% | 10/403 | 2.48% | 5913 (uncapped) |
| eng_for_ita | 38/100 | 38.00% | 62/476 | 13.03% | 2525 (uncapped) |
| eng_for_jpn | 14/81 | 17.28% | 16/563 | 2.84% | 5981 (uncapped) |
| eng_for_kan | 13/84 | 15.48% | 23/401 | 5.74% | 6601 (uncapped) |
| eng_for_kor | 28/75 | 37.33% | 20/470 | 4.26% | 2357 (uncapped) |
| eng_for_mar | 14/63 | 22.22% | 27/395 | 6.84% | 6519 (uncapped) |
| eng_for_pan | 7/82 | 8.54% | 15/400 | 3.75% | 5830 (uncapped) |
| eng_for_por | 34/72 | 47.22% | 86/400 | 21.50% | 2584 (uncapped) |
| eng_for_sin | 10/89 | 11.24% | 10/415 | 2.41% | 6071 (uncapped) |
| eng_for_spa | 26/76 | 34.21% | 51/409 | 12.47% | 2500 (uncapped) |
| eng_for_tam | 16/71 | 22.54% | 4/401 | 1.00% | 6264 (uncapped) |
| eng_for_tel | 29/68 | 42.65% | 20/397 | 5.04% | 6254 (uncapped) |
| eng_for_urd | 9/82 | 10.98% | 6/395 | 1.52% | 5420 (uncapped) |
| eng_for_zho | 23/80 | 28.75% | 31/497 | 6.24% | 2006 (uncapped) |
| eng_template | 16/49 | 32.65% | 14/376 | 3.72% | 2349 (uncapped) |
| est_for_eng | 6/83 | 7.23% | 3/372 | 0.81% | 2515 (uncapped) |
| eus_for_eng | 8/69 | 11.59% | 15/413 | 3.63% | 3040 (uncapped) |
| fas_for_eng | 7/72 | 9.72% | 2/396 | 0.51% | 3285 (uncapped) |
| fin_for_eng | 4/114 | 3.51% | 38/463 | 8.21% | 7192 (uncapped) |
| fra_ca_for_eng | 9/60 | 15.00% | 13/399 | 3.26% | 6253 (uncapped) |
| fra_for_eng | 17/91 | 18.68% | 39/615 | 6.34% | 8261 (uncapped) |
| gla_for_eng | 36/97 | 37.11% | 56/399 | 14.04% | 2255 (uncapped) |
| gle_for_eng | 1/71 | 1.41% | 171/717 | 23.85% | 3029 (uncapped) |
| glg_for_eng | 10/83 | 12.05% | 20/398 | 5.03% | 2271 (uncapped) |
| hak_for_eng | 2/76 | 2.63% | 5/400 | 1.25% | 11670 (uncapped) |
| heb_for_eng | 26/79 | 32.91% | 64/390 | 16.41% | 2438 (uncapped) |
| hin_for_eng | 12/76 | 15.79% | 6/390 | 1.54% | 3134 (uncapped) |
| hrv_for_eng | 28/80 | 35.00% | 42/396 | 10.61% | 2754 (uncapped) |
| hun_for_eng | 14/77 | 18.18% | 3/369 | 0.81% | 2489 (uncapped) |
| hye_for_eng | 15/72 | 20.83% | 54/411 | 13.14% | 2697 (uncapped) |
| isl_for_eng | 22/76 | 28.95% | 22/428 | 5.14% | 2405 (uncapped) |
| ita_for_eng | 14/64 | 21.88% | 7/348 | 2.01% | 7350 (uncapped) |
| jpn_for_eng | 10/72 | 13.89% | 4/377 | 1.06% | 6249 (uncapped) |
| kor_for_eng | 12/77 | 15.58% | 20/494 | 4.05% | 7176 (uncapped) |
| lav_for_eng | 18/85 | 21.18% | 12/380 | 3.16% | 2621 (uncapped) |
| lit_for_eng | 14/90 | 15.56% | 6/383 | 1.57% | 2478 (uncapped) |
| mar_for_eng | 35/75 | 46.67% | 21/400 | 5.25% | 7941 (uncapped) |
| mlt_for_eng | 25/82 | 30.49% | 18/363 | 4.96% | 2854 (uncapped) |
| nan_for_eng | 13/64 | 20.31% | 12/400 | 3.00% | 3033 (uncapped) |
| nep_for_eng | 14/67 | 20.90% | 6/397 | 1.51% | 3713 (uncapped) |
| nld_for_eng | 3/68 | 4.41% | 6/385 | 1.56% | 2246 (uncapped) |
| nor_for_eng | 30/79 | 37.97% | 12/399 | 3.01% | 2404 (uncapped) |
| pol_for_eng | 19/72 | 26.39% | 17/396 | 4.29% | 2579 (uncapped) |
| por_br_for_eng | 14/75 | 18.67% | 37/392 | 9.44% | 6683 (uncapped) |
| por_for_eng | 13/79 | 16.46% | 12/435 | 2.76% | 7543 (uncapped) |
| ron_for_eng | 26/84 | 30.95% | 27/414 | 6.52% | 2624 (uncapped) |
| rus_for_eng | 18/83 | 21.69% | 7/383 | 1.83% | 3245 (uncapped) |
| sbx_for_eng | 15/41 | 36.59% | 57/122 | 46.72% | 0 (uncapped) |
| spa_for_eng | 20/85 | 23.53% | 148/547 | 27.06% | 9254 (uncapped) |
| spa_mx_for_eng | 9/80 | 11.25% | 80/472 | 16.95% | 7052 (uncapped) |
| srp_for_eng | 15/82 | 18.29% | 9/363 | 2.48% | 2541 (uncapped) |
| swa_for_eng | 29/71 | 40.85% | 19/382 | 4.97% | 3093 (uncapped) |
| swe_for_eng | 10/78 | 12.82% | 19/400 | 4.75% | 2825 (uncapped) |
| tel_for_eng | 5/76 | 6.58% | 4/377 | 1.06% | 7294 (uncapped) |
| tha_for_eng | 9/77 | 11.69% | 4/391 | 1.02% | 2426 (uncapped) |
| tur_for_eng | 14/67 | 20.90% | 168/398 | 42.21% | 5590 (uncapped) |
| ukr_for_eng | 25/74 | 33.78% | 55/400 | 13.75% | 2471 (uncapped) |
| yue_for_eng | 6/55 | 10.91% | 12/400 | 3.00% | 4611 (uncapped) |
| zho_for_eng | 26/102 | 25.49% | 3/502 | 0.60% | 6280 (uncapped) |

17 of the 96 eng-involved courses have zero USE-phrase rows and are omitted (empty drafts): `ara_sy_for_eng`, `bre_for_eng`, `cor_for_eng`, `fur_for_eng`, `kan_for_eng`, `lmo_for_eng`, `mkd_for_eng`, `nap_for_eng`, `pdc_for_eng`, `rgn_for_eng`, `roh_for_eng`, `scn_for_eng`, `sme_for_eng`, `vec_for_eng`, `yid_for_eng`, `yor_for_eng`, `zzz_test_for_eng`. The 79 rows below are everything with actual data.

---

## Part 2 — non-English known-language groups (Spanish / Chinese / Italian / German known side, target ≠ eng)

Scope: `courses` where `known_lang IN ('spa','zho','ita','deu') AND target_lang != 'eng'`. Word count on `known_text` (the known-language side).

**Gap: no `ita` or `deu` known-side courses exist.** The only rows with `known_lang IN ('ita','deu')` in the whole `courses` table are `eng_for_ita` and `eng_for_deu` — both have English as the *target*, so both are excluded by this part's "target ≠ eng" scope and land in Part 1 instead. There is currently no `ita_for_*` or `deu_for_*`-as-known-side course pair anywhere in the DB. Reporting this as an explicit gap rather than substituting anything.

Of the 15 `spa`/`zho`-known candidate rows, 6 have USE-phrase data (rest are empty drafts: `ara_eg_for_zho`, `ara_for_zho`, `ara_sy_for_zho`, `deu_at_for_zho`, `jpn_for_zho`, `kor_for_zho`, `por_br_for_zho`, `por_for_zho`, `spa_mx_for_zho`).

| Known-lang | Course | 1-20 excl/total | 1-20 % | 20-100 excl/total | 20-100 % | 101+ total |
|---|---|---|---|---|---|---|
| spa | cat_for_spa | 0/89 | 0.00% | 41/464 | 8.84% | 3067 (uncapped) |
| spa | eus_for_spa | 3/80 | 3.75% | 3/397 | 0.76% | 2500 (uncapped) |
| zho | deu_for_zho | 0/66 | 0.00% | 0/379 | 0.00% | 2441 (uncapped) |
| zho | fra_for_zho | 0/94 | 0.00% | 0/390 | 0.00% | 2340 (uncapped) |
| zho | ita_for_zho | 0/75 | 0.00% | 0/404 | 0.00% | 2360 (uncapped) |
| zho | spa_for_zho | 0/83 | 0.00% | 0/380 | 0.00% | 2175 (uncapped) |

**Methodology break for `zho`, confirmed on sampled rows** (e.g. `deu_for_zho` USE known_text: `我想说。` / `我想和你说中文。`): Chinese text carries no whitespace between words, so `regexp_split_to_array(...,'\s+')` returns exactly 1 "word" per phrase almost always — every zho-known row above reads 0% culled at both bands purely as an artefact of the counting method, not because the phrases are actually short. **The zho numbers in this table measure nothing about phrase length and should not be used to judge an 8/10 threshold.** A real zho word-count would need a segmenter (e.g. character count, or a CJK tokenizer), which this read-only pass did not run.

The `spa` known-side numbers (`cat_for_spa`, `eus_for_spa`) are methodologically sound (Spanish uses whitespace normally) but the sample is thin — 2 courses only — since no other pure-`spa`-known-non-eng course pairs exist in the DB.

---

## Read

Across Part 1's 79 English-involved courses, culled % at both bands varies enormously by course pair (1-20 band ranges from 0% to 47%; 20-100 band from 0.5% to 47%) — there is no sign the 8/10 thresholds sit near a natural inflection point common to all pairs, so a single universal cap looks like it will over-cull some pairs (e.g. `eng_for_por` 47%/22%, `tur_for_eng` 21%/42%, `spa_for_eng` 24%/27%) while barely touching others (`cat_for_eng` 1%/1%, `ben_for_eng` 0%/7%). Part 2 can't extend this comparison to zho, ita, or deu: zho's known-side numbers are a whitespace-tokenizer artefact (not a real measurement), and ita/deu have zero known-side non-English course pairs in the DB at all — only the thin spa sample (2 courses) is usable, and it lands in the same wide range as the English-involved set, giving no evidence either way that Spanish specifically needs a different threshold.

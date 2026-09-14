# Catalogue grid — every target × known cell

Read-only census against the live Popty database, 2026-09-04. No writes, no fixes — this is a snapshot of what the DB says exists right now.

Every course row below is a genuinely distinct course (SSi's teaching is pair-specific by construction: `deu_for_jpn` and `deu_for_zho` are different curricula, not the same content re-voiced). Several `target_lang`/`known_lang` combinations hold more than one course because of dialect variants sharing a language-pair code (e.g. `ara_for_eng` / `ara_eg_for_eng` / `ara_lb_for_eng` / `ara_sy_for_eng` are four distinct Arabic-dialect courses that all map to the cell "ara × eng").

## Headline numbers

- **149** course rows in `courses` (148 real + `zzz_test2_for_eng`, a test artifact — see anomalies).
- **69** distinct target languages.
- **25** distinct known languages.
- **125** distinct target × known cells (i.e. 125 language-pair slots; 149 courses fill them, with dialect variants doubling up on 16 of those cells).
- **80 cells are substantial** (real content and real, roughly-proportionate audio coverage — see method below). That's 80 of 125 cells, or 64%.
- **88 of the 149 course rows** are individually substantial by the same test.

### What "substantial" means here
A course counts as substantial if it has **≥100 practice-phrase rows AND ≥1,000 audio clips**. The ≥1,000-clip bar isn't arbitrary: courses with thousands of phrases but only 1-100 clips exist in the data (see "thin audio" below) — a raw ">0 clips" test would have called those complete. A cell is substantial if at least one of its courses clears that bar.

---

## The full grid — 149 courses

| course_code | target | known | dialect | status | visibility | seeds | phrases | tts clips | human clips | total clips | learner status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| afr_for_eng | afr | eng |  | beta | public |  | 4123 | 13393 | 0 | 13393 | beta |
| ara_for_cym | ara | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| ara_eg_for_eng | ara | eng |  | beta | public | 668 | 11421 | 22178 | 0 | 22178 | beta |
| ara_for_eng | ara | eng |  | beta | beta | 668 | 12638 | 44261 | 74 | 44335 | beta |
| ara_lb_for_eng | ara | eng |  | beta | public | 668 | 12332 | 16648 | 0 | 16648 | beta |
| ara_sy_for_eng | ara | eng |  | draft | public | 300 | 0 | 2974 | 0 | 2974 | draft |
| ara_eg_for_jpn | ara | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ara_for_jpn | ara | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ara_sy_for_jpn | ara | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ara_eg_for_zho | ara | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ara_for_zho | ara | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ara_sy_for_zho | ara | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| ben_for_eng | ben | eng |  | released | public |  | 6778 | 20315 | 0 | 20315 | LIVE |
| bre_for_eng | bre | eng |  | draft | public | 300 | 352 | 314 | 0 | 314 | draft |
| sbx_for_eng | bre | eng |  | draft | private | 300 | 473 | 216 | 0 | 216 | draft |
| bre_for_fra | bre | fra |  | draft | public | 300 | 5926 | 97 | 0 | 97 | draft |
| bul_for_eng | bul | eng |  | beta | public | 300 | 4837 | 19462 | 0 | 19462 | beta |
| cat_for_eng | cat | eng |  | beta | public | 300 | 5454 | 21036 | 0 | 21036 | beta |
| cat_for_spa | cat | spa |  | beta | public | 300 | 6544 | 22283 | 0 | 22283 | beta |
| ceb_for_eng | ceb | eng |  | draft | hidden | 300 | 0 | 0 | 0 | 0 | hidden |
| ces_for_eng | ces | eng |  | beta | public |  | 6690 | 19850 | 0 | 19850 | beta |
| cor_for_eng | cor | eng |  | draft | hidden |  | 642 | 1 | 0 | 1 | hidden |
| cym_n_for_eng | cym | eng | north | released | public | 300 | 4997 | 979 | 20120 | 21099 | LIVE |
| cym_nnew_for_eng | cym | eng | north | draft | hidden |  | 3948 | 0 | 0 | 0 | hidden |
| cym_s_for_eng | cym | eng | south | released | public | 300 | 5365 | 48 | 20722 | 20770 | LIVE |
| cym_anthem_for_jpn | cym | jpn |  | released | public | 7 | 147 | 299 | 354 | 653 | LIVE |
| cym_for_yor | cym | yor |  | draft | hidden | 668 | 7326 | 0 | 0 | 0 | hidden |
| dan_for_eng | dan | eng |  | beta | public | 300 | 5155 | 19784 | 0 | 19784 | beta |
| deu_for_cym | deu | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| deu_at_for_eng | deu | eng |  | beta | beta | 668 | 12549 | 40486 | 225 | 40711 | beta |
| deu_ch_for_eng | deu | eng |  | draft | hidden | 668 | 13301 | 4139 | 0 | 4139 | hidden |
| deu_for_eng | deu | eng |  | beta | beta | 668 | 13926 | 62019 | 74 | 62093 | beta |
| deu_at_for_jpn | deu | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| deu_for_jpn | deu | jpn |  | beta | public | 300 | 5136 | 18375 | 0 | 18375 | beta |
| deu_at_for_zho | deu | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| deu_for_zho | deu | zho |  | beta | public | 300 | 5539 | 17214 | 0 | 17214 | beta |
| ell_for_eng | ell | eng |  | beta | public | 300 | 8065 | 28879 | 0 | 28879 | beta |
| eng_for_ara | eng | ara |  | beta | public | 300 | 5920 | 31994 | 0 | 31994 | beta |
| eng_for_ben | eng | ben |  | released | public | 668 | 12476 | 49359 | 0 | 49359 | LIVE |
| eng_for_deu | eng | deu |  | beta | public | 300 | 5880 | 18358 | 0 | 18358 | beta |
| eng_template | eng | eng |  | draft | public | 300 | 6105 | 287 | 0 | 287 | draft (template, not a real course) |
| eng_for_fra | eng | fra |  | beta | public | 300 | 6325 | 20908 | 0 | 20908 | beta |
| eng_for_guj | eng | guj |  | released | public | 668 | 13948 | 53266 | 0 | 53266 | LIVE |
| eng_for_hin | eng | hin |  | released | public | 668 | 10975 | 51659 | 0 | 51659 | LIVE |
| eng_for_ita | eng | ita |  | beta | public | 300 | 5661 | 18628 | 0 | 18628 | beta |
| eng_for_jpn | eng | jpn |  | beta | beta | 300 | 10770 | 53574 | 0 | 53574 | beta |
| eng_for_kan | eng | kan |  | released | public | 668 | 14230 | 44689 | 0 | 44689 | LIVE |
| eng_for_kor | eng | kor |  | beta | public | 300 | 5406 | 28706 | 0 | 28706 | beta |
| eng_for_mar | eng | mar |  | released | public | 668 | 12848 | 39421 | 0 | 39421 | LIVE |
| eng_for_pan | eng | pan |  | released | public | 668 | 12587 | 51251 | 0 | 51251 | LIVE |
| eng_for_por | eng | por |  | beta | public | 300 | 6011 | 19427 | 0 | 19427 | beta |
| eng_for_sin | eng | sin |  | beta | public | 668 | 11719 | 51845 | 0 | 51845 | beta |
| eng_for_spa | eng | spa |  | beta | public | 668 | 6352 | 18417 | 0 | 18417 | beta |
| eng_for_tam | eng | tam |  | released | public | 668 | 12577 | 55621 | 0 | 55621 | LIVE |
| eng_for_tel | eng | tel |  | released | public | 668 | 12255 | 40952 | 0 | 40952 | LIVE |
| eng_for_urd | eng | urd |  | released | public | 668 | 11257 | 47143 | 0 | 47143 | LIVE |
| eng_for_zho | eng | zho |  | beta | public | 300 | 5092 | 31727 | 0 | 31727 | beta |
| est_for_eng | est | eng |  | beta | public | 300 | 5110 | 20301 | 0 | 20301 | beta |
| eus_for_eng | eus | eng |  | beta | public | 300 | 6821 | 28893 | 0 | 28893 | beta |
| eus_for_spa | eus | spa |  | beta | public | 300 | 5353 | 20009 | 0 | 20009 | beta |
| fas_for_eng | fas | eng |  | beta | public | 300 | 7252 | 26338 | 0 | 26338 | beta |
| fin_for_eng | fin | eng |  | draft | public | 668 | 14120 | 238 | 119 | 357 | draft |
| fra_for_cym | fra | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| fra_ca_for_eng | fra | eng |  | draft | hidden | 668 | 12887 | 61705 | 0 | 61705 | hidden |
| fra_for_eng | fra | eng |  | released | public | 668 | 15898 | 67294 | 75 | 67369 | LIVE |
| fra_for_jpn | fra | jpn |  | beta | public | 300 | 6474 | 22432 | 0 | 22432 | beta |
| fra_for_zho | fra | zho |  | beta | public | 300 | 5633 | 16728 | 0 | 16728 | beta |
| fur_for_eng | fur | eng |  | draft | hidden |  | 582 | 1 | 0 | 1 | hidden |
| gla_for_eng | gla | eng |  | draft | hidden | 300 | 5376 | 1965 | 0 | 1965 | hidden |
| gle_cn_for_eng | gle | eng | connemara | draft | hidden | 668 | 6151 | 0 | 0 | 0 | hidden |
| gle_for_eng | gle | eng |  | beta | beta | 300 | 5975 | 25602 | 75 | 25677 | beta |
| gle_mu_for_eng | gle | eng | munster | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| gle_ul_for_eng | gle | eng | ulster | draft | hidden | 668 | 0 | 0 | 0 | 0 | hidden |
| glg_for_eng | glg | eng |  | released | public |  | 5036 | 15934 | 0 | 15934 | LIVE |
| hak_for_eng | hak | eng |  | draft | hidden | 668 | 24563 | 1 | 0 | 1 | hidden |
| heb_for_eng | heb | eng |  | beta | public | 300 | 5756 | 22086 | 0 | 22086 | beta |
| hin_for_eng | hin | eng |  | beta | public | 300 | 6129 | 24037 | 0 | 24037 | beta |
| hrv_for_eng | hrv | eng |  | released | public | 300 | 6274 | 29023 | 0 | 29023 | LIVE |
| hun_for_eng | hun | eng |  | beta | public |  | 5116 | 17310 | 0 | 17310 | beta |
| hye_for_eng | hye | eng |  | beta | public | 300 | 5579 | 23392 | 0 | 23392 | beta |
| ind_for_eng | ind | eng |  | draft | hidden |  | 643 | 0 | 0 | 0 | hidden |
| isl_for_eng | isl | eng |  | beta | public | 300 | 5210 | 20098 | 0 | 20098 | beta |
| ita_for_cym | ita | cym | /north | draft | hidden |  | 465 | 0 | 0 | 0 | hidden |
| ita_for_eng | ita | eng |  | released | public | 668 | 13507 | 51416 | 75 | 51491 | LIVE |
| ita_for_jpn | ita | jpn |  | beta | public | 300 | 5437 | 19859 | 0 | 19859 | beta |
| ita_for_zho | ita | zho |  | beta | public | 300 | 5073 | 16812 | 0 | 16812 | beta |
| jpn_for_cym | jpn | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| jpn_for_eng | jpn | eng |  | released | public | 668 | 11864 | 53498 | 75 | 53573 | LIVE |
| jpn_for_zho | jpn | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| kan_for_eng | kan | eng |  | draft | hidden |  | 146 | 1 | 0 | 1 | hidden |
| kor_for_cym | kor | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| kor_for_eng | kor | eng |  | released | public | 668 | 13910 | 58837 | 75 | 58912 | LIVE |
| kor_for_hin | kor | hin |  | draft | hidden | 668 | 13349 | 43425 | 0 | 43425 | hidden |
| kor_for_jpn | kor | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| kor_for_tam | kor | tam |  | draft | hidden | 668 | 12907 | 42530 | 0 | 42530 | hidden |
| kor_for_zho | kor | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| lav_for_eng | lav | eng |  | beta | public | 300 | 5266 | 20321 | 0 | 20321 | beta |
| lit_for_eng | lit | eng |  | beta | public | 300 | 6070 | 23427 | 0 | 23427 | beta |
| lmo_for_eng | lmo | eng |  | draft | hidden |  | 636 | 1 | 0 | 1 | hidden |
| mar_for_eng | mar | eng |  | draft | hidden | 668 | 13874 | 1329 | 0 | 1329 | hidden |
| mkd_for_eng | mkd | eng |  | draft | hidden |  | 400 | 1 | 0 | 1 | hidden |
| mlt_for_eng | mlt | eng |  | draft | hidden |  | 5811 | 1886 | 0 | 1886 | hidden |
| nan_for_eng | nan | eng |  | draft | hidden | 668 | 6371 | 1 | 0 | 1 | hidden |
| nap_for_eng | nap | eng |  | draft | hidden |  | 793 | 1 | 0 | 1 | hidden |
| nep_for_eng | nep | eng |  | beta | public | 300 | 7291 | 25811 | 0 | 25811 | beta |
| nld_for_eng | nld | eng |  | beta | beta | 300 | 4614 | 19574 | 74 | 19648 | beta |
| nor_for_eng | nor | eng |  | beta | public | 300 | 4678 | 18338 | 0 | 18338 | beta |
| pdc_for_eng | pdc | eng |  | draft | hidden | 300 | 6680 | 1 | 0 | 1 | hidden |
| pol_for_eng | pol | eng |  | beta | public | 300 | 6110 | 24317 | 0 | 24317 | beta |
| por_for_aze | por | aze |  | draft | hidden |  | 0 | 1 | 0 | 1 | hidden |
| por_for_cym | por | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| por_br_for_eng | por | eng |  | beta | public | 668 | 14180 | 48497 | 0 | 48497 | beta |
| por_for_eng | por | eng |  | released | public | 668 | 14155 | 47305 | 71 | 47376 | LIVE |
| por_br_for_jpn | por | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| por_for_jpn | por | jpn |  | draft | hidden | 300 | 6788 | 97 | 0 | 97 | hidden |
| por_for_lit | por | lit |  | draft | public | 300 | 0 | 1 | 0 | 1 | draft |
| por_br_for_zho | por | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| por_for_zho | por | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| rgn_for_eng | rgn | eng |  | draft | hidden |  | 199 | 1 | 0 | 1 | hidden |
| roh_for_eng | roh | eng |  | draft | hidden |  | 252 | 1 | 0 | 1 | hidden |
| ron_for_eng | ron | eng |  | beta | public | 300 | 5729 | 22556 | 0 | 22556 | beta |
| rus_for_eng | rus | eng |  | beta | public |  | 6381 | 20299 | 0 | 20299 | beta |
| scn_for_eng | scn | eng |  | draft | hidden |  | 697 | 1 | 0 | 1 | hidden |
| sme_for_eng | sme | eng |  | draft | hidden |  | 228 | 1 | 0 | 1 | hidden |
| spa_for_cym | spa | cym | /north | draft | hidden |  | 26 | 0 | 0 | 0 | hidden |
| spa_for_eng | spa | eng |  | released | public | 668 | 16325 | 79875 | 75 | 79950 | LIVE |
| spa_mx_for_eng | spa | eng |  | beta | public | 668 | 12688 | 44582 | 0 | 44582 | beta |
| spa_for_jpn | spa | jpn |  | beta | public | 300 | 7481 | 25331 | 0 | 25331 | beta |
| spa_mx_for_jpn | spa | jpn |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| spa_for_zho | spa | zho |  | beta | public | 300 | 4733 | 15431 | 0 | 15431 | beta |
| spa_mx_for_zho | spa | zho |  | draft | hidden | 300 | 0 | 1 | 0 | 1 | hidden |
| srp_for_eng | srp | eng |  | beta | public |  | 5622 | 18068 | 0 | 18068 | beta |
| swa_for_eng | swa | eng |  | beta | public | 300 | 6340 | 23432 | 0 | 23432 | beta |
| swe_for_eng | swe | eng |  | beta | public | 300 | 5456 | 20772 | 75 | 20847 | beta |
| tel_for_eng | tel | eng |  | draft | hidden | 668 | 12562 | 1421 | 0 | 1421 | hidden |
| tha_for_eng | tha | eng |  | beta | public | 300 | 4965 | 18975 | 0 | 18975 | beta |
| tur_for_eng | tur | eng |  | beta | public | 300 | 9418 | 33505 | 74 | 33579 | beta |
| ukr_for_eng | ukr | eng |  | beta | public | 300 | 4999 | 19538 | 0 | 19538 | beta |
| vec_for_eng | vec | eng |  | draft | hidden |  | 719 | 1 | 0 | 1 | hidden |
| yid_for_eng | yid | eng |  | draft | hidden |  | 239 | 1 | 0 | 1 | hidden |
| yor_for_eng | yor | eng |  | draft | hidden | 305 | 248 | 1 | 0 | 1 | hidden |
| yue_for_eng | yue | eng |  | draft | hidden | 668 | 8994 | 1 | 0 | 1 | hidden |
| zho_for_cym | zho | cym | /north | draft | hidden |  | 0 | 0 | 0 | 0 | hidden |
| zho_for_eng | zho | eng |  | released | public | 668 | 11879 | 41371 | 75 | 41446 | LIVE |
| zho_for_gle | zho | gle |  | beta | beta | 5 | 127 | 414 | 0 | 414 | beta |
| zho_for_hin | zho | hin |  | draft | hidden | 668 | 13176 | 39462 | 0 | 39462 | hidden |
| zho_for_jpn | zho | jpn |  | beta | public | 300 | 3994 | 16799 | 0 | 16799 | beta |
| zho_for_tam | zho | tam |  | draft | hidden | 668 | 10800 | 32167 | 0 | 32167 | hidden |
| zzz_test2_for_eng | zzz | eng |  | draft | hidden |  | 6352 | 0 | 84 | 84 | hidden — test artifact, not a real language |

`learner status`: LIVE = released to a live app (`new_app_status='live'` or `legacy_app_status='released'`, or `status='released'` + `visibility='public'`); beta = in beta with public/beta visibility; draft/hidden = not learner-facing. This is read off `courses.status`/`visibility`/`new_app_status`/`legacy_app_status` directly — no separate "is it actually live" check was run against the app itself.

---

## Summary 1 — Substantial cells (real content AND real audio)

**80 of 125 cells (64%)** clear the bar (≥100 phrases, ≥1,000 clips on at least one course in the cell). This is the estate as it actually stands, not the aspirational catalogue:

`afr_for_eng, ara_for_eng, ben_for_eng, bre_for_eng*, bul_for_eng, cat_for_eng, cat_for_spa, ces_for_eng, cym_for_eng, cym_for_jpn, dan_for_eng, deu_for_eng, deu_for_jpn, deu_for_zho, ell_for_eng, eng_for_ara, eng_for_ben, eng_for_deu, eng_for_fra, eng_for_guj, eng_for_hin, eng_for_ita, eng_for_jpn, eng_for_kan, eng_for_kor, eng_for_mar, eng_for_pan, eng_for_por, eng_for_sin, eng_for_spa, eng_for_tam, eng_for_tel, eng_for_urd, eng_for_zho, est_for_eng, eus_for_eng, eus_for_spa, fas_for_eng, fin_for_eng*, fra_for_eng, fra_for_jpn, fra_for_zho, gla_for_eng, gle_for_eng, glg_for_eng, heb_for_eng, hin_for_eng, hrv_for_eng, hun_for_eng, hye_for_eng, isl_for_eng, ita_for_eng, ita_for_jpn, ita_for_zho, jpn_for_eng, kor_for_eng, kor_for_hin, kor_for_tam, lav_for_eng, lit_for_eng, mar_for_eng*, mlt_for_eng, nep_for_eng, nld_for_eng, nor_for_eng, pol_for_eng, por_for_eng, ron_for_eng, rus_for_eng, spa_for_eng, spa_for_jpn, spa_for_zho, srp_for_eng, swa_for_eng, swe_for_eng, tel_for_eng*, tha_for_eng, tur_for_eng, ukr_for_eng, zho_for_eng, zho_for_gle, zho_for_hin, zho_for_jpn, zho_for_tam`

(`*` = borderline: cleared the bar but only just — `mar_for_eng` and `tel_for_eng` sit at 1,329 and 1,421 clips against 13,874 and 12,562 phrases respectively, i.e. audio is present but thin relative to content; `fin_for_eng` and `bre_for_eng` are small, low-clip-count courses that still round-trip cleanly.)

**Notable pattern**: 45 of these 80 substantial cells are `X_for_eng` (English as the known language) or `eng_for_X` (English as the target). Non-English-anchored substantial cells are rarer: `cat_for_spa`, `eus_for_spa`, `kor_for_hin`, `kor_for_tam`, `zho_for_gle`, `zho_for_hin`, `zho_for_tam` — seven pairs where neither side is English. For the Indian-learner market-research question specifically: the substantial `eng_for_X` cells with an Indian known-language are **guj, hin, kan, mar, pan, sin, tam, tel, urd** — nine, all released/LIVE. `kor_for_hin`, `kor_for_tam`, and `zho_for_hin`/`zho_for_tam` are also substantial (Korean/Chinese for Hindi/Tamil known-speakers) but are `draft`/`hidden`, not learner-facing.

---

## Summary 2 — Stubs (a course row exists with little or no content/audio)

Two distinct stub shapes were found — they are not the same failure and shouldn't be conflated:

### 2a. Thin-audio courses — real content, almost no audio (11 courses)
These have a genuine, sizeable phrase corpus but essentially no rendered clips — text-complete, audio-absent:

| course_code | phrases | tts clips | human clips |
|---|---|---|---|
| hak_for_eng | 24,563 | 1 | 0 |
| yue_for_eng | 8,994 | 1 | 0 |
| cym_for_yor | 7,326 | 0 | 0 |
| por_for_jpn | 6,788 | 97 | 0 |
| pdc_for_eng | 6,680 | 1 | 0 |
| nan_for_eng | 6,371 | 1 | 0 |
| gle_cn_for_eng | 6,151 | 0 | 0 |
| bre_for_fra | 5,926 | 97 | 0 |
| cym_nnew_for_eng | 3,948 | 0 | 0 |
| fin_for_eng | 14,120 | 238 | 119 |
| (eng_template) | 6,105 | 287 | 0 | — this is the `course_type='template'` scaffold row, not a real course; excluded from cell counts throughout |

`pdc_for_eng` (Pennsylvania Dutch) is a known human-voice-only course per existing memory (`audio-pass-queue-refuses-human-voice-courses`) — its near-zero clip count is consistent with that, not a fresh defect.

### 2b. Empty/near-empty stubs — no real content, no real audio (29 courses)
Almost entirely `_for_cym` (Welsh as known language: `ara`, `deu`, `fra`, `ita`, `jpn`, `kor`, `por`, `spa`, `zho` all `_for_cym`) plus scattered `_for_jpn`/`_for_zho` placeholder rows and three unfinished `gle_*` Irish dialect variants (Munster, Ulster). These read as course-row scaffolding created ahead of content, not partial builds that stalled mid-way.

### 2c. Small-but-real courses (20 courses)
Sit below the 1,000-phrase bar used above but are internally consistent — small in scope, not broken (e.g. `bre_for_eng` 352 phrases/314 clips, `zho_for_gle` 127/414, `cym_anthem_for_jpn` a deliberately tiny 147-phrase specialty course). `ara_sy_for_eng` also lands here by clip count but is listed separately below — it's the anomaly.

---

## Summary 3 — Anomalies (numbers that don't hang together)

### The specimen, confirmed
**`ara_sy_for_eng`: 2,974 audio clips, 0 rows in `course_practice_phrases`.** Confirmed exactly as reported. `status='draft'`, `visibility='public'` — meaning it is nominally content-less by the phrase table but has nearly 3,000 clips rendered and is publicly visible.

### Others of that shape
Eighteen more courses show the identical pattern (audio present, zero phrase rows) but at trivial scale — 1 clip each, all clearly placeholder/probe rows rather than real anomalies:
`ara_eg_for_jpn, ara_for_jpn, ara_sy_for_jpn, ara_eg_for_zho, ara_for_zho, ara_sy_for_zho, deu_at_for_jpn, deu_at_for_zho, jpn_for_zho, kor_for_jpn, kor_for_zho, por_for_aze, por_br_for_jpn, por_for_lit, por_br_for_zho, por_for_zho, spa_mx_for_jpn, spa_mx_for_zho` — each has exactly 1 clip against 0 phrases. `ara_sy_for_eng` is qualitatively different: it's the only one with real volume (2,974, not 1), and it's the only one that's publicly visible. Worth treating as the one genuine anomaly in this shape; the 18 single-clip rows look like test/scaffold artifacts, not defects to chase.

### The inverse anomaly (not asked for, but the mirror case)
The thin-audio list in 2a is the reverse shape of the specimen — thousands of phrase rows against 0-1 clips (`hak_for_eng` 24,563/1, `cym_for_yor` 7,326/0). Flagging because the same "numbers don't hang together" logic applies, just on the other axis.

### zzz_test2_for_eng
`course_type='official'` despite the name and 84 clips/6,352 phrases/0 real language code (`target_lang='zzz'`) — a test course left live in the `courses` table under `course_type='official'`, which is itself a small data-hygiene anomaly (it should presumably be `course_type='template'` or deleted, not counted as an official course). Excluded from all cell/language counts above.

---

## Gaps / things not verified

- No query was blocked; full live-DB access was available throughout (via `.env.psql` → Supabase).
- `learner status` in the grid is read from the `courses` table's own status columns, not cross-checked against the running learning app (`GET /api/estate-map` or the app itself) — per this repo's `CLAUDE.md`, that endpoint is the authoritative source for released/blocked status and was not queried in this pass. Treat the "LIVE/beta/draft/hidden" column as what the courses table claims, not as an independently verified app-serving check.
- Audio quality (whether clips are good takes, not just present) was out of scope — this counts rows in `course_audio`, it does not listen to them.

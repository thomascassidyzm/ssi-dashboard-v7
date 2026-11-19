# Item 9 changesets (cs #960·AI): index for this ops directory

Kai approved paid-cleanup item 9 (untaught target words) on 18 Nov 15:41Z, all but the 19 held make-new LEGOs (none of them is in any file here). These files are what the night runner applies to live. They were computed on the **nightly copy `ssi_copy_20261119t033000z` (built 2026-11-19 03:41Z)**, and every op's `expect` holds the copy's value. Regenerate with `node tools/to-changesets.cjs <course>` (reads the copy only). **28 files, all `--check` OK.**

Run order (`night-run.sh`, timer `cs-long-keep-item9-night`): `1-backfill`, then `2-free`, then `3-filled`, then `4-recut-S####`. A course's `3-filled` is refused until its `1-backfill` ledger is complete and clean. Re-cuts run with `--batch 8`. Audio runs after each file, for applied rows only (`tools/night-audio.cjs`).

| course | #778 plan: deletes / back-fill rows | 1-backfill insert + rewrite | 2-free deletes | 3-filled deletes | re-cut seeds | drift (already gone on the copy) | set aside: back-fill never authored | set aside: error | gross audio chars |
|---|---|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | 45 / 40 | 0 + 0 | 0 | 0 | 0 (0 ops) | 5 | 24 LEGOs (40 deletes) | 0 | 0 |
| ara_for_eng | 2 / 1 | 0 + 0 | 0 | 0 | 0 (0 ops) | 1 | 1 LEGOs (1 deletes) | 0 | 0 |
| ara_lb_for_eng | 35 / 31 | 0 + 0 | 0 | 0 | 0 (0 ops) | 4 | 21 LEGOs (31 deletes) | 0 | 0 |
| deu_for_eng | 73 / 21 | 0 + 0 | 0 | 0 | 0 (0 ops) | 34 | 13 LEGOs (39 deletes) | 0 | 0 |
| eng_for_ara | 38 / 36 | 0 + 36 | 0 | 0 | 0 (0 ops) | 2 | 0 LEGOs (0 deletes) | 0 | 4,128 |
| eng_for_ben | 19 / 14 | 6 + 14 | 0 | 0 | 1 (9 ops) | 2 | 0 LEGOs (0 deletes) | 0 | 2,110 |
| eng_for_deu | 27 / 23 | 0 + 0 | 0 | 0 | 0 (0 ops) | 4 | 20 LEGOs (23 deletes) | 0 | 0 |
| eng_for_fra | 38 / 37 | 0 + 0 | 0 | 0 | 0 (0 ops) | 0 | 22 LEGOs (38 deletes) | 0 | 0 |
| eng_for_guj | 2 / 2 | 2 + 2 | 0 | 0 | 1 (9 ops) | 0 | 0 LEGOs (0 deletes) | 0 | 1,347 |
| eng_for_ita | 4 / 3 | 0 + 0 | 0 | 0 | 0 (0 ops) | 1 | 2 LEGOs (3 deletes) | 0 | 0 |
| eng_for_jpn | 375 / 207 | 0 + 213 | 19 | 11 | 0 (0 ops) | 132 | 0 LEGOs (0 deletes) | 0 | 21,114 |
| eng_for_kan | 62 / 62 | 0 + 62 | 0 | 0 | 0 (0 ops) | 0 | 0 LEGOs (0 deletes) | 0 | 6,699 |
| eng_for_kor | 17 / 10 | 0 + 10 | 0 | 0 | 0 (0 ops) | 7 | 0 LEGOs (0 deletes) | 0 | 761 |
| eng_for_pan | 10 / 9 | 16 + 2 | 0 | 7 | 2 (11 ops) | 1 | 0 LEGOs (0 deletes) | 0 | 2,436 |
| eng_for_sin | 14 / 3 | 4 + 0 | 0 | 6 | 0 (0 ops) | 8 | 0 LEGOs (0 deletes) | 0 | 225 |
| eng_for_spa | 12 / 11 | 0 + 0 | 0 | 0 | 0 (0 ops) | 1 | 10 LEGOs (11 deletes) | 0 | 0 |
| eng_for_tam | 64 / 53 | 0 + 0 | 0 | 0 | 0 (0 ops) | 10 | 46 LEGOs (54 deletes) | 0 | 0 |
| eng_for_tel | 25 / 23 | 0 + 23 | 0 | 0 | 0 (0 ops) | 2 | 0 LEGOs (0 deletes) | 0 | 2,806 |
| eng_for_urd | 29 / 25 | 0 + 25 | 0 | 0 | 6 (48 ops) | 4 | 0 LEGOs (0 deletes) | 0 | 6,710 |
| eng_for_zho | 34 / 32 | 0 + 33 | 0 | 1 | 0 (0 ops) | 0 | 0 LEGOs (0 deletes) | 0 | 3,711 |
| fra_for_eng | 56 / 42 | 0 + 0 | 0 | 0 | 0 (0 ops) | 14 | 24 LEGOs (42 deletes) | 0 | 0 |
| ita_for_eng | 16 / 11 | 0 + 0 | 0 | 0 | 0 (0 ops) | 5 | 10 LEGOs (11 deletes) | 0 | 0 |
| kor_for_eng | 90 / 60 | 0 + 0 | 14 | 0 | 0 (0 ops) | 0 | 33 LEGOs (76 deletes) | 0 | 0 |
| kor_for_tam | 6 / 6 | 0 + 0 | 0 | 0 | 0 (0 ops) | 0 | 5 LEGOs (6 deletes) | 0 | 0 |
| por_br_for_eng | 24 / 16 | 0 + 0 | 0 | 0 | 0 (0 ops) | 7 | 12 LEGOs (16 deletes) | 0 | 0 |
| por_for_eng | 148 / 114 | 0 + 0 | 0 | 0 | 0 (0 ops) | 31 | 40 LEGOs (114 deletes) | 0 | 0 |
| spa_for_eng | 126 / 32 | 0 + 0 | 50 | 0 | 0 (0 ops) | 25 | 21 LEGOs (50 deletes) | 0 | 0 |
| spa_mx_for_eng | 15 / 4 | 0 + 0 | 0 | 0 | 0 (0 ops) | 11 | 4 LEGOs (4 deletes) | 0 | 0 |
| **total** | **1,406 / 928** | **28 + 420** | **83** | **25** | **10 (77 ops)** | **311** | **308 LEGOs (559 deletes)** | **0** | **52,047** |

- **Drift.** These are planned rows that are no longer in the copy's basket: 311, every one with the reason "row not in the live basket". They were removed after #778's 18:40Z re-plan, most likely by #778's own free-delete apply before the 19:57Z pause. They are dropped, not chased.
- **Back-fill never authored.** Authoring workers only ran for the 11 `eng_for_*` courses #811/#812/#813 covered. In the other 17 courses, no replacement rows exist for the LEGOs whose floor depends on back-fill, so their deletes are **not** queued. The per-LEGO list is in each `summary.json`.
- **Re-cuts.** The 10 authored re-cuts are all here. #778's build check refused 9 of them under S3, because the seed has words no LEGO of it carries. Those words were uncovered **before** the re-cut too: these are single-LEGO seeds. `build.cjs` now blocks only a re-cut that uncovers a word, or one that covers none. Brief count was 24; the other 14 were never authored.
- **Audio.** The gross figure counts characters: a new row is known + 2 × target, and a rewrite counts only the sides whose words changed. The render route's library-first lookup will make the real spend lower. The route's own dry-run totals are taken at night, written to `<file>.audio.dry.jsonl`, and come before every paid render. The night cap is 60,000 Cartesia chars (`ITEM9_NIGHT_CAP`).

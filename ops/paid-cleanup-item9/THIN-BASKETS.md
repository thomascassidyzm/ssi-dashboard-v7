# Item 9: thin baskets after the delete-only pass (cs #972·AI, 19 Nov)

Kai ruled at 19 Nov 12:25Z: *"I'd prefer to get the bad phrases out and have the baskets temporarily thin over having bad phrases in the course."* So the 559 deletes that #960·AI had set aside are now queued with no back-fill. That is 555 deletes on 307 LEGOs in 17 courses, in `<course>/changesets/5-thin.changeset.jsonl`. They run after #960's 28 files.

There is one hard limit (canon P30): a debut LEGO is never left with **zero** real practice phrases, and a bare-LEGO row does not count. Thin baskets are allowed. Computed on the nightly copy `ssi_copy_20261119t033000z`. Drift was 0, because this is the same copy #960 used.

**This is the back-fill worklist.** Each LEGO is listed with what it still needs to reach the floor (`phraseFloor`: seeds 1-3 need 1 BUILD + 1 USE; seed 4 onward needs 3 BUILD + 5 USE). The LEGO ids, texts and the counts it still needs are in `THIN-BASKETS.json`. No back-fill has been authored.

| course | deletes queued | LEGOs touched | debut below floor (above zero) | debut still at floor | not-new LEGO | held by P30: LEGOs (deletes) | drift |
|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | 40 | 24 | 24 | 0 | 0 | 0 (0) | 0 |
| ara_for_eng | 1 | 1 | 1 | 0 | 0 | 0 (0) | 0 |
| ara_lb_for_eng | 27 | 20 | 20 | 0 | 0 | 1 (4) | 0 |
| deu_for_eng | 39 | 13 | 13 | 0 | 0 | 0 (0) | 0 |
| eng_for_deu | 23 | 20 | 20 | 0 | 0 | 0 (0) | 0 |
| eng_for_fra | 38 | 22 | 22 | 0 | 0 | 0 (0) | 0 |
| eng_for_ita | 3 | 2 | 2 | 0 | 0 | 0 (0) | 0 |
| eng_for_spa | 11 | 10 | 10 | 0 | 0 | 0 (0) | 0 |
| eng_for_tam | 54 | 46 | 46 | 0 | 0 | 0 (0) | 0 |
| fra_for_eng | 42 | 24 | 24 | 0 | 0 | 0 (0) | 0 |
| ita_for_eng | 11 | 10 | 10 | 0 | 0 | 0 (0) | 0 |
| kor_for_eng | 76 | 33 | 33 | 0 | 0 | 0 (0) | 0 |
| kor_for_tam | 6 | 5 | 5 | 0 | 0 | 0 (0) | 0 |
| por_br_for_eng | 16 | 12 | 12 | 0 | 0 | 0 (0) | 0 |
| por_for_eng | 114 | 40 | 39 | 1 | 0 | 0 (0) | 0 |
| spa_for_eng | 50 | 21 | 21 | 0 | 0 | 0 (0) | 0 |
| spa_mx_for_eng | 4 | 4 | 4 | 0 | 0 | 0 (0) | 0 |
| **total** | **555** | **307** | **306** | **1** | **0** | **1 (4)** | **0** |

## Held because the basket would be empty (P30)

- **ara_lb_for_eng S0018L01** "we want" | بدنا: all 4 real rows use an untaught word (S0018L01U01, S0018L01U02, S0018L01U03, S0018L01U04). Deleting them would leave the debut with zero practice, so they stay in until back-fill (or a LEGO fix) is authored.

## The 25 "3-filled" deletes, now un-gated

These are in eng_for_jpn, eng_for_pan, eng_for_sin and eng_for_zho. They now run even if that course's back-fill drifts or is refused. They still come after its `1-backfill` file on the same night. I checked them on the copy as though **no** back-fill landed: none of the 17 LEGOs would be empty. 11 would be below the floor: eng_for_jpn S0210L04 (1B/5U), eng_for_jpn S0231L02 (3B/4U), eng_for_jpn S0232L01 (4B/4U), eng_for_pan S0033L01 (3B/4U), eng_for_pan S0053L02 (3B/4U), eng_for_pan S0128L02 (2B/4U), eng_for_pan S0133L02 (2B/3U), eng_for_pan S0206L02 (2B/4U), eng_for_pan S0220L01 (1B/4U), eng_for_sin S0094L01 (2B/5U), eng_for_sin S0205L01 (2B/3U). If their back-fill applies, these go back up to the floor.

## How it runs

- Each delete carries `expect` set to the copy's row text, so the applier sets aside any row that has changed on live.
- Each file has a `5-thin.guards.json` sidecar with the seed and LEGO text. `precheck-guards.cjs` checks those against live right before the apply. A mismatch is held, never forced.
- Run offline against the copy, the precheck held 0 rows.
- The files go through Popty's HTTP edit-batch door, so `recordContentEdit`'s `check-debut-practice --strict` exit hook (which fires only outside an HTTP request) does not run. The door has no floor check, so a thin basket is not refused there.
- No audio is needed and none is queued.

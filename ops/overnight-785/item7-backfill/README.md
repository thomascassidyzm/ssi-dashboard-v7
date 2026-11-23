# Item 7: item-9 back-fill for the 17 thin-basket courses (overnight #785·AK, cs #791·AK). NOT applied

Kai ruled on 19 Nov that thin baskets beat bad phrases, so #972·AI deleted untaught-word rows and left 307 debut LEGOs below the floor.
This directory holds the authored replacement rows. Each course has ONE night changeset of **inserts only**
(`<course>/changesets/backfill.changeset.jsonl`), a guards sidecar holding the copy's seed + LEGO text for Kai's live pre-check, and `summary.json`.
Every file passes `node tools/changeset/apply-changeset.cjs <file> --check`. **Nothing is applied, nothing is rendered, and no timer is armed.** The apply needs Kai's own Y.

Computed on QA copy `ssi_copy_20261123t033000z` (built 23 Nov 03:40Z). The worklist was recounted there (`tools/worklist.cjs`): 306 listed, 303 still short, and 3 already at floor.

| course | LEGOs short | rows | B / U | LEGOs to floor | still thin | gross audio chars if rendered |
|---|---|---|---|---|---|---|
| ara_eg_for_eng | 24 | 35 | 11 / 24 | 11 | 13 | 2,147 |
| ara_for_eng | 1 | 5 | 2 / 3 | 1 | 0 | 678 |
| ara_lb_for_eng | 20 | 36 | 14 / 22 | 10 | 10 | 2,119 |
| deu_for_eng | 13 | 31 | 20 / 11 | 13 | 0 | 1,908 |
| eng_for_deu | 20 | 47 | 21 / 26 | 20 | 0 | 4,715 |
| eng_for_fra | 21 | 50 | 21 / 29 | 19 | 2 | 4,848 |
| eng_for_ita | 2 | 4 | 2 / 2 | 2 | 0 | 317 |
| eng_for_spa | 10 | 16 | 10 / 6 | 10 | 0 | 1,319 |
| eng_for_tam | 44 | 22 | 9 / 13 | 9 | 35 | 1,831 |
| fra_for_eng | 24 | 60 | 25 / 35 | 12 | 12 | 5,678 |
| ita_for_eng | 10 | 28 | 11 / 17 | 10 | 0 | 2,449 |
| kor_for_eng | 33 | 28 | 12 / 16 | 0 | 33 | 1,622 |
| kor_for_tam | 5 | 6 | 0 / 6 | 5 | 0 | 399 |
| por_br_for_eng | 12 | 27 | 12 / 15 | 12 | 0 | 1,897 |
| por_for_eng | 39 | 104 | 19 / 85 | 13 | 26 | 8,484 |
| spa_for_eng | 21 | 42 | 22 / 20 | 13 | 8 | 3,786 |
| spa_mx_for_eng | 4 | 5 | 3 / 2 | 4 | 0 | 298 |
| **total** | **303** | **546** | **214 / 332** | **164** | **139** | **44,495** |

**Why so many are still thin.** This follows the rule "thin baskets over bad phrases"; nothing was padded.
- The build check refuses any target word or form not taught by that LEGO. For Korean and Arabic it matches **exact surface forms**, so most natural conjugations are refused. That is why kor_for_eng has 0 LEGOs at floor, and ara_eg/ara_lb about half.
- Many short LEGOs are **mis-cut or mis-glossed**, and no good row can carry them whole. Examples: kor_for_eng S0026L01 "is good=좋아요", S0026L03, S0027L02/L03 and S0200L02 "they say=해요"; fra_for_eng S0094L02 "way it will"; most of eng_for_tam's (Tamil word-salad glosses such as S0146L04 / S0148L04 / S0149L04).
  These need a LEGO fix, which is Kai's call. A back-fill cannot fix them.
- **Seed text mismatches found:** in eng_for_tam S0139 and S0140, the known side does not say the target. In fra_for_eng S0178, `bien que` is followed by the indicative ("bien que je voulais"), which is not correct French. No subjunctive is taught yet, so no new row was added there.
- fra_for_eng S0190L01 "ask=pose": "question(s)" is not taught until L02, so no natural row exists yet.

**Checks per row** (`ops/paid-cleanup-item9/tools/build.cjs`, run by `tools/to-changeset.cjs`):
- taught words only (the builder's own check);
- whole LEGO contained (P17);
- not the bare LEGO;
- no duplicate target in the basket;
- no known+target pair already anywhere in the course (`ITEM9_COURSE_DUP=1`, the item 8 lesson);
- ZUT course-wide.

Every row was also read by hand against the canon. Confidence:
- high: eng_for_* targets in English, and deu/spa/por/ita targets;
- medium: Arabic dialects, Korean and Tamil (known side).

**To apply later (Kai's Y)**, at night with the gate green, for each course:
1. Run `node ops/paid-cleanup-item9/tools/precheck-guards.cjs <file>` (live seed + LEGO pre-check; a mismatch is held, never forced).
2. Run `node tools/changeset/apply-changeset.cjs <file> --key kai --agent kai-<job>`.
3. Queue the audio pass: `node tools/course-optimization/queue-audio-pass.cjs <course> --reason "item 7 back-fill"`.

The render route is library-first, so real spend will come in below the gross figure.

Regenerate (copy only, no DB writes):
- `node ops/paid-cleanup-item9/tools/copy-live.cjs <course> <dir>`
- `ITEM9_LIVE_DIR=<dir> node tools/worklist.cjs`
- author `<course>/authored/S####.json` (`AUTHOR-BRIEF.md`)
- `ITEM9_LIVE_DIR=<dir> node tools/to-changeset.cjs [--dry] <course>`

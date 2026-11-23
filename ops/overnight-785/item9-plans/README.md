# Item 9: cleanup items 18 / 16 / 14, fix plans only, nothing applied (overnight #785·AK, cs #791·AK)

Counts are from the committed recount (`ops/paid-cleanup-717/tools/recount.cjs`) on QA copy `ssi_copy_20261123t033000z`, run with
`P717_SNAP=… P717_RECOUNT_OUT=…` (see `../item8-census/README.md`). Every scripted fix is a PROPOSAL for Kai's Y/N (his 18 Nov rule).

| item | defect | size (23 Nov copy) | audio | plan |
|---|---|---|---|---|
| 18 | same row twice in one basket | 3,761 rows / 2,556 LEGOs / 34 courses | 0 | https://watson-1.tail4968cb.ts.net:10000/d/d58f19f3 |
| 16 | wrong NEW flag | 652 LEGOs (189 taught twice, 463 not-new never taught) | 0 for rule 1; ≈3.4k for real make-NEW | https://watson-1.tail4968cb.ts.net:10000/d/ed89648a |
| 14 | question mark on one side only | 2,881 rows (≈1,263 real per #447) | ≈21.2k Cartesia after the reading pass | https://watson-1.tail4968cb.ts.net:10000/d/6e9f4b92 |

Sources: `item-18-same-row-twice.md`, `item-16-wrong-new-flag.md`, `item-14-question-mark-one-side.md`.

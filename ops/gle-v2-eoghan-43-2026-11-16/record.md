# gle_v2: Eoghan's line on the 43 "no reason recorded" seeds (cs #343·AI, 16 Nov 2026)

Every batch: built by `plan.py` from a fresh Popty `GET /api/production/gle_v2_for_eng/seeds`, checked by `check.py`
(gaps, 8 syllables, phrase contains its LEGO, untaught words, duplicates, one English two Irish), dry run, then applied by
`post.py` through `POST :3470/api/production/gle_v2_for_eng/edit-batch`. `<batch>-apply.json` keeps the undo ops.

| Batch | Seeds | Ops | Event |
|---|---|---|---|
| A (probe) | 7, 36, 38, 247 | 145 | 399cead4 |
| B | 61, 69, 77, 102 | 69 | bb8739b0 |
| C | 142, 147, 148 | 112 | 638e44f9 |

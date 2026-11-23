# Item 8: paid-cleanup item 12 duplicate census (overnight #785·AK, cs #791·AK)

**Question.** Paid-cleanup item 12 (#957·AI changesets, #964·AI seed fixes, #976·AI follow-up, 19-21 Nov) added each seed sentence as a
practice row where no played row said it. How many of those rows duplicate a phrase the course already had?

**Answer (QA copy `ssi_copy_20261123t033000z`, built 2026-11-23 03:40Z, 48 courses):** of 4,330 item-12 inserts, 4,129 are on the copy
(eng_for_sin's 188 were held whole by #957; 5 por_br + 5 spa seed-fix rows were undone by #964 on Kai's hold; 3 others missing).
- **0** are an exact duplicate (same known AND same target) of another row in their own basket. The #957 planner avoided that.
- **1,259** have the **same target** as an older row in the same basket, under a **different known prompt** (e.g. eng_for_zho
  S0013L02U09 "你英语说得很好" vs U01 "你说英语很好", both → "You speak English very well"). The learner hears one target twice with two
  prompts. In nearly every sample the older row was a near-paraphrase of the seed whose known side drifted, which is why item 12 counted the seed as unplayed.
- **4** duplicate a played row in another basket (eng_for_tam 2, fra_for_eng 2); **1** equals a LEGO pair (deu_for_jpn, one-LEGO seed).
- **2,868** are clean.

Per-course detail with every row and its twin: `out/<course>.json` (`same_target[]`: id, known, target, twin, twin_known).

| course | item-12 inserts | on copy | same basket exact | same target, other prompt | cross basket | clean |
|---|---|---|---|---|---|---|
| ara_eg_for_eng | 76 | 76 | 0 | 17 | 0 | 59 |
| ara_for_eng | 37 | 37 | 0 | 26 | 0 | 11 |
| ara_lb_for_eng | 72 | 72 | 0 | 19 | 0 | 53 |
| deu_at_for_eng | 68 | 68 | 0 | 13 | 0 | 55 |
| deu_ch_for_eng | 41 | 41 | 0 | 10 | 0 | 31 |
| deu_for_eng | 2 | 2 | 0 | 1 | 0 | 1 |
| deu_for_jpn | 47 | 47 | 0 | 14 | 0 | 33 |
| deu_for_zho | 60 | 60 | 0 | 2 | 0 | 58 |
| eng_for_ara | 50 | 50 | 0 | 6 | 0 | 44 |
| eng_for_ben | 145 | 145 | 0 | 35 | 0 | 110 |
| eng_for_deu | 55 | 55 | 0 | 7 | 0 | 48 |
| eng_for_fra | 47 | 47 | 0 | 1 | 0 | 46 |
| eng_for_guj | 99 | 99 | 0 | 45 | 0 | 54 |
| eng_for_hin | 261 | 261 | 0 | 20 | 0 | 241 |
| eng_for_ita | 41 | 41 | 0 | 5 | 0 | 36 |
| eng_for_jpn | 118 | 118 | 0 | 33 | 0 | 85 |
| eng_for_kan | 271 | 271 | 0 | 49 | 0 | 222 |
| eng_for_kor | 54 | 54 | 0 | 36 | 0 | 18 |
| eng_for_mar | 108 | 108 | 0 | 33 | 0 | 75 |
| eng_for_pan | 194 | 194 | 0 | 68 | 0 | 126 |
| eng_for_por | 69 | 69 | 0 | 26 | 0 | 43 |
| eng_for_sin | 188 | 0 | 0 | 0 | 0 | 0 |
| eng_for_spa | 84 | 84 | 0 | 12 | 0 | 72 |
| eng_for_tam | 200 | 199 | 0 | 85 | 2 | 114 |
| eng_for_tel | 153 | 152 | 0 | 53 | 0 | 99 |
| eng_for_urd | 166 | 166 | 0 | 68 | 0 | 98 |
| eng_for_zho | 100 | 100 | 0 | 75 | 0 | 25 |
| fra_ca_for_eng | 21 | 20 | 0 | 11 | 0 | 9 |
| fra_for_eng | 12 | 12 | 0 | 3 | 2 | 7 |
| fra_for_jpn | 94 | 94 | 0 | 17 | 0 | 77 |
| fra_for_zho | 48 | 48 | 0 | 11 | 0 | 37 |
| ita_for_eng | 2 | 2 | 0 | 1 | 0 | 1 |
| ita_for_jpn | 107 | 107 | 0 | 49 | 0 | 58 |
| ita_for_zho | 54 | 54 | 0 | 11 | 0 | 43 |
| jpn_for_eng | 143 | 143 | 0 | 29 | 0 | 114 |
| kor_for_eng | 116 | 116 | 0 | 13 | 0 | 103 |
| kor_for_hin | 111 | 111 | 0 | 34 | 0 | 77 |
| kor_for_tam | 183 | 183 | 0 | 101 | 0 | 82 |
| por_br_for_eng | 38 | 33 | 0 | 4 | 0 | 29 |
| por_for_eng | 0 | 0 | 0 | 0 | 0 | 0 |
| spa_for_eng | 7 | 2 | 0 | 0 | 0 | 2 |
| spa_for_jpn | 71 | 71 | 0 | 42 | 0 | 29 |
| spa_for_zho | 66 | 66 | 0 | 14 | 0 | 52 |
| spa_mx_for_eng | 102 | 102 | 0 | 29 | 0 | 73 |
| zho_for_eng | 26 | 26 | 0 | 17 | 0 | 9 |
| zho_for_hin | 84 | 84 | 0 | 23 | 0 | 61 |
| zho_for_jpn | 64 | 64 | 0 | 18 | 0 | 46 |
| zho_for_tam | 175 | 175 | 0 | 73 | 0 | 102 |
| **total** | **4,330** | **4,129** | **0** | **1,259** | **4** | **2,868** |

## How it was made (regenerate on a newer copy)
```
S=~/ssi-evidence/ssi-dashboard-v7/ops/overnight-785/item8-census/snap
for c in <48 courses in ops/paid-cleanup-717/tools/lib.cjs COURSES>; do node tools/paid-cleanup-717/snapshot.cjs $c $S/$c.json; done   # committed, unchanged; db shim -> QA copy
P717_SNAP=$S node ops/overnight-785/item8-census/dup12.cjs ops/overnight-785/item8-census/out                                        # JSON only
P717_SNAP=$S P717_RECOUNT_OUT=~/ssi-evidence/ssi-dashboard-v7/ops/overnight-785/item8-census/recount node ops/paid-cleanup-717/tools/recount.cjs   # item 14/16/18 recount, same copy
```
**Gap, stated plainly:** no committed tool answered "which duplicates are item 12's" as-is. `recount.cjs` counts item 18 duplicates but
does not know which rows item 12 inserted. `dup12.cjs` is new: it joins the committed snapshot with the item-12 op files and reads **no database**.
The snapshot reader and the item-12 kit's `load()`/`key()` are committed and unchanged. The kit only gained the env overrides `P717_SNAP`
and `P717_RECOUNT_OUT`, so the 19 Nov snapshots and recount stay as they were.

## Feeds item 7
The item 7 back-fill check (`ITEM9_COURSE_DUP=1` in `ops/paid-cleanup-item9/tools/build.cjs`) refuses any authored row whose known+target pair
already exists anywhere in the course, and any row whose target is already in its basket.

## Kai's call (one word)
The 1,259 same-target pairs: **delete-old** (recommended: drop the older paraphrase row, keep item 12's row, which carries the seed's
own prompt and clips), **delete-new** (undo the item-12 row), or **keep** (two prompts for one target are legal under ZUT, which runs
known→target). Any of these is a scripted fix of item-18 shape, so it needs his specific Y (18 Nov rule).

# item10 queue — PLAN ONLY, nothing applied (updated cs #931·AI, 19 Nov ~11:30Z)
Reads: nightly copy only (copy-read.cjs). Dry runs: edit door, no apply, gated. See BRIEF.md "Database rule".
The old FREEZE (dbslot go-file, cs-long-keep-item10-storehold) no longer gates this kit: nothing here touches live except the dry run.

## DRY RUNS ARE HEAVY SINCE 11:00Z 19 NOV — run them at night, chunk 10
cs #937 (landed 11:00:11Z) makes every edit-batch that changes a LEGO recompute that slot's word tiles across the course
INSIDE the transaction. Same plans before/after: eng_for_ita 33 ops 10.8 s (10:04Z) -> 27-37 s per 10 ops (11:2xZ);
zho_for_jpn 50 ops ~10 s (18 Nov) -> 158 s, then two 50-op chunks hit the 60 s statement timeout (409, code 57014) while
the gate sat amber. Use `--chunk 10`, in quiet hours (22:00-07:00 UK), one course at a time.

## Status per plan (validator = course-builder checks in process on copy ssi_copy_20261119t033000z)
| plan | seeds | ops | plan vs earlier | validator NEW issues | dry run | audio (upper bound) |
|---|---|---|---|---|---|---|
| plans/zho_for_eng.json (#714·AI) | 3-49 | 350 | kept as #714's | none (copy) | 200, 18 Nov (live) | in 37-450 figure* |
| shard-zho-37-450 (#741·AI) | 37-450 | 938 | identical | **57 of 98 seeds** (BUILD floor 51, vocab 32) | not run: fails validator | ≈28,595 |
| plans/zho_for_eng-b.json (#742·AI) | 451-663 | 915 | identical | **58 seeds** (BUILD floor 61, vocab 8) | not run: fails validator | ≈24,099 |
| plans/zho_for_jpn.json (#743·AI) | 1-150 | 401 | identical | 91, 122 (same as live 18 Nov) | PARTIAL: chunk 1 200, chunks 2-3 409 timeout (post-#937); 4-9 not sent | ≈8,743 |
| plans/zho_for_jpn-b.json (#743·AI) | 151-300 | 587 | 1 expect fixed (row corrected since 18 Nov) | 90 only (live 18 Nov said 90, 283) | not yet | ≈13,599 |
*#714's 3-49 overlaps #741 on seeds 39-49 (8 LEGOs) and `rescued-714-uncommitted/` (seeds 3-69) overlaps it further: pick one plan per LEGO before any apply.

Next, in order (plan only):
1. zho_for_jpn 1-150 and 151-300: `python3 -I tools/dryrun.py zho_for_jpn --chunk 10` then `... --tag -b --chunk 10`, at night.
2. #741 37-450 and #742 451-663: back-fill BUILD rows / fix vocab rows in the decisions files (the validator names each
   seed), re-plan, re-validate — content work for kai-gmail, then dry-run at night.
3. Then the shards never started:
jpn_for_eng
kor_for_eng + kor_for_tam + kor_for_hin
ara_lb_for_eng + ara_eg_for_eng
ara_for_eng + eng_for_ara
por_br_for_eng + por_for_eng
fra_ca/fra/spa/spa_mx/ita/deu/deu_ch _for_eng
eng_for_tam + eng_for_tel
eng_for_pan/ben/kan/guj/hin/mar/urd
eng_for_por/ita/spa/deu/fra/zho/kor/jpn
(#808·AI "CJK + Arabic" and #809·AI "eng_for_* + Romance" were dispatched on 18 Nov; #809 is done with tool changes only,
#808 still shows running at step 0 — neither left plans on its branch.)

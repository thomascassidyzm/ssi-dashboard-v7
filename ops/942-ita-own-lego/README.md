# 942-ita-own-lego: fix plan for the 132 Italian rows #937 could not tile-repair (cs #942, PLAN ONLY)

Nothing here has been applied to any database. `plan.tsv` is the per-row plan for Kai to approve.

How it was made (regenerates):

1. The 132 rows are the `SKIP_PARENT_UNLOCATABLE` rows in
   `~/ssi-evidence/ssi-dashboard-v7/ops/937-ita-tiles/<course>-changeset-plan-log.json` (#937's run).
2. Course context came from the nightly copy `ssi_copy_20261119t033000z` only, with the committed reader run unchanged:
   `node ops/paid-cleanup-scan-447/copy-read.cjs dump <course> $CS_SCRATCH/<eng|jpn>.json 700`.
3. `plan-rows.py` holds the hand-written decision for each of the 82 real practice phrases (does not regenerate: it is the judgement).
4. `check.py` tests every re-word against the dump: contains its whole LEGO, every Italian and English word taught at or
   before that LEGO, no known prompt with a second Italian answer anywhere in the course, no duplicate in its basket.
   Its only remaining output is "play" in six English prompts: the LEGO's English is "playing something else" and
   the seed's own L04 rows already say "to play something else".
5. `build.py <dir>` writes `plan.tsv` (reads the two dumps from `$CS_SCRATCH`, imports `lib.py` and `plan-rows.py` as `plan`).

Characters = Italian text x 2 (both target voice slots are filled on every row in the copy) + the known prompt when it changes.
Not done: no changeset file was drafted, no render dry run was made, the cast's voice names were not read (no committed copy reader gives them).

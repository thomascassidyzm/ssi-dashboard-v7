# 420-ita-own-lego-apply — the #942 own-LEGO plan, applied (cs #420·AK)

Changesets for the 82 actionable rows of `ops/942-ita-own-lego/plan.tsv` (75 re-words, 7 deletes; the 50 component
rows stay as they are), re-checked on the nightly copy `ssi_copy_20261122t033000z`: all 82 still had their 19 Nov text,
LEGO and seed, still lacked their LEGO, and still passed #942's learner checks (whole LEGO, every word taught by then,
no ZUT clash, no basket duplicate). None is in seed 108.

Regenerates (copy only, no live read):

    node ops/paid-cleanup-scan-447/copy-read.cjs dump <course> $CS_SCRATCH/<eng|jpn>.json 700
    node ops/paid-cleanup-scan-447/copy-read.cjs baskets <course> $CS_SCRATCH/<eng|jpn>-baskets.json all
    python3 ops/420-ita-own-lego-apply/rebuild.py $CS_SCRATCH/rebuilt.json      # HELD list, if any
    node ops/420-ita-own-lego-apply/mkchangesets.cjs $CS_SCRATCH/rebuilt.json $CS_SCRATCH
    node tools/changeset/apply-changeset.cjs ops/420-ita-own-lego-apply/<course>/changesets/own-lego-420.changeset.jsonl --check
    node ops/420-ita-own-lego-apply/validate-overlay.cjs reqs <course> <baskets.json> <req.json>
    node ops/paid-cleanup-scan-447/copy-read.cjs validate <course> <req.json> <ans.json>
    node ops/420-ita-own-lego-apply/validate-overlay.cjs diff <course> <req.json> <ans.json>

Night: `night-run.sh` (timer cs-long-keep-ita420-apply, 23:46 UTC), from the persistent worktree ~/.cs-long/ita420/popty.
Each applied batch's undo file is named in `<file>.applied.jsonl` there (untracked).

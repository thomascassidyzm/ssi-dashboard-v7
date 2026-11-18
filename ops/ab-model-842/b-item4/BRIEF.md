# A/B test (b), JUDGEMENT: item-4 filler-row rewrite, por_br_for_eng seeds 631-668, FILE-ONLY (cs #842·AI)

You are ONE ARM of a model A/B. A worker on another model gets this exact brief. Your rewrites will
be scored by the course-builder validator AND by a blind read of their Portuguese naturalness. Do the
job as well as you can.

## SETUP
In your worktree:
- `git fetch origin && git merge --no-edit origin/cs/759-resume-700-item4-filler-rows`
- `cd ops/paid-cleanup-item4`
- BLIND: before you look at anything else, delete the existing plans for seeds 631-668:
  `git rm -q por_br_for_eng/plans/S06{3[1-9],[45][0-9],6[0-8]}.json`, then commit
  ("A/B: clear 631-668 plans"). Never read those plans: not from git history, not from the cs/759
  branch, not from #759's reports. Another model wrote them and they are part of what you are
  scored against.
- Read `authoring-brief.txt` and `README.md` in this directory. They are your real instructions,
  with COURSE=por_br_for_eng, SEEDS=631-668, KNOWN=English, TARGET=Brazilian Portuguese.
  For house style, look at three plans BELOW 631 (e.g. S0620, S0625, S0630).

## THE SNAPSHOT: run every tool against the FROZEN copy
Run every tool with the frozen home, so that both arms read the identical course:
`HOME=/home/tomcassidy/ssi-evidence/ssi-dashboard-v7/ops/ab-model-842/frozen-home node tools/dump.cjs por_br_for_eng 631 668`
(and the same `HOME=…` prefix for `vocab.cjs` and `build.cjs`). The copy's sha256 starts 823b4dd4eb27a6e4.

## HARD LIMITS (breaking any of them voids the arm)
- FILE-ONLY: these are all forbidden — `fetch.sh`, `fetch-light.cjs`, `post.cjs` (in every mode),
  `run-queue.cjs`, any curl to :3470/:3471, any database access, any audio.
- Do the slice yourself; no sub-workers. Do not merge to main.

## DONE =
- `HOME=… node tools/build.cjs por_br_for_eng ab842-<arm>-631-668 631 668` ends with 0 errors.
- Save its full output to `por_br_for_eng/batches/ab842-<arm>-build.txt`.
- Commit plans/seen/batches (scoped adds) and push your branch.

REPORT: one paragraph covering deleted/rewritten/inserted counts from the final build, any
accept_gap or held rows, and build errors/warnings. End with the landing line.

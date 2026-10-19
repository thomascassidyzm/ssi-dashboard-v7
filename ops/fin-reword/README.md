# fin_for_eng reword proposals (job #226, 19 Oct 2026) — PROPOSALS ONLY, nothing applied

Kai's ruling (19 Oct): fix the #164·T proofread findings by REWORDING each row using only
word forms already taught at that point in the course, never by correcting to an
untaught form. These files are the fan-out's shared state, kept here so an apply job can use them.

- `brief.txt` — the brief all seven workers ran (#231·T–#237·T).
- `items.json` — the 441 findings (from ~/ssi-evidence/ssi-dashboard-v7/fin-proofread/merged.json, deduped), ids F001–F441.
- `shard-*.json` → `out/*.json` — each worker's input and output.
- `all-proposals.json` — the seven outputs together.
- `build-edits.cjs` → `edits.json` (one edit per row; where a row is rewritten both alone and inside a
  seed/LEGO cascade, the cascade wins) + `superseded.json` (the losing standalone versions).
- `merge-fixes.json` — knock-on rows I fixed at merge (forms another shard's seed/LEGO change stopped teaching).
- `edits-final.json` — edits.json + merge-fixes: the set the whole-set check judged.
- `world.json` — output of `node tools/course-optimization/fin-available-forms-2026-10-19.cjs world <dump> edits-final.json`.
- `build-review.cjs` → `review-items.json` → the review pages listed in `review-urls.json`.

NOT regenerable as-is: the scripts read `./fa.cjs` (a copy of
tools/course-optimization/fin-available-forms-2026-10-19.cjs) and the live dump
`live-2026-10-19.json` (15 MB, GET http://localhost:3470/api/production/fin_for_eng/seeds on 19 Oct,
not committed). A fresh dump reflects the course as it is when you fetch it, so re-run
`world` against it before applying anything.

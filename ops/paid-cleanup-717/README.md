# paid cleanup #717 — items 12/14/15/16/18 (Kai approved 18 Nov)

Regenerates: `node tools/paid-cleanup-717/snapshot.cjs <course> ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap/<course>.json`
(nightly QA copy, read-only, env from ~/ssi-restore/qa-copy-fresh.env) → `tools/recount.cjs` → `recount/` → `tools/plan12.cjs` → `item12/<course>/plan.json`.

Does NOT regenerate: `item*/<course>/events.json`, `refused.json`, `post-*.json` — the applied events and their undo ops.
Undo one: POST :3470/api/production/<course>/edit-batch {"undo_file":"…","apply":true}.

`scan-rows-447-real.json` holds the #447 scan's real-verdict rows (from origin/cs/482 ops/paid-cleanup-scan-447). It is used
to skip rows that sibling families 3-9 own.

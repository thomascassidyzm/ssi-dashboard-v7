# paid cleanup #717 — items 12/14/15/16/18 (Kai approved 18 Nov)

Regenerates: `node tools/paid-cleanup-717/snapshot.cjs <course> ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap/<course>.json`
(nightly QA copy, read-only, env from ~/ssi-restore/qa-copy-fresh.env) → `tools/recount.cjs` → `recount/` → `tools/plan12.cjs` → `item12/<course>/plan.json`.

Does NOT regenerate: `item*/<course>/events.json`, `refused.json`, `post-*.json` — the applied events and their undo ops.
Undo one: POST :3470/api/production/<course>/edit-batch {"undo_file":"…","apply":true}.

`scan-rows-447-real.json` holds the #447 scan's real-verdict rows (from origin/cs/482 ops/paid-cleanup-scan-447). It is used
to skip rows that sibling families 3-9 own.

## #914·AI resume, 19 Nov — state
Snapshots, `recount/` and `item12/*/plan.json` regenerated from `ssi_copy_20261119t033000z`. Nothing written to live.
- Item 12: 4,329 rows / 17,316 ops in 47 courses — far past a daytime light job, so NOT applied. Each course has
  `item12/<course>/item12.changeset.jsonl` (`tools/to-changeset.cjs`), all 47 pass `apply-changeset.cjs --check`.
  Apply at night: `node tools/changeset/apply-changeset.cjs ops/paid-cleanup-717/item12/<course>/item12.changeset.jsonl --key kai --agent kai-914`.
- Items 14 (2,883 rows), 16 (645 LEGOs), 18 (3,775 same-basket + 2,603 cross-basket): counts only, in `recount/`.
  Too heavy to apply by day, and Kai's 18 Nov 22:03Z ruling bars scripted fix plans without his specific OK.
- Item 15 (86 formal rows in deu/deu_at/deu_ch/fra_ca/ita): rewording + new audio; no renders in this job. Held.

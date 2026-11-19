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
- Kai's live pre-check rule (19 Nov 10:38Z) applies to these changesets: `item12/<course>/precheck.json` (`tools/precheck12.cjs`)
  holds, per planned row, the seed (texts + 3 clip ids) and home LEGO (texts + is_new) it was built on. `apply-changeset.cjs`
  checks neither the LEGO nor the seed, so DO NOT run the item 12 changesets with it as it stands: first pre-check each
  batch on live against precheck.json (hold mismatches) — or add that step to the applier.

## #957·AI, 19 Nov — item 12 spot-checked and scheduled (Kai yes, 12:02Z)
- `item12/SPOTCHECK.md`: 26 rows dropped from 15 files (the header's `dropped` lists them), eng_for_sin held whole. 47/47 pass `--check`.
- `item12/night-run.sh` runs nightly from the user timer `cs-long-keep-item12-night.timer` (22:30 UTC), in the persistent
  worktree `~/.cs-long/item12/popty` (never recreate it: the `.applied.jsonl` ledgers live there). Once all are done it disables itself.
- Kai's live pre-check is enforced only as far as the applier's door enforces it (phrase.insert refuses an existing id).
  Seed/LEGO drift since the copy is NOT re-checked against precheck.json; see the #957 report.
- NEVER edit a changeset after its first night: the ledger records ops by line index.

## #964·AI, 19 Nov — the seeds #957 held, fixed live
- `item12-seed-fixes/`: `plan.py` (from the copy) → `plan.json`; `render.py` → `renders.json` (clip per text, or the existing
  clip named by EXISTS_IN_LANGUAGE); `batch.py` → `batches/<course>.json`; `send.sh` (MODE=dry|apply, Kai key) → `applied/<course>.json`
  (event id + undo file: POST …/edit-batch {"undo_file": …, "apply": true}). eng_for_tam was sent by hand (its applied file).
- Item 12 seed rows for these seeds were re-added there (or already said by an existing phrase); the item 12 changesets are untouched.

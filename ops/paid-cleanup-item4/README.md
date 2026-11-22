# paid cleanup item 4: filler and template practice rows (cs #700·AI, 18 Nov 2026)

Shared work dir for #700·AI and its children. Kai approved item 4 of the combined list (d/23c5a220):
remove the generator filler, back-fill real phrases from taught words, every touched NEW LEGO keeps
3+ real BUILDs and 5+ USEs, everything passes the course-builder validator, audio later and centrally.

## What is here and what regenerates
- `scan-rows-2026-11-17.json` — the 2,249 item-4 rows, cut from branch cs/482 reports (does not regenerate; it is the scan).
- `tools/` — everything talks to Popty routes only (no DB code):
  - `fetch.sh <course>`: live course via `GET :3470/api/production/<course>/seeds` → `~/ssi-evidence/.../paid-cleanup-item4/live/` (regenerates; re-run before every build).
  - `dump.cjs <course> <from> [to]`: baskets with scan marks (`*T1a` …), `TODAY`, `bare`, `noaudio`; writes `<course>/seen/`.
  - `vocab.cjs <course> <seed> [regex]`: every LEGO taught up to that seed.
  - `build.cjs <course> <batch> <from> <to>`: `<course>/plans/S####.json` → ops + validator overrides + pre-check
    (course-builder's own containment / vocab / floor functions, ZUT course-wide, collision rules).
  - `post.cjs baseline|validate|dry|apply|after`: `:3471 /api/v2/validate` (with override, nothing written),
    `:3470 edit-batch` dry run, apply (event id + undo saved), whole-course after-check.
- `<course>/plans/` — the decisions, one file per seed (authored by hand; does not regenerate).
- `<course>/batches/` — ops, check, validate, dry, apply, undo per batch. `<course>/events-<owner>.json` — applied events.
- `<course>/collide.json` — rows/LEGOs another job owns (build refuses them).

## Workflow per batch (5–10 seeds)
fetch → dump the seeds → read and write plans → build (0 errors) → post validate (0 blocking) → post dry → post apply → commit.
After the last batch of a course: `post.cjs after <course>` → `validate-diff.json`.
Undo: `POST /api/production/<course>/edit-batch {"undo_file":"<name from the apply>","apply":true}`.

## cs #358 (22 Nov): the rest, applied by night changeset
- `status-358.json` per course: live vs planned per seed. por_br 469-668 went live on 18 Nov 18:49-19:29Z (queue c) but its
  record was lost with the #759 worktree; `por_br_for_eng/events-759c-recovered.json` rebuilds it from Popty's undo files.
- Planning reads the NIGHTLY COPY: `ITEM4_LIVE_DIR=<dir>` (snapshot by `ops/paid-cleanup-item9/tools/copy-live.cjs`);
  `post.cjs cvalidate|cafter` run the course-builder's /v2/validate on the copy (no live read, any hour).
- `tools/to-changesets.cjs <course>` → `<course>/changesets/r358.changeset.jsonl` + `.guards.json` (Kai's seed+LEGO pre-check,
  checked by item 9's `precheck-guards.cjs`). Never rebuilt after its first night (the ledger keys ops by line).
- `tools/audio-backlog.cjs` → `<course>/changesets/backlog-358.slots.json`: slots item 4's 18 Nov rows left silent (copy).
- `night-run.sh` (timer `cs-long-keep-item4-358.timer`, 22:05 UTC, persistent worktree `~/.cs-long/item4-358/popty`):
  pre-check → governed applier (por_br, then eng_for_mar) → `tools/night-audio.cjs` (seed order, 200k Cartesia cap in total,
  spend file `~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/cartesia-spend.json`, reserved in the a2c `fixes.json`).

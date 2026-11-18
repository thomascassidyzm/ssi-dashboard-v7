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

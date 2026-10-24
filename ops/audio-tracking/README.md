# ops/audio-tracking — job #338 (one live clip per text; Drill cut from the pod)

Shared work product, committed per Tom's 2026-10-09 ruling. Read-only census outputs and DRY-RUN fix lists; nothing here has been applied.

- `PLAN.md` — the plan page (published for Tom).
- `census-all.md`, `census-zho_for_eng.{md,json}` — `tools/audio/live-clip-census.cjs` on the QA copy, 2026-10-24. `census-all.json` (5 MB) is NOT committed; regenerate it:
  `set -a; . ~/ssi-restore/qa-copy.env; set +a; node tools/audio/live-clip-census.cjs --json ops/audio-tracking/census-all.json --md ops/audio-tracking/census-all.md`
- `dryrun-*.json` — `node tools/audio/live-clip.cjs plan --census ops/audio-tracking/census-all.json --out ops/audio-tracking/`.
  `dryrun-recut-drill.json` carries each row's current `sentence_audio_ids` (the ROLLBACK for step A);
  `dryrun-consolidate-forks.json` carries every clip id a repoint would move away from (rollback for step B).
  These are a snapshot of 2026-10-24: regenerate before applying anything.

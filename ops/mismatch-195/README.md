# ops/mismatch-161 — missing-LEGO mismatch scoping harness (job cs/161, Kai, 30 Oct 2026)

Read-only scoping for the class "one side of a practice phrase carries a chunk of meaning the other side lacks, and no taught LEGO pairing explains it". Nothing here writes to any course.

- `prep.py <course.json> <out.jsonl> [--seeds a-b] [--every N]` — one judging unit per PLAYED basket (is_new LEGO, phrases with phrase_role != component) with the cumulative taught pairs up to that LEGO, FULL and FILTERED. Input = `GET /api/production/<course>/seeds` saved to a file (one Popty read per course; the snapshot is not committed, ~20 MB).
- `prompt.txt` — the judging prompt, verbatim.
- `judge.py <units.jsonl> <haiku|sonnet> <out.jsonl> [--ctx filtered|full] [--par N] [--limit N]` — runs the prompt through `claude --print` (never the SDK); resumable (skips baskets already in out).
- `score.py labels.json run.jsonl…` — precision/recall of DEFECT verdicts against hand labels.
- `census.py` — per-course played-basket / played-phrase counts from a directory of snapshots (`courses/*.json`); `census.json` is the 30 Oct 2026 result (157 courses).
- `labels.json` — the hand-labelled calibration set (36 baskets, 364 phrases, 5 positives), NOT regenerable.
- `adjudications.json` — hand adjudication of every DEFECT flag the Sonnet and Haiku sweeps raised, NOT regenerable.
- `sweeps/` — the model outputs of the calibration sweeps (regenerable, kept for the record).

The report that reads these is published on the surface (see the job's final message).

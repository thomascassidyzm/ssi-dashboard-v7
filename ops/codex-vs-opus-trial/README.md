# Opus vs Codex phrase-basket trial (#438·AD, 2026-11-05)

Files only. Nothing here writes to the database or renders audio.

- `legos.txt`: the 10 LEGOs, from `pick.cjs <course> 5 438` (fixed seed 438, new LEGOs at seed 21 or later).
- `run-pair.sh <course> <SnnnnLnn> <seed>`: one LEGO on both providers through `generate-v4 --provider claude|codex --lego`. It skips a provider whose run file already exists, so delete that file to regenerate.
- `claude/`, `codex/`: per-LEGO run files (`v4-*.json`), the raw candidates saved before gating, and `ledger.json` (per-call usage).
- `run.log`: output of the batch run.
- `build-doc.cjs` → `trial.md`: the side-by-side doc. It regenerates from the run files.

The course read cache (`script-view-<course>-<date>.json`) lives outside the repo, under `~/ssi-evidence/ssi-dashboard-v7/438-codex-vs-opus/cache`, and regenerates from Popty on a cache miss.

# plan-11-13-17-19 — PLAN ONLY (cs #784·AI, 18 Nov 2026). Nothing here has been applied, rendered or linked.
Paid-course cleanup items 11, 13, 17, 19 and the duplicate-LEGO pairs (source: ../COMBINED-FIX-LIST.md).
- `PLAN.md` — the walk document (regenerate by hand; it is authored).
- `<family>/decisions/<course>.json` — hand-authored proposals (do not regenerate). `<family>/plans/<course>.json` — built by
  `tools/plan.py` from the decisions (regenerates), carrying the validator and dry-run answers;
  `<family>/plans/<course>.changeset.jsonl` — the same ops for the one governed applier (written by a clean dry run).
- `data/scan-*.json` — the 17 Nov scan rows per family (`tools/extract_scan_rows.py`, regenerates).
- `data/copy/<course>.json` — every seed a proposal touches, as the NIGHTLY COPY holds it (`tools/copy_seeds.py <course> --same`
  regenerates). It replaced `data/live/` (cs #931·AI), which was a live per-seed read through Popty's script-view.
- `tools/` — `plan.py`, `validate.py`, `dryrun.py`, `price.py`, `roman.py` are item 10's tools with a family directory
  argument; `mkdump.py` makes the dump + snapshot from the nightly copy; `snap.py` are shared helpers.

## Database rule (cs #931·AI, 19 Nov — the planners were cancelled at ~10:20Z for reading live)
Every READ is from the NIGHTLY COPY through `../copy-read.cjs`, which refuses any database URL that is not the local
ssi_copy login. No Python, psql or other client reaches live; no Popty read route, no :3471 validate. The ONE call towards
live is the DRY RUN (`tools/dryrun.py`): POST /api/production/<course>/edit-batch WITHOUT "apply", chunks of at most 100
(default 50), paced, each chunk only while /health shows dbLoadGate governed + green. An all-200 dry run writes the
changeset and runs `node tools/changeset/apply-changeset.cjs <file> --check` (offline, zero DB). Never without `--check`.

```
python3 -I tools/mkdump.py <course>                                         # copy -> $CS_SCRATCH/dumps + snap
python3 -I tools/copy_seeds.py <course> <seed>...                           # data/copy/<course>.json
python3 -I item19/decisions/<course>.py                                     # item 19 cut list (gen.py) -> decisions json
python3 -I tools/plan.py item19 <course> $CS_SCRATCH/dumps/<course>.json
python3 -I tools/validate.py item19 <course> $CS_SCRATCH/dumps/<course>.json
python3 -I tools/dryrun.py item19 <course>
```

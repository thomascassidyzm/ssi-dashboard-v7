# ops/paid-cleanup-scan-447 — shared directory of the #447 paid-courses cleanup scan (17 Nov 2026)
Read-only scan; nothing here writes to a course. Kept in git because several jobs read and write it.
- `dump-course.py` — live course read through Popty's script-view route (regenerates; dumps are NOT committed).
- `detect.cjs` + `patterns.json` — mechanical and lexical CANDIDATE detectors (regenerates hits from a dump).
- `patterns.md` — the pattern catalogue, each detector's known positive, the gaps. Does not regenerate: it is the Stage 1/2 record.
- `candidate-counts-2026-11-17.txt` — detector counts per course on 17 Nov (candidates, not defects).
- `BRIEF-COMMON.md` — the common half of every worker brief. `partition.md` — slices, jobs, accounts.
- `reports/` — one file set per worker slice (on each worker's own branch until folded).

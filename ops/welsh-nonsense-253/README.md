# welsh-nonsense-253 (cs #253·AL, Kai 24 Nov)
Senseless practice-row scan over every cym_* course; only S0328L01B06 (cym_s + cym_sv2) deleted, everything else list-only (Kai's amendment 17:56Z).
- `prompt.md`, `classify.py` — the classifier (claude --print, sonnet). Regenerable: dumps (`copy-read.cjs dump <course> <out> 2000`), `classify.py units`, `classify.py run`.
- `calibrate.py`, `calibration/` — calibration against #249's known positives/negatives. Kept: results.
- `out/verdicts.jsonl` — the full run's flags (model output, NOT hand-confirmed). `handread.json` — the hand-read decisions. Not regenerable (the hand-read).
- `changeset-s0328.jsonl` — the two deletes. Undo files: written by the applier.

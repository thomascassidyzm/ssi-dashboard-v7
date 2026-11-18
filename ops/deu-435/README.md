# ops/deu-435 — deu_for_eng English↔German mismatch pass (job #435, Kai, 2026-10-29)

Shared work dir for the reader fan-out. Committed because several jobs read and write it.

- `print-shard.cjs <dump> <from> <to>` — prints every seed/LEGO/phrase pair in a seed range (regenerable).
- `taught.cjs <dump> <seed> <word…>` — is a word taught by that seed (regenerable).
- `shard-<from>-<to>.data.cjs` — one reader's verdicts: FIXES (clear-cut, applied by the job's apply tool after its gates),
  LEGO_SEED (proposals on LEGO/seed rows, judged by the parent), HOLDS (native-speaker questions). NOT regenerable:
  each is a model's full read of its range.
- The dump itself is not committed (20 MB); regenerate with
  `node tools/course-optimization/course-dump-readonly-2026-10-14.cjs deu_for_eng <out.json>`.

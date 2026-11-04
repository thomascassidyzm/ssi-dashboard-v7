# #219 — zho_for_eng #545 out-of-scope ("other") triage

Inputs: `items-191.json` (the 181 'other' holds + 10 'other' edit/deletes from decisions-*.json).
- `python3 apply219.py <seeds dump> apply-set.json` — bucket-1 edits/deletes, `before` taken from the dump.
- `python3 ov.py` (repo root) — writes ../overrides.json: demotes every A/B/C edit/delete, adds the bucket-1 set.
- then the committed tool `tools/course-optimization/zho-545-learner-feedback-2026-11-03.cjs check|apply|verify|render`.
- `classify219.py` → `record.json`: every one of the 191 items with its bucket (1 apply, 2 试试 for Tom, 3 Kai, ruled, after214).
- `ctx.py <dump> <ids…>` prints a row with its seed and whole basket (read-only, on a dump file).
Seeds dump = GET http://localhost:3470/api/production/zho_for_eng/seeds (regenerable; not committed).

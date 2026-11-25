# cs #375 — Welsh "na ddylen i / na ddylwn i" timing fix, v2 sandboxes only (applied 25 Nov 2026)

- `table.csv` — every row decided: move / delete / keep, with the reason.
- `apply.py` — the batch, through Popty's edit door only (live pre-check, dry run, apply). Expectations come from the 25 Nov 03:30Z QA copy, read with `tools/qa/known-target-mismatch/dump.cjs` unchanged.
- `readback.py` / `readback.txt` — live readback of every touched row (dry runs only).
- `undo/` — every dry run and apply response. To undo an apply: `POST /api/production/<course>/edit-batch {"undo_file":"<undo_file in the response>","apply":true}`.

Running order matters: both v2 courses play seeds 1–137, then the 1001–1668 block, then old 138+ (read from `GET /api/production/<course>/lego-proof/`). The "that … not" particle is first taught at S1313 in the block, so only rows at seeds ≤137 were early.
Held, not applied: the sv2 seed 117 text fix gwneud → wneud (it would unlink the seed's only Welsh take, 10f25262, before a corrected take exists).

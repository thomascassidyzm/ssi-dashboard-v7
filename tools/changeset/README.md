# tools/changeset — the one way a computed change reaches the live SSi DB (cs #835)

Tom, 2026-11-18: "There should be no need to write to the live database in a heavy way. We want a single db still but we need a clever way to update it."
Design: https://watson-1.tail4968cb.ts.net/d/973c9f34

1. **Plan on the nightly copy.** A worker's pg reads go there by default.
2. **Emit a changeset** with `services/shared/changeset.cjs`. Use `diffUpdates(...)` for updates and `op(...)` for inserts and deletes, then `write(file, {course, job, why}, ops)`. The changeset holds only the rows that differ, each with `expect` = what the copy held. Commit it in your job's tracked ops dir.
3. **Check it offline** (no DB): `node tools/changeset/apply-changeset.cjs <file> --check`
4. **Apply it** at night (22:00-07:00 UK): `node tools/changeset/apply-changeset.cjs <file> --agent <job-label>`. Kai's agents add `--key kai --agent kai-<job>`.
   - 25 ops per transaction through Popty's edit door, paced by the load governor.
   - Ledger: `<file>.applied.jsonl`. A re-run resumes from it.
   - A row whose live value already equals the target is skipped as `already`. A row someone changed since the copy is set aside as `drift` and never overwritten.
   - Each batch's undo file is named in the ledger: `POST /api/production/<course>/edit-batch {"undo_file": "<name>", "apply": true}`.
   - `--dry-run` rolls every batch back. It still loads live, so it also respects quiet hours.

Exit codes: 0 done · 1 stopped (re-run resumes) · 2 done with drift/refused ops to look at · 75 outside quiet hours.

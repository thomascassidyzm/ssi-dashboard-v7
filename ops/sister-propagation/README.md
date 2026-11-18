# ops/sister-propagation — cs #695·AI (Kai approved 18 Nov)

Carrying main-course fixes (scan family 7, d/23c5a220) to sister/dialect courses, plus Hindi-base fixes
to ben/guj/mar/pan/urd (family 20). One sub-directory per course (or per child job):

- `BRIEF-DIGEST.md` — the rules every worker on this job follows, and the TTS cap split.
- `<course>/plan.json` — rows re-read live, decision per row (apply / skip + reason + source).
- `<course>/ops-*.json` — edit-batch bodies posted to Popty.
- `<course>/dry-*.json` — Popty's dry-run answers (with character cost where priced).
- `<course>/audio-*.json` — render-route answers (dryRun first, then real), clip ids.
- `<course>/undo-*.json` — the undo Popty returned for each applied batch (post it back to revert).
- `<course>/readback.json` — live read-back after apply.
- `<course>/record.md` — what was applied, skipped and why, event ids, chars spent.
- `tools/` — small composers that call Popty HTTP routes only (no database access).

Nothing here regenerates the live state; the undo files are the way back besides Popty's event log.

# This tree is not documentation

Do not read anything here to find out how the system works. **The live code and the live database are the only sources of truth** (see `CLAUDE.md` at the repo root). Two retirement sweeps — 2026-08-24 and 2026-09-03 — moved the descriptive prose to `archive/`, with nothing deleted and all history intact.

What is left in `docs/` is **not** documentation:

- `pair-contracts/*.cjs` — required by the course-builder validator on every seed submission.
- `pods/*.md` and `pods/*.txt` — content globbed into the dashboard SPA, plus pod scripts parsed by `tools/pods/parse-pod-markdown.cjs`.
- `sector-pods/source/*.md` — conversation corpora read by the frame-layer tools.
- `explainer-*.md`, `frame-layer/dialogue-frame-inventory.md` — generated outputs.
- `gle-cn/`, `gle-ul/`, `gle-mu/` scripts and the Connemara dialect spec a live gate enforces.
- Files written since 2026-09-02, where jobs are still in flight.

**Do not add a new descriptive document here.** If you have learned something worth keeping about how or why the system works, put it in the code: a named function, a comment at the decision point, or best of all a test that asserts the rule.

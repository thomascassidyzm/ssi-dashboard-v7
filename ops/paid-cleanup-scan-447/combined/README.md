# combined/ — read-only recounts behind COMBINED-FIX-LIST.md (17 Nov 2026)
Input: live dumps from `../dump-course.py` (not committed; regenerate). Scripts read dumps and slice JSONs only; no database access.
- `fam.py` — maps every REAL slice row into a fix family → `family-totals-*.json`. Run from a dir holding `r/<slice>.json`.
- `untaught.cjs <dump> <out>` + `utx.py` — untaught-word recount at seed level (detector bug: first LEGO taken before seed) → `untaught-recount-*.json`.
- `empty.py <dumpdir> <courses…>` — empty audio slots on played rows, with same-words clip lookup across dumped courses → `empty-audio-live-*.json`.
- `popty-missing/` — Popty `GET /api/production/<course>/audio-pipeline/missing` answers (missing vs already-rendered-unbound), 17 Nov.

# plan-11-13-17-19 — PLAN ONLY (cs #784·AI, 18 Nov 2026). Nothing here has been applied, rendered or linked.
Paid-course cleanup items 11, 13, 17, 19 and the duplicate-LEGO pairs (source: ../COMBINED-FIX-LIST.md).
- `PLAN.md` — the walk document (regenerate by hand; it is authored).
- `<family>/decisions/<course>.json` — hand-authored proposals (do not regenerate). `<family>/plans/<course>.json` — built by
  `tools/plan.py` from the decisions (regenerates), carrying the validator and dry-run answers.
- `data/scan-*.json` — the 17 Nov scan rows per family (`tools/extract_scan_rows.py`, regenerates).
- `data/live/<course>.json` — today's LIVE read of every seed a proposal touches (`tools/live_seeds.py`; a re-run refreshes it).
- `tools/` — read-only. `plan.py`, `validate.py`, `dryrun.py`, `price.py`, `roman.py` are item 10's tools with a family
  directory argument; `mkdump.py` overlays the live seeds on the nightly QA-copy snapshot; `snap.py` are shared helpers.
  `dryrun.py` never sends `"apply": true`.

gle_v2_for_eng job #241 (11 Nov 2026): person endings (muid) and Eoghan clash reversals, applied through Popty edit-batch.

Hand-written, does not regenerate: fam_*.py (the decisions, one file per family), lib.py, check.py, build_ops.py.
Regenerates from those: decisions.json, ops.json (python3 build_ops.py, with CS_SCRATCH holding course.json built from Popty's GET /seeds, /seed/:n/baskets, /lego/:id/basket).
Written by the apply: apply-result.json (event id, undo file name), undo.json (post back to edit-batch to revert).

gle_v2_for_eng job #253 (11 Nov 2026): Eoghan's wording on 24 seeds (+ seed 105 for the 'an chúis' clash), applied through Popty edit-batch.

Hand-written, does not regenerate: fam_*.py (the decisions, one file per family), lib.py, check.py, build_ops.py, q.py, dry.py, verify.py.
Regenerates from those: decisions.json, ops.json (python3 build_ops.py, with CS_SCRATCH holding course.json built from Popty's GET /api/production/gle_v2_for_eng/seeds as read BEFORE the apply; after the apply the expect values no longer match, by design).
Written by the apply: apply-result.json (event ids, undo file names), undo/ (one file per chunk; post {"undo_file": name, "apply": true} to edit-batch, newest first, to revert).
Check that it is live: python3 verify.py against a fresh course.json.

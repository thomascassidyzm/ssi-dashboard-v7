gle_v2_for_eng job #403 (12 Nov 2026): Kai's 12 Nov rulings on the 15 open questions of #253, applied through Popty edit-batch in three rounds (small seeds, Q11 "have Irish", Q14 "happy").

Hand-written, does not regenerate: fam_small.py, fam_q11.py, fam_q14.py (the decisions, one file per round), lib.py, check.py, build_ops.py, q.py, dry.py, verify.py, mkcourse.py.
Per round: curl Popty GET /api/production/gle_v2_for_eng/seeds > $CS_SCRATCH/seeds.json; python3 mkcourse.py; FAMS=fam_<round> python3 check.py; FAMS=fam_<round> python3 build_ops.py; python3 dry.py dry ops.json; python3 dry.py apply ops.json apply-result-<round>.json.
Kept per round: ops-<round>.json, decisions-<round>.json (before/after of every row), apply-result-<round>.json (event ids), undo/ (one file per chunk; post {"undo_file": name, "apply": true} to edit-batch, newest first, to revert).
After an apply the expect values in that round's ops no longer match the live course, by design.
Recompute: python3 recompute.py [apply] (word-tile decompositions for every touched seed; the route is admin-only, so the script signs through tools/agent-admin/call.cjs --key kai --agent kai-<id>, the committed door for Kai's agents; plain x-agent-id gets a 401 there). Result: recompute-result.json.
Follow-up: ops-followup.json / decisions-followup.json (one Q14 row the first pass missed).
Record for Kai: python3 record.py > record.md against a fresh course.json, then publish it (not committed).
Not done, by a missing door: the two "literally" presentation notes. intro-notes-pending.json holds the wording and says why.

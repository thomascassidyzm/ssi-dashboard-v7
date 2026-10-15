# hin_for_eng female forms apply (#762, 15 Oct 2026)

What was written to course_gender_expansions, and how. The input came from #718·Q
(branch cs/718-hin-female-forms-full-read). `live.py` matched it against
`GET /api/production/hin_for_eng/seeds`; `build_ops.py` built `ops.json`, and the
judged forms are hard-coded in it. `ops.json` was posted through
`tools/agent-admin/call.cjs --key kai` to `/api/admin/course-edit/hin_for_eng/edit-batch`:
first as a dry run, then with "apply": true (event 79ed0e02). `applied.md` is the
record, published at d/8fe3e164. The undo file is in
~/ssi-evidence/ssi-dashboard-v7/ops/course-edit-undo/hin_for_eng/. Do not re-run:
the inserts would now conflict.

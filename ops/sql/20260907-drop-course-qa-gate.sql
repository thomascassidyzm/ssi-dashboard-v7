-- THE MANUAL PLAY-THROUGH APPROVAL GATE IS DELETED.
--
-- Tom's ruling, 2026-09-07: "let us just remove this - something that has not
-- been used, ever, is clearly not valuable enough".
--
-- WHAT IT WAS. From 2026-08-05 a course could not be promoted to a
-- learner-visible new_app_status until a human had played its first X rounds
-- through in the real app and signed each one off — X = 100 for paid, 20 for
-- free. The rule was sound and the implementation worked: inserting the
-- sign-off rows a real play-through would leave makes all 100 rounds of
-- cym_n_for_eng read `passed` with nothing left over (verified 2026-09-07 in a
-- rolled-back transaction on production). It is not being deleted because it
-- was broken.
--
-- WHAT IT DID IN THIRTEEN MONTHS. Nothing. The numbers, taken from these tables
-- immediately before this file ran:
--
--   course_qa_gate            143 rows, EVERY ONE gate_status='unpassed'
--                             0 with passed_at, 0 with passed_by, 0 passed_version
--   course_round_signoffs       0 rows, ever
--   audio_clip_signoffs         0 rows, ever
--   course_round_assignments    0 rows, ever
--
-- No human ever signed off a single round of a single course. The only six
-- promotions the gate ever saw went through on Tom's own overrides of
-- 2026-09-02, whose stated reason was that the gate is historic. And the sole
-- piece of human-authored text in all 143 rows is machine-written by a probe
-- account: deu_for_eng, "X set to 100 by qa-gate-probe@saysomethingin.com".
--
-- NOTHING WAS SALVAGED because there was nothing to salvage. Every free-text
-- column on every one of these tables was read in full before this ran:
-- course_round_signoffs.notes, audio_clip_signoffs.notes,
-- course_round_assignments.released_reason — all empty, because all four tables
-- above are empty. A gate nobody ever used records nothing about the courses it
-- was pointed at. The 143 rows are snapshotted at
-- ~/ssi-evidence/ssi-dashboard-v7/ops/sql/course-qa-gate-143-rows-before-drop-2026-09-07.json.
--
-- WHAT IS DELIBERATELY *NOT* DROPPED, and why each would be a bad mistake:
--
--   audio_clip_flags      NOT the gate. It is the tail-truncation detector's
--                         work queue: services/audio-tail-scan.cjs finds clipped
--                         clips and POST /api/audio/tail-scan/jobs/:id/raise-flags
--                         makes the findings durable. That path works and is
--                         wanted. The three functions that own the table moved
--                         out of the gate module into services/audio-clip-flags.cjs
--                         rather than dying of having shared a file. A flag is a
--                         piece of work, never an assurance, so nothing about
--                         keeping it leaves a dead check standing.
--   course_qa_flags       One character away from course_qa_gate and completely
--                         unrelated: 604 content findings written by
--                         services/phrase-monitor.cjs and read from ~30 sites in
--                         the course-builder routes. Six months older than the gate.
--   course_round_index    A materialised view on the LEARNER path — it is what
--                         ssi-learning-app/api/courses/[code]/round-map.ts reads.
--                         The gate only ever read it.
--   checkpoint_*          The build-time QA checkpoint system (83 results). A
--                         different mechanism entirely, and one that is used.
--
-- WHAT STILL STOPS AN UNFINISHED COURSE REACHING LEARNERS. The CHECK constraint
-- courses_learner_status_never_ahead_of_internal, added the same day
-- (ops/sql/20260907-learner-status-never-ahead-of-internal.sql): new_app_status
-- may sit at or below courses.status, never above. It lives in the database, so
-- unlike this gate it is in the path of a hand-written UPDATE — which is exactly
-- how four draft courses were served to learners as beta for a month while this
-- gate stood in the API and never saw the write.
--
-- Views first, then tables: the five views are a closed subgraph over these
-- tables and nothing outside the gate depends on any of them (verified against
-- pg_depend before this file was written).

BEGIN;

DROP VIEW IF EXISTS course_qa_estate;
DROP VIEW IF EXISTS course_qa_round_status;
DROP VIEW IF EXISTS course_qa_cycle_status;
DROP VIEW IF EXISTS course_qa_clip_status;
DROP VIEW IF EXISTS course_qa_cycle_clips;

DROP TABLE IF EXISTS course_round_assignments;
DROP TABLE IF EXISTS audio_clip_signoffs;
DROP TABLE IF EXISTS course_round_signoffs;
DROP TABLE IF EXISTS course_qa_gate;

COMMIT;

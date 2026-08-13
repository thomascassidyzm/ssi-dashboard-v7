-- 20260813-qa-gate-round-status-delateralise.sql
--
-- WHY: GET /api/qa-gate/<course>/rounds?from=1&limit=500 died with
-- "canceling statement due to statement timeout" (Tom, 2026-08-13 ~06:25Z,
-- eus_for_eng). The timeout is NOT the 2min a superuser session sees: PostgREST
-- connects as `authenticator`, which carries statement_timeout=8s, and
-- `service_role` has no rolconfig of its own to override it. So the real budget
-- for every dashboard query is EIGHT SECONDS.
--
-- Measured on the shipped view, warm cache, eus_for_eng (the SMALLEST course in
-- play): 17.7s. It could never have returned. This was not table growth tipping
-- something over an edge — the endpoint was born over budget and stayed there
-- until someone asked for 500 rounds at once.
--
-- THE DEFECT: course_qa_round_status re-derived course_qa_cycle_clips inside two
-- LATERAL subqueries, evaluated once PER ROUND. course_qa_cycle_clips contains a
-- ROW_NUMBER() window over course_practice_phrases partitioned by
-- (course_code, seed_number, lego_index); the lateral filtered on lego_id, which
-- Postgres can only apply AFTER the window. So every one of the 500 laterals
-- sorted and numbered all 5,683 phrase rows of the course — twice over, once for
-- the cycle rollup and once for the clip rollup. O(rounds x course_phrases),
-- 2.9M shared buffer hits.
--
-- THE FIX: derive the rollup ONCE per lego and join it. `course_code` is a
-- grouping key, so the planner pushes the course predicate into the aggregate
-- (verified in EXPLAIN: "Group Key: cys.lego_id" with course_code folded to a
-- constant). The cycle rollup and the clip rollup are computed in a single pass
-- over course_qa_cycle_clips instead of two.
--
-- The fingerprint is byte-identical, not merely equivalent: the original ordered
-- every clip in the round by (cycle_type, cycle_ordinal, audio_role, audio_id);
-- this builds a per-cycle fragment ordered by (audio_role, audio_id) and
-- concatenates the fragments ordered by (cycle_type, cycle_ordinal). Same
-- lexicographic order, same separator, so the same md5 — which matters because a
-- fingerprint change would silently invalidate every human sign-off on record.
--
-- MEASURED, limit=500, warm, after:
--   eus_for_eng  17,670ms -> 331ms
--   fra_for_eng            -> 739ms
--   hak_for_eng            -> 114ms   (2,510 rounds, 24,563 phrases)
--
-- VERIFIED IDENTICAL: full-column EXCEPT both ways over eus_for_eng,
-- fra_for_eng, spa_for_eng, cym_n_for_eng — 4,214 rounds, 0 rows differing in
-- either direction.
--
-- No timeout was raised; the query shape was the bug.

CREATE OR REPLACE VIEW course_qa_round_status AS
SELECT ri.course_code, ri.round_index, ri.lego_id, ri.seed_number,
       COALESCE(r.cycle_count, 0)     AS cycle_count,
       COALESCE(r.verified_cycles, 0) AS verified_cycles,
       COALESCE(r.flagged_cycles, 0)  AS flagged_cycles,
       COALESCE(r.clip_count, 0)      AS clip_count,
       COALESCE(r.flagged_clips, 0)   AS flagged_clips,
       r.fingerprint                  AS audio_fingerprint,
       so.verdict AS signoff_verdict, so.signed_off_by, so.signed_off_at, so.notes AS signoff_notes,
       (so.id IS NOT NULL AND so.audio_fingerprint = r.fingerprint AND so.content_version = c.version) AS signoff_current,
       CASE
         WHEN so.id IS NULL THEN 'not_signed_off'
         WHEN so.audio_fingerprint IS DISTINCT FROM r.fingerprint
           OR so.content_version IS DISTINCT FROM c.version THEN 'stale'
         WHEN so.verdict = 'flagged' THEN 'flagged'
         ELSE 'passed'
       END AS status,
       asg.assignee
FROM course_round_index ri
JOIN courses c ON c.course_code = ri.course_code
LEFT JOIN (
  SELECT pc.course_code, pc.lego_id,
         sum(pc.clip_count)::bigint    AS clip_count,
         sum(pc.flagged_clips)::bigint AS flagged_clips,
         count(*)                                            AS cycle_count,
         count(*) FILTER (WHERE pc.cyc_status = 'verified')  AS verified_cycles,
         count(*) FILTER (WHERE pc.cyc_status = 'flagged')   AS flagged_cycles,
         md5(string_agg(pc.fp_part, ',' ORDER BY pc.cycle_type, pc.cycle_ordinal)) AS fingerprint
  FROM (
    SELECT cc.course_code, cc.lego_id, cc.cycle_type, cc.cycle_ordinal,
           count(*)                                          AS clip_count,
           count(*) FILTER (WHERE cs.status = 'flagged')      AS flagged_clips,
           CASE
             WHEN count(*) FILTER (WHERE cs.status = 'flagged') > 0 THEN 'flagged'
             WHEN count(*) FILTER (WHERE cs.status <> 'passed') = 0 THEN 'verified'
             ELSE 'unverified'
           END AS cyc_status,
           string_agg(cc.audio_id::text || ':' || cs.audio_revision::text,
                      ',' ORDER BY cc.audio_role, cc.audio_id) AS fp_part
    FROM course_qa_cycle_clips cc
    JOIN course_qa_clip_status cs ON cs.audio_id = cc.audio_id
    GROUP BY cc.course_code, cc.lego_id, cc.cycle_key, cc.cycle_type, cc.cycle_ordinal
  ) pc
  GROUP BY pc.course_code, pc.lego_id
) r ON r.course_code = ri.course_code AND r.lego_id = ri.lego_id
LEFT JOIN course_round_signoffs so ON so.course_code = ri.course_code AND so.round_index = ri.round_index
LEFT JOIN course_round_assignments asg ON asg.course_code = ri.course_code AND asg.released_at IS NULL AND asg.rounds @> ri.round_index
;

COMMENT ON VIEW course_qa_round_status IS
  'One row per round (= per LEGO) with the derived cycle rollup, the human play-through verdict, and whether that verdict is still current against the live bytes and content version. The rollup is aggregated once per lego and joined, NOT re-derived per round in a LATERAL — see ops/sql/20260813-qa-gate-round-status-delateralise.sql for why that shape could never fit the 8s PostgREST statement timeout.';

-- ── PART 2: the covering index ─────────────────────────────────────────────
--
-- De-lateralising alone took eus_for_eng to 331ms warm but left fra_for_eng at
-- 9.2s COLD, still over budget on a first visit — and a first visit is exactly
-- what a producer opening the gate page does. EXPLAIN put 5,474ms of that 9,158ms
-- in one node: an Index Scan on course_audio_pkey with 52,133 loops, doing a
-- random heap fetch per clip into a 1.5GB table (11,142 of them from disk).
--
-- Only two columns are ever read there — id and audio_revision (the plan's
-- width=20 is uuid + int4) — so an INCLUDE index makes it an index-only scan.
-- 99MB against 1.5GB of heap, and it stays cached.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_id_revision
  ON public.course_audio (id) INCLUDE (audio_revision);

-- The index-only scan still charged 21,489 heap fetches until course_audio was
-- vacuumed — yesterday's bulk gloss/decomposition writes had left the visibility
-- map stale, which is what made this look like "table growth". It was not growth;
-- it was an unvacuumed visibility map on top of a query shape that never fit.
--   VACUUM (ANALYZE) public.course_audio;
--   VACUUM (ANALYZE) public.course_practice_phrases;
--   VACUUM (ANALYZE) public.course_legos;
-- (Run separately — VACUUM cannot run inside a transaction block.)
--
-- MEASURED END TO END, all 145 courses, from=1&limit=500, statement_timeout=8s:
--   before: fra_for_eng cancelled; 27 courses over 4s
--   after:  0 timeouts; slowest ara_for_eng 3,255ms; median 385ms

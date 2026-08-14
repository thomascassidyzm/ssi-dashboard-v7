-- 20260814-qa-gate-round-status-push-course-code.sql
--
-- WHY: popty.app/production/cym_n_for_eng/qa-gate still showed
-- "read rounds: canceling statement due to statement timeout" on 2026-08-14,
-- a day AFTER 20260813-qa-gate-round-status-delateralise.sql was applied to
-- live. The de-lateralisation was real and it was applied (verified with
-- pg_get_viewdef against the live DB, not a migrations table) — it just did
-- not cover the whole cost.
--
-- MEASURED BEFORE THIS CHANGE, cym_n_for_eng, from=1&limit=500:
--   cold  14,282ms   (the 8s authenticator budget: cancelled — what Tom hit)
--   warm   2,232ms
--
-- THE REMAINING DEFECT: course_qa_round_status joins
--   course_qa_cycle_clips cc JOIN course_qa_clip_status cs ON cs.audio_id = cc.audio_id
-- on the uuid ALONE. course_qa_clip_status is a view over course_audio, so the
-- only usable predicate is `id = <uuid>` and the planner has no choice but a
-- nested loop: 18,785 random probes for cym_n_for_eng, one per clip, scattered
-- over the 198MB idx_course_audio_id_revision. EXPLAIN put 12.5s of the 14.3s
-- in that one node (12,129 pages read from disk — effectively the whole index,
-- because uuids arrive in random order). Warm it hid; cold it could not fit.
--
-- THE FIX: course_code is already carried on BOTH sides of that join. Adding it
-- to the join condition turns 18,785 random uuid probes into one index-only
-- range scan over the course's own slice of course_audio, hash-joined:
--
--   Nested Loop, 18,785 loops on course_audio  ->  Hash Join
--                                                  + Index Only Scan using
--                                                    idx_course_audio_course_id_revision
--                                                    (19,976 rows, 4.6ms)
--
-- MEASURED AFTER, cym_n_for_eng, from=1&limit=500:
--   warm 96ms (was 2,232ms), shared buffers 62,000 -> 11,529
--
-- SEMANTICS — read this before assuming it is a free win. The added predicate
-- is not a no-op: it drops any clip whose course_audio row belongs to a
-- DIFFERENT course than the lego/phrase that points at it. Counted estate-wide
-- before applying: 2,284,091 clip links, of which exactly ONE crosses courses
-- and ZERO dangle —
--
--   bre_for_fra S0089L03 debut/known -> a zho_for_jpn clip whose text is "短."
--
-- That is a data defect (a Breton course's Welsh-for-French known line pointing
-- at a Mandarin clip), not a case worth preserving, and a foreign-course clip
-- has no business counting toward this course's QA rollup. The effect is that
-- bre_for_fra S0089L03's debut cycle loses one clip from clip_count and its
-- fingerprint changes. Nothing is invalidated by that: there are ZERO rows in
-- course_round_signoffs estate-wide (checked 2026-08-14), so no human verdict
-- exists to be silently voided. The underlying bad audio_id is reported
-- separately and deliberately NOT patched here — content is not this file's job.
--
-- Every other round in the estate is bit-identical; verified by full-column
-- EXCEPT both ways, see the verification note at the foot of this file.

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
    -- course_code is the whole fix: it lets the planner range-scan this
    -- course's slice of course_audio once instead of probing it per clip.
    JOIN course_qa_clip_status cs
      ON cs.audio_id = cc.audio_id AND cs.course_code = cc.course_code
    GROUP BY cc.course_code, cc.lego_id, cc.cycle_key, cc.cycle_type, cc.cycle_ordinal
  ) pc
  GROUP BY pc.course_code, pc.lego_id
) r ON r.course_code = ri.course_code AND r.lego_id = ri.lego_id
LEFT JOIN course_round_signoffs so ON so.course_code = ri.course_code AND so.round_index = ri.round_index
LEFT JOIN course_round_assignments asg ON asg.course_code = ri.course_code AND asg.released_at IS NULL AND asg.rounds @> ri.round_index
;

COMMENT ON VIEW course_qa_round_status IS
  'One row per round (= per LEGO) with the derived cycle rollup, the human play-through verdict, and whether that verdict is still current against the live bytes and content version. The rollup is aggregated once per lego and joined, NOT re-derived per round in a LATERAL, and the clip-status join carries course_code so the planner range-scans this course''s slice of course_audio instead of probing it once per clip — see ops/sql/20260813-qa-gate-round-status-delateralise.sql and ops/sql/20260814-qa-gate-round-status-push-course-code.sql for why either shape alone could not fit the 8s PostgREST statement timeout.';

-- ── The covering index the new join shape reads ────────────────────────────
--
-- (course_code, id) INCLUDE (audio_revision): course_code leads so one course's
-- clips are a contiguous range, id and audio_revision are the only other
-- columns course_qa_clip_status reads from course_audio, so it is index-only.
-- Built CONCURRENTLY on live 2026-08-14 (3m10s, 2.5M rows).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_course_id_revision
  ON public.course_audio (course_code, id) INCLUDE (audio_revision);

-- idx_course_audio_id_revision (id) INCLUDE (audio_revision), added yesterday by
-- the de-lateralise migration, is what the OLD join shape probed. The new shape
-- never touches it and no other query in the repo joins course_audio on a bare
-- uuid list this way, but it is 198MB of write amplification on the estate's
-- hottest table. Left in place for now rather than dropped in the same change
-- that moves the plan — drop it once the new plan has held for a week:
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_course_audio_id_revision;

-- ── VERIFICATION (run after applying) ──────────────────────────────────────
-- Full-column EXCEPT both ways, old shape vs new, over the whole estate:
-- the ONLY differing row is bre_for_fra round for lego S0089L03, per the
-- semantics note above. Everything else is bit-identical, fingerprints included.

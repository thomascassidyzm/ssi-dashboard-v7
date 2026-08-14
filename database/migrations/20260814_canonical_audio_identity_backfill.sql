-- ============================================================================
-- Canonical audio identity — backfill. Additive; deletes nothing.
--
-- Run AFTER 20260814_canonical_audio_identity_phase1.sql.
--
-- Usage (psql):
--   \set scope 'eng'    -- canonical language to backfill, or 'ALL'
--   \i 20260814_canonical_audio_identity_backfill.sql
--
-- What it does, and nothing else:
--   1. materialises the canonical key for every course_audio row (staging);
--   2. inserts ONE canonical clip per identity group, choosing the best member;
--   3. points every course_audio row at its canonical clip via clip_id.
--
-- It does NOT change course_audio.s3_key. Every course keeps serving exactly
-- the bytes it serves today; convergence onto the canonical object is a
-- separate, separately verified pass (see …_converge_s3.sql), because that one
-- is audible and make-before-break requires the canon be proven alive first.
--
-- CANON SELECTION, best first — the audit's rule ("prefer origin='human', then
-- veracity-passed, then oldest") with two additions that fall out of the data:
--   0. never a 'pending/%' placeholder — those are unrendered stubs (50 rows)
--   1. origin = 'human'         — a real person's take beats any TTS take
--   2. veracity_pass = true     — then unchecked, then failed
--   3. duration_ms IS NOT NULL  — a row with no duration was never measured
--   4. oldest created_at        — the take the estate has been serving longest
--   5. id                       — deterministic tiebreak, so a re-run is stable
--
-- Voice is INSIDE the identity key, so this rule never changes which voice a
-- course hears. The English cast question (9,767 pod clips on off-cast Leo and
-- Azure voices where an Olivia/Tom-clone take exists) is a cross-voice recast,
-- not a canon choice, and is reported separately rather than smuggled in here.
-- ============================================================================

\set ON_ERROR_STOP on
\timing on
SET statement_timeout = 0;

-- ----------------------------------------------------------------------------
-- 1. Staging: compute the canonical key once, not once per query.
--
-- audio_canon_lang/voice are plpgsql with an EXCEPTION block, which costs a
-- subtransaction per call — 2.5M of those is hours. There are only ~80 distinct
-- language spellings and a few hundred voice spellings in the whole table, so
-- they are mapped ONCE into small lookup tables and joined. Same values, two
-- orders of magnitude less work.
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS _canon_stage;
DROP TABLE IF EXISTS _canon_lang_map;
DROP TABLE IF EXISTS _canon_voice_map;

-- DISTINCT the raw value FIRST, then map it: `SELECT DISTINCT raw, f(raw)`
-- de-duplicates the PAIR, so any non-determinism in f silently produces two
-- rows for one raw value. This shape cannot.
CREATE UNLOGGED TABLE _canon_lang_map AS
SELECT raw, audio_canon_lang(raw) AS canon
FROM (SELECT DISTINCT language AS raw FROM course_audio) d;
CREATE UNIQUE INDEX ON _canon_lang_map (raw);

CREATE UNLOGGED TABLE _canon_voice_map AS
SELECT raw, audio_canon_voice(raw) AS canon
FROM (SELECT DISTINCT voice_id AS raw FROM course_audio) d;
CREATE UNIQUE INDEX ON _canon_voice_map (raw);

ANALYZE _canon_lang_map;
ANALYZE _canon_voice_map;

CREATE UNLOGGED TABLE _canon_stage AS
SELECT
  ca.id                                     AS audio_id,
  audio_canon_text(ca.text_normalized)      AS text_key,
  lm.canon                                  AS language,
  ca.role                                   AS role,
  vm.canon                                  AS voice_id
FROM course_audio ca
JOIN _canon_lang_map  lm ON lm.raw = ca.language
JOIN _canon_voice_map vm ON vm.raw = ca.voice_id
WHERE ca.s3_key IS NOT NULL
  AND ca.s3_key <> ''
  AND ca.s3_key NOT LIKE 'pending/%'
  AND (:'scope' = 'ALL' OR lm.canon = :'scope');

CREATE UNIQUE INDEX _canon_stage_audio ON _canon_stage (audio_id);
CREATE INDEX _canon_stage_key ON _canon_stage (text_key, language, role, voice_id);
ANALYZE _canon_stage;

\echo '--- staged rows / distinct identities ---'
SELECT count(*) AS staged_rows,
       count(DISTINCT (text_key, language, role, voice_id)) AS identities
FROM _canon_stage;

-- ----------------------------------------------------------------------------
-- 2. Insert one canonical clip per identity group.
--
-- ON CONFLICT DO NOTHING makes the whole script idempotent: a re-run inserts
-- nothing and simply re-links, which is what a resumable backfill needs.
-- ----------------------------------------------------------------------------

INSERT INTO audio_clips (
  text_key, language, role, voice_id, text, s3_key, duration_ms, file_size_bytes,
  word_boundaries, origin, veracity_checked_at, veracity_pass, veracity_reason,
  veracity_cer, veracity_attempts, veracity_checker, audio_revision,
  source_audio_id, created_at
)
SELECT DISTINCT ON (s.text_key, s.language, s.role, s.voice_id)
  s.text_key, s.language, s.role, s.voice_id,
  ca.text, ca.s3_key, ca.duration_ms, ca.file_size_bytes,
  ca.word_boundaries, ca.origin, ca.veracity_checked_at, ca.veracity_pass,
  ca.veracity_reason, ca.veracity_cer, ca.veracity_attempts, ca.veracity_checker,
  ca.audio_revision, ca.id, ca.created_at
FROM _canon_stage s
JOIN course_audio ca ON ca.id = s.audio_id
ORDER BY
  s.text_key, s.language, s.role, s.voice_id,
  (ca.origin = 'human') DESC,
  (CASE WHEN ca.veracity_pass IS TRUE THEN 0 WHEN ca.veracity_pass IS NULL THEN 1 ELSE 2 END) ASC,
  (ca.duration_ms IS NOT NULL) DESC,
  ca.created_at ASC,
  ca.id ASC
ON CONFLICT ON CONSTRAINT audio_clips_identity DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Link every staged course_audio row to its canonical clip.
--
-- session_replication_role = replica suppresses user triggers FOR THIS SESSION
-- ONLY — no table lock, no effect on any concurrent writer — and it is required
-- here for correctness, not just speed:
--
--   * trg_course_audio_normalize is BEFORE UPDATE on ALL columns and reassigns
--     text_normalized := normalize_text(text). Rows written before ~March 2026
--     still carry the older convention (trailing '?' kept), so merely writing
--     clip_id would REWRITE their identity column — and on the first attempt
--     that collided with unique_course_audio_per_voice at ita_for_eng "have you
--     got more to learn today". Setting a pointer must not silently re-key the
--     row it points from.
--   * course_audio_audit, course_audio_touch_audio_stamp and
--     touch_course_content_stamp would each fire 1.1M times for a change that
--     alters no audio and no content. A link is metadata.
--
-- Wrapped in an explicit transaction because SET LOCAL needs one. The FK on
-- clip_id is not enforced while triggers are off; step 4 re-checks every link
-- against audio_clips by all four identity components, which is stricter.
-- ----------------------------------------------------------------------------

-- Resolve the clip id INTO the staging table first. Joining course_audio to
-- audio_clips on four text columns while also writing course_audio put the
-- planner on a random-IO path that was still running after 32 minutes; split in
-- two, each half is cheap — one hash join between two indexed tables, then a
-- pure primary-key update.
ALTER TABLE _canon_stage ADD COLUMN IF NOT EXISTS clip_id uuid;

UPDATE _canon_stage s
SET clip_id = c.id
FROM audio_clips c
WHERE c.text_key = s.text_key
  AND c.language = s.language
  AND c.role     = s.role
  AND c.voice_id = s.voice_id;

-- Batch membership is decided ONCE, here, not re-derived per batch.
--
-- The first attempt looped `SELECT … WHERE ca.clip_id IS DISTINCT FROM s.clip_id
-- LIMIT 50000`, which looks like the obvious resumable batch and is quadratic:
-- every pass re-scans the rows it already linked to find 50,000 it has not. It
-- linked 600,000 rows and then crawled. A precomputed batch number turns each
-- pass into an index range scan that cannot see the finished work at all.
ALTER TABLE _canon_stage ADD COLUMN IF NOT EXISTS batch_no int;
UPDATE _canon_stage SET batch_no = (rn - 1) / 50000
FROM (SELECT audio_id, row_number() OVER (ORDER BY audio_id) AS rn FROM _canon_stage) o
WHERE o.audio_id = _canon_stage.audio_id;
CREATE INDEX IF NOT EXISTS _canon_stage_batch ON _canon_stage (batch_no) INCLUDE (audio_id, clip_id);
ANALYZE _canon_stage;

-- Batched so no single transaction holds row locks on a live table for half an
-- hour. Live render workers are inserting into course_audio throughout.
SET session_replication_role = replica;

DO $$
DECLARE
  b        int := 0;
  max_b    int;
  moved    bigint;
  total    bigint := 0;
BEGIN
  SELECT max(batch_no) INTO max_b FROM _canon_stage;
  WHILE b <= max_b LOOP
    UPDATE course_audio ca
    SET clip_id = s.clip_id
    FROM _canon_stage s
    WHERE s.batch_no = b
      AND s.clip_id IS NOT NULL
      AND ca.id = s.audio_id
      AND ca.clip_id IS DISTINCT FROM s.clip_id;

    GET DIAGNOSTICS moved = ROW_COUNT;
    total := total + moved;
    COMMIT;
    RAISE NOTICE 'batch %/% linked % (total %)', b, max_b, moved, total;
    b := b + 1;
  END LOOP;
  RAISE NOTICE 'LINK DONE: % rows', total;
END $$;

RESET session_replication_role;

-- ----------------------------------------------------------------------------
-- 4. Reconciliation. Any mismatch aborts loudly rather than reporting success.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  staged      bigint;
  identities  bigint;
  linked      bigint;
  unlinked    bigint;
  clips       bigint;
  wrong_key   bigint;
BEGIN
  SELECT count(*), count(DISTINCT (text_key, language, role, voice_id))
    INTO staged, identities FROM _canon_stage;

  SELECT count(*) INTO linked
    FROM _canon_stage s JOIN course_audio ca ON ca.id = s.audio_id
   WHERE ca.clip_id IS NOT NULL;

  unlinked := staged - linked;

  SELECT count(*) INTO clips
    FROM audio_clips c
   WHERE EXISTS (SELECT 1 FROM _canon_stage s
                  WHERE s.text_key = c.text_key AND s.language = c.language
                    AND s.role = c.role AND s.voice_id = c.voice_id);

  -- every linked row must agree with its clip on all four identity components
  SELECT count(*) INTO wrong_key
    FROM _canon_stage s
    JOIN course_audio ca ON ca.id = s.audio_id
    JOIN audio_clips c   ON c.id = ca.clip_id
   WHERE c.text_key <> s.text_key OR c.language <> s.language
      OR c.role <> s.role OR c.voice_id <> s.voice_id;

  RAISE NOTICE 'staged=%  identities=%  clips=%  linked=%  unlinked=%  wrong_key=%',
    staged, identities, clips, linked, unlinked, wrong_key;

  IF unlinked <> 0 THEN
    RAISE EXCEPTION 'BACKFILL ABORT: % staged rows have no clip_id', unlinked;
  END IF;
  IF clips <> identities THEN
    RAISE EXCEPTION 'BACKFILL ABORT: % canonical clips for % identities', clips, identities;
  END IF;
  IF wrong_key <> 0 THEN
    RAISE EXCEPTION 'BACKFILL ABORT: % rows linked to a clip of a different identity', wrong_key;
  END IF;

  RAISE NOTICE 'RECONCILED: % rows collapse to % canonical clips (% redundant)',
    staged, identities, staged - identities;
END $$;

\echo '--- canon origin mix ---'
SELECT origin, count(*) FROM audio_clips GROUP BY 1 ORDER BY 2 DESC;

DROP TABLE IF EXISTS _canon_stage;
DROP TABLE IF EXISTS _canon_lang_map;
DROP TABLE IF EXISTS _canon_voice_map;

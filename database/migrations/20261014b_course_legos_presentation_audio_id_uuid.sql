-- 20261014b: course_legos.presentation_audio_id text -> uuid (job #387).
--
-- WHY. It was the one audio pointer stored as text; every other one (course_legos known/target1/
-- target2, course_practice_phrases.presentation_audio_id, lego_introductions) is uuid. Every join
-- to course_audio needed a cast, and ~25 tools put it on course_audio.id, which defeats the primary
-- key: 2.5M-row scans at 5-12 s each, booth 500s on 2026-10-14 (#383/#384). With uuid on both sides
-- the join needs no cast and uses course_audio_pkey.
--
-- SAFE TO APPLY. Checked on the live DB 2026-10-14: 73,777 non-null values, every one parses as a
-- uuid and every one exists in course_audio (0 orphans). The guard below re-checks before altering.
-- Readers: the learner app reads via PostgREST (a uuid serialises to the same string). Popty
-- services use supabase-js or `::uuid` casts that are correct on both sides of this change (edited
-- in the same commit). The one writer that breaks is link_audio_to_content, which assigned
-- NEW.id::text; it is replaced here with NEW.id, which also works on the old text column.
--
-- LOCKING. ALTER ... TYPE rewrites the table under ACCESS EXCLUSIVE until COMMIT. lock_timeout
-- 5 s: if a reader holds it, this fails cleanly and the runner retries. Rehearsed on a full copy
-- by the CANARY file first. Rollback: the .ROLLBACK.sql beside this file.
--
-- Apply: psql -X -f this file, owner login (~/.config/ssi-db/owner.env). Every check is inside
-- the transaction; any failure raises and nothing is committed.

\set ON_ERROR_STOP 1
\timing on
SET lock_timeout = '5s';
SET statement_timeout = '10min';

BEGIN;

DO $$
DECLARE v_type text;
BEGIN
  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'course_legos' AND column_name = 'presentation_audio_id';
  IF v_type = 'uuid' THEN RAISE EXCEPTION 'ALREADY-UUID: course_legos.presentation_audio_id is already uuid; nothing to do'; END IF;
  IF v_type <> 'text' THEN RAISE EXCEPTION 'unexpected type %', v_type; END IF;
END $$;

-- Every value must parse. List any that do not and stop.
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id, lego_id, course_code, presentation_audio_id v FROM public.course_legos
            WHERE presentation_audio_id IS NOT NULL
              AND presentation_audio_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' LOOP
    n := n + 1;
    RAISE NOTICE 'UNPARSEABLE % % % %', r.course_code, r.lego_id, r.id, r.v;
  END LOOP;
  IF n > 0 THEN RAISE EXCEPTION '% presentation_audio_id values do not parse as uuid (listed above)', n; END IF;
END $$;

-- Pre-change fingerprints, checked again after the ALTER.
CREATE TEMP TABLE _387_pre ON COMMIT DROP AS
SELECT (SELECT count(presentation_audio_id) FROM public.course_legos) AS n,
       (SELECT md5(string_agg(id::text || ':' || coalesce(lower(presentation_audio_id), ''), ',' ORDER BY id)) FROM public.course_legos) AS h,
       md5(lower(public.get_course_cycles_window('spa_for_eng', NULL, 30)::text)) AS cw,
       md5(lower(public.get_audio_counts('spa_for_eng', NULL)::text)) AS ac;

-- The one writer that assigned text: now assigns the uuid (valid for text and uuid columns).
\ir 20261014b_link_audio_to_content_uuid.fn.sql

-- Triggers whose definition names the column (UPDATE OF ... / WHEN) block ALTER ... TYPE.
-- Save their exact definitions, drop them, and re-create them verbatim after the ALTER.
CREATE TEMP TABLE _387_trg (name text, def text) ON COMMIT DROP;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tg.tgname, pg_get_triggerdef(tg.oid) def FROM pg_trigger tg
            WHERE tg.tgrelid = 'public.course_legos'::regclass AND NOT tg.tgisinternal
              AND (pg_get_triggerdef(tg.oid) ~ 'presentation_audio_id'
                   OR (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_legos'::regclass AND attname = 'presentation_audio_id') = ANY (tg.tgattr::int2[])) LOOP
    INSERT INTO _387_trg VALUES (t.tgname, t.def);
    EXECUTE format('DROP TRIGGER %I ON public.course_legos', t.tgname);
    RAISE NOTICE 'dropped trigger % for the ALTER: %', t.tgname, t.def;
  END LOOP;
END $$;

ALTER TABLE public.course_legos
  ALTER COLUMN presentation_audio_id TYPE uuid USING presentation_audio_id::uuid;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT * FROM _387_trg LOOP
    EXECUTE t.def;
    RAISE NOTICE 're-created trigger %', t.name;
  END LOOP;
  IF (SELECT count(*) FROM _387_trg) <> (SELECT count(*) FROM pg_trigger tg JOIN _387_trg s ON s.name = tg.tgname
                                          WHERE tg.tgrelid = 'public.course_legos'::regclass) THEN
    RAISE EXCEPTION 'not every dropped trigger was re-created'; END IF;
END $$;

ANALYZE public.course_legos;

DO $$
DECLARE p record; v_type text; v_plan text := ''; v_n bigint; v_h text;
BEGIN
  SELECT * INTO p FROM _387_pre;
  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'course_legos' AND column_name = 'presentation_audio_id';
  IF v_type <> 'uuid' THEN RAISE EXCEPTION 'post: type is %', v_type; END IF;

  SELECT count(presentation_audio_id),
         md5(string_agg(id::text || ':' || coalesce(presentation_audio_id::text, ''), ',' ORDER BY id))
    INTO v_n, v_h FROM public.course_legos;
  IF v_n <> p.n THEN RAISE EXCEPTION 'post: non-null count % <> %', v_n, p.n; END IF;
  IF v_h <> p.h THEN RAISE EXCEPTION 'post: values changed (fingerprint mismatch)'; END IF;
  IF md5(lower(public.get_course_cycles_window('spa_for_eng', NULL, 30)::text)) <> p.cw THEN
    RAISE EXCEPTION 'post: get_course_cycles_window output changed'; END IF;
  IF md5(lower(public.get_audio_counts('spa_for_eng', NULL)::text)) <> p.ac THEN
    RAISE EXCEPTION 'post: get_audio_counts output changed'; END IF;

  -- The point of the change: the join with no cast uses the course_audio primary key.
  FOR p IN EXECUTE $q$EXPLAIN SELECT a.text FROM public.course_legos l
           JOIN public.course_audio a ON a.id = l.presentation_audio_id
           WHERE l.course_code = 'spa_for_eng' AND l.seed_number <= 3$q$ LOOP
    v_plan := v_plan || p."QUERY PLAN" || E'\n';
  END LOOP;
  RAISE NOTICE E'PLAN (uncast join):\n%', v_plan;
  IF v_plan !~ 'course_audio_pkey' THEN RAISE EXCEPTION 'post: uncast join does not use course_audio_pkey'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED: % non-null values, fingerprints equal, PK used', v_n;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- CANARY for 20261014b_course_legos_presentation_audio_id_uuid.sql (job #387). Run BEFORE the
-- migration. Rehearses it on a full copy of course_legos in a private schema (canary_387), so the
-- live table is only READ. Proves: the cast succeeds on real data, how long the rewrite takes,
-- that the row triggers on the column still work on uuid, that the old ::text writer form fails
-- (so the link_audio_to_content fix is required) and the new form works, that every edited Popty
-- query shape runs on uuid and uses course_audio_pkey, and that the fingerprint RPCs the migration
-- compares are deterministic. Every trigger exercise is rolled back. Drops canary_387 at the end.
-- Apply: psql -X -f this file, owner login. Exit status non-zero = a check failed.

\set ON_ERROR_STOP 1
\timing on
SET statement_timeout = '10min';
SET lock_timeout = '5s';

DROP SCHEMA IF EXISTS canary_387 CASCADE;
CREATE SCHEMA canary_387;
REVOKE ALL ON SCHEMA canary_387 FROM PUBLIC;

CREATE TABLE canary_387.course_legos (LIKE public.course_legos INCLUDING ALL);
-- Generated columns (lego_id) cannot be inserted: copy the stored columns by name.
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'course_legos' AND is_generated = 'NEVER';
  EXECUTE format('INSERT INTO canary_387.course_legos (%s) SELECT %s FROM public.course_legos', cols, cols);
END $$;

-- Copy the row triggers that read or write presentation_audio_id onto the copy.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tgname, pg_get_triggerdef(oid) def FROM pg_trigger
            WHERE tgrelid = 'public.course_legos'::regclass AND NOT tgisinternal
              AND (tgname IN ('trg_null_lego_audio_on_text_change', 'human_take_lock', 'course_legos_pull_duration')
                   OR pg_get_triggerdef(oid) ~ 'presentation_audio_id') LOOP
    EXECUTE replace(t.def, 'ON public.course_legos', 'ON canary_387.course_legos');
    RAISE NOTICE 'copied trigger %', t.tgname;
  END LOOP;
END $$;

-- 1. The fingerprint RPCs the migration compares must be deterministic (two calls, same md5).
DO $$
BEGIN
  IF md5(lower(public.get_course_cycles_window('spa_for_eng', NULL, 30)::text))
     <> md5(lower(public.get_course_cycles_window('spa_for_eng', NULL, 30)::text)) THEN
    RAISE EXCEPTION 'get_course_cycles_window is not deterministic'; END IF;
  IF md5(lower(public.get_audio_counts('spa_for_eng', NULL)::text))
     <> md5(lower(public.get_audio_counts('spa_for_eng', NULL)::text)) THEN
    RAISE EXCEPTION 'get_audio_counts is not deterministic'; END IF;
  IF length(public.get_course_cycles_window('spa_for_eng', NULL, 30)::text) < 100 THEN
    RAISE EXCEPTION 'get_course_cycles_window(spa_for_eng) returned almost nothing'; END IF;
  RAISE NOTICE 'OK 1: fingerprint RPCs deterministic';
END $$;

-- 2. Every value parses (list any that do not).
SELECT course_code, lego_id, id, presentation_audio_id AS unparseable
  FROM canary_387.course_legos
 WHERE presentation_audio_id IS NOT NULL
   AND presentation_audio_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. The conversion itself, timed (this is the lock window tonight, plus ANALYZE).
-- Triggers whose definition names the column (UPDATE OF ... / WHEN) block ALTER ... TYPE.
-- Save their exact definitions, drop them, and re-create them verbatim after the ALTER.
CREATE TEMP TABLE _387_trg (name text, def text);
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tg.tgname, pg_get_triggerdef(tg.oid) def FROM pg_trigger tg
            WHERE tg.tgrelid = 'canary_387.course_legos'::regclass AND NOT tg.tgisinternal
              AND (pg_get_triggerdef(tg.oid) ~ 'presentation_audio_id'
                   OR (SELECT attnum FROM pg_attribute WHERE attrelid = 'canary_387.course_legos'::regclass AND attname = 'presentation_audio_id') = ANY (tg.tgattr::int2[])) LOOP
    INSERT INTO _387_trg VALUES (t.tgname, t.def);
    EXECUTE format('DROP TRIGGER %I ON canary_387.course_legos', t.tgname);
    RAISE NOTICE 'dropped trigger % for the ALTER: %', t.tgname, t.def;
  END LOOP;
END $$;

ALTER TABLE canary_387.course_legos
  ALTER COLUMN presentation_audio_id TYPE uuid USING presentation_audio_id::uuid;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT * FROM _387_trg LOOP
    EXECUTE t.def;
    RAISE NOTICE 're-created trigger %', t.name;
  END LOOP;
  IF (SELECT count(*) FROM _387_trg) <> (SELECT count(*) FROM pg_trigger tg JOIN _387_trg s ON s.name = tg.tgname
                                          WHERE tg.tgrelid = 'canary_387.course_legos'::regclass) THEN
    RAISE EXCEPTION 'not every dropped trigger was re-created'; END IF;
END $$;
ANALYZE canary_387.course_legos;

DO $$
BEGIN
  IF (SELECT count(presentation_audio_id) FROM canary_387.course_legos)
     <> (SELECT count(presentation_audio_id) FROM public.course_legos) THEN
    RAISE EXCEPTION 'count changed'; END IF;
  IF EXISTS (SELECT 1 FROM canary_387.course_legos c JOIN public.course_legos p USING (id)
              WHERE c.presentation_audio_id IS DISTINCT FROM p.presentation_audio_id::uuid) THEN
    RAISE EXCEPTION 'values changed'; END IF;
  RAISE NOTICE 'OK 3: % values converted, identical', (SELECT count(presentation_audio_id) FROM canary_387.course_legos);
END $$;

-- 4. Writers: the old ::text assignment must now FAIL, the uuid assignment and a string literal
--    (PostgREST / supabase-js shape) must work.
DO $$
BEGIN
  BEGIN
    EXECUTE 'UPDATE canary_387.course_legos SET presentation_audio_id = gen_random_uuid()::text WHERE false';
    RAISE EXCEPTION 'old ::text writer still accepted - unexpected';
  EXCEPTION WHEN datatype_mismatch THEN
    RAISE NOTICE 'OK 4a: old NEW.id::text writer is refused on uuid (link_audio_to_content fix is required)';
  END;
  EXECUTE 'UPDATE canary_387.course_legos SET presentation_audio_id = gen_random_uuid() WHERE false';
  EXECUTE $q$UPDATE canary_387.course_legos SET presentation_audio_id = '00000000-0000-0000-0000-000000000000' WHERE false$q$;
  RAISE NOTICE 'OK 4b: uuid and string-literal writers accepted';
END $$;

-- 5. Row triggers on uuid, exercised for real and rolled back.
BEGIN;
DO $$
DECLARE r record; v uuid;
BEGIN
  -- null_lego_audio_on_text_change: a real text edit on a linked lego drops the presentation link.
  SELECT id, presentation_audio_id INTO r FROM canary_387.course_legos
   WHERE presentation_audio_id IS NOT NULL AND target_text IS NOT NULL LIMIT 1;
  UPDATE canary_387.course_legos SET target_text = target_text || ' canary387' WHERE id = r.id;
  SELECT presentation_audio_id INTO v FROM canary_387.course_legos WHERE id = r.id;
  IF v IS NOT NULL THEN RAISE EXCEPTION 'text-change trigger did not null the presentation link'; END IF;
  RAISE NOTICE 'OK 5a: text-change trigger ran on uuid and nulled the link';

  -- human_take_lock: repointing a synthetic presentation clip to another synthetic clip passes.
  SELECT l.id, a2.id AS to_id INTO r
    FROM canary_387.course_legos l
    JOIN public.course_audio a ON a.id = l.presentation_audio_id
    JOIN LATERAL (SELECT id FROM public.course_audio b
                   WHERE b.course_code = a.course_code AND b.role = 'presentation' AND b.id <> a.id
                     AND lower(coalesce(b.origin, '')) <> 'human' AND coalesce(b.voice_id, '') !~* '^human_' LIMIT 1) a2 ON true
   WHERE lower(coalesce(a.origin, '')) <> 'human' AND coalesce(a.voice_id, '') !~* '^human_' LIMIT 1;
  UPDATE canary_387.course_legos SET presentation_audio_id = r.to_id WHERE id = r.id;
  RAISE NOTICE 'OK 5b: human-take trigger ran on uuid';
END $$;
ROLLBACK;

-- 6. Every edited reader shape runs on uuid; the uncast join uses course_audio_pkey.
SELECT count(*) AS intro_mirror_shape FROM canary_387.course_legos x
  LEFT JOIN public.course_audio a ON a.id = x.presentation_audio_id::uuid WHERE x.course_code = 'spa_for_eng';
SELECT count(*) AS recordist_shape FROM canary_387.course_legos
 WHERE presentation_audio_id::uuid = any(ARRAY(SELECT presentation_audio_id FROM canary_387.course_legos WHERE presentation_audio_id IS NOT NULL LIMIT 5));
SELECT count(*) AS old_text_compare_shape FROM canary_387.course_legos
 WHERE course_code = 'spa_for_eng' AND presentation_audio_id::text = any(ARRAY['00000000-0000-0000-0000-000000000000']::text[]);
SELECT count(*) AS postgrest_eq_shape FROM canary_387.course_legos WHERE presentation_audio_id = '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE p record; v_plan text := '';
BEGIN
  FOR p IN EXECUTE $q$EXPLAIN SELECT a.text FROM canary_387.course_legos l
           JOIN public.course_audio a ON a.id = l.presentation_audio_id
           WHERE l.course_code = 'spa_for_eng' AND l.seed_number <= 3$q$ LOOP
    v_plan := v_plan || p."QUERY PLAN" || E'\n';
  END LOOP;
  RAISE NOTICE E'PLAN (uncast join, copy):\n%', v_plan;
  IF v_plan !~ 'course_audio_pkey' THEN RAISE EXCEPTION 'uncast join does not use course_audio_pkey'; END IF;
  v_plan := '';
  FOR p IN EXECUTE $q$EXPLAIN SELECT a.text FROM canary_387.course_legos l
           JOIN public.course_audio a ON a.id = l.presentation_audio_id::uuid
           WHERE l.course_code = 'spa_for_eng'$q$ LOOP
    v_plan := v_plan || p."QUERY PLAN" || E'\n';
  END LOOP;
  RAISE NOTICE E'PLAN (agent-db ::uuid form, whole course, copy):\n%', v_plan;
  RAISE NOTICE 'OK 6: readers run on uuid; PK used';
END $$;

-- 7. Rollback rehearsal: back to text, values identical to the live column.
DROP TABLE _387_trg;
-- Triggers whose definition names the column (UPDATE OF ... / WHEN) block ALTER ... TYPE.
-- Save their exact definitions, drop them, and re-create them verbatim after the ALTER.
CREATE TEMP TABLE _387_trg (name text, def text);
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tg.tgname, pg_get_triggerdef(tg.oid) def FROM pg_trigger tg
            WHERE tg.tgrelid = 'canary_387.course_legos'::regclass AND NOT tg.tgisinternal
              AND (pg_get_triggerdef(tg.oid) ~ 'presentation_audio_id'
                   OR (SELECT attnum FROM pg_attribute WHERE attrelid = 'canary_387.course_legos'::regclass AND attname = 'presentation_audio_id') = ANY (tg.tgattr::int2[])) LOOP
    INSERT INTO _387_trg VALUES (t.tgname, t.def);
    EXECUTE format('DROP TRIGGER %I ON canary_387.course_legos', t.tgname);
    RAISE NOTICE 'dropped trigger % for the ALTER: %', t.tgname, t.def;
  END LOOP;
END $$;

ALTER TABLE canary_387.course_legos
  ALTER COLUMN presentation_audio_id TYPE text USING presentation_audio_id::text;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT * FROM _387_trg LOOP
    EXECUTE t.def;
    RAISE NOTICE 're-created trigger %', t.name;
  END LOOP;
  IF (SELECT count(*) FROM _387_trg) <> (SELECT count(*) FROM pg_trigger tg JOIN _387_trg s ON s.name = tg.tgname
                                          WHERE tg.tgrelid = 'canary_387.course_legos'::regclass) THEN
    RAISE EXCEPTION 'not every dropped trigger was re-created'; END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM canary_387.course_legos c JOIN public.course_legos p USING (id)
              WHERE c.presentation_audio_id IS DISTINCT FROM lower(p.presentation_audio_id)) THEN
    RAISE EXCEPTION 'rollback rehearsal: values differ from live'; END IF;
  RAISE NOTICE 'OK 7: rollback rehearsal restores the same strings';
END $$;

DROP SCHEMA canary_387 CASCADE;
\echo CANARY PASSED

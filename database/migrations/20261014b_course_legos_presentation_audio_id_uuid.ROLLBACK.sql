-- ROLLBACK for 20261014b_course_legos_presentation_audio_id_uuid.sql (job #387).
-- Puts course_legos.presentation_audio_id back to text (lower-case uuid strings, which is what the
-- column held) and restores link_audio_to_content's prior body exactly (captured live 2026-10-14).
-- Popty code edited alongside the forward migration is correct on either type, so no code revert
-- is needed. Apply: psql -X -f this file, owner login.

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
  IF v_type <> 'uuid' THEN RAISE EXCEPTION 'presentation_audio_id is %, not uuid: nothing to roll back', v_type; END IF;
END $$;

CREATE TEMP TABLE _387_rb ON COMMIT DROP AS
SELECT count(presentation_audio_id) n FROM public.course_legos;

ALTER TABLE public.course_legos
  ALTER COLUMN presentation_audio_id TYPE text USING presentation_audio_id::text;

\ir 20261014b_link_audio_to_content_uuid.ROLLBACK.fn.sql

ANALYZE public.course_legos;

DO $$
BEGIN
  IF (SELECT count(presentation_audio_id) FROM public.course_legos) <> (SELECT n FROM _387_rb) THEN
    RAISE EXCEPTION 'rollback: non-null count changed'; END IF;
  RAISE NOTICE 'ROLLED BACK to text';
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
